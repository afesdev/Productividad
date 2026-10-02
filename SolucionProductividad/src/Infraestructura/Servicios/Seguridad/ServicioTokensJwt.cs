using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Servicios.Opciones;

namespace SolucionProductividad.Servicios.Seguridad;

public sealed class ServicioTokensJwt : IServicioTokensJwt
{
    private readonly OpcionesJwt _opciones;
    private readonly SigningCredentials _credencialesFirma;

    public ServicioTokensJwt(IOptions<OpcionesJwt> opciones)
    {
        _opciones = opciones.Value;
        var llave = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opciones.LlaveFirma));
        _credencialesFirma = new SigningCredentials(llave, SecurityAlgorithms.HmacSha256);
    }

    public TimeSpan VigenciaTokenRefresco => TimeSpan.FromDays(_opciones.DiasVigenciaRefresco);

    public (string Token, DateTime FechaExpiracion) GenerarTokenAcceso(Usuario usuario, IEnumerable<string> roles)
    {
        var fechaExpiracion = DateTime.UtcNow.AddMinutes(_opciones.MinutosVigenciaAcceso);

        var reclamaciones = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, usuario.Correo),
            new(JwtRegisteredClaimNames.Name, usuario.NombreCompleto),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        reclamaciones.AddRange(roles.Select(rol => new Claim(ClaimTypes.Role, rol)));

        var token = new JwtSecurityToken(
            issuer: _opciones.Emisor,
            audience: _opciones.Audiencia,
            claims: reclamaciones,
            notBefore: DateTime.UtcNow,
            expires: fechaExpiracion,
            signingCredentials: _credencialesFirma);

        return (new JwtSecurityTokenHandler().WriteToken(token), fechaExpiracion);
    }

    public string GenerarTokenRefresco() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    public string CalcularHashTokenRefresco(string tokenRefresco) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(tokenRefresco)));
}
