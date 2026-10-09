using System.Text.Json;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Preferencias;

internal static class ReglasPreferencia
{
    public const string PatronClave = "^[a-z0-9][a-z0-9.-]{0,99}$";
    public const int MaximoCaracteres = 50_000;
}

/// <summary>Devuelve el JSON guardado, o null si el usuario aún no tiene esa preferencia.</summary>
public sealed record ObtenerPreferenciaConsulta(string Clave) : IRequest<string?>;

public sealed class ValidadorObtenerPreferenciaConsulta : AbstractValidator<ObtenerPreferenciaConsulta>
{
    public ValidadorObtenerPreferenciaConsulta() => RuleFor(consulta => consulta.Clave).Matches(ReglasPreferencia.PatronClave);
}

public sealed class ManejadorObtenerPreferenciaConsulta : IRequestHandler<ObtenerPreferenciaConsulta, string?>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorObtenerPreferenciaConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<string?> Handle(ObtenerPreferenciaConsulta consulta, CancellationToken tokenCancelacion) =>
        await _contexto.PreferenciasUsuario.AsNoTracking()
            .Where(preferencia => preferencia.Clave == consulta.Clave)
            .Select(preferencia => preferencia.ValorJson)
            .FirstOrDefaultAsync(tokenCancelacion);
}

public sealed record GuardarPreferenciaComando(string Clave, string ValorJson) : IRequest;

public sealed class ValidadorGuardarPreferenciaComando : AbstractValidator<GuardarPreferenciaComando>
{
    public ValidadorGuardarPreferenciaComando()
    {
        RuleFor(comando => comando.Clave).Matches(ReglasPreferencia.PatronClave).WithMessage("Clave de preferencia no válida.");
        RuleFor(comando => comando.ValorJson).NotEmpty().MaximumLength(ReglasPreferencia.MaximoCaracteres)
            .Must(EsJson).WithMessage("El valor debe ser JSON válido.");
    }

    private static bool EsJson(string valor)
    {
        try
        {
            using var _ = JsonDocument.Parse(valor);
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}

public sealed class ManejadorGuardarPreferenciaComando : IRequestHandler<GuardarPreferenciaComando>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorGuardarPreferenciaComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task Handle(GuardarPreferenciaComando comando, CancellationToken tokenCancelacion)
    {
        var preferencia = await _contexto.PreferenciasUsuario.FirstOrDefaultAsync(existente => existente.Clave == comando.Clave, tokenCancelacion);
        if (preferencia is null)
        {
            preferencia = new PreferenciaUsuario { UsuarioId = _usuarioActual.ObtenerUsuarioIdRequerido(), Clave = comando.Clave };
            _contexto.PreferenciasUsuario.Add(preferencia);
        }
        preferencia.ValorJson = comando.ValorJson;
        preferencia.FechaActualizacion = DateTime.UtcNow;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}
