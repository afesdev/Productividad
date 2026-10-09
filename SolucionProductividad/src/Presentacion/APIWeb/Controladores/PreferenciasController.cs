using MediatR;
using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Caracteristicas.Preferencias;

namespace SolucionProductividad.APIWeb.Controladores;

/// <summary>Preferencias de la interfaz del usuario (JSON por clave), iguales en cualquier equipo.</summary>
[ApiController]
[Route("api/v1/[controller]")]
public class PreferenciasController : ControllerBase
{
    private readonly ISender _mediador;

    public PreferenciasController(ISender mediador) => _mediador = mediador;

    public sealed record CuerpoPreferencia(string ValorJson);

    /// <summary>200 con el JSON guardado, o 204 si el usuario aún no tiene esa preferencia.</summary>
    [HttpGet("{clave}")]
    public async Task<IActionResult> Obtener(string clave)
    {
        var valor = await _mediador.Send(new ObtenerPreferenciaConsulta(clave));
        return valor is null ? NoContent() : Ok(new CuerpoPreferencia(valor));
    }

    [HttpPut("{clave}")]
    public async Task<IActionResult> Guardar(string clave, [FromBody] CuerpoPreferencia cuerpo)
    {
        await _mediador.Send(new GuardarPreferenciaComando(clave, cuerpo.ValorJson));
        return NoContent();
    }
}
