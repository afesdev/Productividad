using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Diario;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.APIWeb.Controladores;

/// <summary>Diario: una nota por día (Markdown) más entradas tipadas. Fechas en formato AAAA-MM-DD.</summary>
[ApiController]
[Route("api/v1/[controller]")]
public class DiarioController : ControllerBase
{
    private readonly ISender _mediador;

    public DiarioController(ISender mediador) => _mediador = mediador;

    public sealed record CuerpoNota(string ContenidoMarkdown, byte? Animo, byte? Energia);
    public sealed record CuerpoEntrada(TipoEntradaDiario Tipo, string Titulo, string? DetalleMarkdown, TimeOnly? HoraInicio, TimeOnly? HoraFin, bool Completada = false, Guid? TableroReporteId = null);

    [HttpGet("mes")]
    public async Task<ActionResult<IReadOnlyList<ResumenDiaDiarioDto>>> ObtenerMes([FromQuery] int anio, [FromQuery] int mes) =>
        Ok(await _mediador.Send(new ObtenerMesDiarioConsulta(anio, mes)));

    [HttpGet("entradas")]
    public async Task<ActionResult<IReadOnlyList<EntradaExploradaDto>>> Explorar(
        [FromQuery] TipoEntradaDiario? tipo = null,
        [FromQuery] string? texto = null,
        [FromQuery] DateOnly? desde = null,
        [FromQuery] DateOnly? hasta = null) =>
        Ok(await _mediador.Send(new ExplorarEntradasDiarioConsulta(tipo, texto, desde, hasta)));

    /// <param name="desplazamiento">Minutos que la hora local va por delante de UTC (-new Date().getTimezoneOffset()).</param>
    [HttpGet("revision")]
    public async Task<ActionResult<RevisionDiarioDto>> ObtenerRevision([FromQuery] DateOnly desde, [FromQuery] DateOnly hasta, [FromQuery] int desplazamiento = 0) =>
        Ok(await _mediador.Send(new ObtenerRevisionDiarioConsulta(desde, hasta, desplazamiento)));

    [HttpGet("{fecha}/actividad")]
    public async Task<ActionResult<ActividadDiaDto>> ObtenerActividad(DateOnly fecha, [FromQuery] int desplazamiento = 0) =>
        Ok(await _mediador.Send(new ObtenerActividadDiaConsulta(fecha, desplazamiento)));

    /// <summary>Días con registro del rango (vista semanal y exportación a Markdown).</summary>
    [HttpGet("rango")]
    public async Task<ActionResult<IReadOnlyList<DiaDiarioDto>>> ObtenerRango([FromQuery] DateOnly desde, [FromQuery] DateOnly hasta) =>
        Ok(await _mediador.Send(new ObtenerRangoDiarioConsulta(desde, hasta)));

    public sealed record CuerpoConvertir(Guid ListaTareaId, string? Titulo, bool EsUrgente = false, bool EsImportante = true);

    [HttpPost("entradas/{id:guid}/convertir-en-tarea")]
    public async Task<ActionResult<Guid>> ConvertirEnTarea(Guid id, [FromBody] CuerpoConvertir cuerpo) =>
        Ok(await _mediador.Send(new ConvertirEntradaEnTareaComando(id, cuerpo.ListaTareaId, cuerpo.Titulo, cuerpo.EsUrgente, cuerpo.EsImportante)));

    [HttpGet("registros/{registroId:guid}/fecha")]
    public async Task<ActionResult<DateOnly>> ObtenerFechaRegistro(Guid registroId) =>
        Ok(await _mediador.Send(new ObtenerFechaRegistroDiarioConsulta(registroId)));

    [HttpGet("{fecha}")]
    public async Task<ActionResult<DiaDiarioDto>> ObtenerDia(DateOnly fecha) => Ok(await _mediador.Send(new ObtenerDiaDiarioConsulta(fecha)));

    [HttpPut("{fecha}/nota")]
    public async Task<ActionResult<Guid>> GuardarNota(DateOnly fecha, [FromBody] CuerpoNota cuerpo) =>
        Ok(await _mediador.Send(new GuardarNotaDiarioComando(fecha, cuerpo.ContenidoMarkdown, cuerpo.Animo, cuerpo.Energia)));

    [HttpPost("{fecha}/entradas")]
    public async Task<ActionResult<Guid>> CrearEntrada(DateOnly fecha, [FromBody] CuerpoEntrada cuerpo) =>
        Ok(await _mediador.Send(new CrearEntradaDiarioComando(fecha, cuerpo.Tipo, cuerpo.Titulo, cuerpo.DetalleMarkdown, cuerpo.HoraInicio, cuerpo.HoraFin, cuerpo.Completada, cuerpo.TableroReporteId)));

    [HttpPut("entradas/{id:guid}")]
    public async Task<IActionResult> ActualizarEntrada(Guid id, [FromBody] CuerpoEntrada cuerpo)
    {
        await _mediador.Send(new ActualizarEntradaDiarioComando(id, cuerpo.Tipo, cuerpo.Titulo, cuerpo.DetalleMarkdown, cuerpo.HoraInicio, cuerpo.HoraFin, cuerpo.Completada, cuerpo.TableroReporteId));
        return NoContent();
    }

    [HttpDelete("entradas/{id:guid}")]
    public async Task<IActionResult> EliminarEntrada(Guid id)
    {
        await _mediador.Send(new EliminarEntradaDiarioComando(id));
        return NoContent();
    }
}
