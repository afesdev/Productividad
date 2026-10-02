using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

[PrefijoTabla("Carpetas", "Crp")]
public class Carpeta : EntidadBase
{
    public Guid ProyectoId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Icono { get; set; }
    public int IndiceOrden { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
}
