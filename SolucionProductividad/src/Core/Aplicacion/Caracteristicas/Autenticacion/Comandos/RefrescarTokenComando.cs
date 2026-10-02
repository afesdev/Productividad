using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Comandos;

public sealed record RefrescarTokenComando(string TokenRefresco) : IRequest<RespuestaAutenticacionDto>;

public sealed class ValidadorRefrescarTokenComando : AbstractValidator<RefrescarTokenComando>
{
    public ValidadorRefrescarTokenComando() => RuleFor(comando => comando.TokenRefresco).NotEmpty().MaximumLength(200);
}

/// <summary>
/// Rota el token de refresco. Si se presenta un token ya revocado (posible robo),
/// se revocan todas las sesiones activas del usuario.
/// </summary>
public sealed class ManejadorRefrescarTokenComando : IRequestHandler<RefrescarTokenComando, RespuestaAutenticacionDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioTokensJwt _servicioTokens;
    private readonly EmisorSesiones _emisorSesiones;

    public ManejadorRefrescarTokenComando(IContextoAplicacion contexto, IServicioTokensJwt servicioTokens, EmisorSesiones emisorSesiones)
    {
        _contexto = contexto;
        _servicioTokens = servicioTokens;
        _emisorSesiones = emisorSesiones;
    }

    public async Task<RespuestaAutenticacionDto> Handle(RefrescarTokenComando comando, CancellationToken tokenCancelacion)
    {
        var hashToken = _servicioTokens.CalcularHashTokenRefresco(comando.TokenRefresco);
        var tokenAlmacenado = await _contexto.TokensRefresco
            .Include(token => token.Usuario)
            .FirstOrDefaultAsync(token => token.TokenHash == hashToken, tokenCancelacion);

        if (tokenAlmacenado?.Usuario is null)
            throw new ExcepcionNoAutorizado("Sesión no válida.");

        var ahoraUtc = DateTime.UtcNow;

        if (tokenAlmacenado.FechaRevocacion is not null)
        {
            await RevocarSesionesActivasAsync(tokenAlmacenado.UsuarioId, ahoraUtc, tokenCancelacion);
            throw new ExcepcionNoAutorizado("Sesión no válida.");
        }

        if (!tokenAlmacenado.EstaVigente(ahoraUtc) || !tokenAlmacenado.Usuario.EstaActivo)
            throw new ExcepcionNoAutorizado("La sesión expiró. Inicie sesión nuevamente.");

        tokenAlmacenado.Revocar(ahoraUtc);
        return await _emisorSesiones.EmitirAsync(tokenAlmacenado.Usuario, tokenCancelacion);
    }

    private async Task RevocarSesionesActivasAsync(Guid usuarioId, DateTime ahoraUtc, CancellationToken tokenCancelacion)
    {
        var tokensActivos = await _contexto.TokensRefresco
            .Where(token => token.UsuarioId == usuarioId && token.FechaRevocacion == null)
            .ToListAsync(tokenCancelacion);

        foreach (var token in tokensActivos)
            token.Revocar(ahoraUtc);

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}
