using FluentValidation;
using MediatR;
using SolucionProductividad.Aplicacion.Caracteristicas.Busqueda.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Busqueda.Consultas;

/// <summary>Alimenta la Paleta de Comandos (Ctrl + K).</summary>
public sealed record BuscarGlobalConsulta(string Termino, int LimitePorTipo = 6) : IRequest<IReadOnlyList<ResultadoBusquedaDto>>;

public sealed class ValidadorBuscarGlobalConsulta : AbstractValidator<BuscarGlobalConsulta>
{
    public ValidadorBuscarGlobalConsulta()
    {
        RuleFor(consulta => consulta.Termino).NotEmpty().MaximumLength(100);
        RuleFor(consulta => consulta.LimitePorTipo).InclusiveBetween(1, 25);
    }
}

public sealed class ManejadorBuscarGlobalConsulta : IRequestHandler<BuscarGlobalConsulta, IReadOnlyList<ResultadoBusquedaDto>>
{
    private readonly IConsultasBusqueda _consultasBusqueda;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorBuscarGlobalConsulta(IConsultasBusqueda consultasBusqueda, IServicioUsuarioActual usuarioActual)
    {
        _consultasBusqueda = consultasBusqueda;
        _usuarioActual = usuarioActual;
    }

    public Task<IReadOnlyList<ResultadoBusquedaDto>> Handle(BuscarGlobalConsulta consulta, CancellationToken tokenCancelacion) =>
        _consultasBusqueda.BuscarAsync(consulta.Termino.Trim(), _usuarioActual.ObtenerUsuarioIdRequerido(), consulta.LimitePorTipo, tokenCancelacion);
}
