using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Proyectos;

namespace SolucionProductividad.APIWeb.Controladores;

[ApiController]
[Route("api/v1/[controller]")]
public class ListasController : ControllerBase
{
    private readonly ISender _mediador;

    public ListasController(ISender mediador) => _mediador = mediador;

    public sealed record CuerpoActualizarLista(string Nombre, Guid? CarpetaId);

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] CuerpoActualizarLista cuerpo)
    {
        await _mediador.Send(new ActualizarListaTareasComando(id, cuerpo.Nombre, cuerpo.CarpetaId));
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        await _mediador.Send(new EliminarListaTareasComando(id));
        return NoContent();
    }
}
