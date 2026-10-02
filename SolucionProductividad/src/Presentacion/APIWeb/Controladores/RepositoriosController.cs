using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Dtos;

namespace SolucionProductividad.APIWeb.Controladores;

[ApiController]
[Route("api/v1/[controller]")]
public class RepositoriosController : ControllerBase
{
    private readonly ISender _mediador;

    public RepositoriosController(ISender mediador) => _mediador = mediador;

    public sealed record CuerpoRepositorio(
        string Nombre,
        string Propietario,
        string NombreRepositorio,
        string? RamaPrincipal,
        string RamaDesarrollo,
        bool EstaActivo = true,
        Guid? ProyectoSoporteId = null);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RepositorioDto>>> Listar([FromQuery] bool incluirInactivos = false) =>
        Ok(await _mediador.Send(new ListarRepositoriosConsulta(incluirInactivos)));

    [HttpGet("{id:guid}/grafo")]
    public async Task<ActionResult<GrafoRepositorioDto>> Grafo(Guid id, CancellationToken tokenCancelacion) =>
        Ok(await _mediador.Send(new ObtenerGrafoRepositorioConsulta(id), tokenCancelacion));

    [HttpGet("{id:guid}/commits/{sha}")]
    public async Task<ActionResult<DetalleCommitDto>> Commit(Guid id, string sha, CancellationToken tokenCancelacion) =>
        Ok(await _mediador.Send(new ObtenerCommitRepositorioConsulta(id, sha), tokenCancelacion));

    [HttpPost]
    public async Task<ActionResult<Guid>> Crear([FromBody] CuerpoRepositorio cuerpo) =>
        Ok(await _mediador.Send(new GuardarRepositorioComando(null, cuerpo.Nombre, cuerpo.Propietario, cuerpo.NombreRepositorio, cuerpo.RamaPrincipal, cuerpo.RamaDesarrollo,
            cuerpo.EstaActivo, cuerpo.ProyectoSoporteId)));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Guid>> Actualizar(Guid id, [FromBody] CuerpoRepositorio cuerpo) =>
        Ok(await _mediador.Send(new GuardarRepositorioComando(id, cuerpo.Nombre, cuerpo.Propietario, cuerpo.NombreRepositorio, cuerpo.RamaPrincipal, cuerpo.RamaDesarrollo,
            cuerpo.EstaActivo, cuerpo.ProyectoSoporteId)));
}
