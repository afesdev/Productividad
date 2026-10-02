using System.Globalization;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Calendario;

// ---------- DTOs ----------

public sealed record EstadoConexionCalendarioDto(bool Conectado, DateTime? FechaConexion);

/// <summary>
/// Inicio y Fin: "AAAA-MM-DD" (fin exclusivo) en eventos de todo el día; instante UTC ISO-8601 en el resto.
/// Así el navegador los ubica en su zona sin correr los de todo el día.
/// </summary>
public sealed record EventoCalendarioDto(
    string Id,
    string Titulo,
    string Inicio,
    string Fin,
    bool TodoElDia,
    string? Ubicacion,
    string? Organizador,
    DisponibilidadEvento Disponibilidad,
    bool Cancelado,
    bool Privado,
    string? EnlaceReunion,
    string? Descripcion);

// ---------- Estado de la conexión ----------

public sealed record ObtenerEstadoConexionCalendarioConsulta : IRequest<EstadoConexionCalendarioDto>;

public sealed class ManejadorObtenerEstadoConexionCalendarioConsulta : IRequestHandler<ObtenerEstadoConexionCalendarioConsulta, EstadoConexionCalendarioDto>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorObtenerEstadoConexionCalendarioConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<EstadoConexionCalendarioDto> Handle(ObtenerEstadoConexionCalendarioConsulta consulta, CancellationToken tokenCancelacion)
    {
        var fecha = await _contexto.ConexionesCalendario.AsNoTracking()
            .Select(conexion => (DateTime?)conexion.FechaConexion)
            .FirstOrDefaultAsync(tokenCancelacion);
        return new EstadoConexionCalendarioDto(fecha is not null, fecha);
    }
}

// ---------- Conectar (o reemplazar el enlace) ----------

public sealed record ConectarCalendarioComando(string UrlIcs) : IRequest<EstadoConexionCalendarioDto>;

public sealed class ValidadorConectarCalendarioComando : AbstractValidator<ConectarCalendarioComando>
{
    public ValidadorConectarCalendarioComando() =>
        RuleFor(comando => comando.UrlIcs)
            .NotEmpty()
            .MaximumLength(2000)
            .Must(ReglasUrlCalendario.EsValida).WithMessage(ReglasUrlCalendario.Mensaje)
            .WithName("Enlace ICS");
}

public sealed class ManejadorConectarCalendarioComando : IRequestHandler<ConectarCalendarioComando, EstadoConexionCalendarioDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;
    private readonly IServicioCalendarioIcs _calendario;
    private readonly IServicioCifradoBoveda _cifrado;

    public ManejadorConectarCalendarioComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual, IServicioCalendarioIcs calendario, IServicioCifradoBoveda cifrado)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
        _calendario = calendario;
        _cifrado = cifrado;
    }

    public async Task<EstadoConexionCalendarioDto> Handle(ConectarCalendarioComando comando, CancellationToken tokenCancelacion)
    {
        var url = comando.UrlIcs.Trim();
        // Se prueba antes de guardar: si Outlook no lo acepta o no es un ICS, el usuario lo sabe ya.
        var ahora = DateTime.UtcNow;
        await _calendario.ObtenerEventosAsync(url, ahora, ahora.AddDays(1), omitirCache: true, tokenCancelacion);

        var conexion = await _contexto.ConexionesCalendario.FirstOrDefaultAsync(tokenCancelacion);
        if (conexion is null)
        {
            conexion = new ConexionCalendario { UsuarioId = _usuarioActual.ObtenerUsuarioIdRequerido() };
            _contexto.ConexionesCalendario.Add(conexion);
        }
        conexion.UrlIcsCifrada = _cifrado.CifrarTexto(url);
        conexion.FechaConexion = ahora;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return new EstadoConexionCalendarioDto(true, conexion.FechaConexion);
    }
}

// ---------- Desconectar ----------

public sealed record DesconectarCalendarioComando : IRequest;

public sealed class ManejadorDesconectarCalendarioComando : IRequestHandler<DesconectarCalendarioComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorDesconectarCalendarioComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(DesconectarCalendarioComando comando, CancellationToken tokenCancelacion)
    {
        var conexion = await _contexto.ConexionesCalendario.FirstOrDefaultAsync(tokenCancelacion);
        if (conexion is null) return;
        _contexto.ConexionesCalendario.Remove(conexion);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Eventos de un rango ----------

public sealed record ObtenerEventosCalendarioConsulta(DateTimeOffset Desde, DateTimeOffset Hasta, bool Actualizar = false) : IRequest<IReadOnlyList<EventoCalendarioDto>>;

public sealed class ValidadorObtenerEventosCalendarioConsulta : AbstractValidator<ObtenerEventosCalendarioConsulta>
{
    public ValidadorObtenerEventosCalendarioConsulta()
    {
        RuleFor(consulta => consulta.Hasta).GreaterThan(consulta => consulta.Desde).WithMessage("El fin del rango debe ser posterior al inicio.");
        RuleFor(consulta => consulta).Must(consulta => consulta.Hasta - consulta.Desde <= TimeSpan.FromDays(62))
            .WithName("Rango").WithMessage("El rango no puede superar 62 días.");
    }
}

public sealed class ManejadorObtenerEventosCalendarioConsulta : IRequestHandler<ObtenerEventosCalendarioConsulta, IReadOnlyList<EventoCalendarioDto>>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioCalendarioIcs _calendario;
    private readonly IServicioCifradoBoveda _cifrado;

    public ManejadorObtenerEventosCalendarioConsulta(IContextoAplicacion contexto, IServicioCalendarioIcs calendario, IServicioCifradoBoveda cifrado)
    {
        _contexto = contexto;
        _calendario = calendario;
        _cifrado = cifrado;
    }

    public async Task<IReadOnlyList<EventoCalendarioDto>> Handle(ObtenerEventosCalendarioConsulta consulta, CancellationToken tokenCancelacion)
    {
        var urlCifrada = await _contexto.ConexionesCalendario.AsNoTracking()
            .Select(conexion => conexion.UrlIcsCifrada)
            .FirstOrDefaultAsync(tokenCancelacion)
            ?? throw new ExcepcionConflicto("No hay ningún calendario conectado.");

        var eventos = await _calendario.ObtenerEventosAsync(
            _cifrado.DescifrarTexto(urlCifrada), consulta.Desde.UtcDateTime, consulta.Hasta.UtcDateTime, consulta.Actualizar, tokenCancelacion);

        return eventos.Select(evento => new EventoCalendarioDto(
                evento.Id,
                evento.Titulo,
                Formatear(evento.Inicio, evento.TodoElDia),
                Formatear(evento.Fin, evento.TodoElDia),
                evento.TodoElDia,
                evento.Ubicacion,
                evento.Organizador,
                evento.Disponibilidad,
                evento.Cancelado,
                evento.Privado,
                evento.EnlaceReunion,
                evento.Descripcion))
            .ToList();
    }

    private static string Formatear(DateTime fecha, bool todoElDia) =>
        todoElDia ? fecha.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) : DateTime.SpecifyKind(fecha, DateTimeKind.Utc).ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture);
}
