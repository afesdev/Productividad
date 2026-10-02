using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Archivos.Dtos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Consultas;

// ---------- Obtener por Id ----------

public sealed record ObtenerTareaPorIdConsulta(Guid Id) : IRequest<TareaDetalleDto>;

public sealed class ManejadorObtenerTareaPorIdConsulta : IRequestHandler<ObtenerTareaPorIdConsulta, TareaDetalleDto>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorObtenerTareaPorIdConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<TareaDetalleDto> Handle(ObtenerTareaPorIdConsulta consulta, CancellationToken tokenCancelacion)
    {
        var tarea = await _contexto.Tareas.AsNoTracking().FirstOrDefaultAsync(tarea => tarea.Id == consulta.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("la tarea", consulta.Id);

        var resumen = await AccesoTareas.ObtenerResumenAsync(_contexto, consulta.Id, tokenCancelacion);

        var subtareas = await _contexto.Tareas.AsNoTracking()
            .Where(subtarea => subtarea.TareaPadreId == consulta.Id)
            .OrderBy(subtarea => subtarea.IndiceOrden)
            .Select(ProyeccionesTarea.AResumen)
            .ToListAsync(tokenCancelacion);

        var adjuntos = await _contexto.ArchivosAdjuntos.AsNoTracking()
            .Where(adjunto => adjunto.TareaId == consulta.Id)
            .OrderByDescending(adjunto => adjunto.FechaCreacion)
            .Select(ProyeccionesAdjunto.ADto)
            .ToListAsync(tokenCancelacion);

        return new TareaDetalleDto(resumen, tarea.DescripcionMarkdown, tarea.HorasEstimadas, tarea.CreadoPor,
            tarea.FechaCreacion, tarea.FechaActualizacion, subtareas, adjuntos);
    }
}

// ---------- Listar tareas de un proyecto (tablero Kanban) ----------

public sealed record ListarTareasProyectoConsulta(Guid ProyectoId, Guid? ListaTareaId = null) : IRequest<IReadOnlyList<TareaResumenDto>>;

public sealed class ManejadorListarTareasProyectoConsulta : IRequestHandler<ListarTareasProyectoConsulta, IReadOnlyList<TareaResumenDto>>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorListarTareasProyectoConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<IReadOnlyList<TareaResumenDto>> Handle(ListarTareasProyectoConsulta consulta, CancellationToken tokenCancelacion)
    {
        var tareas = _contexto.Tareas.AsNoTracking().Where(tarea => tarea.ListaTareas!.ProyectoId == consulta.ProyectoId);
        if (consulta.ListaTareaId is { } listaTareaId)
            tareas = tareas.Where(tarea => tarea.ListaTareaId == listaTareaId);

        return await tareas
            .OrderBy(tarea => tarea.ListaTareas!.IndiceOrden).ThenBy(tarea => tarea.IndiceOrden)
            .Select(ProyeccionesTarea.AResumen)
            .ToListAsync(tokenCancelacion);
    }
}

// ---------- Matriz de Eisenhower ----------

public sealed record ObtenerMatrizEisenhowerConsulta(Guid ProyectoId) : IRequest<MatrizEisenhowerDto>;

public sealed class ManejadorObtenerMatrizEisenhowerConsulta : IRequestHandler<ObtenerMatrizEisenhowerConsulta, MatrizEisenhowerDto>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorObtenerMatrizEisenhowerConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<MatrizEisenhowerDto> Handle(ObtenerMatrizEisenhowerConsulta consulta, CancellationToken tokenCancelacion)
    {
        var tareasAbiertas = await _contexto.Tareas.AsNoTracking()
            .Where(tarea => tarea.ListaTareas!.ProyectoId == consulta.ProyectoId
                            && tarea.Estado != EstadoTarea.Completada
                            && tarea.Estado != EstadoTarea.Cancelada)
            .OrderBy(tarea => tarea.FechaVencimiento == null).ThenBy(tarea => tarea.FechaVencimiento).ThenBy(tarea => tarea.IndiceOrden)
            .Select(ProyeccionesTarea.AResumen)
            .ToListAsync(tokenCancelacion);

        var porCuadrante = tareasAbiertas.ToLookup(tarea => tarea.Cuadrante);

        return new MatrizEisenhowerDto(
            porCuadrante[CuadranteEisenhower.Hacer].ToList(),
            porCuadrante[CuadranteEisenhower.Programar].ToList(),
            porCuadrante[CuadranteEisenhower.Delegar].ToList(),
            porCuadrante[CuadranteEisenhower.Eliminar].ToList());
    }
}
