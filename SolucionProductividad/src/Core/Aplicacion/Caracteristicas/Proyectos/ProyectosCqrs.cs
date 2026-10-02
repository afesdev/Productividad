using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Proyectos;

public sealed record ProyectoDto(Guid Id, string Nombre, string ClavePrefijo, string? Descripcion, DateTime FechaCreacion);

public sealed record ListaTareasDto(Guid Id, Guid ProyectoId, Guid? CarpetaId, string Nombre, int IndiceOrden);

// ---------- Crear proyecto ----------

public sealed record CrearProyectoComando(string Nombre, string ClavePrefijo, string? Descripcion) : IRequest<Guid>;

public sealed class ValidadorCrearProyectoComando : AbstractValidator<CrearProyectoComando>
{
    public ValidadorCrearProyectoComando()
    {
        RuleFor(comando => comando.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(comando => comando.ClavePrefijo)
            .NotEmpty()
            .Matches("^[A-Za-z]{2,10}$").WithMessage("La clave debe tener entre 2 y 10 letras (ej. WEB).")
            .Must(clave => !string.Equals(clave, "TCK", StringComparison.OrdinalIgnoreCase))
            .WithMessage("La clave TCK está reservada para tickets.");
        RuleFor(comando => comando.Descripcion).MaximumLength(500);
    }
}

public sealed class ManejadorCrearProyectoComando : IRequestHandler<CrearProyectoComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorCrearProyectoComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<Guid> Handle(CrearProyectoComando comando, CancellationToken tokenCancelacion)
    {
        var clavePrefijo = comando.ClavePrefijo.ToUpperInvariant();
        // La consulta ya está filtrada al usuario: la clave es única entre sus propios proyectos.
        if (await _contexto.Proyectos.AnyAsync(proyecto => proyecto.ClavePrefijo == clavePrefijo, tokenCancelacion))
            throw new ExcepcionConflicto($"Ya tienes un proyecto con la clave {clavePrefijo}.");

        var proyecto = new Proyecto
        {
            PropietarioId = _usuarioActual.ObtenerUsuarioIdRequerido(),
            Nombre = comando.Nombre.Trim(),
            ClavePrefijo = clavePrefijo,
            Descripcion = comando.Descripcion
        };
        // Todo proyecto nuevo arranca con una lista por defecto para poder crear tareas de inmediato.
        proyecto.ListasTareas.Add(new ListaTareas { ProyectoId = proyecto.Id, Nombre = "Backlog" });

        _contexto.Proyectos.Add(proyecto);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return proyecto.Id;
    }
}

// ---------- Listar proyectos ----------

public sealed record ListarProyectosConsulta : IRequest<IReadOnlyList<ProyectoDto>>;

public sealed class ManejadorListarProyectosConsulta : IRequestHandler<ListarProyectosConsulta, IReadOnlyList<ProyectoDto>>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorListarProyectosConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<IReadOnlyList<ProyectoDto>> Handle(ListarProyectosConsulta consulta, CancellationToken tokenCancelacion)
    {
        return await _contexto.Proyectos
            .AsNoTracking()
            .OrderBy(proyecto => proyecto.Nombre)
            .Select(proyecto => new ProyectoDto(proyecto.Id, proyecto.Nombre, proyecto.ClavePrefijo, proyecto.Descripcion, proyecto.FechaCreacion))
            .ToListAsync(tokenCancelacion);
    }
}

// ---------- Crear lista de tareas ----------

public sealed record CrearListaTareasComando(Guid ProyectoId, string Nombre, Guid? CarpetaId) : IRequest<Guid>;

public sealed class ValidadorCrearListaTareasComando : AbstractValidator<CrearListaTareasComando>
{
    public ValidadorCrearListaTareasComando()
    {
        RuleFor(comando => comando.ProyectoId).NotEmpty();
        RuleFor(comando => comando.Nombre).NotEmpty().MaximumLength(100);
    }
}

public sealed class ManejadorCrearListaTareasComando : IRequestHandler<CrearListaTareasComando, Guid>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorCrearListaTareasComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<Guid> Handle(CrearListaTareasComando comando, CancellationToken tokenCancelacion)
    {
        if (!await _contexto.Proyectos.AnyAsync(proyecto => proyecto.Id == comando.ProyectoId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("el proyecto", comando.ProyectoId);

        if (comando.CarpetaId is { } carpetaId &&
            !await _contexto.Carpetas.AnyAsync(carpeta => carpeta.Id == carpetaId && carpeta.ProyectoId == comando.ProyectoId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("la carpeta", carpetaId);

        var siguienteIndice = await _contexto.ListasTareas
            .Where(lista => lista.ProyectoId == comando.ProyectoId)
            .Select(lista => (int?)lista.IndiceOrden)
            .MaxAsync(tokenCancelacion) ?? -1;

        var lista = new ListaTareas
        {
            ProyectoId = comando.ProyectoId,
            CarpetaId = comando.CarpetaId,
            Nombre = comando.Nombre.Trim(),
            IndiceOrden = siguienteIndice + 1
        };

        _contexto.ListasTareas.Add(lista);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return lista.Id;
    }
}

// ---------- Listar listas de un proyecto ----------

public sealed record ListarListasTareasConsulta(Guid ProyectoId) : IRequest<IReadOnlyList<ListaTareasDto>>;

public sealed class ManejadorListarListasTareasConsulta : IRequestHandler<ListarListasTareasConsulta, IReadOnlyList<ListaTareasDto>>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorListarListasTareasConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<IReadOnlyList<ListaTareasDto>> Handle(ListarListasTareasConsulta consulta, CancellationToken tokenCancelacion)
    {
        return await _contexto.ListasTareas
            .AsNoTracking()
            .Where(lista => lista.ProyectoId == consulta.ProyectoId)
            .OrderBy(lista => lista.IndiceOrden)
            .Select(lista => new ListaTareasDto(lista.Id, lista.ProyectoId, lista.CarpetaId, lista.Nombre, lista.IndiceOrden))
            .ToListAsync(tokenCancelacion);
    }
}
