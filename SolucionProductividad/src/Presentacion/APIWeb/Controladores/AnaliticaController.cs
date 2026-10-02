using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Analitica.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Analitica.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;

namespace SolucionProductividad.APIWeb.Controladores;

[ApiController]
[Route("api/v1/[controller]")]
public class AnaliticaController : ControllerBase
{
    private readonly ISender _mediador;
    private readonly IServicioUsuarioActual _usuarioActual;

    public AnaliticaController(ISender mediador, IServicioUsuarioActual usuarioActual)
    {
        _mediador = mediador;
        _usuarioActual = usuarioActual;
    }

    /// <summary>
    /// KPIs personales. Por defecto: últimas 8 semanas hasta mañana (rango [fechaInicio, fechaFin)).
    /// usuarioId solo es aceptado para administradores.
    /// </summary>
    [HttpGet("resumen")]
    public async Task<ActionResult<ResumenAnaliticaPersonalDto>> ObtenerResumen(
        [FromQuery] DateTime? fechaInicio,
        [FromQuery] DateTime? fechaFin,
        [FromQuery] Guid? usuarioId,
        [FromQuery] int desplazamientoMinutos = 0)
    {
        var fin = fechaFin ?? DateTime.UtcNow.Date.AddDays(1);
        var inicio = fechaInicio ?? fin.AddDays(-56);
        var idUsuario = usuarioId ?? _usuarioActual.ObtenerUsuarioIdRequerido();

        return Ok(await _mediador.Send(new ObtenerResumenAnaliticaPersonalConsulta(idUsuario, inicio, fin, desplazamientoMinutos)));
    }
}
