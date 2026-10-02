using SolucionProductividad.Dominio.Comun;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Dominio.Entidades;

[PrefijoTabla("Marcadores", "Mrc")]
public class Marcador : EntidadBase
{
    public Guid UsuarioId { get; set; }
    public TipoEntidad TipoEntidad { get; set; }
    public Guid EntidadId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public int IndiceOrden { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
}
