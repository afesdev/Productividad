using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SolucionProductividad.Aplicacion.Caracteristicas.Flujos;

namespace SolucionProductividad.APIWeb.Controladores;

/// <summary>Diagramas de procesos (usuario, vistas, validaciones, procedimientos…) del usuario.</summary>
[ApiController]
[Route("api/v1/[controller]")]
public class FlujosController : ControllerBase
{
    private readonly ISender _mediador;

    public FlujosController(ISender mediador) => _mediador = mediador;

    public sealed record CuerpoDatos(string Titulo, string? Sistema, string? Descripcion);
    public sealed record CuerpoContenido(string ContenidoJson);
    public sealed record CuerpoGenerar(string Descripcion);
    public sealed record RespuestaGenerar(string Texto);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<FlujoResumenDto>>> Listar([FromQuery] string? texto = null) =>
        Ok(await _mediador.Send(new ListarFlujosConsulta(texto)));

    [HttpGet("sistemas")]
    public async Task<ActionResult<IReadOnlyList<string>>> ListarSistemas() => Ok(await _mediador.Send(new ListarSistemasFlujoConsulta()));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FlujoDetalleDto>> ObtenerPorId(Guid id) => Ok(await _mediador.Send(new ObtenerFlujoConsulta(id)));

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CuerpoDatos cuerpo)
    {
        var id = await _mediador.Send(new CrearFlujoComando(cuerpo.Titulo, cuerpo.Sistema, cuerpo.Descripcion));
        return CreatedAtAction(nameof(ObtenerPorId), new { id }, id);
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> ActualizarDatos(Guid id, [FromBody] CuerpoDatos cuerpo)
    {
        await _mediador.Send(new ActualizarDatosFlujoComando(id, cuerpo.Titulo, cuerpo.Sistema, cuerpo.Descripcion));
        return NoContent();
    }

    [HttpPut("{id:guid}/contenido")]
    [RequestSizeLimit(6_000_000)]
    public async Task<ActionResult<FlujoGuardadoDto>> GuardarContenido(Guid id, [FromBody] CuerpoContenido cuerpo) =>
        Ok(await _mediador.Send(new GuardarContenidoFlujoComando(id, cuerpo.ContenidoJson)));

    [HttpPost("{id:guid}/duplicar")]
    public async Task<ActionResult<Guid>> Duplicar(Guid id) => Ok(await _mediador.Send(new DuplicarFlujoComando(id)));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        await _mediador.Send(new EliminarFlujoComando(id));
        return NoContent();
    }

    /// <summary>Devuelve el flujo en la sintaxis de texto del editor a partir de una descripción libre.</summary>
    [HttpPost("generar")]
    [EnableRateLimiting("ia")]
    public async Task<ActionResult<RespuestaGenerar>> Generar([FromBody] CuerpoGenerar cuerpo, CancellationToken tokenCancelacion) =>
        Ok(new RespuestaGenerar(await _mediador.Send(new GenerarFlujoConIAComando(cuerpo.Descripcion), tokenCancelacion)));
}
