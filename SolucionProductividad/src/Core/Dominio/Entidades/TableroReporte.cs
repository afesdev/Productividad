using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

/// <summary>
/// Tablero de Trello al que se imputan las actividades del reporte diario de la empresa (columna TABLERO DE TRELLO).
/// Catálogo por usuario; opcionalmente asociado a un proyecto para sugerirlo en las entradas con tarea vinculada.
/// </summary>
[PrefijoTabla("TablerosReporte", "Tbr")]
public class TableroReporte : EntidadBase
{
    public Guid UsuarioId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public Guid? ProyectoId { get; set; }
    /// <summary>Archivado: deja de ofrecerse al registrar, pero las entradas antiguas lo conservan.</summary>
    public bool EstaArchivado { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public Proyecto? Proyecto { get; set; }
}
