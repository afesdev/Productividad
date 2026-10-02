using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Lienzos;

namespace SolucionProductividad.APIWeb.Controladores;

/// <summary>Lienzos (pizarras infinitas estilo Excalidraw) del usuario.</summary>
[ApiController]
[Route("api/v1/[controller]")]
public class LienzosController : ControllerBase
{
    private readonly ISender _mediador;

    public LienzosController(ISender mediador) => _mediador = mediador;

    public sealed record CuerpoCrear(string Titulo);
    public sealed record CuerpoRenombrar(string Titulo);
    public sealed record CuerpoGuardar(string ContenidoJson);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<LienzoResumenDto>>> Listar() => Ok(await _mediador.Send(new ListarLienzosConsulta()));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LienzoDetalleDto>> ObtenerPorId(Guid id) => Ok(await _mediador.Send(new ObtenerLienzoPorIdConsulta(id)));

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CuerpoCrear cuerpo)
    {
        var id = await _mediador.Send(new CrearLienzoComando(cuerpo.Titulo));
        return CreatedAtAction(nameof(ObtenerPorId), new { id }, id);
    }

    [HttpPatch("{id:guid}/titulo")]
    public async Task<IActionResult> Renombrar(Guid id, [FromBody] CuerpoRenombrar cuerpo)
    {
        await _mediador.Send(new RenombrarLienzoComando(id, cuerpo.Titulo));
        return NoContent();
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<LienzoGuardadoDto>> Guardar(Guid id, [FromBody] CuerpoGuardar cuerpo) =>
        Ok(await _mediador.Send(new GuardarLienzoComando(id, cuerpo.ContenidoJson)));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        await _mediador.Send(new EliminarLienzoComando(id));
        return NoContent();
    }
}
