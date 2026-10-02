using System.Linq.Expressions;
using SolucionProductividad.Aplicacion.Caracteristicas.Archivos.Dtos;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.ObjetosValor;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Dtos;

public sealed record TareaResumenDto(
    Guid Id,
    int NumeroTarea,
    string ClavePrefijoProyecto,
    Guid ProyectoId,
    Guid ListaTareaId,
    Guid? TareaPadreId,
    string Titulo,
    EstadoTarea Estado,
    Prioridad Prioridad,
    bool EsUrgente,
    bool EsImportante,
    DateTime? FechaVencimiento,
    int IndiceOrden,
    int TotalSubtareas,
    int SubtareasCompletadas)
{
    /// <summary>Identificador legible, ej. "WEB-105". Se usa también en WikiLinks.</summary>
    public string Clave => $"{ClavePrefijoProyecto}-{NumeroTarea}";

    public CuadranteEisenhower Cuadrante => MatrizEisenhower.ObtenerCuadrante(EsUrgente, EsImportante);
}

public sealed record TareaDetalleDto(
    TareaResumenDto Resumen,
    string? DescripcionMarkdown,
    decimal? HorasEstimadas,
    Guid CreadoPor,
    DateTime FechaCreacion,
    DateTime FechaActualizacion,
    IReadOnlyList<TareaResumenDto> Subtareas,
    IReadOnlyList<ArchivoAdjuntoDto> Adjuntos);

public sealed record MatrizEisenhowerDto(
    IReadOnlyList<TareaResumenDto> Hacer,
    IReadOnlyList<TareaResumenDto> Programar,
    IReadOnlyList<TareaResumenDto> Delegar,
    IReadOnlyList<TareaResumenDto> Eliminar);

public static class ProyeccionesTarea
{
    /// <summary>Proyección traducible a SQL por EF Core.</summary>
    public static readonly Expression<Func<Tarea, TareaResumenDto>> AResumen = tarea => new TareaResumenDto(
        tarea.Id,
        tarea.NumeroTarea,
        tarea.ListaTareas!.Proyecto!.ClavePrefijo,
        tarea.ListaTareas.ProyectoId,
        tarea.ListaTareaId,
        tarea.TareaPadreId,
        tarea.Titulo,
        tarea.Estado,
        tarea.Prioridad,
        tarea.EsUrgente,
        tarea.EsImportante,
        tarea.FechaVencimiento,
        tarea.IndiceOrden,
        tarea.Subtareas.Count(),
        tarea.Subtareas.Count(subtarea => subtarea.Estado == EstadoTarea.Completada));
}
