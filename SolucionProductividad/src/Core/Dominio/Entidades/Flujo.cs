using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

/// <summary>
/// Diagrama de un proceso (qué hace el usuario, qué vista se usa, validaciones, procedimientos…). El grafo de React Flow
/// (nodos con posición y datos, conexiones) se guarda como JSON; el texto de los nodos se copia aparte para buscar.
/// </summary>
[PrefijoTabla("Flujos", "Flu")]
public class Flujo : EntidadBase
{
    public Guid UsuarioId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    /// <summary>Sistema o aplicación al que pertenece el proceso (agrupa la lista): "Cremil", "Sygnus"…</summary>
    public string? Sistema { get; set; }
    public string? Descripcion { get; set; }
    public string ContenidoJson { get; set; } = string.Empty;
    /// <summary>Títulos, datos técnicos y descripciones de los nodos, en texto plano, para la búsqueda.</summary>
    public string TextoBuscable { get; set; } = string.Empty;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;
}
