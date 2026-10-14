using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

/// <summary>
/// Fragmento reutilizable (consulta SQL, comando, código) de la biblioteca personal. Puede llevar variables
/// <c>{{nombre}}</c> que se rellenan al copiarlo. No es secreto: lo sensible va a la Bóveda.
/// </summary>
[PrefijoTabla("Snippets", "Snp")]
public class Snippet : EntidadBase
{
    public Guid UsuarioId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    /// <summary>Lenguaje de highlight.js ("sql", "powershell", "csharp"…) o "texto".</summary>
    public string Lenguaje { get; set; } = "texto";
    public string Contenido { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public bool EsFavorito { get; set; }
    /// <summary>Veces que se copió o insertó: ordena los más usados primero.</summary>
    public int Usos { get; set; }
    public DateTime? FechaUltimoUso { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;
    public ICollection<SnippetEtiqueta> Etiquetas { get; set; } = new List<SnippetEtiqueta>();
}

/// <summary>Relación muchos a muchos entre snippets y el catálogo de etiquetas compartido.</summary>
[PrefijoTabla("SnippetsEtiquetas", "Spe")]
public class SnippetEtiqueta : EntidadBase
{
    public Guid SnippetId { get; set; }
    public Guid EtiquetaId { get; set; }
    public EtiquetaDocumento? Etiqueta { get; set; }
}
