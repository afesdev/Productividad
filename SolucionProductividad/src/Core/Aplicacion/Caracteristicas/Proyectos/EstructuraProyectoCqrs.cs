using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Proyectos;

public sealed record ListaResumenDto(Guid Id, Guid? CarpetaId, string Nombre, int IndiceOrden, int TotalTareas, int TareasCompletadas);

public sealed record CarpetaDto(Guid Id, string Nombre, string? Icono, int IndiceOrden, IReadOnlyList<ListaResumenDto> Listas);

/// <summary>Árbol Proyecto → Carpetas → Listas para la barra lateral del módulo de tareas.</summary>
public sealed record EstructuraProyectoDto(ProyectoDto Proyecto, IReadOnlyList<CarpetaDto> Carpetas, IReadOnlyList<ListaResumenDto> ListasSinCarpeta);

// ---------- Estructura ----------

public sealed record ObtenerEstructuraProyectoConsulta(Guid ProyectoId) : IRequest<EstructuraProyectoDto>;

public sealed class ManejadorObtenerEstructuraProyectoConsulta : IRequestHandler<ObtenerEstructuraProyectoConsulta, EstructuraProyectoDto>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorObtenerEstructuraProyectoConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<EstructuraProyectoDto> Handle(ObtenerEstructuraProyectoConsulta consulta, CancellationToken tokenCancelacion)
    {
        var proyecto = await _contexto.Proyectos.AsNoTracking()
            .Where(proyecto => proyecto.Id == consulta.ProyectoId)
            .Select(proyecto => new ProyectoDto(proyecto.Id, proyecto.Nombre, proyecto.ClavePrefijo, proyecto.Descripcion, proyecto.FechaCreacion))
            .FirstOrDefaultAsync(tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el proyecto", consulta.ProyectoId);

        var carpetas = await _contexto.Carpetas.AsNoTracking()
            .Where(carpeta => carpeta.ProyectoId == consulta.ProyectoId)
            .OrderBy(carpeta => carpeta.IndiceOrden).ThenBy(carpeta => carpeta.Nombre)
            .ToListAsync(tokenCancelacion);

        // Solo se cuentan tareas raíz: las subtareas se ven dentro de su tarea padre.
        var listas = await _contexto.ListasTareas.AsNoTracking()
            .Where(lista => lista.ProyectoId == consulta.ProyectoId)
            .OrderBy(lista => lista.IndiceOrden)
            .Select(lista => new ListaResumenDto(
                lista.Id,
                lista.CarpetaId,
                lista.Nombre,
                lista.IndiceOrden,
                lista.Tareas.Count(tarea => tarea.TareaPadreId == null),
                lista.Tareas.Count(tarea => tarea.TareaPadreId == null && tarea.Estado == EstadoTarea.Completada)))
            .ToListAsync(tokenCancelacion);

        var listasPorCarpeta = listas.Where(lista => lista.CarpetaId is not null).ToLookup(lista => lista.CarpetaId!.Value);

        return new EstructuraProyectoDto(
            proyecto,
            carpetas.Select(carpeta => new CarpetaDto(carpeta.Id, carpeta.Nombre, carpeta.Icono, carpeta.IndiceOrden, listasPorCarpeta[carpeta.Id].ToList())).ToList(),
            listas.Where(lista => lista.CarpetaId is null).ToList());
    }
}

// ---------- Proyecto ----------

/// <summary>La clave (prefijo) no se edita: forma parte de los identificadores de tarea y de los WikiLinks ya escritos.</summary>
public sealed record ActualizarProyectoComando(Guid Id, string Nombre, string? Descripcion) : IRequest;

public sealed class ValidadorActualizarProyectoComando : AbstractValidator<ActualizarProyectoComando>
{
    public ValidadorActualizarProyectoComando()
    {
        RuleFor(comando => comando.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(comando => comando.Descripcion).MaximumLength(500);
    }
}

public sealed class ManejadorActualizarProyectoComando : IRequestHandler<ActualizarProyectoComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorActualizarProyectoComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(ActualizarProyectoComando comando, CancellationToken tokenCancelacion)
    {
        var proyecto = await _contexto.Proyectos.FirstOrDefaultAsync(proyecto => proyecto.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el proyecto", comando.Id);

        proyecto.Nombre = comando.Nombre.Trim();
        proyecto.Descripcion = comando.Descripcion;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Carpetas ----------

public sealed record CrearCarpetaComando(Guid ProyectoId, string Nombre, string? Icono) : IRequest<Guid>;

public sealed class ValidadorCrearCarpetaComando : AbstractValidator<CrearCarpetaComando>
{
    public ValidadorCrearCarpetaComando()
    {
        RuleFor(comando => comando.ProyectoId).NotEmpty();
        RuleFor(comando => comando.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(comando => comando.Icono).MaximumLength(50);
    }
}

public sealed class ManejadorCrearCarpetaComando : IRequestHandler<CrearCarpetaComando, Guid>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorCrearCarpetaComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<Guid> Handle(CrearCarpetaComando comando, CancellationToken tokenCancelacion)
    {
        if (!await _contexto.Proyectos.AnyAsync(proyecto => proyecto.Id == comando.ProyectoId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("el proyecto", comando.ProyectoId);

        var siguienteIndice = await _contexto.Carpetas
            .Where(carpeta => carpeta.ProyectoId == comando.ProyectoId)
            .Select(carpeta => (int?)carpeta.IndiceOrden)
            .MaxAsync(tokenCancelacion) ?? -1;

        var carpeta = new Carpeta { ProyectoId = comando.ProyectoId, Nombre = comando.Nombre.Trim(), Icono = comando.Icono, IndiceOrden = siguienteIndice + 1 };
        _contexto.Carpetas.Add(carpeta);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return carpeta.Id;
    }
}

public sealed record ActualizarCarpetaComando(Guid Id, string Nombre, string? Icono) : IRequest;

public sealed class ValidadorActualizarCarpetaComando : AbstractValidator<ActualizarCarpetaComando>
{
    public ValidadorActualizarCarpetaComando()
    {
        RuleFor(comando => comando.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(comando => comando.Icono).MaximumLength(50);
    }
}

public sealed class ManejadorActualizarCarpetaComando : IRequestHandler<ActualizarCarpetaComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorActualizarCarpetaComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(ActualizarCarpetaComando comando, CancellationToken tokenCancelacion)
    {
        var carpeta = await _contexto.Carpetas.FirstOrDefaultAsync(carpeta => carpeta.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("la carpeta", comando.Id);

        carpeta.Nombre = comando.Nombre.Trim();
        carpeta.Icono = comando.Icono;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

/// <summary>Eliminar una carpeta no borra tareas: sus listas pasan a la raíz del proyecto.</summary>
public sealed record EliminarCarpetaComando(Guid Id) : IRequest;

public sealed class ManejadorEliminarCarpetaComando : IRequestHandler<EliminarCarpetaComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorEliminarCarpetaComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(EliminarCarpetaComando comando, CancellationToken tokenCancelacion)
    {
        var carpeta = await _contexto.Carpetas.FirstOrDefaultAsync(carpeta => carpeta.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("la carpeta", comando.Id);

        var listas = await _contexto.ListasTareas.Where(lista => lista.CarpetaId == carpeta.Id).ToListAsync(tokenCancelacion);
        foreach (var lista in listas)
            lista.CarpetaId = null;

        _contexto.Carpetas.Remove(carpeta);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Listas ----------

public sealed record ActualizarListaTareasComando(Guid Id, string Nombre, Guid? CarpetaId) : IRequest;

public sealed class ValidadorActualizarListaTareasComando : AbstractValidator<ActualizarListaTareasComando>
{
    public ValidadorActualizarListaTareasComando() => RuleFor(comando => comando.Nombre).NotEmpty().MaximumLength(100);
}

public sealed class ManejadorActualizarListaTareasComando : IRequestHandler<ActualizarListaTareasComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorActualizarListaTareasComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(ActualizarListaTareasComando comando, CancellationToken tokenCancelacion)
    {
        var lista = await _contexto.ListasTareas.FirstOrDefaultAsync(lista => lista.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("la lista de tareas", comando.Id);

        if (comando.CarpetaId is { } carpetaId &&
            !await _contexto.Carpetas.AnyAsync(carpeta => carpeta.Id == carpetaId && carpeta.ProyectoId == lista.ProyectoId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("la carpeta", carpetaId);

        lista.Nombre = comando.Nombre.Trim();
        lista.CarpetaId = comando.CarpetaId;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

/// <summary>Solo se eliminan listas vacías, para no borrar tareas por accidente.</summary>
public sealed record EliminarListaTareasComando(Guid Id) : IRequest;

public sealed class ManejadorEliminarListaTareasComando : IRequestHandler<EliminarListaTareasComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorEliminarListaTareasComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(EliminarListaTareasComando comando, CancellationToken tokenCancelacion)
    {
        var lista = await _contexto.ListasTareas.FirstOrDefaultAsync(lista => lista.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("la lista de tareas", comando.Id);

        if (await _contexto.Tareas.AnyAsync(tarea => tarea.ListaTareaId == lista.Id, tokenCancelacion))
            throw new ExcepcionConflicto("La lista tiene tareas. Muévalas o elimínelas antes de borrar la lista.");

        if (!await _contexto.ListasTareas.AnyAsync(otra => otra.ProyectoId == lista.ProyectoId && otra.Id != lista.Id, tokenCancelacion))
            throw new ExcepcionConflicto("Un proyecto debe conservar al menos una lista.");

        _contexto.ListasTareas.Remove(lista);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}
