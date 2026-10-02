using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SolucionProductividad.Aplicacion.Caracteristicas.IA;

namespace SolucionProductividad.APIWeb.Controladores;

[ApiController]
[Route("api/v1/ia")]
[EnableRateLimiting("ia")]
public class IAController : ControllerBase
{
    private readonly ISender _mediador;

    public IAController(ISender mediador) => _mediador = mediador;

    public sealed record RespuestaTextoIA(string Texto);

    [HttpPost("texto")]
    public async Task<ActionResult<RespuestaTextoIA>> TransformarTexto(TransformarTextoIAComando comando, CancellationToken tokenCancelacion) =>
        Ok(new RespuestaTextoIA(await _mediador.Send(comando, tokenCancelacion)));
}
