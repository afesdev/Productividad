using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Trello;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;

namespace SolucionProductividad.APIWeb.Controladores;

/// <summary>Cuenta de Trello del usuario: conexión y lectura de tableros y tarjetas (solo lectura, proxy de la API de Trello).</summary>
[ApiController]
[Route("api/v1/[controller]")]
public class TrelloController : ControllerBase
{
    private readonly ISender _mediador;

    public TrelloController(ISender mediador) => _mediador = mediador;

    public sealed record CuerpoConectar(string Token);
    public sealed record CuerpoVincular(string Tarjeta, Guid? TareaId, Guid? TicketId);
    public sealed record CuerpoImportar(Guid ListaTareaId);

    [HttpGet("conexion")]
    public async Task<ActionResult<EstadoConexionTrelloDto>> ObtenerConexion() =>
        Ok(await _mediador.Send(new ObtenerEstadoConexionTrelloConsulta()));

    [HttpPut("conexion")]
    public async Task<ActionResult<EstadoConexionTrelloDto>> Conectar([FromBody] CuerpoConectar cuerpo) =>
        Ok(await _mediador.Send(new ConectarTrelloComando(cuerpo.Token)));

    [HttpDelete("conexion")]
    public async Task<IActionResult> Desconectar()
    {
        await _mediador.Send(new DesconectarTrelloComando());
        return NoContent();
    }

    /// <summary><paramref name="actualizar"/> ignora la caché de un par de minutos.</summary>
    [HttpGet("tableros")]
    public async Task<ActionResult<IReadOnlyList<TableroTrelloResumen>>> ListarTableros([FromQuery] bool actualizar = false) =>
        Ok(await _mediador.Send(new ListarTablerosTrelloConsulta(actualizar)));

    [HttpGet("tableros/{id}")]
    public async Task<ActionResult<TableroTrello>> ObtenerTablero(string id, [FromQuery] bool actualizar = false) =>
        Ok(await _mediador.Send(new ObtenerTableroTrelloConsulta(id, actualizar)));

    [HttpGet("tarjetas/{id}")]
    public async Task<ActionResult<TarjetaTrelloDetalle>> ObtenerTarjeta(string id) =>
        Ok(await _mediador.Send(new ObtenerTarjetaTrelloConsulta(id)));

    [HttpGet("mis-tarjetas")]
    public async Task<ActionResult<IReadOnlyList<TarjetaAsignadaTrello>>> ListarMisTarjetas([FromQuery] bool actualizar = false) =>
        Ok(await _mediador.Send(new ListarMisTarjetasTrelloConsulta(actualizar)));

    /// <summary>
    /// Imagen subida a una tarjeta (Trello exige autenticación para descargarla). Solo PNG, JPEG, GIF y WebP; el navegador
    /// la pide con su sesión y la muestra como blob.
    /// </summary>
    [HttpGet("tarjetas/{idTarjeta}/adjuntos/{idAdjunto}/imagen")]
    public async Task<IActionResult> ObtenerImagenAdjunto(string idTarjeta, string idAdjunto)
    {
        var imagen = await _mediador.Send(new ObtenerImagenAdjuntoTrelloConsulta(idTarjeta, idAdjunto));
        Response.Headers.XContentTypeOptions = "nosniff";
        Response.Headers.CacheControl = "private, max-age=900";
        return File(imagen.Contenido, imagen.TipoContenido);
    }

    /// <summary>Si <paramref name="texto"/> es un enlace o id de tarjeta devuelve esa tarjeta; si no, busca en Trello.</summary>
    [HttpGet("tarjetas/buscar")]
    public async Task<ActionResult<IReadOnlyList<TarjetaAsignadaTrello>>> BuscarTarjetas([FromQuery] string texto) =>
        Ok(await _mediador.Send(new BuscarTarjetasTrelloConsulta(texto)));

    /// <summary>Crea una tarea a partir de la tarjeta y la deja vinculada. Devuelve el Id de la tarea.</summary>
    [HttpPost("tarjetas/{id}/importar")]
    public async Task<ActionResult<Guid>> ImportarTarjeta(string id, [FromBody] CuerpoImportar cuerpo) =>
        Ok(await _mediador.Send(new ImportarTarjetaTrelloComando(id, cuerpo.ListaTareaId)));

    // ---------- Vínculos con tareas y tickets ----------

    [HttpGet("vinculos")]
    public async Task<ActionResult<IReadOnlyList<VinculoTrelloDto>>> ListarVinculos([FromQuery] Guid? tareaId, [FromQuery] Guid? ticketId, [FromQuery] string? idTarjeta) =>
        Ok(await _mediador.Send(new ListarVinculosTrelloConsulta(tareaId, ticketId, idTarjeta)));

    [HttpPost("vinculos")]
    public async Task<ActionResult<VinculoTrelloDto>> Vincular([FromBody] CuerpoVincular cuerpo) =>
        Ok(await _mediador.Send(new VincularTarjetaTrelloComando(cuerpo.Tarjeta, cuerpo.TareaId, cuerpo.TicketId)));

    [HttpDelete("vinculos/{id:guid}")]
    public async Task<IActionResult> Desvincular(Guid id)
    {
        await _mediador.Send(new DesvincularTarjetaTrelloComando(id));
        return NoContent();
    }
}
