using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Calendario;

namespace SolucionProductividad.APIWeb.Controladores;

/// <summary>Calendario de Outlook/Teams publicado como ICS: conexión y lectura de eventos (solo lectura).</summary>
[ApiController]
[Route("api/v1/[controller]")]
public class CalendarioController : ControllerBase
{
    private readonly ISender _mediador;

    public CalendarioController(ISender mediador) => _mediador = mediador;

    public sealed record CuerpoConectar(string UrlIcs);

    [HttpGet("conexion")]
    public async Task<ActionResult<EstadoConexionCalendarioDto>> ObtenerConexion() =>
        Ok(await _mediador.Send(new ObtenerEstadoConexionCalendarioConsulta()));

    [HttpPut("conexion")]
    public async Task<ActionResult<EstadoConexionCalendarioDto>> Conectar([FromBody] CuerpoConectar cuerpo) =>
        Ok(await _mediador.Send(new ConectarCalendarioComando(cuerpo.UrlIcs)));

    [HttpDelete("conexion")]
    public async Task<IActionResult> Desconectar()
    {
        await _mediador.Send(new DesconectarCalendarioComando());
        return NoContent();
    }

    /// <summary>Eventos que se solapan con [desde, hasta). <paramref name="actualizar"/> ignora la caché de unos minutos.</summary>
    [HttpGet("eventos")]
    public async Task<ActionResult<IReadOnlyList<EventoCalendarioDto>>> ObtenerEventos([FromQuery] DateTimeOffset desde, [FromQuery] DateTimeOffset hasta, [FromQuery] bool actualizar = false) =>
        Ok(await _mediador.Send(new ObtenerEventosCalendarioConsulta(desde, hasta, actualizar)));
}
