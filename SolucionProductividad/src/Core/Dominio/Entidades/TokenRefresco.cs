using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

/// <summary>
/// Token de refresco persistido como hash SHA-256; nunca se guarda el valor en claro.
/// </summary>
[PrefijoTabla("TokensRefresco", "Tkr")]
public class TokenRefresco : EntidadBase
{
    public Guid UsuarioId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime FechaExpiracion { get; set; }
    public DateTime? FechaRevocacion { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public Usuario? Usuario { get; set; }

    public bool EstaVigente(DateTime ahoraUtc) => FechaRevocacion is null && FechaExpiracion > ahoraUtc;

    public void Revocar(DateTime ahoraUtc) => FechaRevocacion ??= ahoraUtc;
}
