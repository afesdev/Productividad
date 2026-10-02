using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Boveda;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.APIWeb.Controladores;

[ApiController]
[Route("api/v1/[controller]")]
public class BovedaController : ControllerBase
{
    private readonly ISender _mediador;

    public BovedaController(ISender mediador) => _mediador = mediador;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SecretoResumenDto>>> Listar([FromQuery] Guid? proyectoId, [FromQuery] EntornoBoveda? entorno) =>
        Ok(await _mediador.Send(new ListarSecretosConsulta(proyectoId, entorno)));

    [HttpPost("guardar-secreto")]
    public async Task<IActionResult> GuardarSecreto([FromBody] GuardarSecretoComando comando)
    {
        var idSecreto = await _mediador.Send(comando);
        return Ok(idSecreto);
    }

    [HttpGet("revelar-secreto/{id:guid}")]
    public async Task<IActionResult> RevelarSecreto(Guid id)
    {
        var secretoRevelado = await _mediador.Send(new RevelarSecretoConsulta(id));
        // Evita que proxies o el navegador guarden el valor en caché.
        Response.Headers.CacheControl = "no-store";
        return Ok(secretoRevelado);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        await _mediador.Send(new EliminarSecretoComando(id));
        return NoContent();
    }
}
