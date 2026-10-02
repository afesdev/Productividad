using SolucionProductividad.Aplicacion.Caracteristicas.Analitica.Dtos;

namespace SolucionProductividad.Aplicacion.Contratos.Persistencia;

/// <summary>
/// Consultas de lectura optimizadas (Dapper) para el tablero de analítica.
/// </summary>
public interface IConsultasAnalitica
{
    /// <param name="desplazamientoMinutos">Diferencia de la zona del usuario respecto a UTC (ej. Colombia = -300), para agrupar por semana local.</param>
    Task<ResumenAnaliticaPersonalDto> ObtenerResumenPersonalAsync(Guid usuarioId, DateTime fechaInicio, DateTime fechaFin, int desplazamientoMinutos, CancellationToken tokenCancelacion = default);
}
