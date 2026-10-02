using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Documentos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Dtos;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.APIWeb.Controladores;

[ApiController]
[Route("api/v1/[controller]")]
public class TicketsController : ControllerBase
{
    private readonly ISender _mediador;

    public TicketsController(ISender mediador) => _mediador = mediador;

    public sealed record CuerpoActualizarTicket(
        string Asunto,
        TipoTicket Tipo,
        Prioridad Prioridad,
        string NombreSolicitante,
        string CorreoSolicitante,
        string? DescripcionMarkdown,
        string? NumeroExterno,
        string? IdSeguimiento,
        decimal? HorasDedicadas,
        DateTime? FechaVencimiento,
        IReadOnlyList<Guid>? ProyectoIds);
    public sealed record CuerpoDocumentacion(string? DocumentacionMarkdown);
    public sealed record CuerpoAsignar(Guid? AgenteId);
    public sealed record CuerpoCambiarEstado(EstadoTicket NuevoEstado, string? Comentario);
    public sealed record CuerpoNuevoMensaje(string CuerpoMensaje, bool EsNotaInterna);
    public sealed record CuerpoVincularTarea(Guid? TareaId);
    public sealed record CuerpoVincularRama(Guid RepositorioId, string NombreRama);
    public sealed record CuerpoDespliegue(AmbienteDespliegue Ambiente, string? Referencia, string? Notas);
    public sealed record CuerpoResultadoPruebas(bool Aprobado, string? Notas);

    // ---------- Consulta ----------

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TicketResumenDto>>> Listar(
        [FromQuery] VistaTickets vista = VistaTickets.Abiertos,
        [FromQuery] string? texto = null,
        [FromQuery] TipoTicket? tipo = null,
        [FromQuery] Guid? proyectoId = null) =>
        Ok(await _mediador.Send(new ListarTicketsConsulta(vista, texto, tipo, proyectoId)));

    [HttpGet("conteos")]
    public async Task<ActionResult<ConteoTicketsDto>> ObtenerConteos() => Ok(await _mediador.Send(new ObtenerConteoTicketsConsulta()));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TicketDetalleDto>> ObtenerPorId(Guid id) => Ok(await _mediador.Send(new ObtenerTicketDetalleConsulta(id)));

    [HttpGet("usuarios-asignables")]
    public async Task<ActionResult<IReadOnlyList<UsuarioAsignableDto>>> ListarUsuariosAsignables() => Ok(await _mediador.Send(new ListarUsuariosAsignablesConsulta()));

    [HttpGet("{id:guid}/backlinks")]
    public async Task<ActionResult<IReadOnlyList<BacklinkDto>>> ObtenerBacklinks(Guid id) =>
        Ok(await _mediador.Send(new ObtenerBacklinksConsulta(TipoEntidad.Ticket, id)));

    // ---------- Datos del ticket ----------

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearTicketComando comando)
    {
        var id = await _mediador.Send(comando);
        return CreatedAtAction(nameof(ObtenerPorId), new { id }, id);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] CuerpoActualizarTicket cuerpo)
    {
        await _mediador.Send(new ActualizarTicketComando(id, cuerpo.Asunto, cuerpo.Tipo, cuerpo.Prioridad, cuerpo.NombreSolicitante, cuerpo.CorreoSolicitante,
            cuerpo.DescripcionMarkdown, cuerpo.NumeroExterno, cuerpo.IdSeguimiento, cuerpo.HorasDedicadas, cuerpo.FechaVencimiento, cuerpo.ProyectoIds));
        return NoContent();
    }

    [HttpPut("{id:guid}/documentacion")]
    public async Task<IActionResult> ActualizarDocumentacion(Guid id, [FromBody] CuerpoDocumentacion cuerpo)
    {
        await _mediador.Send(new ActualizarDocumentacionTicketComando(id, cuerpo.DocumentacionMarkdown));
        return NoContent();
    }

    [HttpPatch("{id:guid}/asignar")]
    public async Task<IActionResult> Asignar(Guid id, [FromBody] CuerpoAsignar cuerpo)
    {
        await _mediador.Send(new AsignarTicketComando(id, cuerpo.AgenteId));
        return NoContent();
    }

    [HttpPatch("{id:guid}/estado")]
    public async Task<IActionResult> CambiarEstado(Guid id, [FromBody] CuerpoCambiarEstado cuerpo)
    {
        await _mediador.Send(new CambiarEstadoTicketComando(id, cuerpo.NuevoEstado, cuerpo.Comentario));
        return NoContent();
    }

    [HttpPost("{id:guid}/mensajes")]
    public async Task<ActionResult<Guid>> AgregarMensaje(Guid id, [FromBody] CuerpoNuevoMensaje cuerpo) =>
        Ok(await _mediador.Send(new AgregarMensajeTicketComando(id, cuerpo.CuerpoMensaje, cuerpo.EsNotaInterna)));

    [HttpPatch("{id:guid}/tarea")]
    public async Task<IActionResult> VincularTarea(Guid id, [FromBody] CuerpoVincularTarea cuerpo)
    {
        await _mediador.Send(new VincularTareaTicketComando(id, cuerpo.TareaId));
        return NoContent();
    }

    // ---------- Código (GitHub, solo lectura: ramas y PRs se crean fuera de la app) ----------

    [HttpGet("{id:guid}/ramas-detectadas")]
    public async Task<ActionResult<DeteccionRamasDto>> DetectarRamas(Guid id) => Ok(await _mediador.Send(new DetectarRamasTicketConsulta(id)));

    [HttpPost("{id:guid}/ramas")]
    public async Task<ActionResult<Guid>> VincularRama(Guid id, [FromBody] CuerpoVincularRama cuerpo) =>
        Ok(await _mediador.Send(new VincularRamaTicketComando(id, cuerpo.RepositorioId, cuerpo.NombreRama)));

    [HttpPost("ramas/{ramaId:guid}/sincronizar")]
    public async Task<IActionResult> Sincronizar(Guid ramaId)
    {
        await _mediador.Send(new SincronizarRamaTicketComando(ramaId));
        return NoContent();
    }

    [HttpGet("archivos-modificados/{archivoId:guid}/diferencia")]
    public async Task<ActionResult<DiferenciaArchivoDto>> ObtenerDiferencia(Guid archivoId) =>
        Ok(await _mediador.Send(new ObtenerDiferenciaArchivoConsulta(archivoId)));

    [HttpDelete("ramas/{ramaId:guid}")]
    public async Task<IActionResult> DesvincularRama(Guid ramaId)
    {
        await _mediador.Send(new DesvincularRamaTicketComando(ramaId));
        return NoContent();
    }

    // ---------- Despliegues y pruebas ----------

    [HttpPost("{id:guid}/despliegues")]
    public async Task<ActionResult<Guid>> RegistrarDespliegue(Guid id, [FromBody] CuerpoDespliegue cuerpo) =>
        Ok(await _mediador.Send(new RegistrarDespliegueTicketComando(id, cuerpo.Ambiente, cuerpo.Referencia, cuerpo.Notas)));

    [HttpPost("{id:guid}/resultado-pruebas")]
    public async Task<IActionResult> RegistrarResultadoPruebas(Guid id, [FromBody] CuerpoResultadoPruebas cuerpo)
    {
        await _mediador.Send(new RegistrarResultadoPruebasComando(id, cuerpo.Aprobado, cuerpo.Notas));
        return NoContent();
    }
}
