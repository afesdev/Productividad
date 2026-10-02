using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

[PrefijoTabla("ColasSoporte", "Cla")]
public class ColaSoporte : EntidadBase
{
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public bool EstaActiva { get; set; } = true;
}
