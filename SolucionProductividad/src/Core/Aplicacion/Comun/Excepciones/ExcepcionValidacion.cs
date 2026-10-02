using FluentValidation.Results;

namespace SolucionProductividad.Aplicacion.Comun.Excepciones;

/// <summary>
/// Errores de validación de entrada agrupados por propiedad (HTTP 400).
/// </summary>
public class ExcepcionValidacion : Exception
{
    public ExcepcionValidacion(IEnumerable<ValidationFailure> fallos)
        : base("Se produjeron uno o más errores de validación.")
    {
        Errores = fallos
            .GroupBy(fallo => fallo.PropertyName, fallo => fallo.ErrorMessage)
            .ToDictionary(grupo => grupo.Key, grupo => grupo.Distinct().ToArray());
    }

    public IDictionary<string, string[]> Errores { get; }
}
