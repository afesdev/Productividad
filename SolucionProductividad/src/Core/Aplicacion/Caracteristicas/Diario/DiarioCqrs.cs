using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Comandos;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Diario;

// ---------- DTOs ----------

public sealed record EntradaDiarioDto(
    Guid Id,
    TipoEntradaDiario Tipo,
    string Titulo,
    string? DetalleMarkdown,
    TimeOnly? HoraInicio,
    TimeOnly? HoraFin,
    bool Completada,
    DateTime FechaCreacion,
    Guid? TareaId,
    string? ClaveTarea);

/// <param name="RegistroId">null si el día aún no tiene nada escrito.</param>
public sealed record DiaDiarioDto(
    DateOnly Fecha,
    Guid? RegistroId,
    string ContenidoMarkdown,
    byte? Animo,
    byte? Energia,
    DateTime? FechaActualizacion,
    IReadOnlyList<EntradaDiarioDto> Entradas);

/// <summary>Resumen de un día para el calendario mensual.</summary>
public sealed record ResumenDiaDiarioDto(
    DateOnly Fecha,
    bool TieneNota,
    byte? Animo,
    int Eventos,
    int Tareas,
    int TareasPendientes,
    int Decisiones,
    int Aprendizajes,
    int Bloqueos,
    int Notas);

public sealed record EntradaExploradaDto(DateOnly Fecha, EntradaDiarioDto Entrada);

internal static class ProyeccionesDiario
{
    public static readonly System.Linq.Expressions.Expression<Func<EntradaDiario, EntradaDiarioDto>> AEntrada = entrada => new EntradaDiarioDto(
        entrada.Id, entrada.Tipo, entrada.Titulo, entrada.DetalleMarkdown, entrada.HoraInicio, entrada.HoraFin, entrada.Completada, entrada.FechaCreacion,
        entrada.TareaId, entrada.Tarea == null ? null : entrada.Tarea.ListaTareas!.Proyecto!.ClavePrefijo + "-" + entrada.Tarea.NumeroTarea);

    /// <summary>Primero las que tienen hora (en orden), luego el resto por orden de creación.</summary>
    public static IQueryable<EntradaDiario> Ordenar(IQueryable<EntradaDiario> entradas) =>
        entradas.OrderBy(entrada => entrada.HoraInicio == null).ThenBy(entrada => entrada.HoraInicio).ThenBy(entrada => entrada.FechaCreacion);
}

// ---------- Día ----------

public sealed record ObtenerDiaDiarioConsulta(DateOnly Fecha) : IRequest<DiaDiarioDto>;

public sealed class ManejadorObtenerDiaDiarioConsulta : IRequestHandler<ObtenerDiaDiarioConsulta, DiaDiarioDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorObtenerDiaDiarioConsulta(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<DiaDiarioDto> Handle(ObtenerDiaDiarioConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var registro = await _contexto.RegistrosDiarios.AsNoTracking()
            .FirstOrDefaultAsync(registro => registro.UsuarioId == usuarioId && registro.FechaLog == consulta.Fecha, tokenCancelacion);
        if (registro is null)
            return new DiaDiarioDto(consulta.Fecha, null, string.Empty, null, null, null, []);

        var entradas = await ProyeccionesDiario.Ordenar(_contexto.EntradasDiario.AsNoTracking().Where(entrada => entrada.RegistroDiarioId == registro.Id))
            .Select(ProyeccionesDiario.AEntrada)
            .ToListAsync(tokenCancelacion);
        return new DiaDiarioDto(registro.FechaLog, registro.Id, registro.ContenidoMarkdown, registro.Animo, registro.Energia, registro.FechaActualizacion, entradas);
    }
}

// ---------- Calendario del mes ----------

public sealed record ObtenerMesDiarioConsulta(int Anio, int Mes) : IRequest<IReadOnlyList<ResumenDiaDiarioDto>>;

public sealed class ValidadorObtenerMesDiarioConsulta : AbstractValidator<ObtenerMesDiarioConsulta>
{
    public ValidadorObtenerMesDiarioConsulta()
    {
        RuleFor(consulta => consulta.Anio).InclusiveBetween(2000, 2100);
        RuleFor(consulta => consulta.Mes).InclusiveBetween(1, 12);
    }
}

public sealed class ManejadorObtenerMesDiarioConsulta : IRequestHandler<ObtenerMesDiarioConsulta, IReadOnlyList<ResumenDiaDiarioDto>>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorObtenerMesDiarioConsulta(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<IReadOnlyList<ResumenDiaDiarioDto>> Handle(ObtenerMesDiarioConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var desde = new DateOnly(consulta.Anio, consulta.Mes, 1);
        var hasta = desde.AddMonths(1);

        return await _contexto.RegistrosDiarios.AsNoTracking()
            .Where(registro => registro.UsuarioId == usuarioId && registro.FechaLog >= desde && registro.FechaLog < hasta)
            .OrderBy(registro => registro.FechaLog)
            .Select(registro => new ResumenDiaDiarioDto(
                registro.FechaLog,
                registro.ContenidoMarkdown != "",
                registro.Animo,
                registro.Entradas.Count(entrada => entrada.Tipo == TipoEntradaDiario.Evento),
                registro.Entradas.Count(entrada => entrada.Tipo == TipoEntradaDiario.Tarea),
                registro.Entradas.Count(entrada => entrada.Tipo == TipoEntradaDiario.Tarea && !entrada.Completada),
                registro.Entradas.Count(entrada => entrada.Tipo == TipoEntradaDiario.Decision),
                registro.Entradas.Count(entrada => entrada.Tipo == TipoEntradaDiario.Aprendizaje),
                registro.Entradas.Count(entrada => entrada.Tipo == TipoEntradaDiario.Bloqueo),
                registro.Entradas.Count(entrada => entrada.Tipo == TipoEntradaDiario.Nota)))
            .ToListAsync(tokenCancelacion);
    }
}

// ---------- Explorar (todas las decisiones, aprendizajes…) ----------

public sealed record ExplorarEntradasDiarioConsulta(TipoEntradaDiario? Tipo, string? Texto, DateOnly? Desde, DateOnly? Hasta) : IRequest<IReadOnlyList<EntradaExploradaDto>>;

public sealed class ManejadorExplorarEntradasDiarioConsulta : IRequestHandler<ExplorarEntradasDiarioConsulta, IReadOnlyList<EntradaExploradaDto>>
{
    private const int Limite = 300;

    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorExplorarEntradasDiarioConsulta(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<IReadOnlyList<EntradaExploradaDto>> Handle(ExplorarEntradasDiarioConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var entradas = _contexto.EntradasDiario.AsNoTracking().Where(entrada => entrada.RegistroDiario!.UsuarioId == usuarioId);

        if (consulta.Tipo is { } tipo)
            entradas = entradas.Where(entrada => entrada.Tipo == tipo);
        if (consulta.Desde is { } desde)
            entradas = entradas.Where(entrada => entrada.RegistroDiario!.FechaLog >= desde);
        if (consulta.Hasta is { } hasta)
            entradas = entradas.Where(entrada => entrada.RegistroDiario!.FechaLog <= hasta);
        if (!string.IsNullOrWhiteSpace(consulta.Texto))
        {
            var texto = consulta.Texto.Trim();
            entradas = entradas.Where(entrada => entrada.Titulo.Contains(texto) || (entrada.DetalleMarkdown != null && entrada.DetalleMarkdown.Contains(texto)));
        }

        return await entradas
            .OrderByDescending(entrada => entrada.RegistroDiario!.FechaLog)
            .ThenBy(entrada => entrada.HoraInicio == null)
            .ThenBy(entrada => entrada.HoraInicio)
            .ThenBy(entrada => entrada.FechaCreacion)
            .Take(Limite)
            .Select(entrada => new EntradaExploradaDto(
                entrada.RegistroDiario!.FechaLog,
                new EntradaDiarioDto(entrada.Id, entrada.Tipo, entrada.Titulo, entrada.DetalleMarkdown, entrada.HoraInicio, entrada.HoraFin, entrada.Completada, entrada.FechaCreacion,
                    entrada.TareaId, entrada.Tarea == null ? null : entrada.Tarea.ListaTareas!.Proyecto!.ClavePrefijo + "-" + entrada.Tarea.NumeroTarea)))
            .ToListAsync(tokenCancelacion);
    }
}

// ---------- Fecha de un registro (para abrir enlaces de búsqueda y backlinks) ----------

public sealed record ObtenerFechaRegistroDiarioConsulta(Guid RegistroId) : IRequest<DateOnly>;

public sealed class ManejadorObtenerFechaRegistroDiarioConsulta : IRequestHandler<ObtenerFechaRegistroDiarioConsulta, DateOnly>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorObtenerFechaRegistroDiarioConsulta(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<DateOnly> Handle(ObtenerFechaRegistroDiarioConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var fechas = await _contexto.RegistrosDiarios.AsNoTracking()
            .Where(registro => registro.Id == consulta.RegistroId && registro.UsuarioId == usuarioId)
            .Select(registro => registro.FechaLog)
            .Take(1)
            .ToListAsync(tokenCancelacion);
        return fechas.Count == 1 ? fechas[0] : throw new ExcepcionEntidadNoEncontrada("el registro del diario", consulta.RegistroId);
    }
}

// ---------- Guardar la nota del día (crea el registro si no existe) ----------

public sealed record GuardarNotaDiarioComando(DateOnly Fecha, string ContenidoMarkdown, byte? Animo, byte? Energia) : IRequest<Guid>;

public sealed class ValidadorGuardarNotaDiarioComando : AbstractValidator<GuardarNotaDiarioComando>
{
    public ValidadorGuardarNotaDiarioComando()
    {
        RuleFor(comando => comando.ContenidoMarkdown).NotNull().MaximumLength(1_000_000);
        RuleFor(comando => comando.Animo).InclusiveBetween((byte)1, (byte)5).When(comando => comando.Animo is not null).WithName("Ánimo");
        RuleFor(comando => comando.Energia).InclusiveBetween((byte)1, (byte)5).When(comando => comando.Energia is not null).WithName("Energía");
    }
}

public sealed class ManejadorGuardarNotaDiarioComando : IRequestHandler<GuardarNotaDiarioComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;
    private readonly IServicioProcesadorBacklinks _procesadorBacklinks;

    public ManejadorGuardarNotaDiarioComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual, IServicioProcesadorBacklinks procesadorBacklinks)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
        _procesadorBacklinks = procesadorBacklinks;
    }

    public async Task<Guid> Handle(GuardarNotaDiarioComando comando, CancellationToken tokenCancelacion)
    {
        var registro = await RegistrosDiario.ObtenerOCrearAsync(_contexto, _usuarioActual.ObtenerUsuarioIdRequerido(), comando.Fecha, tokenCancelacion);
        registro.ContenidoMarkdown = comando.ContenidoMarkdown;
        registro.Animo = comando.Animo;
        registro.Energia = comando.Energia;
        registro.FechaActualizacion = DateTime.UtcNow;

        // [[enlaces]] de la nota → "Enlazan aquí" en tareas, tickets y documentos.
        await _procesadorBacklinks.ProcesarWikiLinksAsync(registro.ContenidoMarkdown, registro.Id, nameof(TipoEntidad.RegistroDiario), tokenCancelacion);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return registro.Id;
    }
}

// ---------- Entradas ----------

/// <param name="Completada">Solo aplica a Tarea (p. ej. al añadir al diario una tarea ya completada).</param>
public sealed record CrearEntradaDiarioComando(DateOnly Fecha, TipoEntradaDiario Tipo, string Titulo, string? DetalleMarkdown, TimeOnly? HoraInicio, TimeOnly? HoraFin, bool Completada = false)
    : IRequest<Guid>;

public sealed class ValidadorCrearEntradaDiarioComando : AbstractValidator<CrearEntradaDiarioComando>
{
    public ValidadorCrearEntradaDiarioComando()
    {
        RuleFor(comando => comando.Tipo).IsInEnum();
        RuleFor(comando => comando.Titulo).NotEmpty().MaximumLength(500).WithName("Título");
        RuleFor(comando => comando.DetalleMarkdown).MaximumLength(20_000);
        RuleFor(comando => comando.HoraFin).Must((comando, fin) => ReglasHorario.Validas(comando.HoraInicio, fin)).WithMessage(ReglasHorario.Mensaje);
    }
}

public sealed class ManejadorCrearEntradaDiarioComando : IRequestHandler<CrearEntradaDiarioComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorCrearEntradaDiarioComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<Guid> Handle(CrearEntradaDiarioComando comando, CancellationToken tokenCancelacion)
    {
        var registro = await RegistrosDiario.ObtenerOCrearAsync(_contexto, _usuarioActual.ObtenerUsuarioIdRequerido(), comando.Fecha, tokenCancelacion);
        var entrada = new EntradaDiario
        {
            RegistroDiarioId = registro.Id,
            Tipo = comando.Tipo,
            Titulo = comando.Titulo.Trim(),
            DetalleMarkdown = string.IsNullOrWhiteSpace(comando.DetalleMarkdown) ? null : comando.DetalleMarkdown.Trim(),
            HoraInicio = comando.HoraInicio,
            HoraFin = comando.HoraFin,
            Completada = comando.Tipo == TipoEntradaDiario.Tarea && comando.Completada
        };
        _contexto.EntradasDiario.Add(entrada);
        registro.FechaActualizacion = DateTime.UtcNow;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return entrada.Id;
    }
}

public sealed record ActualizarEntradaDiarioComando(Guid Id, TipoEntradaDiario Tipo, string Titulo, string? DetalleMarkdown, TimeOnly? HoraInicio, TimeOnly? HoraFin, bool Completada)
    : IRequest;

public sealed class ValidadorActualizarEntradaDiarioComando : AbstractValidator<ActualizarEntradaDiarioComando>
{
    public ValidadorActualizarEntradaDiarioComando()
    {
        RuleFor(comando => comando.Tipo).IsInEnum();
        RuleFor(comando => comando.Titulo).NotEmpty().MaximumLength(500).WithName("Título");
        RuleFor(comando => comando.DetalleMarkdown).MaximumLength(20_000);
        RuleFor(comando => comando.HoraFin).Must((comando, fin) => ReglasHorario.Validas(comando.HoraInicio, fin)).WithMessage(ReglasHorario.Mensaje);
    }
}

public sealed class ManejadorActualizarEntradaDiarioComando : IRequestHandler<ActualizarEntradaDiarioComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorActualizarEntradaDiarioComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(ActualizarEntradaDiarioComando comando, CancellationToken tokenCancelacion)
    {
        // El filtro global limita las entradas a las del usuario actual.
        var entrada = await _contexto.EntradasDiario.Include(entrada => entrada.RegistroDiario).FirstOrDefaultAsync(entrada => entrada.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("la entrada del diario", comando.Id);
        entrada.Tipo = comando.Tipo;
        entrada.Titulo = comando.Titulo.Trim();
        entrada.DetalleMarkdown = string.IsNullOrWhiteSpace(comando.DetalleMarkdown) ? null : comando.DetalleMarkdown.Trim();
        entrada.HoraInicio = comando.HoraInicio;
        entrada.HoraFin = comando.HoraFin;
        entrada.Completada = comando.Tipo == TipoEntradaDiario.Tarea && comando.Completada;
        entrada.RegistroDiario!.FechaActualizacion = DateTime.UtcNow;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

public sealed record EliminarEntradaDiarioComando(Guid Id) : IRequest;

public sealed class ManejadorEliminarEntradaDiarioComando : IRequestHandler<EliminarEntradaDiarioComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorEliminarEntradaDiarioComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(EliminarEntradaDiarioComando comando, CancellationToken tokenCancelacion)
    {
        var entrada = await _contexto.EntradasDiario.FirstOrDefaultAsync(entrada => entrada.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("la entrada del diario", comando.Id);
        _contexto.EntradasDiario.Remove(entrada);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Varios días (vista semanal y exportación) ----------

/// <summary>Días con registro entre <paramref name="Desde"/> y <paramref name="Hasta"/> (incluido), con nota y entradas. Máx. 62 días.</summary>
public sealed record ObtenerRangoDiarioConsulta(DateOnly Desde, DateOnly Hasta) : IRequest<IReadOnlyList<DiaDiarioDto>>;

public sealed class ValidadorObtenerRangoDiarioConsulta : AbstractValidator<ObtenerRangoDiarioConsulta>
{
    public ValidadorObtenerRangoDiarioConsulta()
    {
        RuleFor(consulta => consulta.Hasta).GreaterThanOrEqualTo(consulta => consulta.Desde);
        RuleFor(consulta => consulta).Must(consulta => consulta.Hasta.DayNumber - consulta.Desde.DayNumber <= 62).WithMessage("El rango máximo es de 62 días.");
    }
}

public sealed class ManejadorObtenerRangoDiarioConsulta : IRequestHandler<ObtenerRangoDiarioConsulta, IReadOnlyList<DiaDiarioDto>>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorObtenerRangoDiarioConsulta(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<IReadOnlyList<DiaDiarioDto>> Handle(ObtenerRangoDiarioConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var registros = await _contexto.RegistrosDiarios.AsNoTracking()
            .Where(registro => registro.UsuarioId == usuarioId && registro.FechaLog >= consulta.Desde && registro.FechaLog <= consulta.Hasta)
            .OrderBy(registro => registro.FechaLog)
            .ToListAsync(tokenCancelacion);
        var ids = registros.Select(registro => registro.Id).ToList();
        var entradas = (await ProyeccionesDiario.Ordenar(_contexto.EntradasDiario.AsNoTracking().Where(entrada => ids.Contains(entrada.RegistroDiarioId)))
                .Select(entrada => new { entrada.RegistroDiarioId, Dto = new EntradaDiarioDto(
                    entrada.Id, entrada.Tipo, entrada.Titulo, entrada.DetalleMarkdown, entrada.HoraInicio, entrada.HoraFin, entrada.Completada, entrada.FechaCreacion,
                    entrada.TareaId, entrada.Tarea == null ? null : entrada.Tarea.ListaTareas!.Proyecto!.ClavePrefijo + "-" + entrada.Tarea.NumeroTarea) })
                .ToListAsync(tokenCancelacion))
            .ToLookup(entrada => entrada.RegistroDiarioId, entrada => entrada.Dto);
        return registros
            .Select(registro => new DiaDiarioDto(registro.FechaLog, registro.Id, registro.ContenidoMarkdown, registro.Animo, registro.Energia, registro.FechaActualizacion,
                entradas[registro.Id].ToList()))
            .ToList();
    }
}

// ---------- Convertir una entrada en tarea ----------

/// <summary>Crea una tarea real con el título y el detalle de la entrada y la deja vinculada. Devuelve el Id de la tarea.</summary>
public sealed record ConvertirEntradaEnTareaComando(Guid EntradaId, Guid ListaTareaId, string? Titulo, bool EsUrgente, bool EsImportante) : IRequest<Guid>;

public sealed class ManejadorConvertirEntradaEnTareaComando : IRequestHandler<ConvertirEntradaEnTareaComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly ISender _mediador;

    public ManejadorConvertirEntradaEnTareaComando(IContextoAplicacion contexto, ISender mediador)
    {
        _contexto = contexto;
        _mediador = mediador;
    }

    public async Task<Guid> Handle(ConvertirEntradaEnTareaComando comando, CancellationToken tokenCancelacion)
    {
        // El filtro global limita las entradas a las del usuario actual.
        var entrada = await _contexto.EntradasDiario.FirstOrDefaultAsync(existente => existente.Id == comando.EntradaId, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("la entrada del diario", comando.EntradaId);
        if (entrada.TareaId is not null && await _contexto.Tareas.AnyAsync(tarea => tarea.Id == entrada.TareaId, tokenCancelacion))
            throw new ExcepcionConflicto("Esta entrada ya se convirtió en tarea.");

        // La creación pasa por el comando de Tareas: mismas validaciones, numeración y notificaciones.
        var titulo = string.IsNullOrWhiteSpace(comando.Titulo) ? entrada.Titulo : comando.Titulo.Trim();
        var tareaId = await _mediador.Send(new CrearTareaComando(
            comando.ListaTareaId,
            titulo.Length > 200 ? titulo[..200] : titulo,
            entrada.DetalleMarkdown,
            comando.EsUrgente,
            comando.EsImportante,
            null,
            Estado: entrada.Tipo == TipoEntradaDiario.Tarea && entrada.Completada ? EstadoTarea.Completada : null), tokenCancelacion);

        entrada.TareaId = tareaId;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return tareaId;
    }
}

// ---------- Utilidades ----------

internal static class RegistrosDiario
{
    public static async Task<RegistroDiario> ObtenerOCrearAsync(IContextoAplicacion contexto, Guid usuarioId, DateOnly fecha, CancellationToken tokenCancelacion)
    {
        var registro = await contexto.RegistrosDiarios.FirstOrDefaultAsync(registro => registro.UsuarioId == usuarioId && registro.FechaLog == fecha, tokenCancelacion);
        if (registro is not null)
            return registro;

        registro = new RegistroDiario { UsuarioId = usuarioId, FechaLog = fecha };
        contexto.RegistrosDiarios.Add(registro);
        return registro;
    }
}

internal static class ReglasHorario
{
    public const string Mensaje = "La hora de fin necesita una hora de inicio y no puede ser anterior a ella.";

    public static bool Validas(TimeOnly? inicio, TimeOnly? fin) => fin is null || (inicio is not null && fin >= inicio);
}
