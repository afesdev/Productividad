using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Dtos;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.APIWeb.Controladores;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = NombresRoles.Administrador)]
public class UsuariosController : ControllerBase
{
    private readonly ISender _mediador;

    public UsuariosController(ISender mediador) => _mediador = mediador;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UsuarioDto>>> Listar() => Ok(await _mediador.Send(new ListarUsuariosConsulta()));

    [HttpPost("{id:guid}/roles/{nombreRol}")]
    public async Task<IActionResult> AsignarRol(Guid id, string nombreRol)
    {
        await _mediador.Send(new AsignarRolUsuarioComando(id, nombreRol));
        return NoContent();
    }

    [HttpDelete("{id:guid}/roles/{nombreRol}")]
    public async Task<IActionResult> RetirarRol(Guid id, string nombreRol)
    {
        await _mediador.Send(new AsignarRolUsuarioComando(id, nombreRol, Asignar: false));
        return NoContent();
    }
}
