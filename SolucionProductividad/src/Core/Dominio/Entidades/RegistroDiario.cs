using SolucionProductividad.Dominio.Comun;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Dominio.Entidades;

/// <summary>
/// Página del diario: una por usuario y día. La nota es Markdown libre (estilo Obsidian) y
/// las entradas estructuradas (eventos, decisiones, aprendizajes…) cuelgan de ella.
/// </summary>
[PrefijoTabla("RegistrosDiarios", "Log")]
public class RegistroDiario : EntidadBase
{
    public Guid UsuarioId { get; set; }
    public DateOnly FechaLog { get; set; }
    public string ContenidoMarkdown { get; set; } = string.Empty;
    /// <summary>Estado de ánimo del día, 1 (bajo) a 5 (alto). Opcional.</summary>
    public byte? Animo { get; set; }
    /// <summary>Nivel de energía del día, 1 a 5. Opcional.</summary>
    public byte? Energia { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;

    public ICollection<EntradaDiario> Entradas { get; set; } = new List<EntradaDiario>();
}

/// <summary>Registro corto y tipado dentro de un día del diario.</summary>
[PrefijoTabla("EntradasDiario", "End")]
public class EntradaDiario : EntidadBase
{
    public Guid RegistroDiarioId { get; set; }
    public TipoEntradaDiario Tipo { get; set; } = TipoEntradaDiario.Nota;
    public string Titulo { get; set; } = string.Empty;
    /// <summary>Detalle opcional en Markdown (motivo de una decisión, fuente de un aprendizaje…).</summary>
    public string? DetalleMarkdown { get; set; }
    public TimeOnly? HoraInicio { get; set; }
    public TimeOnly? HoraFin { get; set; }
    /// <summary>Solo aplica a las entradas de tipo Tarea (checklist del día).</summary>
    public bool Completada { get; set; }
    /// <summary>Tarea real creada a partir de esta entrada ("convertir en tarea").</summary>
    public Guid? TareaId { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public RegistroDiario? RegistroDiario { get; set; }
    public Tarea? Tarea { get; set; }
}
