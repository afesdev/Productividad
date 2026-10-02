using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

[PrefijoTabla("Proyectos", "Pry")]
public class Proyecto : EntidadBase
{
    /// <summary>Usuario dueño: solo él ve el proyecto y todo lo que contiene.</summary>
    public Guid PropietarioId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string ClavePrefijo { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public ICollection<ListaTareas> ListasTareas { get; set; } = new List<ListaTareas>();
}
