using System.Net;
using System.Text;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Servicios.Opciones;
using SolucionProductividad.Servicios.Trello;

namespace SolucionProductividad.Pruebas.Unitarias;

/// <summary>Cliente de solo lectura de Trello contra respuestas grabadas: conversión, caché y traducción de errores.</summary>
public class PruebasServicioTrello
{
    private const string Token = "ATTAabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123";
    private const string IdMiembro = "aaaaaaaaaaaaaaaaaaaaaaaa";
    private const string IdTablero = "bbbbbbbbbbbbbbbbbbbbbbbb";
    private const string IdTableroCerrado = "cccccccccccccccccccccccc";

    private sealed class TrelloFalso(Func<HttpRequestMessage, HttpResponseMessage> responder) : HttpMessageHandler
    {
        public List<HttpRequestMessage> Solicitudes { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage solicitud, CancellationToken tokenCancelacion)
        {
            Solicitudes.Add(solicitud);
            return Task.FromResult(responder(solicitud));
        }
    }

    private static HttpResponseMessage Json(string contenido, HttpStatusCode estado = HttpStatusCode.OK) =>
        new(estado) { Content = new StringContent(contenido, Encoding.UTF8, "application/json") };

    private static ServicioTrello Crear(TrelloFalso trello, string apiKey = "clave-publica") =>
        new(new HttpClient(trello), new MemoryCache(new MemoryCacheOptions()), Options.Create(new OpcionesTrello { ApiKey = apiKey }), NullLogger<ServicioTrello>.Instance);

    private const string Tableros = $$$"""
        [{"id":"{{{IdTablero}}}","name":"Soporte","url":"https://trello.com/b/x/soporte","starred":true,"dateLastActivity":"2026-10-08T10:00:00.000Z",
          "prefs":{"backgroundColor":null,"backgroundImage":"https://img/original.jpg","backgroundImageScaled":[{"width":140,"url":"https://img/140.jpg"},{"width":480,"url":"https://img/480.jpg"},{"width":1920,"url":"https://img/1920.jpg"}]},
          "memberships":[{"idMember":"{{{IdMiembro}}}","memberType":"admin"}],"organization":{"displayName":"Equipo"}},
         {"id":"dddddddddddddddddddddddd","name":"Personal","url":"https://trello.com/b/y/personal","starred":false,"dateLastActivity":null,
          "prefs":{"backgroundColor":"#519839"},"memberships":[{"idMember":"{{{IdMiembro}}}","memberType":"normal"}]}]
        """;

    private const string Tarjeta = $$$"""
        {"id":"eeeeeeeeeeeeeeeeeeeeeeee","name":"Revisar SLA","idBoard":"{{{IdTablero}}}","idList":"ffffffffffffffffffffffff","pos":2.5,"start":null,"due":"2026-10-10T15:00:00.000Z","dueComplete":false,
         "labels":[{"id":"l1","name":"Urgente","color":"red_dark"}],"idMembers":["{{{IdMiembro}}}"],"shortUrl":"https://trello.com/c/abc",
         "badges":{"comments":3,"attachments":1,"checkItems":4,"checkItemsChecked":2,"description":true},"cover":{"color":"green"}}
        """;

    [Fact]
    public async Task Los_tableros_marcan_admin_workspace_y_portada_ligera_y_el_token_va_en_la_cabecera()
    {
        var trello = new TrelloFalso(_ => Json(Tableros));
        var tableros = await Crear(trello).ListarTablerosAsync(Token, IdMiembro, omitirCache: false);

        Assert.Equal(2, tableros.Count);
        var soporte = tableros[0];
        Assert.True(soporte.EsAdmin);
        Assert.True(soporte.Destacado);
        Assert.Equal("Equipo", soporte.NombreWorkspace);
        Assert.Equal("https://img/480.jpg", soporte.ImagenFondo);
        Assert.False(tableros[1].EsAdmin);
        Assert.Equal("#519839", tableros[1].ColorFondo);

        var solicitud = Assert.Single(trello.Solicitudes);
        Assert.DoesNotContain(Token, solicitud.RequestUri!.ToString());
        Assert.Equal("OAuth", solicitud.Headers.Authorization!.Scheme);
        Assert.Contains($"oauth_token=\"{Token}\"", solicitud.Headers.Authorization.Parameter);
    }

    [Fact]
    public async Task El_tablero_ordena_listas_y_convierte_insignias_de_las_tarjetas()
    {
        var trello = new TrelloFalso(_ => Json($$"""
            {"id":"{{IdTablero}}","name":"Soporte","url":"https://trello.com/b/x","prefs":{"backgroundColor":"#0079bf"},
             "lists":[{"id":"l2","name":"Hecho","pos":200},{"id":"ffffffffffffffffffffffff","name":"Por hacer","pos":100}],
             "cards":[{{Tarjeta}}],
             "members":[{"id":"{{IdMiembro}}","fullName":"Ana Pérez","username":"ana","initials":"AP","avatarUrl":"https://avatars/ana"}],
             "labels":[{"id":"l1","name":"Urgente","color":"red_dark"}]}
            """));
        var tablero = await Crear(trello).ObtenerTableroAsync(Token, IdTablero, omitirCache: false);

        Assert.Equal(["Por hacer", "Hecho"], tablero.Listas.Select(lista => lista.Nombre));
        var tarjeta = Assert.Single(tablero.Tarjetas);
        Assert.Equal((3, 1, 4, 2, true, "green"), (tarjeta.Comentarios, tarjeta.Adjuntos, tarjeta.ElementosChecklist, tarjeta.ElementosChecklistHechos, tarjeta.TieneDescripcion, tarjeta.ColorPortada));
        Assert.Equal("red_dark", Assert.Single(tarjeta.Etiquetas).Color);
        Assert.Equal("https://avatars/ana/50.png", Assert.Single(tablero.Miembros).UrlAvatar);
    }

    [Fact]
    public async Task Mis_tarjetas_resuelven_tablero_y_lista_descartan_tableros_cerrados_y_se_cachean()
    {
        var trello = new TrelloFalso(solicitud => solicitud.RequestUri!.AbsolutePath switch
        {
            var ruta when ruta.EndsWith("/members/me/boards") => Json(Tableros),
            var ruta when ruta.EndsWith("/members/me/cards") => Json($"[{Tarjeta}, {Tarjeta.Replace("eeeeeeeeeeeeeeeeeeeeeeee", "999999999999999999999999").Replace($"\"idBoard\":\"{IdTablero}\"", $"\"idBoard\":\"{IdTableroCerrado}\"")}]"),
            var ruta when ruta.EndsWith($"/boards/{IdTablero}/lists") => Json("""[{"id":"ffffffffffffffffffffffff","name":"Por hacer","pos":1}]"""),
            var ruta => throw new InvalidOperationException($"Ruta inesperada: {ruta}"),
        });
        var servicio = Crear(trello);

        var tarjetas = await servicio.ListarMisTarjetasAsync(Token, IdMiembro, omitirCache: false);
        var asignada = Assert.Single(tarjetas);
        Assert.Equal(("Soporte", "Por hacer"), (asignada.NombreTablero, asignada.NombreLista));

        var llamadas = trello.Solicitudes.Count;
        await servicio.ListarMisTarjetasAsync(Token, IdMiembro, omitirCache: false);
        Assert.Equal(llamadas, trello.Solicitudes.Count);
        await servicio.ListarMisTarjetasAsync(Token, IdMiembro, omitirCache: true);
        Assert.True(trello.Solicitudes.Count > llamadas);
    }

    [Fact]
    public async Task Los_errores_de_Trello_se_traducen_y_los_ids_invalidos_no_salen_a_la_red()
    {
        var revocado = new TrelloFalso(_ => Json("invalid token", HttpStatusCode.Unauthorized));
        await Assert.ThrowsAsync<ExcepcionConflicto>(() => Crear(revocado).ListarTablerosAsync(Token, IdMiembro, omitirCache: false));

        var sinRed = new TrelloFalso(_ => throw new InvalidOperationException("No debía llamar a Trello"));
        await Assert.ThrowsAsync<ExcepcionDominio>(() => Crear(sinRed).ObtenerTableroAsync(Token, "../members/me", omitirCache: false));
        await Assert.ThrowsAsync<ExcepcionDominio>(() => Crear(sinRed, apiKey: "").ListarTablerosAsync(Token, IdMiembro, omitirCache: false));
        Assert.Empty(sinRed.Solicitudes);
    }

    [Fact]
    public async Task Las_imagenes_subidas_se_descargan_con_el_token_y_las_demas_se_rechazan()
    {
        const string IdAdjuntoPng = "111111111111111111111111";
        const string IdAdjuntoSvg = "222222222222222222222222";
        var trello = new TrelloFalso(solicitud => solicitud.RequestUri!.ToString() switch
        {
            var url when url.Contains($"attachments/{IdAdjuntoPng}?") =>
                Json($$"""{"id":"{{IdAdjuntoPng}}","name":"captura.png","url":"https://trello.com/1/cards/{{IdTablero}}/attachments/{{IdAdjuntoPng}}/download/captura.png","mimeType":"image/png","isUpload":true,"bytes":4}"""),
            var url when url.Contains($"attachments/{IdAdjuntoSvg}?") =>
                Json($$"""{"id":"{{IdAdjuntoSvg}}","name":"logo.svg","url":"https://trello.com/1/cards/{{IdTablero}}/attachments/{{IdAdjuntoSvg}}/download/logo.svg","mimeType":"image/svg+xml","isUpload":true,"bytes":4}"""),
            var url when url.EndsWith("/download/captura.png") =>
                new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent([0x89, 0x50, 0x4E, 0x47]) },
            var url => throw new InvalidOperationException($"Ruta inesperada: {url}"),
        });
        var servicio = Crear(trello);

        var imagen = await servicio.DescargarImagenAdjuntoAsync(Token, IdTablero, IdAdjuntoPng);
        Assert.Equal("image/png", imagen.TipoContenido);
        Assert.Equal(4, imagen.Contenido.Length);
        Assert.All(trello.Solicitudes, solicitud => Assert.Equal("OAuth", solicitud.Headers.Authorization?.Scheme));

        // Segunda vez sale de la caché.
        var llamadas = trello.Solicitudes.Count;
        await servicio.DescargarImagenAdjuntoAsync(Token, IdTablero, IdAdjuntoPng);
        Assert.Equal(llamadas, trello.Solicitudes.Count);

        await Assert.ThrowsAsync<ExcepcionDominio>(() => servicio.DescargarImagenAdjuntoAsync(Token, IdTablero, IdAdjuntoSvg));
        await Assert.ThrowsAsync<ExcepcionDominio>(() => servicio.DescargarImagenAdjuntoAsync(Token, IdTablero, "../../members/me"));
    }
}
