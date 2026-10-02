using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Servicios.Opciones;

namespace SolucionProductividad.Servicios.GitHub;

/// <summary>
/// Cliente mínimo y de SOLO LECTURA de la API de GitHub (REST v2022-11-28 y una consulta GraphQL) con HttpClient.
/// REST solo usa GET y GraphQL una única consulta fija sin mutaciones: la app nunca crea ramas, PRs ni commits aunque
/// el token lo permita (un token classic con scope "repo" también tiene escritura; esta clase es la barrera).
/// </summary>
public sealed class ServicioGitHub : IServicioGitHub
{
    private const int MaximoPaginasRamas = 10;
    private const int MaximoPaginasCommitsPullRequest = 3;
    private const int MaximoPaginasArchivosPullRequest = 30;
    private const int CommitsPorRamaFija = 150;
    private const int CommitsPorRamaReciente = 40;

    private static readonly JsonSerializerOptions OpcionesJson = new(JsonSerializerDefaults.Web) { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    private readonly HttpClient _clienteHttp;
    private readonly OpcionesGitHub _opciones;

    public ServicioGitHub(HttpClient clienteHttp, IOptions<OpcionesGitHub> opciones)
    {
        _clienteHttp = clienteHttp;
        _opciones = opciones.Value;
        _clienteHttp.BaseAddress = new Uri(_opciones.UrlApi.TrimEnd('/') + "/");
        _clienteHttp.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("SolucionProductividad", "1.0"));
        _clienteHttp.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        _clienteHttp.DefaultRequestHeaders.Add("X-GitHub-Api-Version", "2022-11-28");
        if (!string.IsNullOrWhiteSpace(_opciones.Token))
            _clienteHttp.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _opciones.Token);
    }

    public async Task<RepositorioGitHub> ObtenerRepositorioAsync(string propietario, string repositorio, CancellationToken tokenCancelacion = default)
    {
        var respuesta = await ObtenerAsync<RespuestaRepositorio>($"repos/{Ruta(propietario)}/{Ruta(repositorio)}", tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el repositorio en GitHub", $"{propietario}/{repositorio}");
        return new RepositorioGitHub(respuesta.FullName, respuesta.DefaultBranch, respuesta.Private, respuesta.HtmlUrl);
    }

    public async Task<string?> ObtenerShaRamaAsync(string propietario, string repositorio, string rama, CancellationToken tokenCancelacion = default)
    {
        var respuesta = await ObtenerAsync<RespuestaRama>($"repos/{Ruta(propietario)}/{Ruta(repositorio)}/branches/{Ruta(rama)}", tokenCancelacion, permitirNoEncontrado: true);
        return respuesta?.Commit.Sha;
    }

    public async Task<IReadOnlyList<string>> ListarRamasAsync(string propietario, string repositorio, CancellationToken tokenCancelacion = default)
    {
        // Páginas de 100 (máx. 1000 ramas); GitHub no filtra por "contiene".
        var encontradas = new List<string>();
        for (var pagina = 1; pagina <= MaximoPaginasRamas; pagina++)
        {
            var ramas = await ObtenerAsync<List<RespuestaNombreRama>>($"repos/{Ruta(propietario)}/{Ruta(repositorio)}/branches?per_page=100&page={pagina}", tokenCancelacion) ?? [];
            encontradas.AddRange(ramas.Select(rama => rama.Name));
            if (ramas.Count < 100)
                break;
        }
        return encontradas;
    }

    public async Task<ComparacionGitHub> CompararAsync(string propietario, string repositorio, string ramaBase, string ramaTrabajo, CancellationToken tokenCancelacion = default)
    {
        var ruta = $"repos/{Ruta(propietario)}/{Ruta(repositorio)}/compare/{Ruta(ramaBase)}...{Ruta(ramaTrabajo)}?per_page=100";
        var respuesta = await ObtenerAsync<RespuestaComparacion>(ruta, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("la rama en GitHub", ramaTrabajo);

        return new ComparacionGitHub(
            respuesta.TotalCommits,
            (respuesta.Files ?? []).Select(ConvertirArchivo).ToList(),
            (respuesta.Commits ?? []).Select(ConvertirCommit).ToList());
    }

    public async Task<GrafoGitHub> ObtenerGrafoAsync(string propietario, string repositorio, IReadOnlyList<string> ramasFijas, int maximoRamasRecientes, CancellationToken tokenCancelacion = default)
    {
        // GraphQL trae todo en una petición (con REST sería una por rama). Es una consulta fija de lectura:
        // los nombres viajan como variables, nunca concatenados, y no hay mutaciones.
        var fijas = ramasFijas.Where(rama => !string.IsNullOrWhiteSpace(rama)).Distinct().Take(2).ToList();
        var alias = string.Concat(fijas.Select((_, indice) => $"f{indice}: ref(qualifiedName: $f{indice}) {{ ...Rama }} "));
        var parametros = string.Concat(fijas.Select((_, indice) => $", $f{indice}: String!"));
        var consulta = $$"""
            query($propietario: String!, $nombre: String!, $recientes: Int!{{parametros}}) {
              repository(owner: $propietario, name: $nombre) {
                {{alias}}
                recientes: refs(refPrefix: "refs/heads/", first: $recientes, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) { nodes { ...RamaReciente } }
              }
            }
            fragment Rama on Ref { name target { ... on Commit { oid committedDate history(first: {{CommitsPorRamaFija}}) { nodes { ...C } } } } }
            fragment RamaReciente on Ref { name target { ... on Commit { oid committedDate history(first: {{CommitsPorRamaReciente}}) { nodes { ...C } } } } }
            fragment C on Commit { oid messageHeadline committedDate url author { name user { login } } parents(first: 3) { nodes { oid } } }
            """;
        var variables = new Dictionary<string, object> { ["propietario"] = propietario, ["nombre"] = repositorio, ["recientes"] = maximoRamasRecientes };
        for (var indice = 0; indice < fijas.Count; indice++)
            variables[$"f{indice}"] = $"refs/heads/{fijas[indice]}";

        if (string.IsNullOrWhiteSpace(_opciones.Token))
            throw new ExcepcionDominio("GitHub no está configurado. Defina GitHub:Token en los secretos de la API.");
        using var respuesta = await _clienteHttp.PostAsJsonAsync("graphql", new { query = consulta, variables }, tokenCancelacion);
        if (!respuesta.IsSuccessStatusCode)
            throw await TraducirErrorAsync(respuesta, tokenCancelacion);

        using var documento = JsonDocument.Parse(await respuesta.Content.ReadAsStringAsync(tokenCancelacion));
        var raiz = documento.RootElement;
        if (!raiz.TryGetProperty("data", out var datos) || datos.ValueKind != JsonValueKind.Object
            || !datos.TryGetProperty("repository", out var repo) || repo.ValueKind != JsonValueKind.Object)
        {
            var detalle = raiz.TryGetProperty("errors", out var errores) && errores.GetArrayLength() > 0 && errores[0].TryGetProperty("message", out var mensaje)
                ? mensaje.GetString()
                : null;
            throw new ExcepcionDominio($"GitHub no devolvió el historial de {propietario}/{repositorio}. {detalle}".Trim());
        }

        // GraphQL puede responder datos parciales (campos en null) junto con "errors": se lee todo de forma tolerante.
        var ramas = new Dictionary<string, RamaGrafoGitHub>();
        var commits = new Dictionary<string, CommitGrafoGitHub>();
        void LeerRama(JsonElement referencia)
        {
            if (Texto(referencia, "name") is not { } nombre || !Objeto(referencia, "target", out var objetivo) || Texto(objetivo, "oid") is not { } oid)
                return;
            ramas.TryAdd(nombre, new RamaGrafoGitHub(nombre, oid, Fecha(objetivo, "committedDate")));
            foreach (var nodo in Nodos(objetivo, "history"))
            {
                if (Texto(nodo, "oid") is not { } sha || commits.ContainsKey(sha))
                    continue;
                var nombreAutor = Objeto(nodo, "author", out var autor) ? Texto(autor, "name") : null;
                commits[sha] = new CommitGrafoGitHub(
                    sha,
                    Texto(nodo, "messageHeadline") ?? string.Empty,
                    string.IsNullOrWhiteSpace(nombreAutor) ? "desconocido" : nombreAutor,
                    Fecha(nodo, "committedDate"),
                    Texto(nodo, "url") ?? string.Empty,
                    Nodos(nodo, "parents").Select(padre => Texto(padre, "oid")).OfType<string>().ToList());
            }
        }

        for (var indice = 0; indice < fijas.Count; indice++)
            if (Objeto(repo, $"f{indice}", out var fija))
                LeerRama(fija);
        foreach (var referencia in Nodos(repo, "recientes"))
            LeerRama(referencia);

        if (ramas.Count == 0)
        {
            var detalle = raiz.TryGetProperty("errors", out var errores) && errores.ValueKind == JsonValueKind.Array && errores.GetArrayLength() > 0
                ? Texto(errores[0], "message")
                : null;
            throw new ExcepcionDominio($"GitHub no devolvió ramas para {propietario}/{repositorio}. {detalle}".Trim());
        }

        return new GrafoGitHub(ramas.Values.ToList(), commits.Values.ToList());
    }

    public async Task<DetalleCommitGitHub?> ObtenerCommitAsync(string propietario, string repositorio, string sha, CancellationToken tokenCancelacion = default)
    {
        var respuesta = await ObtenerAsync<RespuestaDetalleCommitCompleto>($"repos/{Ruta(propietario)}/{Ruta(repositorio)}/commits/{Uri.EscapeDataString(sha)}", tokenCancelacion, permitirNoEncontrado: true);
        if (respuesta is null)
            return null;
        var archivos = (respuesta.Files ?? []).Select(ConvertirArchivo).ToList();
        return new DetalleCommitGitHub(
            respuesta.Sha,
            respuesta.Commit.Message,
            respuesta.Commit.Author?.Name ?? respuesta.Author?.Login ?? "desconocido",
            respuesta.Commit.Author?.Date ?? DateTime.UtcNow,
            respuesta.HtmlUrl,
            (respuesta.Parents ?? []).Select(padre => padre.Sha).ToList(),
            respuesta.Stats?.Additions ?? archivos.Sum(archivo => archivo.LineasAgregadas),
            respuesta.Stats?.Deletions ?? archivos.Sum(archivo => archivo.LineasEliminadas),
            archivos,
            archivos.Count >= 300);
    }

    public async Task<ComparacionGitHub> ObtenerCambiosPullRequestAsync(string propietario, string repositorio, int numero, CancellationToken tokenCancelacion = default)
    {
        var rutaPullRequest = $"repos/{Ruta(propietario)}/{Ruta(repositorio)}/pulls/{numero}";
        var commits = await ObtenerPaginadoAsync<RespuestaCommit>($"{rutaPullRequest}/commits", MaximoPaginasCommitsPullRequest, tokenCancelacion);
        var archivos = await ObtenerPaginadoAsync<RespuestaArchivo>($"{rutaPullRequest}/files", MaximoPaginasArchivosPullRequest, tokenCancelacion);
        return new ComparacionGitHub(commits.Count, archivos.Select(ConvertirArchivo).ToList(), commits.Select(ConvertirCommit).ToList());
    }

    private async Task<List<T>> ObtenerPaginadoAsync<T>(string ruta, int maximoPaginas, CancellationToken tokenCancelacion)
    {
        var elementos = new List<T>();
        for (var pagina = 1; pagina <= maximoPaginas; pagina++)
        {
            var lote = await ObtenerAsync<List<T>>($"{ruta}?per_page=100&page={pagina}", tokenCancelacion) ?? [];
            elementos.AddRange(lote);
            if (lote.Count < 100)
                break;
        }
        return elementos;
    }

    private static ArchivoCambiadoGitHub ConvertirArchivo(RespuestaArchivo archivo) => new(
        archivo.Filename,
        archivo.PreviousFilename,
        archivo.Status switch
        {
            "added" => TipoCambioArchivo.Agregado,
            "removed" => TipoCambioArchivo.Eliminado,
            "renamed" => TipoCambioArchivo.Renombrado,
            _ => TipoCambioArchivo.Modificado
        },
        archivo.Additions,
        archivo.Deletions,
        archivo.Patch);

    private static CommitGitHub ConvertirCommit(RespuestaCommit commit) => new(
        commit.Sha,
        commit.Commit.Message,
        commit.Commit.Author?.Name ?? commit.Author?.Login ?? "desconocido",
        commit.Commit.Author?.Date ?? DateTime.UtcNow,
        commit.HtmlUrl);

    public async Task<PullRequestGitHub?> BuscarPullRequestAsync(string propietario, string repositorio, string ramaTrabajo, CancellationToken tokenCancelacion = default)
    {
        // Sin filtro de destino: el PR pudo abrirse hacia Desarrollo, main u otra rama.
        var ruta = $"repos/{Ruta(propietario)}/{Ruta(repositorio)}/pulls?state=all&head={Uri.EscapeDataString($"{propietario}:{ramaTrabajo}")}&sort=created&direction=desc&per_page=20";
        var respuesta = await ObtenerAsync<List<RespuestaPullRequest>>(ruta, tokenCancelacion) ?? [];
        var elegido = respuesta.FirstOrDefault(pullRequest => pullRequest.State == "open") ?? respuesta.FirstOrDefault();
        return elegido is null ? null : Convertir(elegido);
    }

    public async Task<PullRequestGitHub> ObtenerPullRequestAsync(string propietario, string repositorio, int numero, CancellationToken tokenCancelacion = default)
    {
        var respuesta = await ObtenerAsync<RespuestaPullRequest>($"repos/{Ruta(propietario)}/{Ruta(repositorio)}/pulls/{numero}", tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el pull request", numero);
        return Convertir(respuesta);
    }

    private static PullRequestGitHub Convertir(RespuestaPullRequest pullRequest) => new(
        pullRequest.Number,
        pullRequest.Title,
        pullRequest.HtmlUrl,
        pullRequest.MergedAt is not null ? EstadoPullRequest.Fusionado : pullRequest.State == "open" ? EstadoPullRequest.Abierto : EstadoPullRequest.Cerrado,
        pullRequest.MergedAt,
        pullRequest.Base.Ref);

    private static bool Objeto(JsonElement padre, string propiedad, out JsonElement valor)
    {
        valor = default;
        return padre.ValueKind == JsonValueKind.Object && padre.TryGetProperty(propiedad, out valor) && valor.ValueKind == JsonValueKind.Object;
    }

    private static string? Texto(JsonElement padre, string propiedad) =>
        padre.ValueKind == JsonValueKind.Object && padre.TryGetProperty(propiedad, out var valor) && valor.ValueKind == JsonValueKind.String ? valor.GetString() : null;

    private static DateTime Fecha(JsonElement padre, string propiedad) =>
        Texto(padre, propiedad) is { } texto && DateTime.TryParse(texto, null, System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal, out var fecha)
            ? fecha
            : DateTime.MinValue;

    /// <summary>Elementos de "{propiedad}.nodes" (conexiones GraphQL); vacío si falta o es null.</summary>
    private static IEnumerable<JsonElement> Nodos(JsonElement padre, string propiedad) =>
        Objeto(padre, propiedad, out var conexion) && conexion.TryGetProperty("nodes", out var nodos) && nodos.ValueKind == JsonValueKind.Array
            ? nodos.EnumerateArray().Where(nodo => nodo.ValueKind == JsonValueKind.Object)
            : [];

    /// <summary>Escapa cada segmento (las ramas pueden contener "/").</summary>
    private static string Ruta(string segmento) => string.Join('/', segmento.Split('/').Select(Uri.EscapeDataString));

    /// <summary>Único punto de salida hacia GitHub: solo GET, sin cuerpo.</summary>
    private async Task<T?> ObtenerAsync<T>(string ruta, CancellationToken tokenCancelacion, bool permitirNoEncontrado = false)
    {
        if (string.IsNullOrWhiteSpace(_opciones.Token))
            throw new ExcepcionDominio("GitHub no está configurado. Defina GitHub:Token en los secretos de la API.");

        using var solicitud = new HttpRequestMessage(HttpMethod.Get, ruta);
        using var respuesta = await _clienteHttp.SendAsync(solicitud, tokenCancelacion);

        if (respuesta.StatusCode == HttpStatusCode.NotFound && permitirNoEncontrado)
            return default;

        if (!respuesta.IsSuccessStatusCode)
            throw await TraducirErrorAsync(respuesta, tokenCancelacion);

        return await respuesta.Content.ReadFromJsonAsync<T>(OpcionesJson, tokenCancelacion);
    }

    private static async Task<Exception> TraducirErrorAsync(HttpResponseMessage respuesta, CancellationToken tokenCancelacion)
    {
        string? detalle = null;
        try
        {
            var error = await respuesta.Content.ReadFromJsonAsync<RespuestaError>(OpcionesJson, tokenCancelacion);
            detalle = error?.Errors?.FirstOrDefault()?.Message ?? error?.Message;
        }
        catch (JsonException)
        {
            // Cuerpo no JSON: se usa solo el código de estado.
        }

        return respuesta.StatusCode switch
        {
            HttpStatusCode.Unauthorized => new ExcepcionDominio("GitHub rechazó el token. Verifique GitHub:Token."),
            HttpStatusCode.Forbidden => new ExcepcionDominio($"GitHub denegó la operación (permisos o límite de peticiones). {detalle}".Trim()),
            HttpStatusCode.NotFound => new ExcepcionDominio("GitHub no encontró el recurso: revise propietario, repositorio, rama o permisos del token."),
            _ => new ExcepcionDominio($"Error de GitHub ({(int)respuesta.StatusCode}). {detalle}".Trim())
        };
    }

    // ---------- Modelos de respuesta de GitHub (solo los campos usados) ----------

    private sealed record RespuestaRepositorio(string FullName, string DefaultBranch, bool Private, string HtmlUrl);

    private sealed record RespuestaRama(RespuestaCommitRef Commit);

    private sealed record RespuestaCommitRef(string Sha);

    private sealed record RespuestaComparacion(int TotalCommits, List<RespuestaArchivo>? Files, List<RespuestaCommit>? Commits);

    private sealed record RespuestaArchivo(string Filename, string? PreviousFilename, string Status, int Additions, int Deletions, string? Patch);

    private sealed record RespuestaCommit(string Sha, string HtmlUrl, RespuestaDetalleCommit Commit, RespuestaUsuario? Author);

    private sealed record RespuestaDetalleCommit(string Message, RespuestaAutorCommit? Author);

    private sealed record RespuestaAutorCommit(string Name, DateTime Date);

    private sealed record RespuestaUsuario(string Login);

    private sealed record RespuestaNombreRama(string Name);

    private sealed record RespuestaDetalleCommitCompleto(
        string Sha,
        string HtmlUrl,
        RespuestaMensajeCommit Commit,
        RespuestaUsuario? Author,
        List<RespuestaCommitRef>? Parents,
        RespuestaEstadisticas? Stats,
        List<RespuestaArchivo>? Files);

    private sealed record RespuestaMensajeCommit(string Message, RespuestaAutorFecha? Author);

    private sealed record RespuestaAutorFecha(string? Name, DateTime? Date);

    private sealed record RespuestaEstadisticas(int Additions, int Deletions);

    private sealed record RespuestaPullRequest(int Number, string Title, string HtmlUrl, string State, DateTime? MergedAt, RespuestaRefPullRequest Base);

    private sealed record RespuestaRefPullRequest(string Ref);

    private sealed record RespuestaError(string? Message, List<RespuestaDetalleError>? Errors);

    private sealed record RespuestaDetalleError([property: JsonPropertyName("message")] string? Message);
}
