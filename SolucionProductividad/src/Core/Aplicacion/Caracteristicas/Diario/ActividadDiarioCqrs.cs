using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Tiempo;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Diario;

// ---------- DTOs ----------

public sealed record TareaActividadDto(Guid Id, string Clave, string Titulo, DateTime Hora);

public sealed record EventoActividadDto(DateTime Hora, TipoEventoTicket Tipo, string Descripcion);

public sealed record TicketActividadDto(Guid Id, string Clave, string? NumeroExterno, string Asunto, EstadoTicket Estado, IReadOnlyList<EventoActividadDto> Eventos);

public sealed record DocumentoActividadDto(Guid Id, string Titulo, string? Icono, bool Creado, DateTime Hora);

public sealed record TiempoActividadDto(Guid? TareaId, Guid? TicketId, string? Clave, string Titulo, int Minutos);

/// <summary>Lo que el usuario hizo en la app durante un día local; se calcula, no se guarda.</summary>
public sealed record ActividadDiaDto(
    DateOnly Fecha,
    IReadOnlyList<TareaActividadDto> TareasCompletadas,
    IReadOnlyList<TareaActividadDto> TareasCreadas,
    IReadOnlyList<TicketActividadDto> Tickets,
    IReadOnlyList<DocumentoActividadDto> Documentos,
    int MinutosRegistrados,
    IReadOnlyList<TiempoActividadDto> Tiempo);

public sealed record DiaRevisionDto(DateOnly Fecha, byte? Animo, byte? Energia, int Minutos, int Entradas);

public sealed record RevisionDiarioDto(
    DateOnly Desde,
    DateOnly Hasta,
    int DiasConRegistro,
    decimal? AnimoPromedio,
    decimal? EnergiaPromedio,
    IReadOnlyList<DiaRevisionDto> Dias,
    IReadOnlyList<EntradaExploradaDto> Decisiones,
    IReadOnlyList<EntradaExploradaDto> Aprendizajes,
    IReadOnlyList<EntradaExploradaDto> Bloqueos,
    int TareasDiarioCompletadas,
    int TareasDiarioPendientes,
    int MinutosRegistrados,
    IReadOnlyList<TiempoActividadDto> TopTiempo,
    int TareasCompletadas,
    int TareasCreadas,
    int TicketsTrabajados,
    int TicketsCerrados);

// ---------- Actividad del día ----------

/// <param name="DesplazamientoMinutos">Minutos que la hora local está por delante de UTC (Colombia: -300). Define dónde empieza y acaba el día.</param>
public sealed record ObtenerActividadDiaConsulta(DateOnly Fecha, int DesplazamientoMinutos) : IRequest<ActividadDiaDto>;

public sealed class ValidadorObtenerActividadDiaConsulta : AbstractValidator<ObtenerActividadDiaConsulta>
{
    public ValidadorObtenerActividadDiaConsulta() => RuleFor(consulta => consulta.DesplazamientoMinutos).InclusiveBetween(-840, 840);
}

public sealed class ManejadorObtenerActividadDiaConsulta : IRequestHandler<ObtenerActividadDiaConsulta, ActividadDiaDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorObtenerActividadDiaConsulta(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<ActividadDiaDto> Handle(ObtenerActividadDiaConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var (inicio, fin) = RangoLocal.EnUtc(consulta.Fecha, consulta.Fecha, consulta.DesplazamientoMinutos);

        // Tareas, tickets y documentos pasan por los filtros globales: solo lo que el usuario ve.
        var tareas = _contexto.Tareas.AsNoTracking();
        var completadas = await tareas
            .Where(tarea => tarea.Estado == EstadoTarea.Completada && tarea.FechaActualizacion >= inicio && tarea.FechaActualizacion < fin)
            .OrderBy(tarea => tarea.FechaActualizacion)
            .Select(tarea => new TareaActividadDto(tarea.Id, tarea.ListaTareas!.Proyecto!.ClavePrefijo + "-" + tarea.NumeroTarea, tarea.Titulo, tarea.FechaActualizacion))
            .ToListAsync(tokenCancelacion);
        var creadas = await tareas
            .Where(tarea => tarea.CreadoPor == usuarioId && tarea.FechaCreacion >= inicio && tarea.FechaCreacion < fin)
            .OrderBy(tarea => tarea.FechaCreacion)
            .Select(tarea => new TareaActividadDto(tarea.Id, tarea.ListaTareas!.Proyecto!.ClavePrefijo + "-" + tarea.NumeroTarea, tarea.Titulo, tarea.FechaCreacion))
            .ToListAsync(tokenCancelacion);

        var eventos = await (
                from evento in _contexto.EventosTicket.AsNoTracking()
                join ticket in _contexto.Tickets on evento.TicketId equals ticket.Id
                where evento.UsuarioId == usuarioId && evento.FechaEvento >= inicio && evento.FechaEvento < fin
                orderby evento.FechaEvento
                select new { ticket.Id, ticket.NumeroTicket, ticket.NumeroExterno, ticket.Asunto, ticket.Estado, evento.FechaEvento, evento.TipoEvento, evento.Descripcion })
            .ToListAsync(tokenCancelacion);
        var tickets = eventos
            .GroupBy(evento => evento.Id)
            .Select(grupo =>
            {
                var primero = grupo.First();
                return new TicketActividadDto(primero.Id, $"TCK-{primero.NumeroTicket}", primero.NumeroExterno, primero.Asunto, primero.Estado,
                    grupo.Select(evento => new EventoActividadDto(evento.FechaEvento, evento.TipoEvento, evento.Descripcion)).ToList());
            })
            .ToList();

        var documentos = await _contexto.DocumentosMarkdown.AsNoTracking()
            .Where(documento => documento.CreadoPor == usuarioId && !documento.EstaArchivado && documento.FechaActualizacion >= inicio && documento.FechaActualizacion < fin)
            .OrderBy(documento => documento.FechaActualizacion)
            .Select(documento => new DocumentoActividadDto(documento.Id, documento.Titulo, documento.Icono, documento.FechaCreacion >= inicio, documento.FechaActualizacion))
            .ToListAsync(tokenCancelacion);

        var tiempo = await TiempoDelRango.CargarAsync(_contexto, usuarioId, inicio, fin, tokenCancelacion);
        return new ActividadDiaDto(consulta.Fecha, completadas, creadas, tickets, documentos, tiempo.Sum(registro => registro.Minutos), TiempoDelRango.Agrupar(tiempo));
    }
}

// ---------- Revisión semanal / mensual ----------

/// <param name="Hasta">Incluido. Rango máximo: 62 días.</param>
public sealed record ObtenerRevisionDiarioConsulta(DateOnly Desde, DateOnly Hasta, int DesplazamientoMinutos) : IRequest<RevisionDiarioDto>;

public sealed class ValidadorObtenerRevisionDiarioConsulta : AbstractValidator<ObtenerRevisionDiarioConsulta>
{
    public ValidadorObtenerRevisionDiarioConsulta()
    {
        RuleFor(consulta => consulta.DesplazamientoMinutos).InclusiveBetween(-840, 840);
        RuleFor(consulta => consulta.Hasta).GreaterThanOrEqualTo(consulta => consulta.Desde);
        RuleFor(consulta => consulta).Must(consulta => consulta.Hasta.DayNumber - consulta.Desde.DayNumber <= 62).WithMessage("El rango máximo es de 62 días.");
    }
}

public sealed class ManejadorObtenerRevisionDiarioConsulta : IRequestHandler<ObtenerRevisionDiarioConsulta, RevisionDiarioDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorObtenerRevisionDiarioConsulta(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<RevisionDiarioDto> Handle(ObtenerRevisionDiarioConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var (inicio, fin) = RangoLocal.EnUtc(consulta.Desde, consulta.Hasta, consulta.DesplazamientoMinutos);

        var registros = await _contexto.RegistrosDiarios.AsNoTracking()
            .Where(registro => registro.UsuarioId == usuarioId && registro.FechaLog >= consulta.Desde && registro.FechaLog <= consulta.Hasta)
            .Select(registro => new { registro.FechaLog, registro.Animo, registro.Energia, Entradas = registro.Entradas.Count })
            .ToListAsync(tokenCancelacion);

        var entradas = await _contexto.EntradasDiario.AsNoTracking()
            .Where(entrada => entrada.RegistroDiario!.UsuarioId == usuarioId && entrada.RegistroDiario.FechaLog >= consulta.Desde && entrada.RegistroDiario.FechaLog <= consulta.Hasta)
            .OrderBy(entrada => entrada.RegistroDiario!.FechaLog)
            .ThenBy(entrada => entrada.HoraInicio == null)
            .ThenBy(entrada => entrada.HoraInicio)
            .ThenBy(entrada => entrada.FechaCreacion)
            .Select(entrada => new EntradaExploradaDto(
                entrada.RegistroDiario!.FechaLog,
                new EntradaDiarioDto(entrada.Id, entrada.Tipo, entrada.Titulo, entrada.DetalleMarkdown, entrada.HoraInicio, entrada.HoraFin, entrada.Completada, entrada.FechaCreacion,
                    entrada.TareaId, entrada.Tarea == null ? null : entrada.Tarea.ListaTareas!.Proyecto!.ClavePrefijo + "-" + entrada.Tarea.NumeroTarea, entrada.TableroReporteId)))
            .ToListAsync(tokenCancelacion);
        List<EntradaExploradaDto> DeTipo(TipoEntradaDiario tipo) => entradas.Where(explorada => explorada.Entrada.Tipo == tipo).ToList();

        var tiempo = await TiempoDelRango.CargarAsync(_contexto, usuarioId, inicio, fin, tokenCancelacion);
        var minutosPorDia = tiempo
            .GroupBy(registro => DateOnly.FromDateTime(registro.FechaInicio.AddMinutes(consulta.DesplazamientoMinutos)))
            .ToDictionary(grupo => grupo.Key, grupo => grupo.Sum(registro => registro.Minutos));

        var porFecha = registros.ToDictionary(registro => registro.FechaLog);
        var dias = Enumerable.Range(0, consulta.Hasta.DayNumber - consulta.Desde.DayNumber + 1)
            .Select(desplazamiento => consulta.Desde.AddDays(desplazamiento))
            .Select(fecha => porFecha.TryGetValue(fecha, out var registro)
                ? new DiaRevisionDto(fecha, registro.Animo, registro.Energia, minutosPorDia.GetValueOrDefault(fecha), registro.Entradas)
                : new DiaRevisionDto(fecha, null, null, minutosPorDia.GetValueOrDefault(fecha), 0))
            .ToList();

        static decimal? Promedio(IEnumerable<byte?> valores)
        {
            var conValor = valores.Where(valor => valor is not null).Select(valor => (decimal)valor!.Value).ToList();
            return conValor.Count == 0 ? null : Math.Round(conValor.Average(), 1);
        }

        var tareasCompletadas = await _contexto.Tareas.CountAsync(tarea => tarea.Estado == EstadoTarea.Completada && tarea.FechaActualizacion >= inicio && tarea.FechaActualizacion < fin, tokenCancelacion);
        var tareasCreadas = await _contexto.Tareas.CountAsync(tarea => tarea.CreadoPor == usuarioId && tarea.FechaCreacion >= inicio && tarea.FechaCreacion < fin, tokenCancelacion);
        var eventosTickets = from evento in _contexto.EventosTicket.AsNoTracking()
                             join ticket in _contexto.Tickets on evento.TicketId equals ticket.Id
                             where evento.UsuarioId == usuarioId && evento.FechaEvento >= inicio && evento.FechaEvento < fin
                             select evento;
        var ticketsTrabajados = await eventosTickets.Select(evento => evento.TicketId).Distinct().CountAsync(tokenCancelacion);
        var ticketsCerrados = await eventosTickets.Where(evento => evento.EstadoNuevo == EstadoTicket.Cerrado).Select(evento => evento.TicketId).Distinct().CountAsync(tokenCancelacion);

        var tareasDiario = entradas.Where(explorada => explorada.Entrada.Tipo == TipoEntradaDiario.Tarea).ToList();
        return new RevisionDiarioDto(
            consulta.Desde,
            consulta.Hasta,
            registros.Count(registro => registro.Entradas > 0 || registro.Animo is not null),
            Promedio(registros.Select(registro => registro.Animo)),
            Promedio(registros.Select(registro => registro.Energia)),
            dias,
            DeTipo(TipoEntradaDiario.Decision),
            DeTipo(TipoEntradaDiario.Aprendizaje),
            DeTipo(TipoEntradaDiario.Bloqueo),
            tareasDiario.Count(explorada => explorada.Entrada.Completada),
            tareasDiario.Count(explorada => !explorada.Entrada.Completada),
            tiempo.Sum(registro => registro.Minutos),
            TiempoDelRango.Agrupar(tiempo).Take(8).ToList(),
            tareasCompletadas,
            tareasCreadas,
            ticketsTrabajados,
            ticketsCerrados);
    }
}

// ---------- Utilidades ----------

internal static class RangoLocal
{
    /// <summary>[inicio del día <paramref name="desde"/>, fin del día <paramref name="hasta"/>) en UTC, para una zona con ese desplazamiento.</summary>
    public static (DateTime Inicio, DateTime Fin) EnUtc(DateOnly desde, DateOnly hasta, int desplazamientoMinutos) =>
        (desde.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).AddMinutes(-desplazamientoMinutos),
         hasta.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).AddMinutes(-desplazamientoMinutos));
}

internal static class TiempoDelRango
{
    public static async Task<IReadOnlyList<RegistroTiempoDto>> CargarAsync(IContextoAplicacion contexto, Guid usuarioId, DateTime inicio, DateTime fin, CancellationToken tokenCancelacion)
    {
        var registros = await contexto.RegistrosTiempo.AsNoTracking()
            .Where(registro => registro.UsuarioId == usuarioId && registro.FechaInicio >= inicio && registro.FechaInicio < fin)
            .ToListAsync(tokenCancelacion);
        return await ProyeccionesTiempo.AListaAsync(contexto, registros, tokenCancelacion);
    }

    /// <summary>Minutos por tarea, ticket o tiempo libre (por descripción), de mayor a menor.</summary>
    public static IReadOnlyList<TiempoActividadDto> Agrupar(IReadOnlyList<RegistroTiempoDto> registros) =>
        registros
            .GroupBy(registro => (registro.TareaId, registro.TicketId, Libre: registro.TareaId is null && registro.TicketId is null ? registro.Titulo : null))
            .Select(grupo => new TiempoActividadDto(grupo.Key.TareaId, grupo.Key.TicketId, grupo.First().Clave, grupo.First().Titulo, grupo.Sum(registro => registro.Minutos)))
            .OrderByDescending(total => total.Minutos)
            .ToList();
}
