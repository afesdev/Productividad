using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Reporte;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.APIWeb.Controladores;

/// <summary>Reporte de actividades para el Excel de la empresa (sale de las entradas del diario con hora) y catálogo de tableros.</summary>
[ApiController]
[Route("api/v1/[controller]")]
public class ReporteController : ControllerBase
{
    private readonly ISender _mediador;

    public ReporteController(ISender mediador) => _mediador = mediador;

    public sealed record CuerpoTablero(string Nombre, Guid? ProyectoId, bool EstaArchivado = false);
    public sealed record CuerpoFila(string Descripcion, TimeOnly HoraInicio, TimeOnly? HoraFin, Guid? TableroReporteId, DateOnly? FechaSolicitud, EstadoActividadReporte Estado);
    public sealed record CuerpoMarcar(IReadOnlyList<Guid> EntradaIds, bool Reportadas = true);
    public sealed record CuerpoExportar(IReadOnlyList<Guid> EntradaIds, string Ejecutor);

    // ---------- Tableros ----------

    [HttpGet("tableros")]
    public async Task<ActionResult<IReadOnlyList<TableroReporteDto>>> ListarTableros() => Ok(await _mediador.Send(new ListarTablerosReporteConsulta()));

    [HttpPost("tableros")]
    public async Task<ActionResult<Guid>> CrearTablero([FromBody] CuerpoTablero cuerpo) =>
        Ok(await _mediador.Send(new GuardarTableroReporteComando(null, cuerpo.Nombre, cuerpo.ProyectoId, cuerpo.EstaArchivado)));

    [HttpPut("tableros/{id:guid}")]
    public async Task<ActionResult<Guid>> ActualizarTablero(Guid id, [FromBody] CuerpoTablero cuerpo) =>
        Ok(await _mediador.Send(new GuardarTableroReporteComando(id, cuerpo.Nombre, cuerpo.ProyectoId, cuerpo.EstaArchivado)));

    [HttpDelete("tableros/{id:guid}")]
    public async Task<IActionResult> EliminarTablero(Guid id)
    {
        await _mediador.Send(new EliminarTableroReporteComando(id));
        return NoContent();
    }

    // ---------- Actividades ----------

    [HttpGet("actividades")]
    public async Task<ActionResult<IReadOnlyList<FilaReporteDto>>> ObtenerActividades([FromQuery] DateOnly desde, [FromQuery] DateOnly hasta, [FromQuery] bool soloPendientes = false) =>
        Ok(await _mediador.Send(new ObtenerReporteActividadesConsulta(desde, hasta, soloPendientes)));

    [HttpPut("actividades/{entradaId:guid}")]
    public async Task<ActionResult<FilaReporteDto>> ActualizarActividad(Guid entradaId, [FromBody] CuerpoFila cuerpo) =>
        Ok(await _mediador.Send(new ActualizarFilaReporteComando(entradaId, cuerpo.Descripcion, cuerpo.HoraInicio, cuerpo.HoraFin, cuerpo.TableroReporteId, cuerpo.FechaSolicitud, cuerpo.Estado)));

    [HttpPost("actividades/reportadas")]
    public async Task<ActionResult<int>> MarcarReportadas([FromBody] CuerpoMarcar cuerpo) =>
        Ok(await _mediador.Send(new MarcarActividadesReportadasComando(cuerpo.EntradaIds, cuerpo.Reportadas)));

    [HttpPost("actividades/excel")]
    public async Task<IActionResult> ExportarExcel([FromBody] CuerpoExportar cuerpo)
    {
        var archivo = await _mediador.Send(new ExportarReporteExcelConsulta(cuerpo.EntradaIds, cuerpo.Ejecutor));
        return File(archivo.Contenido, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", archivo.NombreArchivo);
    }
}
