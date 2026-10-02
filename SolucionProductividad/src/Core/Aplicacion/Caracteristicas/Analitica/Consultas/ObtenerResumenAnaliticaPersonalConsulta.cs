using FluentValidation;
using MediatR;
using SolucionProductividad.Aplicacion.Caracteristicas.Analitica.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Analitica.Consultas;

/// <param name="DesplazamientoMinutos">Zona horaria del usuario respecto a UTC en minutos (Colombia = -300).</param>
public sealed record ObtenerResumenAnaliticaPersonalConsulta(Guid UsuarioId, DateTime FechaInicio, DateTime FechaFin, int DesplazamientoMinutos = 0) : IRequest<ResumenAnaliticaPersonalDto>;

public sealed class ValidadorObtenerResumenAnaliticaPersonalConsulta : AbstractValidator<ObtenerResumenAnaliticaPersonalConsulta>
{
    public ValidadorObtenerResumenAnaliticaPersonalConsulta()
    {
        RuleFor(consulta => consulta.UsuarioId).NotEmpty();
        RuleFor(consulta => consulta.FechaFin).GreaterThanOrEqualTo(consulta => consulta.FechaInicio)
            .WithMessage("La fecha fin debe ser posterior a la fecha inicio.");
        RuleFor(consulta => consulta)
            .Must(consulta => (consulta.FechaFin - consulta.FechaInicio).TotalDays <= 366)
            .WithName("Rango").WithMessage("El rango máximo es de un año.");
        RuleFor(consulta => consulta.DesplazamientoMinutos).InclusiveBetween(-840, 840).WithMessage("Zona horaria no válida.");
    }
}

public sealed class ManejadorObtenerResumenAnaliticaPersonalConsulta : IRequestHandler<ObtenerResumenAnaliticaPersonalConsulta, ResumenAnaliticaPersonalDto>
{
    private readonly IConsultasAnalitica _consultasAnalitica;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorObtenerResumenAnaliticaPersonalConsulta(IConsultasAnalitica consultasAnalitica, IServicioUsuarioActual usuarioActual)
    {
        _consultasAnalitica = consultasAnalitica;
        _usuarioActual = usuarioActual;
    }

    public Task<ResumenAnaliticaPersonalDto> Handle(ObtenerResumenAnaliticaPersonalConsulta consulta, CancellationToken tokenCancelacion)
    {
        // Cada usuario solo ve su propia analítica (el administrador incluido).
        if (consulta.UsuarioId != _usuarioActual.ObtenerUsuarioIdRequerido())
            throw new ExcepcionAccesoDenegado();

        return _consultasAnalitica.ObtenerResumenPersonalAsync(consulta.UsuarioId, consulta.FechaInicio, consulta.FechaFin, consulta.DesplazamientoMinutos, tokenCancelacion);
    }
}
