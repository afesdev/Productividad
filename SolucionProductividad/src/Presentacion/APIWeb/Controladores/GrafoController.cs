using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Grafo;

namespace SolucionProductividad.APIWeb.Controladores;

/// <summary>Grafo de conocimiento: entidades del usuario y sus conexiones ([[enlaces]], etiquetas, sistemas, relaciones).</summary>
[ApiController]
[Route("api/v1/[controller]")]
public class GrafoController : ControllerBase
{
    private readonly ISender _mediador;

    public GrafoController(ISender mediador) => _mediador = mediador;

    [HttpGet]
    public async Task<ActionResult<GrafoDto>> Obtener() => Ok(await _mediador.Send(new ObtenerGrafoConsulta()));
}
