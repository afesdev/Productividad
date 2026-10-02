using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Busqueda.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Busqueda.Dtos;

namespace SolucionProductividad.APIWeb.Controladores;

[ApiController]
[Route("api/v1/[controller]")]
public class BusquedaController : ControllerBase
{
    private readonly ISender _mediador;

    public BusquedaController(ISender mediador) => _mediador = mediador;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ResultadoBusquedaDto>>> Buscar([FromQuery] string termino, [FromQuery] int limite = 6) =>
        Ok(await _mediador.Send(new BuscarGlobalConsulta(termino, limite)));
}
