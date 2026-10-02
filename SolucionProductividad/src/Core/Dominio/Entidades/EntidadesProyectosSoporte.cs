using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

/// <summary>
/// Proyecto (aplicación, cliente, sistema…) al que pertenecen los tickets; funciona como categoría.
/// Un ticket puede tocar varios proyectos y un proyecto agrupa 0..n repositorios de GitHub.
/// Es independiente de los proyectos de Tareas.
/// </summary>
[PrefijoTabla("ProyectosSoporte", "Pso")]
public class ProyectoSoporte : EntidadBase
{
    /// <summary>Usuario que lo creó: cada usuario gestiona su propio catálogo.</summary>
    public Guid UsuarioId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    /// <summary>Clave de color de la paleta pastel (ej. "violeta").</summary>
    public string Color { get; set; } = "violeta";
    public bool EstaActivo { get; set; } = true;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
}

/// <summary>Relación muchos a muchos entre tickets y proyectos.</summary>
[PrefijoTabla("TicketsProyectos", "Tpr")]
public class TicketProyecto : EntidadBase
{
    public Guid TicketId { get; set; }
    public Guid ProyectoSoporteId { get; set; }
}
