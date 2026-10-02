using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

[PrefijoTabla("ListasTareas", "Lst")]
public class ListaTareas : EntidadBase
{
    public Guid? CarpetaId { get; set; }
    public Guid ProyectoId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public int IndiceOrden { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public Proyecto? Proyecto { get; set; }
    public ICollection<Tarea> Tareas { get; set; } = new List<Tarea>();
}
