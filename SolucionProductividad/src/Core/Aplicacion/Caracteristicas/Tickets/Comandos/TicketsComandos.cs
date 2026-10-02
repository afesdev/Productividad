using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Comandos;

// ---------- Crear ----------

public sealed record CrearTicketComando(
    string Asunto,
    TipoTicket Tipo,
    Prioridad Prioridad,
    string NombreSolicitante,
    string CorreoSolicitante,
    string? DescripcionMarkdown,
    Guid? AgenteAsignadoId,
    Guid? ColaSoporteId = null,
    string? NumeroExterno = null,
    string? IdSeguimiento = null,
    decimal? HorasDedicadas = null,
    DateTime? FechaVencimiento = null,
    IReadOnlyList<Guid>? ProyectoIds = null) : IRequest<Guid>;

public sealed class ValidadorCrearTicketComando : AbstractValidator<CrearTicketComando>
{
    public ValidadorCrearTicketComando()
    {
        RuleFor(comando => comando.Asunto).NotEmpty().MaximumLength(250);
        RuleFor(comando => comando.Tipo).IsInEnum();
        RuleFor(comando => comando.Prioridad).IsInEnum();
        RuleFor(comando => comando.NombreSolicitante).NotEmpty().MaximumLength(150);
        RuleFor(comando => comando.CorreoSolicitante).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(comando => comando.NumeroExterno).MaximumLength(50).WithName("Número de ticket");
        RuleFor(comando => comando.IdSeguimiento).MaximumLength(100).WithName("ID de seguimiento");
        RuleFor(comando => comando.HorasDedicadas).InclusiveBetween(0, 9999.99m).When(comando => comando.HorasDedicadas is not null).WithName("Tiempo dedicado");
    }
}

public sealed class ManejadorCrearTicketComando : IRequestHandler<CrearTicketComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;
    private readonly IServicioProcesadorBacklinks _procesadorBacklinks;

    public ManejadorCrearTicketComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual, IServicioProcesadorBacklinks procesadorBacklinks)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
        _procesadorBacklinks = procesadorBacklinks;
    }

    public async Task<Guid> Handle(CrearTicketComando comando, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var colaId = comando.ColaSoporteId ?? ValoresSemillaSoporte.IdColaGeneral;
        if (!await _contexto.ColasSoporte.AnyAsync(cola => cola.Id == colaId && cola.EstaActiva, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("la cola de soporte", colaId);

        if (comando.AgenteAsignadoId is { } agenteId && !await _contexto.Usuarios.AnyAsync(usuario => usuario.Id == agenteId && usuario.EstaActivo, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("el usuario asignado", agenteId);

        var ticket = new Ticket
        {
            Asunto = comando.Asunto.Trim(),
            Tipo = comando.Tipo,
            Prioridad = comando.Prioridad,
            NombreSolicitante = comando.NombreSolicitante.Trim(),
            CorreoSolicitante = comando.CorreoSolicitante.Trim().ToLowerInvariant(),
            DescripcionMarkdown = comando.DescripcionMarkdown,
            NumeroExterno = Limpiar(comando.NumeroExterno),
            IdSeguimiento = Limpiar(comando.IdSeguimiento),
            HorasDedicadas = comando.HorasDedicadas,
            // Antes de aplicar el SLA: si hay vencimiento, es el límite de resolución.
            FechaVencimiento = comando.FechaVencimiento,
            ColaSoporteId = colaId,
            CreadoPor = usuarioId
        };

        var politica = await _contexto.PoliticasSla.FirstOrDefaultAsync(
            politica => politica.Id == ValoresSemillaSoporte.PoliticasPorPrioridad[comando.Prioridad].Id && politica.EstaActiva, tokenCancelacion);
        if (politica is not null)
            ticket.AplicarPoliticaSla(politica);
        else
            ticket.EstablecerFechaVencimiento(comando.FechaVencimiento);

        _contexto.Tickets.Add(ticket);
        FlujoTickets.RegistrarEvento(_contexto, ticket, TipoEventoTicket.Creado, "Ticket creado", usuarioId, estadoNuevo: EstadoTicket.Nuevo);

        if (comando.AgenteAsignadoId is { } agenteAsignado)
        {
            ticket.AgenteAsignadoId = agenteAsignado;
            FlujoTickets.Transicionar(_contexto, ticket, EstadoTicket.Asignado, usuarioId, null, "asignado al crear");
        }

        await ProyectosTicket.SincronizarAsync(_contexto, ticket.Id, comando.ProyectoIds, usuarioId, tokenCancelacion);

        if (!string.IsNullOrWhiteSpace(ticket.DescripcionMarkdown))
            await _procesadorBacklinks.ProcesarWikiLinksAsync(ticket.DescripcionMarkdown, ticket.Id, nameof(TipoEntidad.Ticket), tokenCancelacion);

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return ticket.Id;
    }

    internal static string? Limpiar(string? valor) => string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();
}

// ---------- Editar datos generales ----------

public sealed record ActualizarTicketComando(
    Guid Id,
    string Asunto,
    TipoTicket Tipo,
    Prioridad Prioridad,
    string NombreSolicitante,
    string CorreoSolicitante,
    string? DescripcionMarkdown,
    string? NumeroExterno = null,
    string? IdSeguimiento = null,
    decimal? HorasDedicadas = null,
    DateTime? FechaVencimiento = null,
    IReadOnlyList<Guid>? ProyectoIds = null) : IRequest;

public sealed class ValidadorActualizarTicketComando : AbstractValidator<ActualizarTicketComando>
{
    public ValidadorActualizarTicketComando()
    {
        RuleFor(comando => comando.Asunto).NotEmpty().MaximumLength(250);
        RuleFor(comando => comando.Tipo).IsInEnum();
        RuleFor(comando => comando.Prioridad).IsInEnum();
        RuleFor(comando => comando.NombreSolicitante).NotEmpty().MaximumLength(150);
        RuleFor(comando => comando.CorreoSolicitante).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(comando => comando.NumeroExterno).MaximumLength(50).WithName("Número de ticket");
        RuleFor(comando => comando.IdSeguimiento).MaximumLength(100).WithName("ID de seguimiento");
        RuleFor(comando => comando.HorasDedicadas).InclusiveBetween(0, 9999.99m).When(comando => comando.HorasDedicadas is not null).WithName("Tiempo dedicado");
    }
}

public sealed class ManejadorActualizarTicketComando : IRequestHandler<ActualizarTicketComando>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;
    private readonly IServicioProcesadorBacklinks _procesadorBacklinks;

    public ManejadorActualizarTicketComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual, IServicioProcesadorBacklinks procesadorBacklinks)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
        _procesadorBacklinks = procesadorBacklinks;
    }

    public async Task Handle(ActualizarTicketComando comando, CancellationToken tokenCancelacion)
    {
        var ticket = await FlujoTickets.ObtenerRastreadoAsync(_contexto, comando.Id, tokenCancelacion);
        var cambios = new List<string>();

        if (ticket.Prioridad != comando.Prioridad)
        {
            cambios.Add($"prioridad {ticket.Prioridad} → {comando.Prioridad}");
            ticket.Prioridad = comando.Prioridad;
            // La primera respuesta se recalcula desde la creación con la política de la nueva prioridad.
            var politica = await _contexto.PoliticasSla.FirstOrDefaultAsync(politica => politica.Id == ValoresSemillaSoporte.PoliticasPorPrioridad[comando.Prioridad].Id, tokenCancelacion);
            if (politica is not null)
                ticket.AplicarPoliticaSla(politica);
        }
        if (ticket.Tipo != comando.Tipo)
        {
            cambios.Add($"tipo {ticket.Tipo} → {comando.Tipo}");
            ticket.Tipo = comando.Tipo;
        }
        if (ticket.Asunto != comando.Asunto.Trim())
            cambios.Add("asunto");
        if (ticket.DescripcionMarkdown != comando.DescripcionMarkdown)
            cambios.Add("descripción");

        var numeroExterno = ManejadorCrearTicketComando.Limpiar(comando.NumeroExterno);
        var idSeguimiento = ManejadorCrearTicketComando.Limpiar(comando.IdSeguimiento);
        if (ticket.NumeroExterno != numeroExterno)
            cambios.Add(numeroExterno is null ? "número externo quitado" : $"número externo {numeroExterno}");
        if (ticket.IdSeguimiento != idSeguimiento)
            cambios.Add(idSeguimiento is null ? "ID de seguimiento quitado" : $"ID de seguimiento {idSeguimiento}");
        if (ticket.HorasDedicadas != comando.HorasDedicadas)
            cambios.Add($"tiempo dedicado {FormatearHoras(ticket.HorasDedicadas)} → {FormatearHoras(comando.HorasDedicadas)}");
        ticket.NumeroExterno = numeroExterno;
        ticket.IdSeguimiento = idSeguimiento;
        ticket.HorasDedicadas = comando.HorasDedicadas;

        if (ticket.FechaVencimiento != comando.FechaVencimiento)
        {
            cambios.Add(comando.FechaVencimiento is { } vence ? $"vencimiento {vence:yyyy-MM-dd}" : "vencimiento quitado");
            ticket.EstablecerFechaVencimiento(comando.FechaVencimiento);
        }

        if (await ProyectosTicket.SincronizarAsync(_contexto, ticket.Id, comando.ProyectoIds, _usuarioActual.ObtenerUsuarioIdRequerido(), tokenCancelacion) is { } cambioProyectos)
            cambios.Add(cambioProyectos);

        ticket.Asunto = comando.Asunto.Trim();
        ticket.NombreSolicitante = comando.NombreSolicitante.Trim();
        ticket.CorreoSolicitante = comando.CorreoSolicitante.Trim().ToLowerInvariant();
        ticket.DescripcionMarkdown = comando.DescripcionMarkdown;

        if (cambios.Count > 0)
            FlujoTickets.RegistrarEvento(_contexto, ticket, TipoEventoTicket.Editado, $"Editado: {string.Join(", ", cambios)}", _usuarioActual.ObtenerUsuarioIdRequerido());

        await ProcesarEnlacesAsync(_procesadorBacklinks, ticket, tokenCancelacion);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }

    private static string FormatearHoras(decimal? horas) => horas is { } valor ? $"{valor:0.##} h" : "sin registrar";

    /// <summary>Descripción y documentación comparten origen: se procesan juntas.</summary>
    internal static Task ProcesarEnlacesAsync(IServicioProcesadorBacklinks procesador, Ticket ticket, CancellationToken tokenCancelacion) =>
        procesador.ProcesarWikiLinksAsync($"{ticket.DescripcionMarkdown}\n{ticket.DocumentacionMarkdown}", ticket.Id, nameof(TipoEntidad.Ticket), tokenCancelacion);
}

// ---------- Documentación técnica (análisis y solución) ----------

public sealed record ActualizarDocumentacionTicketComando(Guid Id, string? DocumentacionMarkdown) : IRequest;

public sealed class ManejadorActualizarDocumentacionTicketComando : IRequestHandler<ActualizarDocumentacionTicketComando>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;
    private readonly IServicioProcesadorBacklinks _procesadorBacklinks;

    public ManejadorActualizarDocumentacionTicketComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual, IServicioProcesadorBacklinks procesadorBacklinks)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
        _procesadorBacklinks = procesadorBacklinks;
    }

    public async Task Handle(ActualizarDocumentacionTicketComando comando, CancellationToken tokenCancelacion)
    {
        var ticket = await FlujoTickets.ObtenerRastreadoAsync(_contexto, comando.Id, tokenCancelacion);
        ticket.DocumentacionMarkdown = string.IsNullOrWhiteSpace(comando.DocumentacionMarkdown) ? null : comando.DocumentacionMarkdown;
        FlujoTickets.RegistrarEvento(_contexto, ticket, TipoEventoTicket.DocumentacionActualizada, "Documentación actualizada", _usuarioActual.ObtenerUsuarioIdRequerido());
        await ManejadorActualizarTicketComando.ProcesarEnlacesAsync(_procesadorBacklinks, ticket, tokenCancelacion);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Asignar ----------

public sealed record AsignarTicketComando(Guid Id, Guid? AgenteId) : IRequest;

public sealed class ManejadorAsignarTicketComando : IRequestHandler<AsignarTicketComando>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorAsignarTicketComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task Handle(AsignarTicketComando comando, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var ticket = await FlujoTickets.ObtenerRastreadoAsync(_contexto, comando.Id, tokenCancelacion);

        string nombreAgente = "nadie";
        if (comando.AgenteId is { } agenteId)
        {
            nombreAgente = await _contexto.Usuarios
                .Where(usuario => usuario.Id == agenteId && usuario.EstaActivo)
                .Select(usuario => usuario.NombreCompleto)
                .FirstOrDefaultAsync(tokenCancelacion)
                ?? throw new ExcepcionEntidadNoEncontrada("el usuario", agenteId);
        }
        else if (ticket.Estado != EstadoTicket.Nuevo)
        {
            throw new ExcepcionDominio("Un ticket en curso debe tener a alguien asignado.");
        }

        ticket.AgenteAsignadoId = comando.AgenteId;
        FlujoTickets.RegistrarEvento(_contexto, ticket, TipoEventoTicket.Asignado, $"Asignado a {nombreAgente}", usuarioId);
        if (comando.AgenteId is not null)
            FlujoTickets.IntentarTransicionar(_contexto, ticket, EstadoTicket.Asignado, usuarioId, "asignación");

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Cambiar estado (acciones manuales del flujo) ----------

public sealed record CambiarEstadoTicketComando(Guid Id, EstadoTicket NuevoEstado, string? Comentario) : IRequest;

public sealed class ValidadorCambiarEstadoTicketComando : AbstractValidator<CambiarEstadoTicketComando>
{
    public ValidadorCambiarEstadoTicketComando()
    {
        RuleFor(comando => comando.NuevoEstado).IsInEnum();
        RuleFor(comando => comando.Comentario).MaximumLength(4000);
        RuleFor(comando => comando.Comentario).NotEmpty()
            .When(comando => comando.NuevoEstado is EstadoTicket.Cancelado or EstadoTicket.PendienteCliente)
            .WithMessage("Indique el motivo en el comentario.");
    }
}

public sealed class ManejadorCambiarEstadoTicketComando : IRequestHandler<CambiarEstadoTicketComando>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorCambiarEstadoTicketComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task Handle(CambiarEstadoTicketComando comando, CancellationToken tokenCancelacion)
    {
        var ticket = await FlujoTickets.ObtenerRastreadoAsync(_contexto, comando.Id, tokenCancelacion);

        // Estos pasos dejan evidencia propia (despliegue o resultado de pruebas) y tienen su propia acción.
        var mensajeAccionDedicada = comando.NuevoEstado switch
        {
            EstadoTicket.EnPruebas => "Registre el despliegue en Desarrollo para pasar a pruebas.",
            EstadoTicket.Aprobado or EstadoTicket.Devuelto => "Registre el resultado de las pruebas del despliegue.",
            EstadoTicket.EnProduccion => "Registre el despliegue en Producción.",
            _ => null
        };
        if (mensajeAccionDedicada is not null)
            throw new ExcepcionDominio(mensajeAccionDedicada);

        if (comando.NuevoEstado == EstadoTicket.Asignado && ticket.AgenteAsignadoId is null)
            throw new ExcepcionDominio("Asigne el ticket a alguien.");

        if (comando.NuevoEstado == EstadoTicket.EnRevision &&
            !await _contexto.RamasTicket.AnyAsync(rama => rama.TicketId == ticket.Id && rama.PullRequestNumero != null, tokenCancelacion))
            throw new ExcepcionDominio("Cree o vincule un pull request antes de enviar a revisión.");

        FlujoTickets.Transicionar(_contexto, ticket, comando.NuevoEstado, _usuarioActual.ObtenerUsuarioIdRequerido(), comando.Comentario);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Conversación y notas internas ----------

public sealed record AgregarMensajeTicketComando(Guid TicketId, string CuerpoMensaje, bool EsNotaInterna) : IRequest<Guid>;

public sealed class ValidadorAgregarMensajeTicketComando : AbstractValidator<AgregarMensajeTicketComando>
{
    public ValidadorAgregarMensajeTicketComando() => RuleFor(comando => comando.CuerpoMensaje).NotEmpty().MaximumLength(20_000);
}

public sealed class ManejadorAgregarMensajeTicketComando : IRequestHandler<AgregarMensajeTicketComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorAgregarMensajeTicketComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<Guid> Handle(AgregarMensajeTicketComando comando, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var ticket = await FlujoTickets.ObtenerRastreadoAsync(_contexto, comando.TicketId, tokenCancelacion);
        var autor = await _contexto.Usuarios.AsNoTracking().FirstAsync(usuario => usuario.Id == usuarioId, tokenCancelacion);

        var mensaje = new MensajeTicket
        {
            TicketId = ticket.Id,
            UsuarioId = usuarioId,
            NombreRemitente = autor.NombreCompleto,
            CorreoRemitente = autor.Correo,
            EsNotaInterna = comando.EsNotaInterna,
            CuerpoMensaje = comando.CuerpoMensaje
        };
        _contexto.MensajesTicket.Add(mensaje);

        // Una respuesta visible para el solicitante cuenta para el SLA de primera respuesta.
        if (!comando.EsNotaInterna)
            ticket.RegistrarPrimeraRespuesta(DateTime.UtcNow);
        ticket.FechaActualizacion = DateTime.UtcNow;

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return mensaje.Id;
    }
}

// ---------- Vincular con una tarea del tablero ----------

public sealed record VincularTareaTicketComando(Guid TicketId, Guid? TareaId) : IRequest;

public sealed class ManejadorVincularTareaTicketComando : IRequestHandler<VincularTareaTicketComando>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorVincularTareaTicketComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task Handle(VincularTareaTicketComando comando, CancellationToken tokenCancelacion)
    {
        var ticket = await FlujoTickets.ObtenerRastreadoAsync(_contexto, comando.TicketId, tokenCancelacion);
        var descripcion = "Tarea desvinculada";
        if (comando.TareaId is { } tareaId)
        {
            var titulo = await _contexto.Tareas.Where(tarea => tarea.Id == tareaId).Select(tarea => tarea.Titulo).FirstOrDefaultAsync(tokenCancelacion)
                ?? throw new ExcepcionEntidadNoEncontrada("la tarea", tareaId);
            descripcion = $"Vinculado a la tarea \"{titulo}\"";
        }

        ticket.TareaRelacionadaId = comando.TareaId;
        FlujoTickets.RegistrarEvento(_contexto, ticket, TipoEventoTicket.TareaVinculada, descripcion, _usuarioActual.ObtenerUsuarioIdRequerido());
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}
