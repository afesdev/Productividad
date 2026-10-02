using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion;

/// <summary>
/// Emite el par token de acceso (JWT) + token de refresco y persiste el hash del refresco.
/// </summary>
public sealed class EmisorSesiones
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioTokensJwt _servicioTokens;

    public EmisorSesiones(IContextoAplicacion contexto, IServicioTokensJwt servicioTokens)
    {
        _contexto = contexto;
        _servicioTokens = servicioTokens;
    }

    public async Task<IReadOnlyList<string>> ObtenerRolesAsync(Guid usuarioId, CancellationToken tokenCancelacion)
    {
        return await _contexto.UsuariosRoles
            .Where(usuarioRol => usuarioRol.UsuarioId == usuarioId)
            .Select(usuarioRol => usuarioRol.Rol!.Nombre)
            .ToListAsync(tokenCancelacion);
    }

    public async Task<RespuestaAutenticacionDto> EmitirAsync(Usuario usuario, CancellationToken tokenCancelacion)
    {
        var roles = await ObtenerRolesAsync(usuario.Id, tokenCancelacion);
        var ahoraUtc = DateTime.UtcNow;

        var (tokenAcceso, expiracionAcceso) = _servicioTokens.GenerarTokenAcceso(usuario, roles);
        var tokenRefresco = _servicioTokens.GenerarTokenRefresco();
        var expiracionRefresco = ahoraUtc.Add(_servicioTokens.VigenciaTokenRefresco);

        _contexto.TokensRefresco.Add(new TokenRefresco
        {
            UsuarioId = usuario.Id,
            TokenHash = _servicioTokens.CalcularHashTokenRefresco(tokenRefresco),
            FechaExpiracion = expiracionRefresco,
            FechaCreacion = ahoraUtc
        });

        usuario.FechaUltimoAcceso = ahoraUtc;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);

        return new RespuestaAutenticacionDto(
            tokenAcceso,
            expiracionAcceso,
            tokenRefresco,
            expiracionRefresco,
            new UsuarioDto(usuario.Id, usuario.Correo, usuario.NombreUsuario, usuario.NombreCompleto, usuario.EstaActivo, roles));
    }
}
