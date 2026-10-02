using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.APIWeb.Seguridad;

public sealed class ServicioUsuarioActual : IServicioUsuarioActual
{
    private readonly IHttpContextAccessor _accesoContextoHttp;

    public ServicioUsuarioActual(IHttpContextAccessor accesoContextoHttp) => _accesoContextoHttp = accesoContextoHttp;

    private ClaimsPrincipal? Principal => _accesoContextoHttp.HttpContext?.User;

    public Guid? UsuarioId => Guid.TryParse(Principal?.FindFirstValue(JwtRegisteredClaimNames.Sub), out var usuarioId) ? usuarioId : null;

    public string? Correo => Principal?.FindFirstValue(JwtRegisteredClaimNames.Email);

    public string? NombreCompleto => Principal?.FindFirstValue(JwtRegisteredClaimNames.Name);

    public bool EsAdministrador => TieneRol(NombresRoles.Administrador);

    public bool TieneRol(string nombreRol) => Principal?.IsInRole(nombreRol) ?? false;
}
