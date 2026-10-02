using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

[PrefijoTabla("PoliticasSla", "Sla")]
public class PoliticaSla : EntidadBase
{
    public string Nombre { get; set; } = string.Empty;
    public int MinutosPrimeraRespuesta { get; set; }
    public int MinutosResolucion { get; set; }
    public bool EstaActiva { get; set; } = true;
}
