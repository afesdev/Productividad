using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Servicios.Opciones;

namespace SolucionProductividad.Servicios.Trello;

/// <summary>
/// Cliente mínimo y de SOLO LECTURA de la API REST de Trello. Todas las lecturas son GET (la única excepción es revocar
/// el propio token al desconectar). El token viaja en la cabecera Authorization, nunca en la URL, para que no quede en logs.
/// </summary>
public sealed class ServicioTrello : IServicioTrello
{
    private static readonly TimeSpan DuracionCache = TimeSpan.FromMinutes(2);
    private static readonly JsonSerializerOptions OpcionesJson = new(JsonSerializerDefaults.Web);

    private const string CamposTarjeta = "name,idBoard,idList,pos,start,due,dueComplete,labels,idMembers,shortUrl,badges,cover";
    private const string CamposMiembro = "fullName,username,initials,avatarUrl";
    /// <summary>Tope de tableros consultados en paralelo para resolver los nombres de lista en "Mis tarjetas".</summary>
    private const int MaximoTablerosParalelo = 6;

    private readonly HttpClient _clienteHttp;
    private readonly IMemoryCache _cache;
    private readonly ILogger<ServicioTrello> _registrador;
    private readonly OpcionesTrello _opciones;

    public ServicioTrello(HttpClient clienteHttp, IMemoryCache cache, IOptions<OpcionesTrello> opciones, ILogger<ServicioTrello> registrador)
    {
        _clienteHttp = clienteHttp;
        _cache = cache;
        _registrador = registrador;
        _opciones = opciones.Value;
        _clienteHttp.BaseAddress = new Uri(_opciones.UrlApi.TrimEnd('/') + "/");
        _clienteHttp.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public string? ApiKey => string.IsNullOrWhiteSpace(_opciones.ApiKey) ? null : _opciones.ApiKey.Trim();

    // ---------- Miembro ----------

    public async Task<MiembroTrello> ObtenerMiembroActualAsync(string token, CancellationToken tokenCancelacion = default)
    {
        var miembro = await ObtenerAsync<RespuestaMiembro>(token, $"members/me?fields={CamposMiembro}", "tu cuenta de Trello", tokenCancelacion);
        return ConvertirMiembro(miembro);
    }

    // ---------- Tableros ----------

    public Task<IReadOnlyList<TableroTrelloResumen>> ListarTablerosAsync(string token, string idMiembro, bool omitirCache, CancellationToken tokenCancelacion = default) =>
        ConCacheAsync(token, "tableros", omitirCache, async () =>
        {
            var tableros = await ObtenerAsync<List<RespuestaTablero>>(
                token,
                "members/me/boards?filter=open&fields=name,url,starred,dateLastActivity,prefs,memberships&organization=true&organization_fields=displayName",
                "tus tableros",
                tokenCancelacion);
            return (IReadOnlyList<TableroTrelloResumen>)tableros
                .Select(tablero => new TableroTrelloResumen(
                    tablero.Id,
                    tablero.Name,
                    tablero.Url,
                    tablero.Prefs?.BackgroundColor,
                    ElegirImagenFondo(tablero.Prefs),
                    tablero.Organization?.DisplayName,
                    tablero.Starred,
                    tablero.Memberships?.Any(membresia => membresia.IdMember == idMiembro && membresia.MemberType == "admin") ?? false,
                    tablero.DateLastActivity))
                .ToList();
        });

    public Task<TableroTrello> ObtenerTableroAsync(string token, string idTablero, bool omitirCache, CancellationToken tokenCancelacion = default)
    {
        ValidarId(idTablero, "el tablero de Trello");
        return ConCacheAsync(token, $"tablero:{idTablero}", omitirCache, async () =>
        {
            var tablero = await ObtenerAsync<RespuestaTableroCompleto>(
                token,
                $"boards/{idTablero}?fields=name,url,prefs&lists=open&list_fields=name,pos&cards=visible&card_fields={CamposTarjeta}"
                + $"&members=all&member_fields={CamposMiembro}&labels=all&label_fields=name,color",
                "el tablero de Trello",
                tokenCancelacion);
            return new TableroTrello(
                tablero.Id,
                tablero.Name,
                tablero.Url,
                tablero.Prefs?.BackgroundColor,
                ElegirImagenFondo(tablero.Prefs),
                (tablero.Lists ?? []).OrderBy(lista => lista.Pos).Select(lista => new ListaTrello(lista.Id, lista.Name, lista.Pos)).ToList(),
                (tablero.Cards ?? []).OrderBy(tarjeta => tarjeta.Pos).Select(ConvertirTarjeta).ToList(),
                (tablero.Members ?? []).Select(ConvertirMiembro).ToList(),
                (tablero.Labels ?? []).Select(ConvertirEtiqueta).ToList());
        });
    }

    // ---------- Tarjetas ----------

    public async Task<TarjetaTrelloDetalle> ObtenerTarjetaAsync(string token, string idTarjeta, CancellationToken tokenCancelacion = default)
    {
        if (!ReglasTrello.EsIdValido(idTarjeta) && !ReglasTrello.EsEnlaceCortoValido(idTarjeta))
            throw new ExcepcionDominio("El identificador de la tarjeta de Trello no es válido.");
        // Sin caché: es una sola petición y al abrir la tarjeta se espera ver lo último.
        var tarjeta = await ObtenerAsync<RespuestaTarjetaDetalle>(
            token,
            $"cards/{idTarjeta}?fields=name,desc,shortUrl,idBoard,start,due,dueComplete,labels&board=true&board_fields=name&list=true&list_fields=name"
            + $"&members=true&member_fields={CamposMiembro}&checklists=all&checklist_fields=name,pos"
            + "&attachments=true&attachment_fields=name,url,date,mimeType,isUpload,bytes&actions=commentCard&actions_limit=50",
            "la tarjeta de Trello",
            tokenCancelacion);

        return new TarjetaTrelloDetalle(
            tarjeta.Id,
            tarjeta.Name,
            tarjeta.Desc ?? string.Empty,
            tarjeta.ShortUrl,
            tarjeta.IdBoard,
            tarjeta.Board?.Name ?? string.Empty,
            tarjeta.List?.Name ?? string.Empty,
            tarjeta.Start,
            tarjeta.Due,
            tarjeta.DueComplete,
            (tarjeta.Labels ?? []).Select(ConvertirEtiqueta).ToList(),
            (tarjeta.Members ?? []).Select(ConvertirMiembro).ToList(),
            (tarjeta.Checklists ?? []).OrderBy(checklist => checklist.Pos)
                .Select(checklist => new ChecklistTrello(
                    checklist.Id,
                    checklist.Name,
                    (checklist.CheckItems ?? []).OrderBy(elemento => elemento.Pos).Select(elemento => new ElementoChecklistTrello(elemento.Id, elemento.Name, elemento.State == "complete")).ToList()))
                .ToList(),
            (tarjeta.Actions ?? [])
                .Where(accion => !string.IsNullOrEmpty(accion.Data?.Text))
                .Select(accion => new ComentarioTrello(accion.Id, accion.MemberCreator?.FullName ?? "Alguien", UrlAvatar(accion.MemberCreator?.AvatarUrl), accion.Data!.Text!, accion.Date))
                .ToList(),
            (tarjeta.Attachments ?? []).Select(adjunto => new AdjuntoTrello(adjunto.Id, adjunto.Name, adjunto.Url, adjunto.Date, EsImagenMostrable(adjunto))).ToList());
    }

    public async Task<IReadOnlyList<TarjetaAsignadaTrello>> BuscarTarjetasAsync(string token, string texto, CancellationToken tokenCancelacion = default)
    {
        var consulta = texto.Trim();
        if (consulta.Length < 2) return [];
        if (consulta.Length > 100) consulta = consulta[..100];
        // Sin caché: cada búsqueda es distinta. "partial" busca también por prefijo de palabra.
        var resultado = await ObtenerAsync<RespuestaBusqueda>(
            token,
            $"search?query={Uri.EscapeDataString(consulta)}&modelTypes=cards&partial=true&cards_limit=20&card_fields={CamposTarjeta}"
            + "&card_board=true&board_fields=name,prefs&card_list=true",
            "la búsqueda en Trello",
            tokenCancelacion);
        return (resultado.Cards ?? [])
            .Select(tarjeta => new TarjetaAsignadaTrello(ConvertirTarjeta(tarjeta), tarjeta.Board?.Name ?? string.Empty, tarjeta.List?.Name ?? string.Empty, tarjeta.Board?.Prefs?.BackgroundColor))
            .ToList();
    }

    public Task<IReadOnlyList<TarjetaAsignadaTrello>> ListarMisTarjetasAsync(string token, string idMiembro, bool omitirCache, CancellationToken tokenCancelacion = default) =>
        ConCacheAsync(token, "mis-tarjetas", omitirCache, async () =>
        {
            var tableros = (await ListarTablerosAsync(token, idMiembro, omitirCache, tokenCancelacion)).ToDictionary(tablero => tablero.Id);
            var tarjetas = (await ObtenerAsync<List<RespuestaTarjeta>>(token, $"members/me/cards?filter=visible&fields={CamposTarjeta}", "tus tarjetas", tokenCancelacion))
                .Where(tarjeta => tableros.ContainsKey(tarjeta.IdBoard))
                .ToList();

            // Nombres de lista: una petición ligera por tablero con tarjetas (cacheada), con paralelismo acotado.
            var nombresLista = new Dictionary<string, string>();
            using var limite = new SemaphoreSlim(MaximoTablerosParalelo);
            var consultas = tarjetas.Select(tarjeta => tarjeta.IdBoard).Distinct().Select(async idTablero =>
            {
                await limite.WaitAsync(tokenCancelacion);
                try
                {
                    return await ListarListasAsync(token, idTablero, omitirCache, tokenCancelacion);
                }
                finally
                {
                    limite.Release();
                }
            });
            foreach (var listas in await Task.WhenAll(consultas))
                foreach (var lista in listas)
                    nombresLista[lista.Id] = lista.Name;

            return (IReadOnlyList<TarjetaAsignadaTrello>)tarjetas
                .Select(tarjeta =>
                {
                    var tablero = tableros[tarjeta.IdBoard];
                    return new TarjetaAsignadaTrello(ConvertirTarjeta(tarjeta), tablero.Nombre, nombresLista.GetValueOrDefault(tarjeta.IdList, string.Empty), tablero.ColorFondo);
                })
                .ToList();
        });

    private Task<IReadOnlyList<RespuestaLista>> ListarListasAsync(string token, string idTablero, bool omitirCache, CancellationToken tokenCancelacion) =>
        ConCacheAsync(token, $"listas:{idTablero}", omitirCache, async () =>
            (IReadOnlyList<RespuestaLista>)await ObtenerAsync<List<RespuestaLista>>(token, $"boards/{idTablero}/lists?filter=all&fields=name,pos", "las listas del tablero", tokenCancelacion));

    // ---------- Imágenes de adjuntos ----------

    public async Task<ImagenAdjuntoTrello> DescargarImagenAdjuntoAsync(string token, string idTarjeta, string idAdjunto, CancellationToken tokenCancelacion = default)
    {
        ValidarId(idTarjeta, "la tarjeta de Trello");
        ValidarId(idAdjunto, "el adjunto de Trello");
        // Las imágenes no cambian: se cachean un rato las pequeñas para no descargarlas en cada apertura.
        var clave = $"trello:{HashToken(token)}:imagen:{idAdjunto}";
        if (_cache.TryGetValue(clave, out ImagenAdjuntoTrello? cacheada) && cacheada is not null)
            return cacheada;

        var adjunto = await ObtenerAsync<RespuestaAdjunto>(token, $"cards/{idTarjeta}/attachments/{idAdjunto}?fields=name,url,mimeType,isUpload,bytes", "el adjunto", tokenCancelacion);
        if (!EsImagenMostrable(adjunto) || !Uri.TryCreate(adjunto.Url, UriKind.Absolute, out var origen) || !EsHostTrello(origen))
            throw new ExcepcionDominio("Solo se pueden mostrar imágenes PNG, JPEG, GIF o WebP subidas a Trello.");

        // El token solo viaja a trello.com; si Trello redirige a su almacenamiento, HttpClient quita la cabecera en el salto.
        using var solicitud = CrearSolicitud(HttpMethod.Get, origen.AbsoluteUri, token);
        HttpResponseMessage respuesta;
        try
        {
            respuesta = await _clienteHttp.SendAsync(solicitud, HttpCompletionOption.ResponseHeadersRead, tokenCancelacion);
        }
        catch (Exception excepcion) when (excepcion is HttpRequestException or TaskCanceledException && !tokenCancelacion.IsCancellationRequested)
        {
            _registrador.LogWarning(excepcion, "No se pudo descargar una imagen de Trello");
            throw new ExcepcionDominio("No se pudo descargar la imagen de Trello.");
        }
        using (respuesta)
        {
            if (!respuesta.IsSuccessStatusCode)
                throw new ExcepcionDominio($"Trello no entregó la imagen (error {(int)respuesta.StatusCode}).");
            if (respuesta.Content.Headers.ContentLength > ReglasTrello.MaximoBytesImagen)
                throw new ExcepcionDominio("La imagen es demasiado grande para mostrarla aquí.");
            var contenido = await respuesta.Content.ReadAsByteArrayAsync(tokenCancelacion);
            // El tipo sale de los metadatos validados, no de la respuesta.
            var imagen = new ImagenAdjuntoTrello(contenido, adjunto.MimeType!.ToLowerInvariant());
            if (contenido.Length <= 3 * 1024 * 1024)
                _cache.Set(clave, imagen, TimeSpan.FromMinutes(15));
            return imagen;
        }
    }

    private static bool EsImagenMostrable(RespuestaAdjunto adjunto) =>
        adjunto.IsUpload && adjunto.MimeType is not null && ReglasTrello.TiposImagen.Contains(adjunto.MimeType)
        && (adjunto.Bytes is null || adjunto.Bytes <= ReglasTrello.MaximoBytesImagen);

    private static bool EsHostTrello(Uri uri) =>
        uri.Scheme == Uri.UriSchemeHttps && (uri.Host.Equals("trello.com", StringComparison.OrdinalIgnoreCase) || uri.Host.Equals("api.trello.com", StringComparison.OrdinalIgnoreCase));

    // ---------- Revocar ----------

    public async Task RevocarTokenAsync(string token, CancellationToken tokenCancelacion = default)
    {
        if (ApiKey is null || !ReglasTrello.EsTokenValido(token)) return;
        try
        {
            using var solicitud = CrearSolicitud(HttpMethod.Delete, $"tokens/{token}", token);
            using var respuesta = await _clienteHttp.SendAsync(solicitud, tokenCancelacion);
            if (!respuesta.IsSuccessStatusCode)
                _registrador.LogInformation("Trello no revocó el token al desconectar ({Estado})", (int)respuesta.StatusCode);
        }
        catch (Exception excepcion) when (excepcion is HttpRequestException or TaskCanceledException)
        {
            _registrador.LogInformation(excepcion, "No se pudo revocar el token de Trello al desconectar");
        }
        InvalidarCache(token);
    }

    // ---------- HTTP ----------

    private async Task<T> ObtenerAsync<T>(string token, string ruta, string descripcion, CancellationToken tokenCancelacion)
    {
        if (ApiKey is null)
            throw new ExcepcionDominio("Trello no está configurado. Defina Trello:ApiKey en los secretos de la API.");

        using var solicitud = CrearSolicitud(HttpMethod.Get, ruta, token);
        HttpResponseMessage respuesta;
        try
        {
            respuesta = await _clienteHttp.SendAsync(solicitud, tokenCancelacion);
        }
        catch (TaskCanceledException) when (!tokenCancelacion.IsCancellationRequested)
        {
            throw new ExcepcionDominio("Trello tardó demasiado en responder. Intenta de nuevo en un momento.");
        }
        catch (HttpRequestException excepcion)
        {
            _registrador.LogWarning(excepcion, "No se pudo conectar con Trello");
            throw new ExcepcionDominio("No se pudo conectar con Trello. Intenta de nuevo en un momento.");
        }

        using (respuesta)
        {
            if (respuesta.IsSuccessStatusCode)
                return await respuesta.Content.ReadFromJsonAsync<T>(OpcionesJson, tokenCancelacion)
                    ?? throw new ExcepcionDominio($"Trello devolvió una respuesta vacía al leer {descripcion}.");

            switch (respuesta.StatusCode)
            {
                case HttpStatusCode.Unauthorized:
                    InvalidarCache(token);
                    throw new ExcepcionConflicto("Trello rechazó la conexión: el acceso caducó o se revocó. Vuelve a conectar tu cuenta.");
                case HttpStatusCode.NotFound:
                case HttpStatusCode.BadRequest when ruta.StartsWith("boards/") || ruta.StartsWith("cards/"):
                    throw new ExcepcionDominio($"No se encontró {descripcion} o ya no tienes acceso.");
                case HttpStatusCode.TooManyRequests:
                    throw new ExcepcionDominio("Trello está limitando las peticiones. Espera unos segundos y vuelve a intentarlo.");
                default:
                    _registrador.LogWarning("Trello respondió {Estado} al leer {Descripcion}", (int)respuesta.StatusCode, descripcion);
                    throw new ExcepcionDominio($"Trello no pudo devolver {descripcion} (error {(int)respuesta.StatusCode}).");
            }
        }
    }

    private HttpRequestMessage CrearSolicitud(HttpMethod metodo, string ruta, string token)
    {
        var solicitud = new HttpRequestMessage(metodo, ruta);
        solicitud.Headers.Authorization = new AuthenticationHeaderValue("OAuth", $"oauth_consumer_key=\"{ApiKey}\", oauth_token=\"{token}\"");
        return solicitud;
    }

    // ---------- Caché ----------

    /// <summary>Claves por hash del token (es un secreto) + recurso; un contador por token permite invalidarlas todas a la vez.</summary>
    private async Task<T> ConCacheAsync<T>(string token, string recurso, bool omitirCache, Func<Task<T>> obtener)
    {
        var clave = $"trello:{HashToken(token)}:{GeneracionCache(token)}:{recurso}";
        if (!omitirCache && _cache.TryGetValue(clave, out T? cacheado) && cacheado is not null)
            return cacheado;
        var valor = await obtener();
        _cache.Set(clave, valor, DuracionCache);
        return valor;
    }

    private int GeneracionCache(string token) => _cache.TryGetValue($"trello:{HashToken(token)}:generacion", out int generacion) ? generacion : 0;

    private void InvalidarCache(string token) => _cache.Set($"trello:{HashToken(token)}:generacion", GeneracionCache(token) + 1, TimeSpan.FromHours(1));

    private static string HashToken(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)))[..32];

    // ---------- Conversión ----------

    private static void ValidarId(string id, string descripcion)
    {
        if (!ReglasTrello.EsIdValido(id))
            throw new ExcepcionDominio($"El identificador de {descripcion} no es válido.");
    }

    private static MiembroTrello ConvertirMiembro(RespuestaMiembro miembro) =>
        new(miembro.Id, miembro.FullName ?? miembro.Username ?? string.Empty, miembro.Username ?? string.Empty, miembro.Initials ?? string.Empty, UrlAvatar(miembro.AvatarUrl));

    private static EtiquetaTrello ConvertirEtiqueta(RespuestaEtiqueta etiqueta) => new(etiqueta.Id, etiqueta.Name ?? string.Empty, etiqueta.Color);

    private static TarjetaTrello ConvertirTarjeta(RespuestaTarjeta tarjeta) => new(
        tarjeta.Id,
        tarjeta.Name,
        tarjeta.IdBoard,
        tarjeta.IdList,
        tarjeta.Pos,
        tarjeta.Start,
        tarjeta.Due,
        tarjeta.DueComplete,
        (tarjeta.Labels ?? []).Select(ConvertirEtiqueta).ToList(),
        tarjeta.IdMembers ?? [],
        tarjeta.ShortUrl,
        tarjeta.Badges?.Comments ?? 0,
        tarjeta.Badges?.Attachments ?? 0,
        tarjeta.Badges?.CheckItems ?? 0,
        tarjeta.Badges?.CheckItemsChecked ?? 0,
        tarjeta.Badges?.Description ?? false,
        tarjeta.Cover?.Color,
        tarjeta.Cover?.IdAttachment);

    /// <summary>Trello da la URL base del avatar; el tamaño va como sufijo.</summary>
    private static string? UrlAvatar(string? baseAvatar) => string.IsNullOrEmpty(baseAvatar) ? null : $"{baseAvatar}/50.png";

    /// <summary>La versión escalada más pequeña que mida al menos 480 px de ancho (las portadas originales pesan varios MB).</summary>
    private static string? ElegirImagenFondo(RespuestaPreferencias? preferencias)
    {
        if (preferencias?.BackgroundImage is null) return null;
        var escaladas = preferencias.BackgroundImageScaled ?? [];
        return escaladas.Where(imagen => imagen.Width >= 480).MinBy(imagen => imagen.Width)?.Url
            ?? escaladas.MaxBy(imagen => imagen.Width)?.Url
            ?? preferencias.BackgroundImage;
    }

    // ---------- Respuestas de Trello (camelCase) ----------

    private sealed record RespuestaMiembro(string Id, string? FullName, string? Username, string? Initials, string? AvatarUrl);
    private sealed record RespuestaEtiqueta(string Id, string? Name, string? Color);
    private sealed record RespuestaImagen(int Width, string Url);
    private sealed record RespuestaPreferencias(string? BackgroundColor, string? BackgroundImage, List<RespuestaImagen>? BackgroundImageScaled);
    private sealed record RespuestaMembresia(string IdMember, string MemberType);
    private sealed record RespuestaOrganizacion(string? DisplayName);

    private sealed record RespuestaTablero(
        string Id, string Name, string Url, bool Starred, DateTime? DateLastActivity, RespuestaPreferencias? Prefs, List<RespuestaMembresia>? Memberships, RespuestaOrganizacion? Organization);

    private sealed record RespuestaLista(string Id, string Name, double Pos);
    private sealed record RespuestaInsignias(int Comments, int Attachments, int CheckItems, int CheckItemsChecked, bool Description);
    private sealed record RespuestaPortada(string? Color, string? IdAttachment);

    private class RespuestaTarjeta
    {
        public string Id { get; init; } = string.Empty;
        public string Name { get; init; } = string.Empty;
        public string IdBoard { get; init; } = string.Empty;
        public string IdList { get; init; } = string.Empty;
        public double Pos { get; init; }
        public DateTime? Start { get; init; }
        public DateTime? Due { get; init; }
        public bool DueComplete { get; init; }
        public List<RespuestaEtiqueta>? Labels { get; init; }
        public List<string>? IdMembers { get; init; }
        public string ShortUrl { get; init; } = string.Empty;
        public RespuestaInsignias? Badges { get; init; }
        public RespuestaPortada? Cover { get; init; }
    }

    private sealed record RespuestaTableroMinimo(string Id, string Name, RespuestaPreferencias? Prefs);

    /// <summary>Tarjeta de la búsqueda: trae su tablero y lista anidados.</summary>
    private sealed class RespuestaTarjetaConContexto : RespuestaTarjeta
    {
        public RespuestaTableroMinimo? Board { get; init; }
        public RespuestaNombre? List { get; init; }
    }

    private sealed record RespuestaBusqueda(List<RespuestaTarjetaConContexto>? Cards);

    private sealed record RespuestaTableroCompleto(
        string Id, string Name, string Url, RespuestaPreferencias? Prefs, List<RespuestaLista>? Lists, List<RespuestaTarjeta>? Cards,
        List<RespuestaMiembro>? Members, List<RespuestaEtiqueta>? Labels);

    private sealed record RespuestaNombre(string Name);
    private sealed record RespuestaElementoChecklist(string Id, string Name, string State, double Pos);
    private sealed record RespuestaChecklist(string Id, string Name, double Pos, List<RespuestaElementoChecklist>? CheckItems);
    private sealed record RespuestaAdjunto(string Id, string Name, string Url, DateTime? Date, string? MimeType, bool IsUpload, long? Bytes);
    private sealed record RespuestaDatosAccion(string? Text);
    private sealed record RespuestaAccion(string Id, DateTime Date, RespuestaDatosAccion? Data, RespuestaMiembro? MemberCreator);

    private sealed record RespuestaTarjetaDetalle(
        string Id, string Name, string? Desc, string ShortUrl, string IdBoard, DateTime? Start, DateTime? Due, bool DueComplete,
        List<RespuestaEtiqueta>? Labels, RespuestaNombre? Board, RespuestaNombre? List, List<RespuestaMiembro>? Members,
        List<RespuestaChecklist>? Checklists, List<RespuestaAdjunto>? Attachments, List<RespuestaAccion>? Actions);
}
