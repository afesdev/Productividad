using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

/// <summary>
/// Tarjeta de Trello vinculada a una tarea o a un ticket (exactamente uno de los dos). Guarda una copia del nombre,
/// tablero y enlace para mostrarla sin llamar a Trello; los datos al día se leen al abrir la tarjeta.
/// </summary>
[PrefijoTabla("VinculosTrello", "Vtr")]
public class VinculoTrello : EntidadBase
{
    public Guid UsuarioId { get; set; }
    /// <summary>Id largo de la tarjeta en Trello (24 hexadecimales).</summary>
    public string IdTarjeta { get; set; } = string.Empty;
    public string NombreTarjeta { get; set; } = string.Empty;
    public string NombreTablero { get; set; } = string.Empty;
    public string UrlTarjeta { get; set; } = string.Empty;
    public Guid? TareaId { get; set; }
    public Guid? TicketId { get; set; }
    public DateTime FechaVinculo { get; set; } = DateTime.UtcNow;
}
