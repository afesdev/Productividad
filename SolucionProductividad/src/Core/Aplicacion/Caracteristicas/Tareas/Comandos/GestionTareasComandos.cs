using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Comandos;

// ---------- Actualizar (edición completa desde el panel de detalle) ----------

public sealed record ActualizarTareaComando(
    Guid Id,
    string Titulo,
    string? DescripcionMarkdown,
    Prioridad Prioridad,
    bool EsUrgente,
    bool EsImportante,
    DateTime? FechaVencimiento,
    decimal? HorasEstimadas) : IRequest<TareaResumenDto>;

public sealed class ValidadorActualizarTareaComando : AbstractValidator<ActualizarTareaComando>
{
    public ValidadorActualizarTareaComando()
    {
        RuleFor(comando => comando.Id).NotEmpty();
        RuleFor(comando => comando.Titulo).NotEmpty().MaximumLength(200);
        RuleFor(comando => comando.Prioridad).IsInEnum();
        RuleFor(comando => comando.HorasEstimadas).InclusiveBetween(0, 999.99m).When(comando => comando.HorasEstimadas.HasValue);
    }
}

public sealed class ManejadorActualizarTareaComando : IRequestHandler<ActualizarTareaComando, TareaResumenDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioProcesadorBacklinks _procesadorBacklinks;
    private readonly INotificadorTiempoReal _notificador;

    public ManejadorActualizarTareaComando(IContextoAplicacion contexto, IServicioProcesadorBacklinks procesadorBacklinks, INotificadorTiempoReal notificador)
    {
        _contexto = contexto;
        _procesadorBacklinks = procesadorBacklinks;
        _notificador = notificador;
    }

    public async Task<TareaResumenDto> Handle(ActualizarTareaComando comando, CancellationToken tokenCancelacion)
    {
        var tarea = await AccesoTareas.ObtenerRastreadaAsync(_contexto, comando.Id, tokenCancelacion);

        tarea.Titulo = comando.Titulo.Trim();
        tarea.DescripcionMarkdown = comando.DescripcionMarkdown;
        tarea.Prioridad = comando.Prioridad;
        tarea.EsUrgente = comando.EsUrgente;
        tarea.EsImportante = comando.EsImportante;
        tarea.FechaVencimiento = comando.FechaVencimiento;
        tarea.HorasEstimadas = comando.HorasEstimadas;
        tarea.FechaActualizacion = DateTime.UtcNow;

        // Se procesa aunque la descripción quede vacía, para retirar los enlaces que ya no existen.
        await _procesadorBacklinks.ProcesarWikiLinksAsync(tarea.DescripcionMarkdown ?? string.Empty, tarea.Id, nameof(TipoEntidad.Tarea), tokenCancelacion);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);

        var resumen = await AccesoTareas.ObtenerResumenAsync(_contexto, tarea.Id, tokenCancelacion);
        await _notificador.NotificarTareaActualizadaAsync(resumen, tokenCancelacion);
        return resumen;
    }
}

// ---------- Mover (drag & drop en el tablero: columna de estado, lista y posición) ----------

/// <param name="AntesDeTareaId">La tarea queda justo antes de esta; null = al final.</param>
public sealed record MoverTareaComando(Guid TareaId, Guid ListaTareaId, EstadoTarea Estado, Guid? AntesDeTareaId) : IRequest<TareaResumenDto>;

public sealed class ValidadorMoverTareaComando : AbstractValidator<MoverTareaComando>
{
    public ValidadorMoverTareaComando()
    {
        RuleFor(comando => comando.TareaId).NotEmpty();
        RuleFor(comando => comando.ListaTareaId).NotEmpty();
        RuleFor(comando => comando.Estado).IsInEnum();
        RuleFor(comando => comando.AntesDeTareaId).NotEqual(comando => comando.TareaId).WithMessage("Una tarea no puede ubicarse antes de sí misma.");
    }
}

public sealed class ManejadorMoverTareaComando : IRequestHandler<MoverTareaComando, TareaResumenDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly INotificadorTiempoReal _notificador;

    public ManejadorMoverTareaComando(IContextoAplicacion contexto, INotificadorTiempoReal notificador)
    {
        _contexto = contexto;
        _notificador = notificador;
    }

    public async Task<TareaResumenDto> Handle(MoverTareaComando comando, CancellationToken tokenCancelacion)
    {
        var tarea = await _contexto.Tareas
            .Include(tarea => tarea.ListaTareas)
            .FirstOrDefaultAsync(tarea => tarea.Id == comando.TareaId, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("la tarea", comando.TareaId);

        if (tarea.TareaPadreId is not null && tarea.ListaTareaId != comando.ListaTareaId)
            throw new ExcepcionDominio("Una subtarea no puede moverse a otra lista; mueva la tarea padre.");

        if (tarea.ListaTareaId != comando.ListaTareaId)
        {
            var listaDestino = await _contexto.ListasTareas.FirstOrDefaultAsync(lista => lista.Id == comando.ListaTareaId, tokenCancelacion)
                ?? throw new ExcepcionEntidadNoEncontrada("la lista de tareas", comando.ListaTareaId);

            // La clave (WEB-105) depende del proyecto, por eso no se permite cruzar proyectos.
            if (listaDestino.ProyectoId != tarea.ListaTareas!.ProyectoId)
                throw new ExcepcionDominio("Solo se puede mover la tarea a una lista del mismo proyecto.");

            await MoverSubtareasAsync(tarea.Id, comando.ListaTareaId, tokenCancelacion);
            tarea.ListaTareaId = comando.ListaTareaId;
        }

        if (tarea.Estado != comando.Estado)
            tarea.CambiarEstado(comando.Estado);

        await ReordenarAsync(tarea, comando.AntesDeTareaId, tokenCancelacion);
        tarea.FechaActualizacion = DateTime.UtcNow;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);

        var resumen = await AccesoTareas.ObtenerResumenAsync(_contexto, tarea.Id, tokenCancelacion);
        await _notificador.NotificarTareaActualizadaAsync(resumen, tokenCancelacion);
        return resumen;
    }

    private async Task MoverSubtareasAsync(Guid tareaPadreId, Guid listaDestinoId, CancellationToken tokenCancelacion)
    {
        var subtareas = await _contexto.Tareas.Where(subtarea => subtarea.TareaPadreId == tareaPadreId).ToListAsync(tokenCancelacion);
        foreach (var subtarea in subtareas)
            subtarea.ListaTareaId = listaDestinoId;
    }

    /// <summary>Renumera los hermanos (mismo padre, misma lista) con la tarea en su nueva posición.</summary>
    private async Task ReordenarAsync(Dominio.Entidades.Tarea tarea, Guid? antesDeTareaId, CancellationToken tokenCancelacion)
    {
        var hermanas = await _contexto.Tareas
            .Where(otra => otra.ListaTareaId == tarea.ListaTareaId && otra.TareaPadreId == tarea.TareaPadreId && otra.Id != tarea.Id)
            .OrderBy(otra => otra.IndiceOrden)
            .ToListAsync(tokenCancelacion);

        var posicion = antesDeTareaId is { } idReferencia ? hermanas.FindIndex(otra => otra.Id == idReferencia) : -1;
        hermanas.Insert(posicion < 0 ? hermanas.Count : posicion, tarea);

        for (var indice = 0; indice < hermanas.Count; indice++)
            hermanas[indice].IndiceOrden = indice;
    }
}

// ---------- Eliminar (con subtareas, adjuntos en Firebase y referencias) ----------

public sealed record EliminarTareaComando(Guid Id) : IRequest;

public sealed class ManejadorEliminarTareaComando : IRequestHandler<EliminarTareaComando>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioAlmacenamientoFirebase _almacenamiento;
    private readonly INotificadorTiempoReal _notificador;
    private readonly ILogger<ManejadorEliminarTareaComando> _registrador;

    public ManejadorEliminarTareaComando(
        IContextoAplicacion contexto,
        IServicioAlmacenamientoFirebase almacenamiento,
        INotificadorTiempoReal notificador,
        ILogger<ManejadorEliminarTareaComando> registrador)
    {
        _contexto = contexto;
        _almacenamiento = almacenamiento;
        _notificador = notificador;
        _registrador = registrador;
    }

    public async Task Handle(EliminarTareaComando comando, CancellationToken tokenCancelacion)
    {
        var tarea = await _contexto.Tareas
            .Include(tarea => tarea.ListaTareas)
            .FirstOrDefaultAsync(tarea => tarea.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("la tarea", comando.Id);
        // El filtro global del contexto ya garantiza que la tarea es de un proyecto del usuario.

        var proyectoId = tarea.ListaTareas!.ProyectoId;
        var tareasAEliminar = await ObtenerTareaYDescendientesAsync(tarea, tokenCancelacion);
        var idsTareas = tareasAEliminar.Select(candidata => candidata.Id).ToList();

        var adjuntos = await _contexto.ArchivosAdjuntos.Where(adjunto => adjunto.TareaId != null && idsTareas.Contains(adjunto.TareaId.Value)).ToListAsync(tokenCancelacion);
        var registrosTiempo = await _contexto.RegistrosTiempo.Where(registro => registro.TareaId != null && idsTareas.Contains(registro.TareaId.Value)).ToListAsync(tokenCancelacion);
        var ticketsVinculados = await _contexto.Tickets.Where(ticket => ticket.TareaRelacionadaId != null && idsTareas.Contains(ticket.TareaRelacionadaId.Value)).ToListAsync(tokenCancelacion);
        var referencias = await _contexto.ReferenciasEntidades
            .Where(referencia => (referencia.TipoOrigen == TipoEntidad.Tarea && idsTareas.Contains(referencia.OrigenId))
                                 || (referencia.TipoDestino == TipoEntidad.Tarea && idsTareas.Contains(referencia.DestinoId)))
            .ToListAsync(tokenCancelacion);
        var marcadores = await _contexto.Marcadores
            .Where(marcador => marcador.TipoEntidad == TipoEntidad.Tarea && idsTareas.Contains(marcador.EntidadId))
            .ToListAsync(tokenCancelacion);

        // Un ticket sobrevive a su tarea: solo se desvincula.
        foreach (var ticket in ticketsVinculados)
            ticket.TareaRelacionadaId = null;

        _contexto.ArchivosAdjuntos.RemoveRange(adjuntos);
        _contexto.RegistrosTiempo.RemoveRange(registrosTiempo);
        _contexto.ReferenciasEntidades.RemoveRange(referencias);
        _contexto.Marcadores.RemoveRange(marcadores);
        _contexto.Tareas.RemoveRange(tareasAEliminar);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);

        // Los binarios se borran después de confirmar en SQL: si falla, queda un huérfano en Firebase, nunca un enlace roto.
        foreach (var adjunto in adjuntos)
        {
            try
            {
                await _almacenamiento.EliminarArchivoAsync(adjunto.RutaFirebaseStorage, CancellationToken.None);
            }
            catch (Exception excepcion)
            {
                _registrador.LogWarning(excepcion, "No se pudo eliminar {RutaFirebase} de Firebase Storage", adjunto.RutaFirebaseStorage);
            }
        }

        foreach (var idTarea in idsTareas)
            await _notificador.NotificarTareaEliminadaAsync(proyectoId, idTarea, tokenCancelacion);
    }

    private async Task<List<Dominio.Entidades.Tarea>> ObtenerTareaYDescendientesAsync(Dominio.Entidades.Tarea raiz, CancellationToken tokenCancelacion)
    {
        var resultado = new List<Dominio.Entidades.Tarea> { raiz };
        var nivelActual = new List<Guid> { raiz.Id };

        while (nivelActual.Count > 0)
        {
            var hijas = await _contexto.Tareas.Where(tarea => tarea.TareaPadreId != null && nivelActual.Contains(tarea.TareaPadreId.Value)).ToListAsync(tokenCancelacion);
            resultado.AddRange(hijas);
            nivelActual = hijas.Select(hija => hija.Id).ToList();
        }

        return resultado;
    }
}
