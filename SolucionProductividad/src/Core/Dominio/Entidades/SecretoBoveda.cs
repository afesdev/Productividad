using SolucionProductividad.Dominio.Comun;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Dominio.Entidades;

[PrefijoTabla("BovedaSecretos", "Bvd")]
public class SecretoBoveda : EntidadBase
{
    public Guid? ProyectoId { get; set; }
    public EntornoBoveda Entorno { get; set; }
    public string NombreClave { get; set; } = string.Empty;
    /// <summary>Valor cifrado con AES-256-GCM (Base64 de nonce + tag + texto cifrado).</summary>
    public string ValorCifrado { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public Guid CreadoPor { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;
}
