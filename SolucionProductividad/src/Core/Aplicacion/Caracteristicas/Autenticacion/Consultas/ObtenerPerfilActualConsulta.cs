using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Consultas;

public sealed record ObtenerPerfilActualConsulta : IRequest<UsuarioDto>;

public sealed class ManejadorObtenerPerfilActualConsulta : IRequestHandler<ObtenerPerfilActualConsulta, UsuarioDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;
    private readonly EmisorSesiones _emisorSesiones;

    public ManejadorObtenerPerfilActualConsulta(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual, EmisorSesiones emisorSesiones)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
        _emisorSesiones = emisorSesiones;
    }

    public async Task<UsuarioDto> Handle(ObtenerPerfilActualConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var usuario = await _contexto.Usuarios.AsNoTracking().FirstOrDefaultAsync(usuario => usuario.Id == usuarioId, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el usuario", usuarioId);

        var roles = await _emisorSesiones.ObtenerRolesAsync(usuarioId, tokenCancelacion);
        return new UsuarioDto(usuario.Id, usuario.Correo, usuario.NombreUsuario, usuario.NombreCompleto, usuario.EstaActivo, roles);
    }
}
