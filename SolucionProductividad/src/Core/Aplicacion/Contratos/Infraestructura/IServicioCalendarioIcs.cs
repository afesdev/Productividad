namespace SolucionProductividad.Aplicacion.Contratos.Infraestructura;

/// <summary>Disponibilidad que Outlook marca en cada evento (X-MICROSOFT-CDO-BUSYSTATUS).</summary>
public enum DisponibilidadEvento
{
    Ocupado,
    Provisional,
    Libre,
    FueraDeOficina,
    TrabajandoEnOtroLugar
}

/// <summary>
/// Una ocurrencia concreta (las series ya vienen expandidas). Con <paramref name="TodoElDia"/>, Inicio y Fin son
/// fechas sin hora (Fin exclusivo); si no, instantes en UTC.
/// </summary>
public sealed record EventoCalendario(
    string Id,
    string Titulo,
    DateTime Inicio,
    DateTime Fin,
    bool TodoElDia,
    string? Ubicacion,
    string? Organizador,
    DisponibilidadEvento Disponibilidad,
    bool Cancelado,
    bool Privado,
    string? EnlaceReunion,
    string? Descripcion);

/// <summary>
/// Lee un calendario publicado como ICS (solo Outlook / Microsoft 365, por https). Cachea la descarga unos minutos;
/// los errores (enlace revocado, no es un ICS…) se traducen a excepciones de dominio con mensajes en español.
/// </summary>
public interface IServicioCalendarioIcs
{
    Task<IReadOnlyList<EventoCalendario>> ObtenerEventosAsync(string urlIcs, DateTime desdeUtc, DateTime hastaUtc, bool omitirCache, CancellationToken tokenCancelacion = default);
}

/// <summary>Reglas del enlace ICS compartidas por el validador y el servicio (este último las vuelve a aplicar antes de cada descarga).</summary>
public static class ReglasUrlCalendario
{
    /// <summary>Solo se descargan calendarios de Microsoft: evita que la API sirva para pedir URLs arbitrarias (SSRF).</summary>
    public static readonly IReadOnlySet<string> HostsPermitidos = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "outlook.office365.com",
        "outlook.office.com",
        "outlook.live.com",
    };

    public const string Mensaje = "Usa el enlace ICS que genera Outlook al publicar el calendario (https://outlook.office365.com/…/calendar.ics).";

    public static bool EsValida(string? url) =>
        Uri.TryCreate(url?.Trim(), UriKind.Absolute, out var uri) && EsValida(uri);

    public static bool EsValida(Uri uri) =>
        uri.Scheme == Uri.UriSchemeHttps && uri.IsDefaultPort && string.IsNullOrEmpty(uri.UserInfo) && HostsPermitidos.Contains(uri.Host);
}
