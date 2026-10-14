using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Snippets;

namespace SolucionProductividad.APIWeb.Controladores;

/// <summary>Biblioteca personal de snippets (consultas, comandos, fragmentos de código) con variables {{nombre}}.</summary>
[ApiController]
[Route("api/v1/[controller]")]
public class SnippetsController : ControllerBase
{
    private readonly ISender _mediador;

    public SnippetsController(ISender mediador) => _mediador = mediador;

    public sealed record CuerpoSnippet(string Titulo, string Lenguaje, string Contenido, string? Descripcion, IReadOnlyList<Guid>? EtiquetaIds);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SnippetDto>>> Listar([FromQuery] string? texto, [FromQuery] string? lenguaje, [FromQuery] Guid? etiquetaId, [FromQuery] bool soloFavoritos = false) =>
        Ok(await _mediador.Send(new ListarSnippetsConsulta(texto, lenguaje, etiquetaId, soloFavoritos)));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SnippetDto>> Obtener(Guid id) => Ok(await _mediador.Send(new ObtenerSnippetConsulta(id)));

    [HttpPost]
    public async Task<ActionResult<SnippetDto>> Crear([FromBody] CuerpoSnippet cuerpo) =>
        Ok(await _mediador.Send(new GuardarSnippetComando(null, cuerpo.Titulo, cuerpo.Lenguaje, cuerpo.Contenido, cuerpo.Descripcion, cuerpo.EtiquetaIds ?? [])));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<SnippetDto>> Actualizar(Guid id, [FromBody] CuerpoSnippet cuerpo) =>
        Ok(await _mediador.Send(new GuardarSnippetComando(id, cuerpo.Titulo, cuerpo.Lenguaje, cuerpo.Contenido, cuerpo.Descripcion, cuerpo.EtiquetaIds ?? [])));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Eliminar(Guid id)
    {
        await _mediador.Send(new EliminarSnippetComando(id));
        return NoContent();
    }

    [HttpPost("{id:guid}/favorito")]
    public async Task<ActionResult<bool>> AlternarFavorito(Guid id) => Ok(await _mediador.Send(new AlternarFavoritoSnippetComando(id)));

    /// <summary>Se llama al copiar o insertar el snippet (ordena por más usados).</summary>
    [HttpPost("{id:guid}/uso")]
    public async Task<IActionResult> RegistrarUso(Guid id)
    {
        await _mediador.Send(new RegistrarUsoSnippetComando(id));
        return NoContent();
    }
}
