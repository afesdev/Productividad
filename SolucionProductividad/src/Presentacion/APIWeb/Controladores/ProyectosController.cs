using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Proyectos;

namespace SolucionProductividad.APIWeb.Controladores;

[ApiController]
[Route("api/v1/[controller]")]
public class ProyectosController : ControllerBase
{
    private readonly ISender _mediador;

    public ProyectosController(ISender mediador) => _mediador = mediador;

    public sealed record CuerpoCrearLista(string Nombre, Guid? CarpetaId);
    public sealed record CuerpoActualizarProyecto(string Nombre, string? Descripcion);
    public sealed record CuerpoCrearCarpeta(string Nombre, string? Icono);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProyectoDto>>> Listar() => Ok(await _mediador.Send(new ListarProyectosConsulta()));

    [HttpPost]
    public async Task<ActionResult<Guid>> Crear([FromBody] CrearProyectoComando comando)
    {
        var idProyecto = await _mediador.Send(comando);
        return Created($"/api/v1/proyectos/{idProyecto}", idProyecto);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] CuerpoActualizarProyecto cuerpo)
    {
        await _mediador.Send(new ActualizarProyectoComando(id, cuerpo.Nombre, cuerpo.Descripcion));
        return NoContent();
    }

    [HttpGet("{id:guid}/estructura")]
    public async Task<ActionResult<EstructuraProyectoDto>> ObtenerEstructura(Guid id) =>
        Ok(await _mediador.Send(new ObtenerEstructuraProyectoConsulta(id)));

    [HttpPost("{id:guid}/carpetas")]
    public async Task<ActionResult<Guid>> CrearCarpeta(Guid id, [FromBody] CuerpoCrearCarpeta cuerpo)
    {
        var idCarpeta = await _mediador.Send(new CrearCarpetaComando(id, cuerpo.Nombre, cuerpo.Icono));
        return Created($"/api/v1/carpetas/{idCarpeta}", idCarpeta);
    }

    [HttpGet("{id:guid}/listas")]
    public async Task<ActionResult<IReadOnlyList<ListaTareasDto>>> ListarListas(Guid id) =>
        Ok(await _mediador.Send(new ListarListasTareasConsulta(id)));

    [HttpPost("{id:guid}/listas")]
    public async Task<ActionResult<Guid>> CrearLista(Guid id, [FromBody] CuerpoCrearLista cuerpo)
    {
        var idLista = await _mediador.Send(new CrearListaTareasComando(id, cuerpo.Nombre, cuerpo.CarpetaId));
        return Created($"/api/v1/proyectos/{id}/listas", idLista);
    }
}
