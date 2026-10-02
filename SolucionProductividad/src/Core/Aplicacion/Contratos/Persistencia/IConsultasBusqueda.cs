using SolucionProductividad.Aplicacion.Caracteristicas.Busqueda.Dtos;

namespace SolucionProductividad.Aplicacion.Contratos.Persistencia;

/// <summary>
/// Búsqueda global (Dapper) sobre Tareas, Documentos, Tickets y Registros Diarios.
/// </summary>
public interface IConsultasBusqueda
{
    Task<IReadOnlyList<ResultadoBusquedaDto>> BuscarAsync(string termino, Guid usuarioId, int limitePorTipo, CancellationToken tokenCancelacion = default);
}
