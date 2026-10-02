using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Marcadores;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.APIWeb.Controladores;

/// <summary>Marcadores (⭐) de tareas, tickets, documentos y días del diario.</summary>
[ApiController]
[Route("api/v1/[controller]")]
public class MarcadoresController : ControllerBase
{
    private readonly ISender _mediador;

    public MarcadoresController(ISender mediador) => _mediador = mediador;

    public sealed record CuerpoAlternar(TipoEntidad TipoEntidad, Guid EntidadId);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MarcadorDto>>> Listar() => Ok(await _mediador.Send(new ListarMarcadoresConsulta()));

    /// <summary>Marca o desmarca; devuelve si queda marcado.</summary>
    [HttpPost("alternar")]
    public async Task<ActionResult<bool>> Alternar([FromBody] CuerpoAlternar cuerpo) =>
        Ok(await _mediador.Send(new AlternarMarcadorComando(cuerpo.TipoEntidad, cuerpo.EntidadId)));
}
