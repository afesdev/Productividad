using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Dtos;

namespace SolucionProductividad.APIWeb.Controladores;

/// <summary>
/// El token de acceso (JWT, corta duración) viaja en el cuerpo y el cliente lo guarda en memoria.
/// El token de refresco viaja solo en una cookie HttpOnly para que JavaScript no pueda leerlo (mitiga XSS).
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
[EnableRateLimiting("autenticacion")]
public class AutenticacionController : ControllerBase
{
    private const string NombreCookieRefresco = "productividad_refresco";
    private readonly ISender _mediador;
    private readonly IWebHostEnvironment _entorno;

    public AutenticacionController(ISender mediador, IWebHostEnvironment entorno)
    {
        _mediador = mediador;
        _entorno = entorno;
    }

    public sealed record RespuestaSesion(string TokenAcceso, DateTime FechaExpiracionAcceso, UsuarioDto Usuario);

    [AllowAnonymous]
    [HttpPost("registrar")]
    public async Task<ActionResult<RespuestaSesion>> Registrar([FromBody] RegistrarUsuarioComando comando)
    {
        var respuesta = await _mediador.Send(comando);
        return ResponderConSesion(respuesta);
    }

    [AllowAnonymous]
    [HttpPost("iniciar-sesion")]
    public async Task<ActionResult<RespuestaSesion>> IniciarSesion([FromBody] IniciarSesionComando comando)
    {
        var respuesta = await _mediador.Send(comando);
        return ResponderConSesion(respuesta);
    }

    [AllowAnonymous]
    [HttpPost("refrescar")]
    public async Task<ActionResult<RespuestaSesion>> Refrescar()
    {
        var tokenRefresco = Request.Cookies[NombreCookieRefresco];
        if (string.IsNullOrEmpty(tokenRefresco))
            return Unauthorized();

        var respuesta = await _mediador.Send(new RefrescarTokenComando(tokenRefresco));
        return ResponderConSesion(respuesta);
    }

    [AllowAnonymous]
    [HttpPost("cerrar-sesion")]
    public async Task<IActionResult> CerrarSesion()
    {
        var tokenRefresco = Request.Cookies[NombreCookieRefresco];
        if (!string.IsNullOrEmpty(tokenRefresco))
            await _mediador.Send(new CerrarSesionComando(tokenRefresco));

        Response.Cookies.Delete(NombreCookieRefresco, CrearOpcionesCookie(null));
        return NoContent();
    }

    [HttpGet("perfil")]
    public async Task<ActionResult<UsuarioDto>> ObtenerPerfil() => Ok(await _mediador.Send(new ObtenerPerfilActualConsulta()));

    private ActionResult<RespuestaSesion> ResponderConSesion(RespuestaAutenticacionDto respuesta)
    {
        Response.Cookies.Append(NombreCookieRefresco, respuesta.TokenRefresco, CrearOpcionesCookie(respuesta.FechaExpiracionRefresco));
        return Ok(new RespuestaSesion(respuesta.TokenAcceso, respuesta.FechaExpiracionAcceso, respuesta.Usuario));
    }

    // En desarrollo el proxy de Vite sirve por http; fuera de Development la cookie siempre es Secure.
    private CookieOptions CrearOpcionesCookie(DateTime? fechaExpiracion) => new()
    {
        HttpOnly = true,
        Secure = !_entorno.IsDevelopment() || Request.IsHttps,
        SameSite = SameSiteMode.Strict,
        Path = "/api/v1/autenticacion",
        Expires = fechaExpiracion
    };
}
