using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Archivos.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Archivos.Dtos;

namespace SolucionProductividad.APIWeb.Controladores;

[ApiController]
[Route("api/v1/[controller]")]
public class ArchivosController : ControllerBase
{
    private readonly ISender _mediador;

    public ArchivosController(ISender mediador)
    {
        _mediador = mediador;
    }

    [HttpPost("subir")]
    [RequestSizeLimit(16 * 1024 * 1024)]
    public async Task<ActionResult<ArchivoAdjuntoDto>> SubirAdjunto([FromForm] SubirArchivoAdjuntoComando comando)
    {
        var respuesta = await _mediador.Send(comando);
        return Ok(respuesta);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        await _mediador.Send(new EliminarArchivoAdjuntoComando(id));
        return NoContent();
    }
}
