using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Tiempo;

namespace SolucionProductividad.APIWeb.Controladores;

/// <summary>Registro de tiempo: cronómetro (uno en marcha por usuario) y tramos manuales. Fechas en UTC.</summary>
[ApiController]
[Route("api/v1/[controller]")]
public class TiempoController : ControllerBase
{
    private readonly ISender _mediador;

    public TiempoController(ISender mediador) => _mediador = mediador;

    public sealed record CuerpoIniciar(Guid? TareaId, Guid? TicketId, string? Descripcion);
    public sealed record CuerpoRegistro(Guid? TareaId, Guid? TicketId, string? Descripcion, DateTime FechaInicio, DateTime FechaFin);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RegistroTiempoDto>>> Listar([FromQuery] DateTime desde, [FromQuery] DateTime hasta) =>
        Ok(await _mediador.Send(new ListarRegistrosTiempoConsulta(desde.ToUniversalTime(), hasta.ToUniversalTime())));

    /// <summary>Cronómetro en marcha; 204 si no hay ninguno.</summary>
    [HttpGet("activo")]
    public async Task<ActionResult<RegistroTiempoDto>> ObtenerActivo() =>
        await _mediador.Send(new ObtenerCronometroActivoConsulta()) is { } activo ? Ok(activo) : NoContent();

    [HttpPost("iniciar")]
    public async Task<ActionResult<RegistroTiempoDto>> Iniciar([FromBody] CuerpoIniciar cuerpo) =>
        Ok(await _mediador.Send(new IniciarCronometroComando(cuerpo.TareaId, cuerpo.TicketId, cuerpo.Descripcion)));

    /// <summary>Detiene el cronómetro; 204 si no había ninguno en marcha.</summary>
    [HttpPost("detener")]
    public async Task<ActionResult<RegistroTiempoDto>> Detener() =>
        await _mediador.Send(new DetenerCronometroComando()) is { } detenido ? Ok(detenido) : NoContent();

    [HttpPost]
    public async Task<ActionResult<Guid>> Crear([FromBody] CuerpoRegistro cuerpo) =>
        Ok(await _mediador.Send(new GuardarRegistroTiempoComando(null, cuerpo.TareaId, cuerpo.TicketId, cuerpo.Descripcion, cuerpo.FechaInicio.ToUniversalTime(), cuerpo.FechaFin.ToUniversalTime())));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Guid>> Actualizar(Guid id, [FromBody] CuerpoRegistro cuerpo) =>
        Ok(await _mediador.Send(new GuardarRegistroTiempoComando(id, cuerpo.TareaId, cuerpo.TicketId, cuerpo.Descripcion, cuerpo.FechaInicio.ToUniversalTime(), cuerpo.FechaFin.ToUniversalTime())));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        await _mediador.Send(new EliminarRegistroTiempoComando(id));
        return NoContent();
    }
}
