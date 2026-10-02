using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Dtos;

namespace SolucionProductividad.Aplicacion.Contratos.Infraestructura;

/// <summary>
/// Publica eventos en tiempo real (implementado con SignalR en la capa de presentación).
/// </summary>
public interface INotificadorTiempoReal
{
    /// <summary>Tarea creada o modificada.</summary>
    Task NotificarTareaActualizadaAsync(TareaResumenDto tarea, CancellationToken tokenCancelacion = default);

    Task NotificarTareaEliminadaAsync(Guid proyectoId, Guid tareaId, CancellationToken tokenCancelacion = default);
}
