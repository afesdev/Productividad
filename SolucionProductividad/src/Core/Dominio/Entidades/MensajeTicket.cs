using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

[PrefijoTabla("MensajesTicket", "Msg")]
public class MensajeTicket : EntidadBase
{
    public Guid TicketId { get; set; }
    public string CorreoRemitente { get; set; } = string.Empty;
    public string NombreRemitente { get; set; } = string.Empty;
    public bool EsNotaInterna { get; set; }
    public string CuerpoMensaje { get; set; } = string.Empty;
    /// <summary>Usuario interno que escribió el mensaje (null si vino del solicitante).</summary>
    public Guid? UsuarioId { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
}
