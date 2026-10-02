using SolucionProductividad.Dominio.Comun;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Dominio.Entidades;

[PrefijoTabla("DocumentosMarkdown", "Doc")]
public class DocumentoMarkdown : EntidadBase
{
    public Guid? ProyectoId { get; set; }
    public Guid? DocumentoPadreId { get; set; }
    public Guid? CarpetaDocumentoId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    /// <summary>Ruta jerárquica tipo slug (ej. "arquitectura/backend/capas").</summary>
    public string RutaEsquema { get; set; } = string.Empty;
    public string ContenidoMarkdown { get; set; } = string.Empty;
    public string? Icono { get; set; }
    public EstadoDocumento Estado { get; set; } = EstadoDocumento.Vigente;
    /// <summary>Fecha a partir de la cual el documento se marca "por revisar" (si no está obsoleto).</summary>
    public DateTime? FechaRevision { get; set; }
    /// <summary>Documento que reemplaza a este cuando está obsoleto.</summary>
    public Guid? DocumentoReemplazoId { get; set; }
    /// <summary>true = en la papelera (se puede restaurar o eliminar definitivamente).</summary>
    public bool EstaArchivado { get; set; }
    public DateTime? FechaArchivado { get; set; }
    public Guid CreadoPor { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;
}
