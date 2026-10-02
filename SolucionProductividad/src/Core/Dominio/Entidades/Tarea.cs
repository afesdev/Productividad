using SolucionProductividad.Dominio.Comun;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.ObjetosValor;

namespace SolucionProductividad.Dominio.Entidades;

[PrefijoTabla("Tareas", "Tar")]
public class Tarea : EntidadBase
{
    public Guid ListaTareaId { get; set; }
    public Guid? TareaPadreId { get; set; }
    /// <summary>Consecutivo IDENTITY(100,1) generado por SQL Server.</summary>
    public int NumeroTarea { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string? DescripcionMarkdown { get; set; }
    public EstadoTarea Estado { get; set; } = EstadoTarea.Pendiente;
    public Prioridad Prioridad { get; set; } = Prioridad.Media;
    public bool EsUrgente { get; set; }
    public bool EsImportante { get; set; }
    public DateTime? FechaVencimiento { get; set; }
    public decimal? HorasEstimadas { get; set; }
    public int IndiceOrden { get; set; }
    public Guid CreadoPor { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;

    public ListaTareas? ListaTareas { get; set; }
    public Tarea? TareaPadre { get; set; }
    public ICollection<Tarea> Subtareas { get; set; } = new List<Tarea>();

    public CuadranteEisenhower Cuadrante => MatrizEisenhower.ObtenerCuadrante(EsUrgente, EsImportante);

    public void MoverACuadrante(CuadranteEisenhower cuadrante)
    {
        (EsUrgente, EsImportante) = MatrizEisenhower.ObtenerBanderas(cuadrante);
        FechaActualizacion = DateTime.UtcNow;
    }

    public void CambiarEstado(EstadoTarea nuevoEstado)
    {
        Estado = nuevoEstado;
        FechaActualizacion = DateTime.UtcNow;
    }
}
