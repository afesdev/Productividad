using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Tickets;

/// <summary>Colores permitidos: las claves de la paleta pastel del frontend.</summary>
internal static class PaletaProyectos
{
    public static readonly HashSet<string> Colores = ["gris", "rojo", "naranja", "ambar", "verde", "turquesa", "azul", "violeta", "rosa"];
}

// ---------- Listar ----------

public sealed record ListarProyectosSoporteConsulta(bool IncluirInactivos = false) : IRequest<IReadOnlyList<ProyectoSoporteDto>>;

public sealed class ManejadorListarProyectosSoporteConsulta : IRequestHandler<ListarProyectosSoporteConsulta, IReadOnlyList<ProyectoSoporteDto>>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorListarProyectosSoporteConsulta(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<IReadOnlyList<ProyectoSoporteDto>> Handle(ListarProyectosSoporteConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        // Los conteos de tickets pasan por el filtro global de Tickets: solo cuentan los que el usuario ve.
        return await _contexto.ProyectosSoporte.AsNoTracking()
            .Where(proyecto => proyecto.UsuarioId == usuarioId && (consulta.IncluirInactivos || proyecto.EstaActivo))
            .OrderBy(proyecto => proyecto.Nombre)
            .Select(proyecto => new ProyectoSoporteDto(
                proyecto.Id,
                proyecto.Nombre,
                proyecto.Descripcion,
                proyecto.Color,
                proyecto.EstaActivo,
                (from relacion in _contexto.TicketsProyectos
                 join ticket in _contexto.Tickets on relacion.TicketId equals ticket.Id
                 where relacion.ProyectoSoporteId == proyecto.Id && ticket.Estado != EstadoTicket.Cerrado && ticket.Estado != EstadoTicket.Cancelado
                 select relacion).Count(),
                (from relacion in _contexto.TicketsProyectos
                 join ticket in _contexto.Tickets on relacion.TicketId equals ticket.Id
                 where relacion.ProyectoSoporteId == proyecto.Id
                 select relacion).Count(),
                _contexto.Repositorios
                    .Where(repositorio => repositorio.ProyectoSoporteId == proyecto.Id)
                    .OrderBy(repositorio => repositorio.Nombre)
                    .Select(repositorio => new RepositorioProyectoDto(repositorio.Id, repositorio.Nombre, repositorio.Propietario + "/" + repositorio.NombreRepositorio))
                    .ToList()))
            .ToListAsync(tokenCancelacion);
    }
}

// ---------- Crear o editar ----------

/// <param name="Id">null para crear.</param>
public sealed record GuardarProyectoSoporteComando(Guid? Id, string Nombre, string? Descripcion, string Color, bool EstaActivo = true) : IRequest<Guid>;

public sealed class ValidadorGuardarProyectoSoporteComando : AbstractValidator<GuardarProyectoSoporteComando>
{
    public ValidadorGuardarProyectoSoporteComando()
    {
        RuleFor(comando => comando.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(comando => comando.Descripcion).MaximumLength(500);
        RuleFor(comando => comando.Color).Must(color => PaletaProyectos.Colores.Contains(color)).WithMessage("Color no válido.");
    }
}

public sealed class ManejadorGuardarProyectoSoporteComando : IRequestHandler<GuardarProyectoSoporteComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorGuardarProyectoSoporteComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<Guid> Handle(GuardarProyectoSoporteComando comando, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var nombre = comando.Nombre.Trim();

        if (await _contexto.ProyectosSoporte.AnyAsync(proyecto => proyecto.UsuarioId == usuarioId && proyecto.Nombre == nombre && proyecto.Id != comando.Id, tokenCancelacion))
            throw new ExcepcionConflicto($"Ya tienes un proyecto llamado \"{nombre}\".");

        ProyectoSoporte proyecto;
        if (comando.Id is { } id)
        {
            proyecto = await _contexto.ProyectosSoporte.FirstOrDefaultAsync(existente => existente.Id == id && existente.UsuarioId == usuarioId, tokenCancelacion)
                ?? throw new ExcepcionEntidadNoEncontrada("el proyecto", id);
        }
        else
        {
            proyecto = new ProyectoSoporte { UsuarioId = usuarioId };
            _contexto.ProyectosSoporte.Add(proyecto);
        }

        proyecto.Nombre = nombre;
        proyecto.Descripcion = string.IsNullOrWhiteSpace(comando.Descripcion) ? null : comando.Descripcion.Trim();
        proyecto.Color = comando.Color;
        proyecto.EstaActivo = comando.EstaActivo;

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return proyecto.Id;
    }
}

// ---------- Eliminar ----------

/// <summary>Quita el proyecto de sus tickets y deja sus repositorios sin proyecto; tickets y repositorios no se borran.</summary>
public sealed record EliminarProyectoSoporteComando(Guid Id) : IRequest;

public sealed class ManejadorEliminarProyectoSoporteComando : IRequestHandler<EliminarProyectoSoporteComando>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorEliminarProyectoSoporteComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task Handle(EliminarProyectoSoporteComando comando, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var proyecto = await _contexto.ProyectosSoporte.FirstOrDefaultAsync(existente => existente.Id == comando.Id && existente.UsuarioId == usuarioId, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el proyecto", comando.Id);
        _contexto.ProyectosSoporte.Remove(proyecto);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Asignación a tickets (compartida por crear y editar) ----------

internal static class ProyectosTicket
{
    /// <summary>
    /// Deja el ticket con exactamente esos proyectos. Se aceptan proyectos propios o los que el ticket ya tenía
    /// (en un ticket compartido, el asignado no debe perder los del creador al editar).
    /// Devuelve la descripción del cambio para el historial, o null si no cambió nada.
    /// </summary>
    public static async Task<string?> SincronizarAsync(IContextoAplicacion contexto, Guid ticketId, IReadOnlyCollection<Guid>? proyectoIds, Guid usuarioId, CancellationToken tokenCancelacion)
    {
        var deseados = (proyectoIds ?? []).Distinct().ToHashSet();
        var actuales = await contexto.TicketsProyectos.Where(relacion => relacion.TicketId == ticketId).ToListAsync(tokenCancelacion);
        var idsActuales = actuales.Select(relacion => relacion.ProyectoSoporteId).ToHashSet();

        var nuevos = deseados.Except(idsActuales).ToList();
        if (nuevos.Count > 0)
        {
            var validos = await contexto.ProyectosSoporte
                .Where(proyecto => nuevos.Contains(proyecto.Id) && proyecto.UsuarioId == usuarioId)
                .Select(proyecto => proyecto.Id)
                .ToListAsync(tokenCancelacion);
            if (validos.Count != nuevos.Count)
                throw new ExcepcionEntidadNoEncontrada("el proyecto", nuevos.Except(validos).First());
        }

        var quitados = actuales.Where(relacion => !deseados.Contains(relacion.ProyectoSoporteId)).ToList();
        if (nuevos.Count == 0 && quitados.Count == 0)
            return null;

        contexto.TicketsProyectos.RemoveRange(quitados);
        foreach (var proyectoId in nuevos)
            contexto.TicketsProyectos.Add(new TicketProyecto { TicketId = ticketId, ProyectoSoporteId = proyectoId });

        var nombres = await contexto.ProyectosSoporte
            .Where(proyecto => deseados.Contains(proyecto.Id))
            .OrderBy(proyecto => proyecto.Nombre)
            .Select(proyecto => proyecto.Nombre)
            .ToListAsync(tokenCancelacion);
        return nombres.Count == 0 ? "sin proyectos" : $"proyectos: {string.Join(", ", nombres)}";
    }
}
