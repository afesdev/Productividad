using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Comandos;

public sealed record RegistrarUsuarioComando(string Correo, string NombreUsuario, string NombreCompleto, string Contrasena) : IRequest<RespuestaAutenticacionDto>;

public sealed class ValidadorRegistrarUsuarioComando : AbstractValidator<RegistrarUsuarioComando>
{
    public ValidadorRegistrarUsuarioComando()
    {
        RuleFor(comando => comando.Correo).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(comando => comando.NombreUsuario)
            .NotEmpty()
            .Must(nombre => System.Text.RegularExpressions.Regex.IsMatch(ReglasNombreUsuario.Normalizar(nombre), ReglasNombreUsuario.Patron))
            .WithMessage("El nombre de usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo.");
        RuleFor(comando => comando.NombreCompleto).NotEmpty().MinimumLength(2).MaximumLength(150);
        RuleFor(comando => comando.Contrasena)
            .NotEmpty()
            .MinimumLength(8).WithMessage("La contraseña debe tener al menos 8 caracteres.")
            .MaximumLength(128)
            .Matches("[A-Za-z]").WithMessage("La contraseña debe contener al menos una letra.")
            .Matches("[0-9]").WithMessage("La contraseña debe contener al menos un número.");
    }
}

public sealed class ManejadorRegistrarUsuarioComando : IRequestHandler<RegistrarUsuarioComando, RespuestaAutenticacionDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioHashContrasena _servicioHash;
    private readonly EmisorSesiones _emisorSesiones;

    public ManejadorRegistrarUsuarioComando(IContextoAplicacion contexto, IServicioHashContrasena servicioHash, EmisorSesiones emisorSesiones)
    {
        _contexto = contexto;
        _servicioHash = servicioHash;
        _emisorSesiones = emisorSesiones;
    }

    public async Task<RespuestaAutenticacionDto> Handle(RegistrarUsuarioComando comando, CancellationToken tokenCancelacion)
    {
        var correoNormalizado = comando.Correo.Trim().ToLowerInvariant();
        var nombreUsuario = ReglasNombreUsuario.Normalizar(comando.NombreUsuario);

        if (await _contexto.Usuarios.AnyAsync(usuario => usuario.Correo == correoNormalizado, tokenCancelacion))
            throw new ExcepcionConflicto("Ya existe una cuenta registrada con ese correo.");

        if (await _contexto.Usuarios.AnyAsync(usuario => usuario.NombreUsuario == nombreUsuario, tokenCancelacion))
            throw new ExcepcionConflicto($"El nombre de usuario \"{nombreUsuario}\" ya está en uso.");

        // El primer usuario del sistema se convierte en Administrador para poder gestionar roles.
        var esPrimerUsuario = !await _contexto.Usuarios.AnyAsync(tokenCancelacion);

        var nuevoUsuario = new Usuario
        {
            Correo = correoNormalizado,
            NombreUsuario = nombreUsuario,
            NombreCompleto = comando.NombreCompleto.Trim(),
            HashContrasena = _servicioHash.GenerarHash(comando.Contrasena)
        };
        nuevoUsuario.Roles.Add(new UsuarioRol
        {
            UsuarioId = nuevoUsuario.Id,
            RolId = esPrimerUsuario ? NombresRoles.IdAdministrador : NombresRoles.IdMiembro
        });

        _contexto.Usuarios.Add(nuevoUsuario);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);

        return await _emisorSesiones.EmitirAsync(nuevoUsuario, tokenCancelacion);
    }
}
