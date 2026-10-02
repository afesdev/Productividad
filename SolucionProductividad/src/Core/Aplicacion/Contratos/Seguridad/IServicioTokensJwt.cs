using SolucionProductividad.Dominio.Entidades;

namespace SolucionProductividad.Aplicacion.Contratos.Seguridad;

public interface IServicioTokensJwt
{
    (string Token, DateTime FechaExpiracion) GenerarTokenAcceso(Usuario usuario, IEnumerable<string> roles);

    /// <summary>Genera un token de refresco aleatorio (valor en claro que solo recibe el cliente).</summary>
    string GenerarTokenRefresco();

    /// <summary>Hash SHA-256 del token de refresco, que es lo único que se persiste.</summary>
    string CalcularHashTokenRefresco(string tokenRefresco);

    TimeSpan VigenciaTokenRefresco { get; }
}
