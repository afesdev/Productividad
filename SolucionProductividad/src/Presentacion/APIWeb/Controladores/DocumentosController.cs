using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Documentos;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.APIWeb.Controladores;

[ApiController]
[Route("api/v1/[controller]")]
public class DocumentosController : ControllerBase
{
    private readonly ISender _mediador;

    public DocumentosController(ISender mediador) => _mediador = mediador;

    public sealed record CuerpoActualizarDocumento(string Titulo, string ContenidoMarkdown, string? Icono, bool CrearVersion = false);
    public sealed record CuerpoMover(Guid? CarpetaDocumentoId);
    public sealed record CuerpoFavorito(bool EsFavorito);
    public sealed record CuerpoVigencia(EstadoDocumento Estado, DateTime? FechaRevision, Guid? DocumentoReemplazoId);
    public sealed record CuerpoEtiquetas(IReadOnlyList<Guid> EtiquetaIds);
    public sealed record CuerpoCarpeta(string Nombre, Guid? CarpetaPadreId, string? Color);
    public sealed record CuerpoEtiqueta(string Nombre, string Color);

    // ---------- Documentos ----------

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DocumentoResumenDto>>> Listar(
        [FromQuery] VistaDocumentos vista = VistaDocumentos.Activos,
        [FromQuery] Guid? carpetaDocumentoId = null,
        [FromQuery] Guid? etiquetaId = null,
        [FromQuery] string? texto = null) =>
        Ok(await _mediador.Send(new ListarDocumentosConsulta(vista, carpetaDocumentoId, etiquetaId, texto)));

    [HttpGet("estructura")]
    public async Task<ActionResult<EstructuraDocumentosDto>> ObtenerEstructura() => Ok(await _mediador.Send(new ObtenerEstructuraDocumentosConsulta()));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DocumentoDetalleDto>> ObtenerPorId(Guid id) => Ok(await _mediador.Send(new ObtenerDocumentoPorIdConsulta(id)));

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearDocumentoComando comando)
    {
        var idDocumento = await _mediador.Send(comando);
        return CreatedAtAction(nameof(ObtenerPorId), new { id = idDocumento }, idDocumento);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DocumentoGuardadoDto>> Actualizar(Guid id, [FromBody] CuerpoActualizarDocumento cuerpo) =>
        Ok(await _mediador.Send(new ActualizarDocumentoComando(id, cuerpo.Titulo, cuerpo.ContenidoMarkdown, cuerpo.Icono, cuerpo.CrearVersion)));

    [HttpPatch("{id:guid}/carpeta")]
    public async Task<IActionResult> Mover(Guid id, [FromBody] CuerpoMover cuerpo)
    {
        await _mediador.Send(new MoverDocumentoComando(id, cuerpo.CarpetaDocumentoId));
        return NoContent();
    }

    [HttpPatch("{id:guid}/vigencia")]
    public async Task<IActionResult> ActualizarVigencia(Guid id, [FromBody] CuerpoVigencia cuerpo)
    {
        await _mediador.Send(new ActualizarVigenciaDocumentoComando(id, cuerpo.Estado, cuerpo.FechaRevision, cuerpo.DocumentoReemplazoId));
        return NoContent();
    }

    [HttpPatch("{id:guid}/favorito")]
    public async Task<IActionResult> MarcarFavorito(Guid id, [FromBody] CuerpoFavorito cuerpo)
    {
        await _mediador.Send(new MarcarFavoritoDocumentoComando(id, cuerpo.EsFavorito));
        return NoContent();
    }

    [HttpPut("{id:guid}/etiquetas")]
    public async Task<ActionResult<IReadOnlyList<EtiquetaDto>>> AsignarEtiquetas(Guid id, [FromBody] CuerpoEtiquetas cuerpo) =>
        Ok(await _mediador.Send(new AsignarEtiquetasDocumentoComando(id, cuerpo.EtiquetaIds)));

    [HttpGet("{id:guid}/backlinks")]
    public async Task<ActionResult<IReadOnlyList<BacklinkDto>>> ObtenerBacklinks(Guid id) =>
        Ok(await _mediador.Send(new ObtenerBacklinksConsulta(TipoEntidad.Documento, id)));

    // ---------- Papelera ----------

    [HttpPost("{id:guid}/papelera")]
    public async Task<IActionResult> MoverAPapelera(Guid id)
    {
        await _mediador.Send(new MoverDocumentoAPapeleraComando(id));
        return NoContent();
    }

    [HttpPost("{id:guid}/restaurar")]
    public async Task<IActionResult> Restaurar(Guid id)
    {
        await _mediador.Send(new RestaurarDocumentoComando(id));
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<int>> EliminarDefinitivo(Guid id) => Ok(await _mediador.Send(new EliminarDocumentoDefinitivoComando(id)));

    [HttpDelete("papelera")]
    public async Task<ActionResult<int>> VaciarPapelera() => Ok(await _mediador.Send(new EliminarDocumentoDefinitivoComando(null)));

    // ---------- Versiones ----------

    [HttpGet("{id:guid}/versiones")]
    public async Task<ActionResult<IReadOnlyList<VersionResumenDto>>> ListarVersiones(Guid id) =>
        Ok(await _mediador.Send(new ListarVersionesDocumentoConsulta(id)));

    [HttpGet("versiones/{versionId:guid}")]
    public async Task<ActionResult<VersionDetalleDto>> ObtenerVersion(Guid versionId) =>
        Ok(await _mediador.Send(new ObtenerVersionDocumentoConsulta(versionId)));

    [HttpPost("versiones/{versionId:guid}/restaurar")]
    public async Task<ActionResult<DocumentoGuardadoDto>> RestaurarVersion(Guid versionId) =>
        Ok(await _mediador.Send(new RestaurarVersionDocumentoComando(versionId)));

    // ---------- Carpetas y etiquetas ----------

    [HttpPost("carpetas")]
    public async Task<ActionResult<Guid>> CrearCarpeta([FromBody] CuerpoCarpeta cuerpo) =>
        Ok(await _mediador.Send(new GuardarCarpetaDocumentoComando(null, cuerpo.Nombre, cuerpo.CarpetaPadreId, cuerpo.Color)));

    [HttpPut("carpetas/{carpetaId:guid}")]
    public async Task<ActionResult<Guid>> ActualizarCarpeta(Guid carpetaId, [FromBody] CuerpoCarpeta cuerpo) =>
        Ok(await _mediador.Send(new GuardarCarpetaDocumentoComando(carpetaId, cuerpo.Nombre, cuerpo.CarpetaPadreId, cuerpo.Color)));

    [HttpDelete("carpetas/{carpetaId:guid}")]
    public async Task<IActionResult> EliminarCarpeta(Guid carpetaId)
    {
        await _mediador.Send(new EliminarCarpetaDocumentoComando(carpetaId));
        return NoContent();
    }

    [HttpPost("etiquetas")]
    public async Task<ActionResult<Guid>> CrearEtiqueta([FromBody] CuerpoEtiqueta cuerpo) =>
        Ok(await _mediador.Send(new GuardarEtiquetaDocumentoComando(null, cuerpo.Nombre, cuerpo.Color)));

    [HttpPut("etiquetas/{etiquetaId:guid}")]
    public async Task<ActionResult<Guid>> ActualizarEtiqueta(Guid etiquetaId, [FromBody] CuerpoEtiqueta cuerpo) =>
        Ok(await _mediador.Send(new GuardarEtiquetaDocumentoComando(etiquetaId, cuerpo.Nombre, cuerpo.Color)));

    [HttpDelete("etiquetas/{etiquetaId:guid}")]
    public async Task<IActionResult> EliminarEtiqueta(Guid etiquetaId)
    {
        await _mediador.Send(new EliminarEtiquetaDocumentoComando(etiquetaId));
        return NoContent();
    }
}
