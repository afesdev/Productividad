using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Documentos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Dtos;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.APIWeb.Controladores;

[ApiController]
[Route("api/v1/[controller]")]
public class TareasController : ControllerBase
{
    private readonly ISender _mediador;

    public TareasController(ISender mediador) => _mediador = mediador;

    public sealed record CuerpoMoverCuadrante(CuadranteEisenhower Cuadrante);
    public sealed record CuerpoCambiarEstado(EstadoTarea Estado);
    public sealed record CuerpoMoverTarea(Guid ListaTareaId, EstadoTarea Estado, Guid? AntesDeTareaId);
    public sealed record CuerpoActualizarTarea(
        string Titulo,
        string? DescripcionMarkdown,
        Prioridad Prioridad,
        bool EsUrgente,
        bool EsImportante,
        DateTime? FechaVencimiento,
        decimal? HorasEstimadas);

    [HttpPost]
    public async Task<IActionResult> CrearTarea([FromBody] CrearTareaComando comando)
    {
        var idTarea = await _mediador.Send(comando);
        return CreatedAtAction(nameof(ObtenerPorId), new { id = idTarea }, idTarea);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TareaDetalleDto>> ObtenerPorId(Guid id)
    {
        var resultado = await _mediador.Send(new ObtenerTareaPorIdConsulta(id));
        return Ok(resultado);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TareaResumenDto>>> ListarPorProyecto([FromQuery] Guid proyectoId, [FromQuery] Guid? listaTareaId) =>
        Ok(await _mediador.Send(new ListarTareasProyectoConsulta(proyectoId, listaTareaId)));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TareaResumenDto>> Actualizar(Guid id, [FromBody] CuerpoActualizarTarea cuerpo) =>
        Ok(await _mediador.Send(new ActualizarTareaComando(id, cuerpo.Titulo, cuerpo.DescripcionMarkdown, cuerpo.Prioridad,
            cuerpo.EsUrgente, cuerpo.EsImportante, cuerpo.FechaVencimiento, cuerpo.HorasEstimadas)));

    [HttpPatch("{id:guid}/mover")]
    public async Task<ActionResult<TareaResumenDto>> Mover(Guid id, [FromBody] CuerpoMoverTarea cuerpo) =>
        Ok(await _mediador.Send(new MoverTareaComando(id, cuerpo.ListaTareaId, cuerpo.Estado, cuerpo.AntesDeTareaId)));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        await _mediador.Send(new EliminarTareaComando(id));
        return NoContent();
    }

    [HttpGet("matriz-eisenhower")]
    public async Task<ActionResult<MatrizEisenhowerDto>> ObtenerMatrizEisenhower([FromQuery] Guid proyectoId)
    {
        var matriz = await _mediador.Send(new ObtenerMatrizEisenhowerConsulta(proyectoId));
        return Ok(matriz);
    }

    [HttpPatch("{id:guid}/cuadrante")]
    public async Task<ActionResult<TareaResumenDto>> MoverCuadrante(Guid id, [FromBody] CuerpoMoverCuadrante cuerpo) =>
        Ok(await _mediador.Send(new MoverTareaCuadranteComando(id, cuerpo.Cuadrante)));

    [HttpPatch("{id:guid}/estado")]
    public async Task<ActionResult<TareaResumenDto>> CambiarEstado(Guid id, [FromBody] CuerpoCambiarEstado cuerpo) =>
        Ok(await _mediador.Send(new CambiarEstadoTareaComando(id, cuerpo.Estado)));

    [HttpGet("{id:guid}/backlinks")]
    public async Task<ActionResult<IReadOnlyList<BacklinkDto>>> ObtenerBacklinks(Guid id) =>
        Ok(await _mediador.Send(new ObtenerBacklinksConsulta(TipoEntidad.Tarea, id)));
}
