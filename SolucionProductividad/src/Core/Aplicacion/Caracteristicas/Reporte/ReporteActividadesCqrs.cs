using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Comun.Utilidades;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Reporte;

// ---------- DTOs ----------

public sealed record TableroReporteDto(Guid Id, string Nombre, Guid? ProyectoId, string? NombreProyecto, bool EstaArchivado, int Actividades);

/// <summary>
/// Una actividad del reporte: una entrada del diario con hora de inicio. Los valores ya vienen resueltos
/// (fecha de solicitud, tablero y estado efectivos) y los indicadores dicen cuáles son sugeridos y no elegidos.
/// </summary>
public sealed record FilaReporteDto(
    Guid EntradaId,
    DateOnly Fecha,
    DateOnly FechaSolicitud,
    bool FechaSolicitudPersonalizada,
    TimeOnly HoraInicio,
    TimeOnly? HoraFin,
    string Descripcion,
    /// <summary>La descripción sin formato Markdown: es lo que va al Excel.</summary>
    string DescripcionTexto,
    TipoEntradaDiario Tipo,
    string? ClaveTarea,
    Guid? TableroReporteId,
    string? NombreTablero,
    bool TableroSugerido,
    EstadoActividadReporte Estado,
    decimal? Horas,
    DateTime? FechaReportado);

public sealed record ArchivoReporteDto(string NombreArchivo, byte[] Contenido);

// ---------- Reglas comunes ----------

internal static class ReglasReporte
{
    public const int MaximoDias = 93;

    public static decimal? Horas(TimeOnly inicio, TimeOnly? fin) =>
        fin is { } final && final >= inicio ? Math.Round((decimal)(final - inicio).TotalHours, 2, MidpointRounding.AwayFromZero) : null;

    public static EstadoActividadReporte Estado(EstadoActividadReporte? elegido, TipoEntradaDiario tipo, bool completada) =>
        elegido ?? (tipo == TipoEntradaDiario.Tarea && !completada ? EstadoActividadReporte.EnProceso : EstadoActividadReporte.Terminada);

    public static string Texto(EstadoActividadReporte estado) => estado == EstadoActividadReporte.Terminada ? "Terminada" : "En proceso";

    /// <summary>Datos crudos de cada entrada; la resolución (sugerencias, horas) se hace en memoria.</summary>
    internal sealed record EntradaCruda(
        Guid Id, DateOnly Fecha, TimeOnly HoraInicio, TimeOnly? HoraFin, string Titulo, TipoEntradaDiario Tipo, bool Completada,
        DateOnly? FechaSolicitud, DateTime? CreacionTarea, string? ClaveTarea, Guid? ProyectoTareaId,
        Guid? TableroReporteId, string? NombreTablero, EstadoActividadReporte? EstadoReporte, DateTime? FechaReportado);

    public static IQueryable<EntradaCruda> Proyectar(IQueryable<EntradaDiario> entradas) =>
        entradas.Where(entrada => entrada.HoraInicio != null).Select(entrada => new EntradaCruda(
            entrada.Id,
            entrada.RegistroDiario!.FechaLog,
            entrada.HoraInicio!.Value,
            entrada.HoraFin,
            entrada.Titulo,
            entrada.Tipo,
            entrada.Completada,
            entrada.FechaSolicitud,
            entrada.Tarea == null ? null : entrada.Tarea.FechaCreacion,
            entrada.Tarea == null ? null : entrada.Tarea.ListaTareas!.Proyecto!.ClavePrefijo + "-" + entrada.Tarea.NumeroTarea,
            entrada.Tarea == null ? null : entrada.Tarea.ListaTareas!.ProyectoId,
            entrada.TableroReporteId,
            entrada.TableroReporte == null ? null : entrada.TableroReporte.Nombre,
            entrada.EstadoReporte,
            entrada.FechaReportado));

    /// <summary>Tablero sugerido por proyecto: el primero no archivado asociado al proyecto de la tarea vinculada.</summary>
    public static async Task<Dictionary<Guid, (Guid Id, string Nombre)>> TablerosPorProyectoAsync(IContextoAplicacion contexto, CancellationToken tokenCancelacion) =>
        (await contexto.TablerosReporte.AsNoTracking()
            .Where(tablero => tablero.ProyectoId != null && !tablero.EstaArchivado)
            .OrderBy(tablero => tablero.Nombre)
            .Select(tablero => new { ProyectoId = tablero.ProyectoId!.Value, tablero.Id, tablero.Nombre })
            .ToListAsync(tokenCancelacion))
        .GroupBy(tablero => tablero.ProyectoId)
        .ToDictionary(grupo => grupo.Key, grupo => (grupo.First().Id, grupo.First().Nombre));

    public static FilaReporteDto AFila(EntradaCruda entrada, IReadOnlyDictionary<Guid, (Guid Id, string Nombre)> tablerosPorProyecto)
    {
        var sugerido = entrada.TableroReporteId is null && entrada.ProyectoTareaId is { } proyectoId && tablerosPorProyecto.TryGetValue(proyectoId, out var porProyecto)
            ? porProyecto
            : ((Guid Id, string Nombre)?)null;
        var fechaSolicitud = entrada.FechaSolicitud
            ?? (entrada.CreacionTarea is { } creacion ? DateOnly.FromDateTime(creacion) : entrada.Fecha);
        // Una tarea creada después del día de la actividad no puede ser la "solicitud": se usa el día.
        if (entrada.FechaSolicitud is null && fechaSolicitud > entrada.Fecha) fechaSolicitud = entrada.Fecha;

        return new FilaReporteDto(
            entrada.Id,
            entrada.Fecha,
            fechaSolicitud,
            entrada.FechaSolicitud is not null,
            entrada.HoraInicio,
            entrada.HoraFin,
            entrada.Titulo,
            TextoPlanoMarkdown.Convertir(entrada.Titulo),
            entrada.Tipo,
            entrada.ClaveTarea,
            entrada.TableroReporteId ?? sugerido?.Id,
            entrada.NombreTablero ?? sugerido?.Nombre,
            sugerido is not null,
            Estado(entrada.EstadoReporte, entrada.Tipo, entrada.Completada),
            Horas(entrada.HoraInicio, entrada.HoraFin),
            entrada.FechaReportado);
    }
}

// ---------- Tableros ----------

public sealed record ListarTablerosReporteConsulta : IRequest<IReadOnlyList<TableroReporteDto>>;

public sealed class ManejadorListarTablerosReporteConsulta : IRequestHandler<ListarTablerosReporteConsulta, IReadOnlyList<TableroReporteDto>>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorListarTablerosReporteConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<IReadOnlyList<TableroReporteDto>> Handle(ListarTablerosReporteConsulta consulta, CancellationToken tokenCancelacion) =>
        await _contexto.TablerosReporte.AsNoTracking()
            .OrderBy(tablero => tablero.EstaArchivado).ThenBy(tablero => tablero.Nombre)
            .Select(tablero => new TableroReporteDto(
                tablero.Id,
                tablero.Nombre,
                tablero.ProyectoId,
                tablero.Proyecto == null ? null : tablero.Proyecto.Nombre,
                tablero.EstaArchivado,
                _contexto.EntradasDiario.Count(entrada => entrada.TableroReporteId == tablero.Id)))
            .ToListAsync(tokenCancelacion);
}

public sealed record GuardarTableroReporteComando(Guid? Id, string Nombre, Guid? ProyectoId, bool EstaArchivado) : IRequest<Guid>;

public sealed class ValidadorGuardarTableroReporteComando : AbstractValidator<GuardarTableroReporteComando>
{
    public ValidadorGuardarTableroReporteComando() => RuleFor(comando => comando.Nombre).NotEmpty().MaximumLength(150).WithName("Nombre");
}

public sealed class ManejadorGuardarTableroReporteComando : IRequestHandler<GuardarTableroReporteComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorGuardarTableroReporteComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<Guid> Handle(GuardarTableroReporteComando comando, CancellationToken tokenCancelacion)
    {
        var nombre = comando.Nombre.Trim();
        if (await _contexto.TablerosReporte.AnyAsync(tablero => tablero.Nombre == nombre && tablero.Id != comando.Id, tokenCancelacion))
            throw new ExcepcionConflicto($"Ya existe un tablero llamado «{nombre}».");
        // El filtro global de proyectos impide asociar uno ajeno.
        if (comando.ProyectoId is { } proyectoId && !await _contexto.Proyectos.AnyAsync(proyecto => proyecto.Id == proyectoId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("el proyecto", proyectoId);

        TableroReporte tablero;
        if (comando.Id is { } id)
        {
            tablero = await _contexto.TablerosReporte.FirstOrDefaultAsync(existente => existente.Id == id, tokenCancelacion)
                ?? throw new ExcepcionEntidadNoEncontrada("el tablero", id);
        }
        else
        {
            tablero = new TableroReporte { UsuarioId = _usuarioActual.ObtenerUsuarioIdRequerido() };
            _contexto.TablerosReporte.Add(tablero);
        }
        tablero.Nombre = nombre;
        tablero.ProyectoId = comando.ProyectoId;
        tablero.EstaArchivado = comando.EstaArchivado;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return tablero.Id;
    }
}

public sealed record EliminarTableroReporteComando(Guid Id) : IRequest;

public sealed class ManejadorEliminarTableroReporteComando : IRequestHandler<EliminarTableroReporteComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorEliminarTableroReporteComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(EliminarTableroReporteComando comando, CancellationToken tokenCancelacion)
    {
        var tablero = await _contexto.TablerosReporte.FirstOrDefaultAsync(existente => existente.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el tablero", comando.Id);
        // Con actividades imputadas se archiva para no perder el dato en reportes ya entregados.
        if (await _contexto.EntradasDiario.AnyAsync(entrada => entrada.TableroReporteId == tablero.Id, tokenCancelacion))
            throw new ExcepcionConflicto("El tablero tiene actividades registradas. Archívalo en lugar de eliminarlo.");
        _contexto.TablerosReporte.Remove(tablero);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Reporte ----------

public sealed record ObtenerReporteActividadesConsulta(DateOnly Desde, DateOnly Hasta, bool SoloPendientes) : IRequest<IReadOnlyList<FilaReporteDto>>;

public sealed class ValidadorObtenerReporteActividadesConsulta : AbstractValidator<ObtenerReporteActividadesConsulta>
{
    public ValidadorObtenerReporteActividadesConsulta()
    {
        RuleFor(consulta => consulta.Hasta).GreaterThanOrEqualTo(consulta => consulta.Desde).WithMessage("La fecha final debe ser igual o posterior a la inicial.");
        RuleFor(consulta => consulta).Must(consulta => consulta.Hasta.DayNumber - consulta.Desde.DayNumber <= ReglasReporte.MaximoDias)
            .WithName("Rango").WithMessage($"El rango máximo es de {ReglasReporte.MaximoDias} días.");
    }
}

public sealed class ManejadorObtenerReporteActividadesConsulta : IRequestHandler<ObtenerReporteActividadesConsulta, IReadOnlyList<FilaReporteDto>>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorObtenerReporteActividadesConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<IReadOnlyList<FilaReporteDto>> Handle(ObtenerReporteActividadesConsulta consulta, CancellationToken tokenCancelacion)
    {
        var entradas = _contexto.EntradasDiario.AsNoTracking()
            .Where(entrada => entrada.RegistroDiario!.FechaLog >= consulta.Desde && entrada.RegistroDiario.FechaLog <= consulta.Hasta);
        if (consulta.SoloPendientes) entradas = entradas.Where(entrada => entrada.FechaReportado == null);

        var crudas = await ReglasReporte.Proyectar(entradas).ToListAsync(tokenCancelacion);
        var tablerosPorProyecto = await ReglasReporte.TablerosPorProyectoAsync(_contexto, tokenCancelacion);
        return crudas
            .OrderBy(entrada => entrada.Fecha).ThenBy(entrada => entrada.HoraInicio)
            .Select(entrada => ReglasReporte.AFila(entrada, tablerosPorProyecto))
            .ToList();
    }
}

/// <summary>Edición de una fila desde la tabla del reporte; se guarda en la entrada del diario.</summary>
public sealed record ActualizarFilaReporteComando(
    Guid EntradaId, string Descripcion, TimeOnly HoraInicio, TimeOnly? HoraFin, Guid? TableroReporteId, DateOnly? FechaSolicitud, EstadoActividadReporte Estado)
    : IRequest<FilaReporteDto>;

public sealed class ValidadorActualizarFilaReporteComando : AbstractValidator<ActualizarFilaReporteComando>
{
    public ValidadorActualizarFilaReporteComando()
    {
        RuleFor(comando => comando.Descripcion).NotEmpty().MaximumLength(500).WithName("Descripción");
        RuleFor(comando => comando.Estado).IsInEnum();
        RuleFor(comando => comando.HoraFin).Must((comando, fin) => fin is null || fin >= comando.HoraInicio)
            .WithMessage("La hora de fin no puede ser anterior a la de inicio.");
    }
}

public sealed class ManejadorActualizarFilaReporteComando : IRequestHandler<ActualizarFilaReporteComando, FilaReporteDto>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorActualizarFilaReporteComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<FilaReporteDto> Handle(ActualizarFilaReporteComando comando, CancellationToken tokenCancelacion)
    {
        var entrada = await _contexto.EntradasDiario.Include(existente => existente.RegistroDiario)
                .FirstOrDefaultAsync(existente => existente.Id == comando.EntradaId, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("la actividad", comando.EntradaId);
        if (comando.TableroReporteId is { } tableroId && !await _contexto.TablerosReporte.AnyAsync(tablero => tablero.Id == tableroId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("el tablero", tableroId);

        entrada.Titulo = comando.Descripcion.Trim();
        entrada.HoraInicio = comando.HoraInicio;
        entrada.HoraFin = comando.HoraFin;
        entrada.TableroReporteId = comando.TableroReporteId;
        entrada.FechaSolicitud = comando.FechaSolicitud;
        entrada.EstadoReporte = comando.Estado;
        // En el diario, las entradas de tipo Tarea reflejan el mismo estado en su casilla.
        if (entrada.Tipo == TipoEntradaDiario.Tarea) entrada.Completada = comando.Estado == EstadoActividadReporte.Terminada;
        entrada.RegistroDiario!.FechaActualizacion = DateTime.UtcNow;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);

        var cruda = await ReglasReporte.Proyectar(_contexto.EntradasDiario.AsNoTracking().Where(existente => existente.Id == entrada.Id)).FirstAsync(tokenCancelacion);
        return ReglasReporte.AFila(cruda, await ReglasReporte.TablerosPorProyectoAsync(_contexto, tokenCancelacion));
    }
}

public sealed record MarcarActividadesReportadasComando(IReadOnlyList<Guid> EntradaIds, bool Reportadas) : IRequest<int>;

public sealed class ValidadorMarcarActividadesReportadasComando : AbstractValidator<MarcarActividadesReportadasComando>
{
    public ValidadorMarcarActividadesReportadasComando() => RuleFor(comando => comando.EntradaIds).NotEmpty().Must(ids => ids.Count <= 2000);
}

public sealed class ManejadorMarcarActividadesReportadasComando : IRequestHandler<MarcarActividadesReportadasComando, int>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorMarcarActividadesReportadasComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<int> Handle(MarcarActividadesReportadasComando comando, CancellationToken tokenCancelacion)
    {
        var ids = comando.EntradaIds.Distinct().ToList();
        var entradas = await _contexto.EntradasDiario.Where(entrada => ids.Contains(entrada.Id)).ToListAsync(tokenCancelacion);
        var ahora = DateTime.UtcNow;
        foreach (var entrada in entradas) entrada.FechaReportado = comando.Reportadas ? ahora : null;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return entradas.Count;
    }
}

/// <summary>Excel con las filas indicadas, en el orden recibido (el de la tabla en pantalla).</summary>
public sealed record ExportarReporteExcelConsulta(IReadOnlyList<Guid> EntradaIds, string Ejecutor) : IRequest<ArchivoReporteDto>;

public sealed class ValidadorExportarReporteExcelConsulta : AbstractValidator<ExportarReporteExcelConsulta>
{
    public ValidadorExportarReporteExcelConsulta()
    {
        RuleFor(consulta => consulta.EntradaIds).NotEmpty().Must(ids => ids.Count <= 2000);
        RuleFor(consulta => consulta.Ejecutor).NotEmpty().MaximumLength(150).WithName("Ejecutor");
    }
}

public sealed class ManejadorExportarReporteExcelConsulta : IRequestHandler<ExportarReporteExcelConsulta, ArchivoReporteDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IGeneradorExcelReporte _generador;

    public ManejadorExportarReporteExcelConsulta(IContextoAplicacion contexto, IGeneradorExcelReporte generador)
    {
        _contexto = contexto;
        _generador = generador;
    }

    public async Task<ArchivoReporteDto> Handle(ExportarReporteExcelConsulta consulta, CancellationToken tokenCancelacion)
    {
        var ids = consulta.EntradaIds.Distinct().ToList();
        var crudas = await ReglasReporte.Proyectar(_contexto.EntradasDiario.AsNoTracking().Where(entrada => ids.Contains(entrada.Id))).ToListAsync(tokenCancelacion);
        var tablerosPorProyecto = await ReglasReporte.TablerosPorProyectoAsync(_contexto, tokenCancelacion);
        var porId = crudas.ToDictionary(entrada => entrada.Id, entrada => ReglasReporte.AFila(entrada, tablerosPorProyecto));
        var filas = ids.Where(porId.ContainsKey).Select(id => porId[id]).ToList();
        if (filas.Count == 0) throw new ExcepcionEntidadNoEncontrada("las actividades", string.Join(", ", ids.Take(3)));

        var ejecutor = consulta.Ejecutor.Trim();
        var contenido = _generador.Generar(filas.Select(fila => new FilaExcelReporte(
            fila.FechaSolicitud, fila.Fecha, fila.Fecha, fila.HoraInicio, fila.HoraFin, fila.DescripcionTexto, fila.NombreTablero, ejecutor,
            ReglasReporte.Texto(fila.Estado), fila.Horas ?? 0)).ToList());

        var desde = filas.Min(fila => fila.Fecha);
        var hasta = filas.Max(fila => fila.Fecha);
        var nombre = desde == hasta ? $"Actividades {desde:yyyy-MM-dd}.xlsx" : $"Actividades {desde:yyyy-MM-dd} a {hasta:yyyy-MM-dd}.xlsx";
        return new ArchivoReporteDto(nombre, contenido);
    }
}
