using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Proyectos;

namespace SolucionProductividad.APIWeb.Controladores;

[ApiController]
[Route("api/v1/[controller]")]
public class CarpetasController : ControllerBase
{
    private readonly ISender _mediador;

    public CarpetasController(ISender mediador) => _mediador = mediador;

    public sealed record CuerpoActualizarCarpeta(string Nombre, string? Icono);

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] CuerpoActualizarCarpeta cuerpo)
    {
        await _mediador.Send(new ActualizarCarpetaComando(id, cuerpo.Nombre, cuerpo.Icono));
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        await _mediador.Send(new EliminarCarpetaComando(id));
        return NoContent();
    }
}
