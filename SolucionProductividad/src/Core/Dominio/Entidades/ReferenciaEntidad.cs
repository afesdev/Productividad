using SolucionProductividad.Dominio.Comun;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Dominio.Entidades;

[PrefijoTabla("ReferenciasEntidades", "Ref")]
public class ReferenciaEntidad : EntidadBase
{
    public TipoEntidad TipoOrigen { get; set; }
    public Guid OrigenId { get; set; }
    public TipoEntidad TipoDestino { get; set; }
    public Guid DestinoId { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
}
