using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Comandos;

/// <summary>Asigna o retira un rol. Solo para administradores (restringido en el controlador).</summary>
public sealed record AsignarRolUsuarioComando(Guid UsuarioId, string NombreRol, bool Asignar = true) : IRequest;

public sealed class ValidadorAsignarRolUsuarioComando : AbstractValidator<AsignarRolUsuarioComando>
{
    public ValidadorAsignarRolUsuarioComando()
    {
        RuleFor(comando => comando.UsuarioId).NotEmpty();
        RuleFor(comando => comando.NombreRol).NotEmpty().MaximumLength(50);
    }
}

public sealed class ManejadorAsignarRolUsuarioComando : IRequestHandler<AsignarRolUsuarioComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorAsignarRolUsuarioComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(AsignarRolUsuarioComando comando, CancellationToken tokenCancelacion)
    {
        if (!await _contexto.Usuarios.AnyAsync(usuario => usuario.Id == comando.UsuarioId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("el usuario", comando.UsuarioId);

        var rol = await _contexto.Roles.FirstOrDefaultAsync(rol => rol.Nombre == comando.NombreRol, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el rol", comando.NombreRol);

        var asignacionExistente = await _contexto.UsuariosRoles
            .FirstOrDefaultAsync(usuarioRol => usuarioRol.UsuarioId == comando.UsuarioId && usuarioRol.RolId == rol.Id, tokenCancelacion);

        if (comando.Asignar && asignacionExistente is null)
        {
            _contexto.UsuariosRoles.Add(new UsuarioRol { UsuarioId = comando.UsuarioId, RolId = rol.Id });
        }
        else if (!comando.Asignar && asignacionExistente is not null)
        {
            if (rol.Id == NombresRoles.IdAdministrador)
            {
                var totalAdministradores = await _contexto.UsuariosRoles.CountAsync(usuarioRol => usuarioRol.RolId == rol.Id, tokenCancelacion);
                if (totalAdministradores <= 1)
                    throw new ExcepcionConflicto("No se puede retirar el rol al último administrador.");
            }

            _contexto.UsuariosRoles.Remove(asignacionExistente);
        }

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}
