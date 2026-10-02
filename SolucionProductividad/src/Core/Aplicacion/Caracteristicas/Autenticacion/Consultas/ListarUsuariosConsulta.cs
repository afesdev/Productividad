using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Consultas;

/// <summary>Solo para administradores (restringido en el controlador).</summary>
public sealed record ListarUsuariosConsulta : IRequest<IReadOnlyList<UsuarioDto>>;

public sealed class ManejadorListarUsuariosConsulta : IRequestHandler<ListarUsuariosConsulta, IReadOnlyList<UsuarioDto>>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorListarUsuariosConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<IReadOnlyList<UsuarioDto>> Handle(ListarUsuariosConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarios = await _contexto.Usuarios
            .AsNoTracking()
            .OrderBy(usuario => usuario.NombreCompleto)
            .Select(usuario => new
            {
                usuario.Id,
                usuario.Correo,
                usuario.NombreUsuario,
                usuario.NombreCompleto,
                usuario.EstaActivo,
                Roles = usuario.Roles.Select(usuarioRol => usuarioRol.Rol!.Nombre).ToList()
            })
            .ToListAsync(tokenCancelacion);

        return usuarios
            .Select(usuario => new UsuarioDto(usuario.Id, usuario.Correo, usuario.NombreUsuario, usuario.NombreCompleto, usuario.EstaActivo, usuario.Roles))
            .ToList();
    }
}
