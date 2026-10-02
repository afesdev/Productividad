using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Comandos;

public sealed record CerrarSesionComando(string TokenRefresco) : IRequest;

public sealed class ManejadorCerrarSesionComando : IRequestHandler<CerrarSesionComando>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioTokensJwt _servicioTokens;

    public ManejadorCerrarSesionComando(IContextoAplicacion contexto, IServicioTokensJwt servicioTokens)
    {
        _contexto = contexto;
        _servicioTokens = servicioTokens;
    }

    public async Task Handle(CerrarSesionComando comando, CancellationToken tokenCancelacion)
    {
        if (string.IsNullOrWhiteSpace(comando.TokenRefresco))
            return;

        var hashToken = _servicioTokens.CalcularHashTokenRefresco(comando.TokenRefresco);
        var tokenAlmacenado = await _contexto.TokensRefresco.FirstOrDefaultAsync(token => token.TokenHash == hashToken, tokenCancelacion);
        if (tokenAlmacenado is null)
            return;

        tokenAlmacenado.Revocar(DateTime.UtcNow);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}
