using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Tiempo;

// ---------- DTOs ----------

/// <param name="Clave">WEB-105 o TCK-1042; null en tiempo libre.</param>
/// <param name="Titulo">Título de la tarea o asunto del ticket; en tiempo libre, la descripción.</param>
/// <param name="Minutos">Duración; en curso, hasta ahora.</param>
public sealed record RegistroTiempoDto(
    Guid Id,
    Guid? TareaId,
    Guid? TicketId,
    string? Clave,
    string Titulo,
    string? Descripcion,
    DateTime FechaInicio,
    DateTime? FechaFin,
    int Minutos);

// ---------- Cronómetro ----------

public sealed record ObtenerCronometroActivoConsulta : IRequest<RegistroTiempoDto?>;

public sealed class ManejadorObtenerCronometroActivoConsulta : IRequestHandler<ObtenerCronometroActivoConsulta, RegistroTiempoDto?>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorObtenerCronometroActivoConsulta(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<RegistroTiempoDto?> Handle(ObtenerCronometroActivoConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var activo = await _contexto.RegistrosTiempo.AsNoTracking().FirstOrDefaultAsync(registro => registro.UsuarioId == usuarioId && registro.FechaFin == null, tokenCancelacion);
        return activo is null ? null : (await ProyeccionesTiempo.AListaAsync(_contexto, [activo], tokenCancelacion))[0];
    }
}

/// <summary>Arranca un cronómetro; si había otro en marcha, primero lo detiene.</summary>
public sealed record IniciarCronometroComando(Guid? TareaId, Guid? TicketId, string? Descripcion) : IRequest<RegistroTiempoDto>;

public sealed class ValidadorIniciarCronometroComando : AbstractValidator<IniciarCronometroComando>
{
    public ValidadorIniciarCronometroComando()
    {
        RuleFor(comando => comando).Must(comando => comando.TareaId is null || comando.TicketId is null).WithMessage("El tiempo se registra en una tarea o en un ticket, no en ambos.");
        RuleFor(comando => comando.Descripcion).NotEmpty().When(comando => comando.TareaId is null && comando.TicketId is null)
            .WithMessage("Describe en qué trabajas si no es una tarea ni un ticket.");
        RuleFor(comando => comando.Descripcion).MaximumLength(250);
    }
}

public sealed class ManejadorIniciarCronometroComando : IRequestHandler<IniciarCronometroComando, RegistroTiempoDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorIniciarCronometroComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<RegistroTiempoDto> Handle(IniciarCronometroComando comando, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        await ReglasTiempo.VerificarDestinoAsync(_contexto, comando.TareaId, comando.TicketId, tokenCancelacion);

        // Se guarda en dos pasos: el índice único impide dos cronómetros en marcha a la vez.
        if (await ReglasTiempo.DetenerActivoAsync(_contexto, usuarioId, tokenCancelacion) is not null)
            await _contexto.GuardarCambiosAsync(tokenCancelacion);

        var registro = new RegistroTiempo
        {
            UsuarioId = usuarioId,
            TareaId = comando.TareaId,
            TicketId = comando.TicketId,
            Descripcion = string.IsNullOrWhiteSpace(comando.Descripcion) ? null : comando.Descripcion.Trim(),
            FechaInicio = DateTime.UtcNow
        };
        _contexto.RegistrosTiempo.Add(registro);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return (await ProyeccionesTiempo.AListaAsync(_contexto, [registro], tokenCancelacion))[0];
    }
}

/// <summary>Detiene el cronómetro en marcha; si era de un ticket, suma el tramo a su tiempo dedicado. Null si no había ninguno.</summary>
public sealed record DetenerCronometroComando : IRequest<RegistroTiempoDto?>;

public sealed class ManejadorDetenerCronometroComando : IRequestHandler<DetenerCronometroComando, RegistroTiempoDto?>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorDetenerCronometroComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<RegistroTiempoDto?> Handle(DetenerCronometroComando comando, CancellationToken tokenCancelacion)
    {
        var detenido = await ReglasTiempo.DetenerActivoAsync(_contexto, _usuarioActual.ObtenerUsuarioIdRequerido(), tokenCancelacion);
        if (detenido is null)
            return null;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return (await ProyeccionesTiempo.AListaAsync(_contexto, [detenido], tokenCancelacion))[0];
    }
}

// ---------- Historial ----------

/// <summary>Registros cuyo inicio cae en [Desde, Hasta) (UTC), del más reciente al más antiguo.</summary>
public sealed record ListarRegistrosTiempoConsulta(DateTime Desde, DateTime Hasta) : IRequest<IReadOnlyList<RegistroTiempoDto>>;

public sealed class ValidadorListarRegistrosTiempoConsulta : AbstractValidator<ListarRegistrosTiempoConsulta>
{
    public ValidadorListarRegistrosTiempoConsulta()
    {
        RuleFor(consulta => consulta.Hasta).GreaterThan(consulta => consulta.Desde);
        RuleFor(consulta => consulta).Must(consulta => consulta.Hasta - consulta.Desde <= TimeSpan.FromDays(92)).WithMessage("El rango máximo es de 3 meses.");
    }
}

public sealed class ManejadorListarRegistrosTiempoConsulta : IRequestHandler<ListarRegistrosTiempoConsulta, IReadOnlyList<RegistroTiempoDto>>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorListarRegistrosTiempoConsulta(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<IReadOnlyList<RegistroTiempoDto>> Handle(ListarRegistrosTiempoConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var registros = await _contexto.RegistrosTiempo.AsNoTracking()
            .Where(registro => registro.UsuarioId == usuarioId && registro.FechaInicio >= consulta.Desde && registro.FechaInicio < consulta.Hasta)
            .OrderByDescending(registro => registro.FechaInicio)
            .Take(1000)
            .ToListAsync(tokenCancelacion);
        return await ProyeccionesTiempo.AListaAsync(_contexto, registros, tokenCancelacion);
    }
}

// ---------- Registro manual, edición y borrado ----------

/// <param name="Id">null para crear un tramo a mano.</param>
public sealed record GuardarRegistroTiempoComando(Guid? Id, Guid? TareaId, Guid? TicketId, string? Descripcion, DateTime FechaInicio, DateTime FechaFin) : IRequest<Guid>;

public sealed class ValidadorGuardarRegistroTiempoComando : AbstractValidator<GuardarRegistroTiempoComando>
{
    public ValidadorGuardarRegistroTiempoComando()
    {
        RuleFor(comando => comando).Must(comando => comando.TareaId is null || comando.TicketId is null).WithMessage("El tiempo se registra en una tarea o en un ticket, no en ambos.");
        RuleFor(comando => comando.Descripcion).NotEmpty().When(comando => comando.TareaId is null && comando.TicketId is null)
            .WithMessage("Describe en qué trabajaste si no es una tarea ni un ticket.");
        RuleFor(comando => comando.Descripcion).MaximumLength(250);
        RuleFor(comando => comando.FechaFin).GreaterThan(comando => comando.FechaInicio).WithMessage("La hora de fin debe ser posterior a la de inicio.");
        RuleFor(comando => comando).Must(comando => comando.FechaFin - comando.FechaInicio <= TimeSpan.FromHours(24)).WithMessage("Un tramo no puede superar 24 horas.");
        RuleFor(comando => comando.FechaFin).LessThanOrEqualTo(_ => DateTime.UtcNow.AddMinutes(5)).WithMessage("No se puede registrar tiempo en el futuro.");
    }
}

public sealed class ManejadorGuardarRegistroTiempoComando : IRequestHandler<GuardarRegistroTiempoComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorGuardarRegistroTiempoComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<Guid> Handle(GuardarRegistroTiempoComando comando, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        await ReglasTiempo.VerificarDestinoAsync(_contexto, comando.TareaId, comando.TicketId, tokenCancelacion);

        RegistroTiempo registro;
        if (comando.Id is { } id)
        {
            registro = await _contexto.RegistrosTiempo.FirstOrDefaultAsync(existente => existente.Id == id && existente.UsuarioId == usuarioId, tokenCancelacion)
                ?? throw new ExcepcionEntidadNoEncontrada("el registro de tiempo", id);
            // Lo que el tramo anterior sumó al ticket se descuenta antes de aplicar el nuevo.
            if (registro is { TicketId: { } ticketAnterior, FechaFin: not null })
                await ReglasTiempo.AjustarHorasTicketAsync(_contexto, ticketAnterior, -registro.Horas(DateTime.UtcNow), usuarioId, "corrección de un registro de tiempo", tokenCancelacion);
        }
        else
        {
            registro = new RegistroTiempo { UsuarioId = usuarioId };
            _contexto.RegistrosTiempo.Add(registro);
        }

        registro.TareaId = comando.TareaId;
        registro.TicketId = comando.TicketId;
        registro.Descripcion = string.IsNullOrWhiteSpace(comando.Descripcion) ? null : comando.Descripcion.Trim();
        registro.FechaInicio = comando.FechaInicio;
        registro.FechaFin = comando.FechaFin;

        if (registro.TicketId is { } ticketId)
            await ReglasTiempo.AjustarHorasTicketAsync(_contexto, ticketId, registro.Horas(DateTime.UtcNow), usuarioId, "registro manual", tokenCancelacion);

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return registro.Id;
    }
}

public sealed record EliminarRegistroTiempoComando(Guid Id) : IRequest;

public sealed class ManejadorEliminarRegistroTiempoComando : IRequestHandler<EliminarRegistroTiempoComando>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorEliminarRegistroTiempoComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task Handle(EliminarRegistroTiempoComando comando, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var registro = await _contexto.RegistrosTiempo.FirstOrDefaultAsync(existente => existente.Id == comando.Id && existente.UsuarioId == usuarioId, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el registro de tiempo", comando.Id);
        if (registro is { TicketId: { } ticketId, FechaFin: not null })
            await ReglasTiempo.AjustarHorasTicketAsync(_contexto, ticketId, -registro.Horas(DateTime.UtcNow), usuarioId, "registro de tiempo eliminado", tokenCancelacion);
        _contexto.RegistrosTiempo.Remove(registro);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Utilidades ----------

internal static class ReglasTiempo
{
    /// <summary>La tarea o el ticket deben existir y ser visibles para el usuario (filtros globales).</summary>
    public static async Task VerificarDestinoAsync(IContextoAplicacion contexto, Guid? tareaId, Guid? ticketId, CancellationToken tokenCancelacion)
    {
        if (tareaId is { } idTarea && !await contexto.Tareas.AnyAsync(tarea => tarea.Id == idTarea, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("la tarea", idTarea);
        if (ticketId is { } idTicket && !await contexto.Tickets.AnyAsync(ticket => ticket.Id == idTicket, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("el ticket", idTicket);
    }

    /// <summary>Cierra el cronómetro en marcha (sin guardar) y devuelve el registro, o null si no había.</summary>
    public static async Task<RegistroTiempo?> DetenerActivoAsync(IContextoAplicacion contexto, Guid usuarioId, CancellationToken tokenCancelacion)
    {
        var activo = await contexto.RegistrosTiempo.FirstOrDefaultAsync(registro => registro.UsuarioId == usuarioId && registro.FechaFin == null, tokenCancelacion);
        if (activo is null)
            return null;
        activo.FechaFin = DateTime.UtcNow;
        if (activo.TicketId is { } ticketId)
            await AjustarHorasTicketAsync(contexto, ticketId, activo.Horas(activo.FechaFin.Value), usuarioId, "cronómetro", tokenCancelacion);
        return activo;
    }

    /// <summary>Suma (o resta) horas al tiempo dedicado del ticket y lo anota en su historial.</summary>
    public static async Task AjustarHorasTicketAsync(IContextoAplicacion contexto, Guid ticketId, decimal horas, Guid usuarioId, string origen, CancellationToken tokenCancelacion)
    {
        if (horas == 0)
            return;
        var ticket = await contexto.Tickets.FirstOrDefaultAsync(existente => existente.Id == ticketId, tokenCancelacion);
        if (ticket is null)
            return;
        ticket.HorasDedicadas = Math.Clamp((ticket.HorasDedicadas ?? 0) + horas, 0, 9999.99m);
        var signo = horas > 0 ? "+" : "−";
        FlujoTickets.RegistrarEvento(contexto, ticket, TipoEventoTicket.TiempoRegistrado,
            $"Tiempo dedicado {signo}{Math.Abs(horas):0.##} h ({origen}) → {ticket.HorasDedicadas:0.##} h", usuarioId);
    }
}

internal static class ProyeccionesTiempo
{
    /// <summary>Completa clave y título de las tareas y tickets de los registros (dos consultas en lote).</summary>
    public static async Task<IReadOnlyList<RegistroTiempoDto>> AListaAsync(IContextoAplicacion contexto, IReadOnlyList<RegistroTiempo> registros, CancellationToken tokenCancelacion)
    {
        var idsTareas = registros.Where(registro => registro.TareaId != null).Select(registro => registro.TareaId!.Value).Distinct().ToList();
        var idsTickets = registros.Where(registro => registro.TicketId != null).Select(registro => registro.TicketId!.Value).Distinct().ToList();

        var tareas = idsTareas.Count == 0
            ? new Dictionary<Guid, (string Clave, string Titulo)>()
            : (await contexto.Tareas.AsNoTracking()
                .Where(tarea => idsTareas.Contains(tarea.Id))
                .Select(tarea => new { tarea.Id, Prefijo = tarea.ListaTareas!.Proyecto!.ClavePrefijo, tarea.NumeroTarea, tarea.Titulo })
                .ToListAsync(tokenCancelacion))
                .ToDictionary(tarea => tarea.Id, tarea => ($"{tarea.Prefijo}-{tarea.NumeroTarea}", tarea.Titulo));
        var tickets = idsTickets.Count == 0
            ? new Dictionary<Guid, (string Clave, string Titulo)>()
            : (await contexto.Tickets.AsNoTracking()
                .Where(ticket => idsTickets.Contains(ticket.Id))
                .Select(ticket => new { ticket.Id, ticket.NumeroTicket, ticket.Asunto })
                .ToListAsync(tokenCancelacion))
                .ToDictionary(ticket => ticket.Id, ticket => ($"TCK-{ticket.NumeroTicket}", ticket.Asunto));

        var ahora = DateTime.UtcNow;
        return registros.Select(registro =>
        {
            (string Clave, string Titulo)? destino = registro.TareaId is { } tareaId && tareas.TryGetValue(tareaId, out var tarea) ? tarea
                : registro.TicketId is { } ticketId && tickets.TryGetValue(ticketId, out var ticket) ? ticket
                : null;
            var minutos = (int)Math.Floor(((registro.FechaFin ?? ahora) - registro.FechaInicio).TotalMinutes);
            return new RegistroTiempoDto(registro.Id, registro.TareaId, registro.TicketId, destino?.Clave, destino?.Titulo ?? registro.Descripcion ?? "Sin descripción",
                registro.Descripcion, registro.FechaInicio, registro.FechaFin, Math.Max(0, minutos));
        }).ToList();
    }
}
