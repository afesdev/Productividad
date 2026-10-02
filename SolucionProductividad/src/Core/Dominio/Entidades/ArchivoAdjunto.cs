using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

[PrefijoTabla("ArchivosAdjuntos", "Adj")]
public class ArchivoAdjunto : EntidadBase
{
    public string NombreArchivo { get; set; } = string.Empty;
    public string TipoContenido { get; set; } = string.Empty;
    public long TamanoEnBytes { get; set; }
    public string RutaFirebaseStorage { get; set; } = string.Empty;
    public string UrlDescarga { get; set; } = string.Empty;
    public Guid? TareaId { get; set; }
    public Guid? MensajeTicketId { get; set; }
    public Guid? TicketId { get; set; }
    public Guid? DocumentoId { get; set; }
    public Guid? RegistroDiarioId { get; set; }
    public Guid SubidoPor { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
}
