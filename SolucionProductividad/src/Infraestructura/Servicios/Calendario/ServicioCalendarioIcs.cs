using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Ical.Net;
using Ical.Net.CalendarComponents;
using Ical.Net.DataTypes;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Servicios.Calendario;

/// <summary>
/// Descarga e interpreta (Ical.Net) el calendario que Outlook publica como ICS. Solo lectura: la app nunca escribe
/// en el calendario. El HttpClient no sigue redirecciones por su cuenta: cada salto se valida contra los hosts permitidos.
/// </summary>
public sealed partial class ServicioCalendarioIcs : IServicioCalendarioIcs
{
    private static readonly TimeSpan DuracionCache = TimeSpan.FromMinutes(5);
    private const int MaximoRedirecciones = 3;
    private const int MaximoLargoDescripcion = 2000;

    private readonly HttpClient _clienteHttp;
    private readonly IMemoryCache _cache;
    private readonly ILogger<ServicioCalendarioIcs> _registrador;

    public ServicioCalendarioIcs(HttpClient clienteHttp, IMemoryCache cache, ILogger<ServicioCalendarioIcs> registrador)
    {
        _clienteHttp = clienteHttp;
        _cache = cache;
        _registrador = registrador;
    }

    public async Task<IReadOnlyList<EventoCalendario>> ObtenerEventosAsync(string urlIcs, DateTime desdeUtc, DateTime hastaUtc, bool omitirCache, CancellationToken tokenCancelacion = default)
    {
        var calendario = await ObtenerCalendarioAsync(urlIcs.Trim(), omitirCache, tokenCancelacion);
        return ExpandirEventos(calendario, desdeUtc, hastaUtc);
    }

    // ---------- Descarga ----------

    private async Task<Ical.Net.Calendar> ObtenerCalendarioAsync(string urlIcs, bool omitirCache, CancellationToken tokenCancelacion)
    {
        // La clave es un hash: el enlace es un secreto y no debe quedar en claro ni en memoria de diagnóstico.
        var clave = "calendario-ics:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(urlIcs)));
        if (!omitirCache && _cache.TryGetValue(clave, out string? contenidoCacheado) && contenidoCacheado is not null)
            return Interpretar(contenidoCacheado);

        var contenido = await DescargarAsync(urlIcs, tokenCancelacion);
        var calendario = Interpretar(contenido);
        _cache.Set(clave, contenido, DuracionCache);
        return calendario;
    }

    private async Task<string> DescargarAsync(string urlIcs, CancellationToken tokenCancelacion)
    {
        if (!Uri.TryCreate(urlIcs, UriKind.Absolute, out var destino) || !ReglasUrlCalendario.EsValida(destino))
            throw new ExcepcionDominio(ReglasUrlCalendario.Mensaje);

        for (var salto = 0; salto <= MaximoRedirecciones; salto++)
        {
            HttpResponseMessage respuesta;
            try
            {
                respuesta = await _clienteHttp.GetAsync(destino, HttpCompletionOption.ResponseContentRead, tokenCancelacion);
            }
            catch (TaskCanceledException) when (!tokenCancelacion.IsCancellationRequested)
            {
                throw new ExcepcionDominio("Outlook tardó demasiado en responder. Intenta de nuevo en un momento.");
            }
            catch (HttpRequestException excepcion)
            {
                _registrador.LogWarning(excepcion, "No se pudo descargar el calendario ICS");
                throw new ExcepcionDominio("No se pudo conectar con Outlook para leer el calendario. Intenta de nuevo en un momento.");
            }

            using (respuesta)
            {
                if (respuesta.StatusCode is HttpStatusCode.Moved or HttpStatusCode.Redirect or HttpStatusCode.RedirectMethod
                    or HttpStatusCode.TemporaryRedirect or HttpStatusCode.PermanentRedirect)
                {
                    var siguiente = respuesta.Headers.Location is { } ubicacion ? new Uri(destino, ubicacion) : null;
                    if (siguiente is null || !ReglasUrlCalendario.EsValida(siguiente))
                        throw new ExcepcionDominio("Outlook redirigió el enlace del calendario a un sitio no permitido.");
                    destino = siguiente;
                    continue;
                }

                if (respuesta.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone or HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                    throw new ExcepcionDominio("Outlook rechazó el enlace del calendario. Puede que se haya cancelado la publicación: vuelve a publicarlo y conecta el enlace nuevo.");
                if (!respuesta.IsSuccessStatusCode)
                    throw new ExcepcionDominio($"Outlook respondió con un error ({(int)respuesta.StatusCode}) al leer el calendario. Intenta de nuevo en un momento.");

                return await respuesta.Content.ReadAsStringAsync(tokenCancelacion);
            }
        }

        throw new ExcepcionDominio("Outlook redirigió el enlace del calendario demasiadas veces.");
    }

    private static Ical.Net.Calendar Interpretar(string contenido)
    {
        if (!contenido.TrimStart().StartsWith("BEGIN:VCALENDAR", StringComparison.OrdinalIgnoreCase))
            throw new ExcepcionDominio("El enlace no devolvió un calendario ICS. Copia el enlace ICS (no el HTML) de \"Publicar un calendario\" en Outlook.");
        try
        {
            return Ical.Net.Calendar.Load(contenido)
                ?? throw new ExcepcionDominio("El calendario ICS está vacío o no se pudo interpretar.");
        }
        catch (Exception excepcion) when (excepcion is not ExcepcionDominio)
        {
            throw new ExcepcionDominio("El calendario ICS no se pudo interpretar.");
        }
    }

    // ---------- Expansión de eventos ----------

    /// <summary>
    /// Se evalúa evento por evento (y no el calendario entero) para que uno con una zona horaria rara no tumbe el resto.
    /// Las ocurrencias modificadas de una serie (RECURRENCE-ID) reemplazan a la original.
    /// </summary>
    private IReadOnlyList<EventoCalendario> ExpandirEventos(Ical.Net.Calendar calendario, DateTime desdeUtc, DateTime hastaUtc)
    {
        // Se empieza un día antes para no perder eventos que comenzaron antes del rango y siguen en curso.
        var inicioBusqueda = new CalDateTime(desdeUtc.AddDays(-1), true);
        var finBusqueda = new CalDateTime(hastaUtc, true);

        var reemplazadas = calendario.Events
            .Where(evento => evento.RecurrenceIdentifier is not null && evento.Uid is not null)
            .Select(evento => ClaveOcurrencia(evento.Uid!, SeguroUtc(evento.RecurrenceIdentifier!.StartTime)))
            .ToHashSet();

        var resultado = new List<EventoCalendario>();
        var fallidos = 0;
        foreach (var evento in calendario.Events)
        {
            try
            {
                foreach (var ocurrencia in evento.GetOccurrences(inicioBusqueda).TakeWhileBefore(finBusqueda))
                {
                    var inicio = ocurrencia.Period.StartTime;
                    var fin = ocurrencia.Period.EffectiveEndTime ?? inicio;
                    var esMaestro = evento.RecurrenceIdentifier is null && evento.Uid is not null;
                    if (esMaestro && reemplazadas.Contains(ClaveOcurrencia(evento.Uid!, SeguroUtc(inicio))))
                        continue;

                    var convertido = Convertir(evento, inicio, fin);
                    if (convertido.TodoElDia
                            ? convertido.Fin > desdeUtc.Date.AddDays(-1) && convertido.Inicio < hastaUtc.Date.AddDays(1)
                            : convertido.Fin > desdeUtc && convertido.Inicio < hastaUtc)
                        resultado.Add(convertido);
                }
            }
            catch (Exception excepcion)
            {
                fallidos++;
                _registrador.LogWarning(excepcion, "Se omitió un evento del calendario ICS que no se pudo evaluar");
            }
        }

        if (fallidos > 0 && resultado.Count == 0 && calendario.Events.Count > 0)
            throw new ExcepcionDominio("No se pudo interpretar ningún evento del calendario.");

        return resultado
            .DistinctBy(evento => evento.Id)
            .OrderBy(evento => evento.Inicio)
            .ToList();
    }

    private static EventoCalendario Convertir(CalendarEvent evento, CalDateTime inicio, CalDateTime fin)
    {
        var todoElDia = evento.IsAllDay || !inicio.HasTime;
        var inicioValor = todoElDia ? inicio.Value.Date : SeguroUtc(inicio);
        var finValor = todoElDia ? fin.Value.Date : SeguroUtc(fin);
        if (todoElDia && finValor <= inicioValor) finValor = inicioValor.AddDays(1);

        var descripcion = LimpiarDescripcion(evento.Description);
        var titulo = string.IsNullOrWhiteSpace(evento.Summary) ? "(Sin título)" : evento.Summary.Trim();
        var privado = string.Equals(evento.Class, "PRIVATE", StringComparison.OrdinalIgnoreCase) || string.Equals(evento.Class, "CONFIDENTIAL", StringComparison.OrdinalIgnoreCase);

        return new EventoCalendario(
            Id: $"{evento.Uid}|{inicioValor:O}",
            Titulo: titulo,
            Inicio: inicioValor,
            Fin: finValor,
            TodoElDia: todoElDia,
            Ubicacion: string.IsNullOrWhiteSpace(evento.Location) ? null : evento.Location.Trim(),
            Organizador: NombreOrganizador(evento.Organizer),
            Disponibilidad: LeerDisponibilidad(evento),
            Cancelado: string.Equals(evento.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase),
            Privado: privado,
            EnlaceReunion: BuscarEnlaceReunion(evento.Description) ?? BuscarEnlaceReunion(evento.Location),
            Descripcion: descripcion);
    }

    private static DateTime SeguroUtc(CalDateTime fecha) =>
        fecha.IsFloating ? DateTime.SpecifyKind(fecha.Value, DateTimeKind.Utc) : fecha.AsUtc;

    private static string ClaveOcurrencia(string uid, DateTime inicioUtc) => $"{uid}|{inicioUtc:O}";

    private static DisponibilidadEvento LeerDisponibilidad(CalendarEvent evento)
    {
        var valor = evento.Properties.Get<string>("X-MICROSOFT-CDO-BUSYSTATUS")?.Trim().ToUpperInvariant();
        return valor switch
        {
            "TENTATIVE" => DisponibilidadEvento.Provisional,
            "FREE" => DisponibilidadEvento.Libre,
            "OOF" => DisponibilidadEvento.FueraDeOficina,
            "WORKINGELSEWHERE" => DisponibilidadEvento.TrabajandoEnOtroLugar,
            "BUSY" => DisponibilidadEvento.Ocupado,
            _ => string.Equals(evento.Transparency, "TRANSPARENT", StringComparison.OrdinalIgnoreCase) ? DisponibilidadEvento.Libre : DisponibilidadEvento.Ocupado
        };
    }

    private static string? NombreOrganizador(Organizer? organizador)
    {
        if (organizador is null) return null;
        if (!string.IsNullOrWhiteSpace(organizador.CommonName)) return organizador.CommonName.Trim();
        var correo = organizador.Value?.ToString();
        return string.IsNullOrWhiteSpace(correo) ? null : Regex.Replace(correo, "^mailto:", string.Empty, RegexOptions.IgnoreCase);
    }

    private static string? BuscarEnlaceReunion(string? texto)
    {
        if (string.IsNullOrWhiteSpace(texto)) return null;
        var coincidencia = PatronEnlaceTeams().Match(texto);
        return coincidencia.Success ? coincidencia.Value.TrimEnd('.', ',', ';', ')', ']') : null;
    }

    /// <summary>Quita el bloque estándar que Teams añade al final ("____ Reunión de Microsoft Teams …") y recorta el largo.</summary>
    private static string? LimpiarDescripcion(string? descripcion)
    {
        if (string.IsNullOrWhiteSpace(descripcion)) return null;
        var texto = descripcion.Replace("\r\n", "\n");
        var corte = PatronSeparadorTeams().Match(texto);
        if (corte.Success) texto = texto[..corte.Index];
        texto = texto.Trim();
        if (texto.Length == 0) return null;
        return texto.Length > MaximoLargoDescripcion ? texto[..MaximoLargoDescripcion].TrimEnd() + "…" : texto;
    }

    [GeneratedRegex(@"https://teams\.(microsoft|live)\.com/(l/meetup-join|meet)/[^\s<>""]+", RegexOptions.IgnoreCase)]
    private static partial Regex PatronEnlaceTeams();

    [GeneratedRegex(@"_{10,}")]
    private static partial Regex PatronSeparadorTeams();
}
