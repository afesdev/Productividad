using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Comandos;

/// <param name="Identificador">Correo o nombre de usuario.</param>
public sealed record IniciarSesionComando(string Identificador, string Contrasena) : IRequest<RespuestaAutenticacionDto>;

public sealed class ValidadorIniciarSesionComando : AbstractValidator<IniciarSesionComando>
{
    public ValidadorIniciarSesionComando()
    {
        RuleFor(comando => comando.Identificador).NotEmpty().MaximumLength(256);
        RuleFor(comando => comando.Contrasena).NotEmpty().MaximumLength(128);
    }
}

public sealed class ManejadorIniciarSesionComando : IRequestHandler<IniciarSesionComando, RespuestaAutenticacionDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioHashContrasena _servicioHash;
    private readonly EmisorSesiones _emisorSesiones;

    public ManejadorIniciarSesionComando(IContextoAplicacion contexto, IServicioHashContrasena servicioHash, EmisorSesiones emisorSesiones)
    {
        _contexto = contexto;
        _servicioHash = servicioHash;
        _emisorSesiones = emisorSesiones;
    }

    public async Task<RespuestaAutenticacionDto> Handle(IniciarSesionComando comando, CancellationToken tokenCancelacion)
    {
        // Un nombre de usuario nunca contiene "@", así que el identificador no es ambiguo.
        var identificador = comando.Identificador.Trim();
        var correo = identificador.ToLowerInvariant();
        var nombreUsuario = ReglasNombreUsuario.Normalizar(identificador);
        var usuario = identificador.Contains('@')
            ? await _contexto.Usuarios.FirstOrDefaultAsync(usuario => usuario.Correo == correo, tokenCancelacion)
            : await _contexto.Usuarios.FirstOrDefaultAsync(usuario => usuario.NombreUsuario == nombreUsuario, tokenCancelacion);

        // Mensaje genérico para no revelar si la cuenta existe.
        if (usuario is null || !usuario.EstaActivo || !_servicioHash.VerificarHash(comando.Contrasena, usuario.HashContrasena))
            throw new ExcepcionNoAutorizado("Usuario o contraseña incorrectos.");

        return await _emisorSesiones.EmitirAsync(usuario, tokenCancelacion);
    }
}
