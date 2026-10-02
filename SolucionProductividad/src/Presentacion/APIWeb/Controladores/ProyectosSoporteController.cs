using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Dtos;

namespace SolucionProductividad.APIWeb.Controladores;

/// <summary>Proyectos (categorías) de los tickets de soporte.</summary>
[ApiController]
[Route("api/v1/proyectos-soporte")]
public class ProyectosSoporteController : ControllerBase
{
    private readonly ISender _mediador;

    public ProyectosSoporteController(ISender mediador) => _mediador = mediador;

    public sealed record CuerpoProyecto(string Nombre, string? Descripcion, string Color, bool EstaActivo = true);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProyectoSoporteDto>>> Listar([FromQuery] bool incluirInactivos = false) =>
        Ok(await _mediador.Send(new ListarProyectosSoporteConsulta(incluirInactivos)));

    [HttpPost]
    public async Task<ActionResult<Guid>> Crear([FromBody] CuerpoProyecto cuerpo) =>
        Ok(await _mediador.Send(new GuardarProyectoSoporteComando(null, cuerpo.Nombre, cuerpo.Descripcion, cuerpo.Color, cuerpo.EstaActivo)));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Guid>> Actualizar(Guid id, [FromBody] CuerpoProyecto cuerpo) =>
        Ok(await _mediador.Send(new GuardarProyectoSoporteComando(id, cuerpo.Nombre, cuerpo.Descripcion, cuerpo.Color, cuerpo.EstaActivo)));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        await _mediador.Send(new EliminarProyectoSoporteComando(id));
        return NoContent();
    }
}
