using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

[PrefijoTabla("Roles", "Rol")]
public class Rol : EntidadBase
{
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
}
