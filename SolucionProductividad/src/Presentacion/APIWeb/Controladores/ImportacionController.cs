using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Importacion;

namespace SolucionProductividad.APIWeb.Controladores;

/// <summary>Importación desde un vault de Obsidian (las notas se interpretan en el navegador).</summary>
[ApiController]
[Route("api/v1/[controller]")]
public class ImportacionController : ControllerBase
{
    private readonly ISender _mediador;

    public ImportacionController(ISender mediador) => _mediador = mediador;

    [HttpPost("tickets")]
    [RequestSizeLimit(20_000_000)]
    public async Task<ActionResult<IReadOnlyList<ResultadoImportacionDto>>> ImportarTickets([FromBody] ImportarTicketsComando comando) => Ok(await _mediador.Send(comando));

    [HttpPost("diario")]
    [RequestSizeLimit(50_000_000)]
    public async Task<ActionResult<IReadOnlyList<ResultadoImportacionDto>>> ImportarDiario([FromBody] ImportarNotasDiarioComando comando) => Ok(await _mediador.Send(comando));
}
