using System.Net;
using System.Text;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Servicios.Calendario;

namespace SolucionProductividad.Pruebas.Unitarias;

public class PruebasServicioCalendarioIcs
{
    private const string UrlValida = "https://outlook.office365.com/owa/calendar/abc@empresa.com/xyz/calendar.ics";

    /// <summary>Calendario como lo publica Outlook: zona de Windows, serie semanal con una ocurrencia movida, evento de todo el día y reunión de Teams.</summary>
    private const string IcsOutlook = """
        BEGIN:VCALENDAR
        METHOD:PUBLISH
        PRODID:Microsoft Exchange Server 2010
        VERSION:2.0
        X-WR-CALNAME:Calendario
        BEGIN:VTIMEZONE
        TZID:SA Pacific Standard Time
        BEGIN:STANDARD
        DTSTART:16010101T000000
        TZOFFSETFROM:-0500
        TZOFFSETTO:-0500
        END:STANDARD
        BEGIN:DAYLIGHT
        DTSTART:16010101T000000
        TZOFFSETFROM:-0500
        TZOFFSETTO:-0500
        END:DAYLIGHT
        END:VTIMEZONE
        BEGIN:VEVENT
        UID:serie-diaria
        SUMMARY:Daily del equipo
        DTSTART;TZID=SA Pacific Standard Time:20260928T090000
        DTEND;TZID=SA Pacific Standard Time:20260928T091500
        RRULE:FREQ=WEEKLY;BYDAY=MO,WE;INTERVAL=1
        X-MICROSOFT-CDO-BUSYSTATUS:BUSY
        END:VEVENT
        BEGIN:VEVENT
        UID:serie-diaria
        RECURRENCE-ID;TZID=SA Pacific Standard Time:20261007T090000
        SUMMARY:Daily del equipo (movida)
        DTSTART;TZID=SA Pacific Standard Time:20261007T110000
        DTEND;TZID=SA Pacific Standard Time:20261007T111500
        X-MICROSOFT-CDO-BUSYSTATUS:BUSY
        END:VEVENT
        BEGIN:VEVENT
        UID:festivo
        SUMMARY:Festivo
        DTSTART;VALUE=DATE:20261012
        DTEND;VALUE=DATE:20261013
        X-MICROSOFT-CDO-BUSYSTATUS:OOF
        END:VEVENT
        BEGIN:VEVENT
        UID:revision
        SUMMARY:Revisión de sprint
        ORGANIZER;CN=Ana Pérez:mailto:ana@empresa.com
        LOCATION:Reunión de Microsoft Teams
        DESCRIPTION:Agenda del sprint\n\n________________________________________________________________________________\nReunión de Microsoft Teams\nUnirse: https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc%40thread.v2/0?context=%7b%22Tid%22%7d\n
        DTSTART;TZID=SA Pacific Standard Time:20261008T150000
        DTEND;TZID=SA Pacific Standard Time:20261008T160000
        X-MICROSOFT-CDO-BUSYSTATUS:TENTATIVE
        CLASS:PUBLIC
        END:VEVENT
        END:VCALENDAR
        """;

    private sealed class OutlookFalso(Func<HttpRequestMessage, HttpResponseMessage> responder) : HttpMessageHandler
    {
        public int Llamadas { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage solicitud, CancellationToken tokenCancelacion)
        {
            Llamadas++;
            return Task.FromResult(responder(solicitud));
        }
    }

    private static HttpResponseMessage Ics(string contenido) =>
        new(HttpStatusCode.OK) { Content = new StringContent(contenido.Replace("\r\n", "\n").Replace("\n", "\r\n"), Encoding.UTF8, "text/calendar") };

    private static ServicioCalendarioIcs Crear(OutlookFalso outlook) =>
        new(new HttpClient(outlook), new MemoryCache(new MemoryCacheOptions()), NullLogger<ServicioCalendarioIcs>.Instance);

    private static readonly DateTime Lunes = new(2026, 10, 5, 5, 0, 0, DateTimeKind.Utc); // 00:00 en Colombia

    [Fact]
    public async Task Expande_series_aplica_la_ocurrencia_movida_y_convierte_a_utc()
    {
        var eventos = await Crear(new OutlookFalso(_ => Ics(IcsOutlook))).ObtenerEventosAsync(UrlValida, Lunes, Lunes.AddDays(7), omitirCache: false);

        var daily = eventos.Where(evento => evento.Titulo.StartsWith("Daily")).ToList();
        Assert.Equal(2, daily.Count);
        Assert.Equal(new DateTime(2026, 10, 5, 14, 0, 0, DateTimeKind.Utc), daily[0].Inicio); // 09:00 -05:00
        Assert.Equal("Daily del equipo (movida)", daily[1].Titulo);
        Assert.Equal(new DateTime(2026, 10, 7, 16, 0, 0, DateTimeKind.Utc), daily[1].Inicio); // 11:00 -05:00, no la de 09:00
    }

    [Fact]
    public async Task Extrae_enlace_de_teams_organizador_disponibilidad_y_limpia_la_descripcion()
    {
        var eventos = await Crear(new OutlookFalso(_ => Ics(IcsOutlook))).ObtenerEventosAsync(UrlValida, Lunes, Lunes.AddDays(7), omitirCache: false);

        var revision = Assert.Single(eventos, evento => evento.Titulo == "Revisión de sprint");
        Assert.StartsWith("https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc", revision.EnlaceReunion);
        Assert.Equal("Ana Pérez", revision.Organizador);
        Assert.Equal(DisponibilidadEvento.Provisional, revision.Disponibilidad);
        Assert.Equal("Agenda del sprint", revision.Descripcion);
        Assert.False(revision.TodoElDia);
    }

    [Fact]
    public async Task Los_eventos_de_todo_el_dia_conservan_la_fecha()
    {
        var eventos = await Crear(new OutlookFalso(_ => Ics(IcsOutlook))).ObtenerEventosAsync(UrlValida, Lunes, Lunes.AddDays(8), omitirCache: false);

        var festivo = Assert.Single(eventos, evento => evento.Titulo == "Festivo");
        Assert.True(festivo.TodoElDia);
        Assert.Equal(new DateTime(2026, 10, 12), festivo.Inicio.Date);
        Assert.Equal(new DateTime(2026, 10, 13), festivo.Fin.Date);
        Assert.Equal(DisponibilidadEvento.FueraDeOficina, festivo.Disponibilidad);
    }

    [Fact]
    public async Task Usa_la_cache_salvo_que_se_pida_actualizar()
    {
        var outlook = new OutlookFalso(_ => Ics(IcsOutlook));
        var servicio = Crear(outlook);
        await servicio.ObtenerEventosAsync(UrlValida, Lunes, Lunes.AddDays(7), omitirCache: false);
        await servicio.ObtenerEventosAsync(UrlValida, Lunes, Lunes.AddDays(7), omitirCache: false);
        Assert.Equal(1, outlook.Llamadas);
        await servicio.ObtenerEventosAsync(UrlValida, Lunes, Lunes.AddDays(7), omitirCache: true);
        Assert.Equal(2, outlook.Llamadas);
    }

    [Theory]
    [InlineData("http://outlook.office365.com/owa/calendar/x/calendar.ics")]
    [InlineData("https://ejemplo.com/calendar.ics")]
    [InlineData("https://outlook.office365.com.ejemplo.com/calendar.ics")]
    [InlineData("https://outlook.office365.com:8443/calendar.ics")]
    [InlineData("https://usuario@outlook.office365.com/calendar.ics")]
    public async Task Rechaza_enlaces_que_no_son_de_outlook_sin_descargarlos(string url)
    {
        var outlook = new OutlookFalso(_ => Ics(IcsOutlook));
        await Assert.ThrowsAsync<ExcepcionDominio>(() => Crear(outlook).ObtenerEventosAsync(url, Lunes, Lunes.AddDays(7), omitirCache: true));
        Assert.Equal(0, outlook.Llamadas);
    }

    [Fact]
    public async Task No_sigue_redirecciones_a_otros_sitios()
    {
        var outlook = new OutlookFalso(_ => new HttpResponseMessage(HttpStatusCode.Redirect) { Headers = { Location = new Uri("http://169.254.169.254/latest") } });
        var error = await Assert.ThrowsAsync<ExcepcionDominio>(() => Crear(outlook).ObtenerEventosAsync(UrlValida, Lunes, Lunes.AddDays(7), omitirCache: true));
        Assert.Contains("no permitido", error.Message);
        Assert.Equal(1, outlook.Llamadas);
    }

    [Fact]
    public async Task Un_enlace_html_o_revocado_da_un_mensaje_claro()
    {
        var html = new OutlookFalso(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("<html></html>") });
        Assert.Contains("ICS", (await Assert.ThrowsAsync<ExcepcionDominio>(() => Crear(html).ObtenerEventosAsync(UrlValida, Lunes, Lunes.AddDays(7), true))).Message);

        var revocado = new OutlookFalso(_ => new HttpResponseMessage(HttpStatusCode.NotFound));
        Assert.Contains("publicación", (await Assert.ThrowsAsync<ExcepcionDominio>(() => Crear(revocado).ObtenerEventosAsync(UrlValida, Lunes, Lunes.AddDays(7), true))).Message);
    }
}
