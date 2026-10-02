using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Boveda;

/// <summary>Metadatos del secreto; nunca incluye el valor.</summary>
public sealed record SecretoResumenDto(
    Guid Id,
    Guid? ProyectoId,
    EntornoBoveda Entorno,
    string NombreClave,
    string? Descripcion,
    Guid CreadoPor,
    DateTime FechaActualizacion);

public sealed record SecretoReveladoDto(Guid Id, EntornoBoveda Entorno, string NombreClave, string Valor);

/// <summary>
/// Regla de acceso: solo el creador del secreto puede verlo, modificarlo o eliminarlo (también aplica al Administrador).
/// Refuerza el filtro global del contexto.
/// </summary>
internal static class ReglasAccesoBoveda
{
    public static bool PuedeAcceder(SecretoBoveda secreto, IServicioUsuarioActual usuarioActual) =>
        secreto.CreadoPor == usuarioActual.UsuarioId;

    public static async Task<SecretoBoveda> ObtenerConAccesoAsync(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual, Guid secretoId, CancellationToken tokenCancelacion)
    {
        var secreto = await contexto.BovedaSecretos.FirstOrDefaultAsync(secreto => secreto.Id == secretoId, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el secreto", secretoId);

        // Se responde 404 en lugar de 403 para no confirmar la existencia de secretos ajenos.
        if (!PuedeAcceder(secreto, usuarioActual))
            throw new ExcepcionEntidadNoEncontrada("el secreto", secretoId);

        return secreto;
    }
}

// ---------- Guardar (crear o actualizar por clave) ----------

public sealed record GuardarSecretoComando(
    Guid? ProyectoId,
    EntornoBoveda Entorno,
    string NombreClave,
    string Valor,
    string? Descripcion) : IRequest<Guid>;

public sealed class ValidadorGuardarSecretoComando : AbstractValidator<GuardarSecretoComando>
{
    public ValidadorGuardarSecretoComando()
    {
        RuleFor(comando => comando.Entorno).IsInEnum();
        RuleFor(comando => comando.NombreClave)
            .NotEmpty()
            .MaximumLength(150)
            .Matches("^[A-Za-z_][A-Za-z0-9_.-]*$").WithMessage("Use un nombre de variable válido (ej. DATABASE_URL).");
        RuleFor(comando => comando.Valor).NotNull().MaximumLength(20_000);
        RuleFor(comando => comando.Descripcion).MaximumLength(250);
    }
}

public sealed class ManejadorGuardarSecretoComando : IRequestHandler<GuardarSecretoComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioCifradoBoveda _servicioCifrado;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorGuardarSecretoComando(IContextoAplicacion contexto, IServicioCifradoBoveda servicioCifrado, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _servicioCifrado = servicioCifrado;
        _usuarioActual = usuarioActual;
    }

    public async Task<Guid> Handle(GuardarSecretoComando comando, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();

        if (comando.ProyectoId is { } proyectoId && !await _contexto.Proyectos.AnyAsync(proyecto => proyecto.Id == proyectoId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("el proyecto", proyectoId);

        var secreto = await _contexto.BovedaSecretos.FirstOrDefaultAsync(secreto =>
            secreto.ProyectoId == comando.ProyectoId &&
            secreto.Entorno == comando.Entorno &&
            secreto.NombreClave == comando.NombreClave, tokenCancelacion);

        if (secreto is null)
        {
            secreto = new SecretoBoveda
            {
                ProyectoId = comando.ProyectoId,
                Entorno = comando.Entorno,
                NombreClave = comando.NombreClave,
                CreadoPor = usuarioId
            };
            _contexto.BovedaSecretos.Add(secreto);
        }
        else if (!ReglasAccesoBoveda.PuedeAcceder(secreto, _usuarioActual))
        {
            throw new ExcepcionAccesoDenegado("La clave ya existe y pertenece a otro usuario.");
        }

        secreto.ValorCifrado = _servicioCifrado.CifrarTexto(comando.Valor);
        secreto.Descripcion = comando.Descripcion;
        secreto.FechaActualizacion = DateTime.UtcNow;

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return secreto.Id;
    }
}

// ---------- Revelar ----------

public sealed record RevelarSecretoConsulta(Guid Id) : IRequest<SecretoReveladoDto>;

public sealed class ManejadorRevelarSecretoConsulta : IRequestHandler<RevelarSecretoConsulta, SecretoReveladoDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioCifradoBoveda _servicioCifrado;
    private readonly IServicioUsuarioActual _usuarioActual;
    private readonly ILogger<ManejadorRevelarSecretoConsulta> _registrador;

    public ManejadorRevelarSecretoConsulta(
        IContextoAplicacion contexto,
        IServicioCifradoBoveda servicioCifrado,
        IServicioUsuarioActual usuarioActual,
        ILogger<ManejadorRevelarSecretoConsulta> registrador)
    {
        _contexto = contexto;
        _servicioCifrado = servicioCifrado;
        _usuarioActual = usuarioActual;
        _registrador = registrador;
    }

    public async Task<SecretoReveladoDto> Handle(RevelarSecretoConsulta consulta, CancellationToken tokenCancelacion)
    {
        var secreto = await ReglasAccesoBoveda.ObtenerConAccesoAsync(_contexto, _usuarioActual, consulta.Id, tokenCancelacion);

        // Auditoría: se registra quién reveló qué clave, jamás el valor.
        _registrador.LogInformation("Secreto {SecretoId} ({NombreClave}/{Entorno}) revelado por {UsuarioId}",
            secreto.Id, secreto.NombreClave, secreto.Entorno, _usuarioActual.UsuarioId);

        return new SecretoReveladoDto(secreto.Id, secreto.Entorno, secreto.NombreClave, _servicioCifrado.DescifrarTexto(secreto.ValorCifrado));
    }
}

// ---------- Listar (sin valores) ----------

public sealed record ListarSecretosConsulta(Guid? ProyectoId, EntornoBoveda? Entorno) : IRequest<IReadOnlyList<SecretoResumenDto>>;

public sealed class ManejadorListarSecretosConsulta : IRequestHandler<ListarSecretosConsulta, IReadOnlyList<SecretoResumenDto>>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorListarSecretosConsulta(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<IReadOnlyList<SecretoResumenDto>> Handle(ListarSecretosConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var secretos = _contexto.BovedaSecretos.AsNoTracking().Where(secreto => secreto.CreadoPor == usuarioId);

        if (consulta.ProyectoId is { } proyectoId)
            secretos = secretos.Where(secreto => secreto.ProyectoId == proyectoId);
        if (consulta.Entorno is { } entorno)
            secretos = secretos.Where(secreto => secreto.Entorno == entorno);

        return await secretos
            .OrderBy(secreto => secreto.Entorno).ThenBy(secreto => secreto.NombreClave)
            .Select(secreto => new SecretoResumenDto(secreto.Id, secreto.ProyectoId, secreto.Entorno, secreto.NombreClave,
                secreto.Descripcion, secreto.CreadoPor, secreto.FechaActualizacion))
            .ToListAsync(tokenCancelacion);
    }
}

// ---------- Eliminar ----------

public sealed record EliminarSecretoComando(Guid Id) : IRequest;

public sealed class ManejadorEliminarSecretoComando : IRequestHandler<EliminarSecretoComando>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorEliminarSecretoComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task Handle(EliminarSecretoComando comando, CancellationToken tokenCancelacion)
    {
        var secreto = await ReglasAccesoBoveda.ObtenerConAccesoAsync(_contexto, _usuarioActual, comando.Id, tokenCancelacion);
        _contexto.BovedaSecretos.Remove(secreto);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}
