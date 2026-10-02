using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

/// <summary>Carpeta de documentos del usuario; se anidan con CarpetaPadreId.</summary>
[PrefijoTabla("CarpetasDocumento", "Cdo")]
public class CarpetaDocumento : EntidadBase
{
    public Guid UsuarioId { get; set; }
    public Guid? CarpetaPadreId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    /// <summary>Clave de color de la paleta (ej. "azul"), no un hex libre.</summary>
    public string? Color { get; set; }
    public int IndiceOrden { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
}

[PrefijoTabla("EtiquetasDocumento", "Etq")]
public class EtiquetaDocumento : EntidadBase
{
    public Guid UsuarioId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    /// <summary>Clave de color de la paleta (ej. "verde").</summary>
    public string Color { get; set; } = "gris";
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
}

/// <summary>Relación muchos a muchos entre documentos y etiquetas.</summary>
[PrefijoTabla("DocumentosEtiquetas", "Dte")]
public class DocumentoEtiqueta : EntidadBase
{
    public Guid DocumentoId { get; set; }
    public Guid EtiquetaId { get; set; }
}

/// <summary>Instantánea de un documento: se crea al pedirla (Ctrl+S) o como máximo cada 10 minutos de edición.</summary>
[PrefijoTabla("VersionesDocumento", "Vdo")]
public class VersionDocumento : EntidadBase
{
    public Guid DocumentoId { get; set; }
    public int NumeroVersion { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string ContenidoMarkdown { get; set; } = string.Empty;
    public Guid CreadoPor { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
}
