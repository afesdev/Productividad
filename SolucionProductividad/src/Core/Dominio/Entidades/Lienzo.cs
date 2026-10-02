using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

/// <summary>
/// Pizarra infinita estilo Excalidraw. La escena completa (elementos, estado del lienzo y archivos
/// incrustados) se guarda serializada como JSON; el backend no la interpreta, solo la almacena por usuario.
/// </summary>
[PrefijoTabla("Lienzos", "Lie")]
public class Lienzo : EntidadBase
{
    public Guid UsuarioId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    /// <summary>Escena de Excalidraw serializada (JSON con elements, appState y files).</summary>
    public string ContenidoJson { get; set; } = string.Empty;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;
}
