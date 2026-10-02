using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion;
using SolucionProductividad.Aplicacion.Comun.Comportamientos;

namespace SolucionProductividad.Aplicacion;

public static class InyeccionDependencias
{
    public static IServiceCollection AgregarAplicacion(this IServiceCollection servicios)
    {
        var ensamblado = typeof(InyeccionDependencias).Assembly;

        servicios.AddMediatR(configuracion =>
        {
            configuracion.RegisterServicesFromAssembly(ensamblado);
            configuracion.AddOpenBehavior(typeof(ComportamientoValidacion<,>));
        });
        servicios.AddValidatorsFromAssembly(ensamblado, includeInternalTypes: true);
        servicios.AddScoped<EmisorSesiones>();

        return servicios;
    }
}
