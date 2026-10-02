using FluentValidation;
using MediatR;
using SolucionProductividad.Aplicacion.Comun.Excepciones;

namespace SolucionProductividad.Aplicacion.Comun.Comportamientos;

/// <summary>
/// Pipeline de MediatR que ejecuta todos los validadores FluentValidation antes del manejador.
/// </summary>
public sealed class ComportamientoValidacion<TSolicitud, TRespuesta> : IPipelineBehavior<TSolicitud, TRespuesta>
    where TSolicitud : notnull
{
    private readonly IEnumerable<IValidator<TSolicitud>> _validadores;

    public ComportamientoValidacion(IEnumerable<IValidator<TSolicitud>> validadores) => _validadores = validadores;

    public async Task<TRespuesta> Handle(TSolicitud solicitud, RequestHandlerDelegate<TRespuesta> siguiente, CancellationToken tokenCancelacion)
    {
        if (!_validadores.Any())
            return await siguiente();

        var contexto = new ValidationContext<TSolicitud>(solicitud);
        var resultados = await Task.WhenAll(_validadores.Select(validador => validador.ValidateAsync(contexto, tokenCancelacion)));
        var fallos = resultados.SelectMany(resultado => resultado.Errors).Where(fallo => fallo is not null).ToList();

        if (fallos.Count > 0)
            throw new ExcepcionValidacion(fallos);

        return await siguiente();
    }
}
