using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Documentos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Etiquetas;

/// <summary>Las etiquetas de tickets y tareas salen del mismo catálogo que las de documentos.</summary>
internal static class CatalogoEtiquetas
{
    public const int MaximoPorElemento = 20;

    /// <summary>Valida que todas existan (el filtro global solo deja ver las propias) y las devuelve ordenadas.</summary>
    public static async Task<List<EtiquetaDocumento>> ObtenerAsync(IContextoAplicacion contexto, IReadOnlyList<Guid> ids, CancellationToken tokenCancelacion)
    {
        var solicitadas = ids.Distinct().ToList();
        var etiquetas = await contexto.EtiquetasDocumento.Where(etiqueta => solicitadas.Contains(etiqueta.Id)).ToListAsync(tokenCancelacion);
        if (etiquetas.Count != solicitadas.Count)
            throw new ExcepcionEntidadNoEncontrada("la etiqueta", string.Join(", ", solicitadas.Except(etiquetas.Select(etiqueta => etiqueta.Id))));
        return etiquetas.OrderBy(etiqueta => etiqueta.Nombre).ToList();
    }
}

// ---------- Tickets ----------

public sealed record AsignarEtiquetasTicketComando(Guid TicketId, IReadOnlyList<Guid> EtiquetaIds) : IRequest<IReadOnlyList<EtiquetaDto>>;

public sealed class ValidadorAsignarEtiquetasTicketComando : AbstractValidator<AsignarEtiquetasTicketComando>
{
    public ValidadorAsignarEtiquetasTicketComando() =>
        RuleFor(comando => comando.EtiquetaIds).NotNull().Must(ids => ids.Count <= CatalogoEtiquetas.MaximoPorElemento)
            .WithMessage($"Máximo {CatalogoEtiquetas.MaximoPorElemento} etiquetas.");
}

public sealed class ManejadorAsignarEtiquetasTicketComando : IRequestHandler<AsignarEtiquetasTicketComando, IReadOnlyList<EtiquetaDto>>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorAsignarEtiquetasTicketComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<IReadOnlyList<EtiquetaDto>> Handle(AsignarEtiquetasTicketComando comando, CancellationToken tokenCancelacion)
    {
        // El filtro global de tickets ya limita a los creados por el usuario o asignados a él.
        var ticket = await _contexto.Tickets.FirstOrDefaultAsync(existente => existente.Id == comando.TicketId, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el ticket", comando.TicketId);
        var etiquetas = await CatalogoEtiquetas.ObtenerAsync(_contexto, comando.EtiquetaIds, tokenCancelacion);
        var ids = etiquetas.Select(etiqueta => etiqueta.Id).ToHashSet();

        var actuales = await _contexto.TicketsEtiquetas.Where(relacion => relacion.TicketId == ticket.Id).ToListAsync(tokenCancelacion);
        _contexto.TicketsEtiquetas.RemoveRange(actuales.Where(relacion => !ids.Contains(relacion.EtiquetaId)));
        foreach (var id in ids.Where(id => actuales.All(relacion => relacion.EtiquetaId != id)))
            _contexto.TicketsEtiquetas.Add(new TicketEtiqueta { TicketId = ticket.Id, EtiquetaId = id });
        ticket.FechaActualizacion = DateTime.UtcNow;

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return etiquetas.Select(etiqueta => new EtiquetaDto(etiqueta.Id, etiqueta.Nombre, etiqueta.Color)).ToList();
    }
}

// ---------- Tareas ----------

/// <summary>Devuelve la tarea actualizada (y la notifica en tiempo real) para que el tablero muestre las etiquetas al momento.</summary>
public sealed record AsignarEtiquetasTareaComando(Guid TareaId, IReadOnlyList<Guid> EtiquetaIds) : IRequest<TareaResumenDto>;

public sealed class ValidadorAsignarEtiquetasTareaComando : AbstractValidator<AsignarEtiquetasTareaComando>
{
    public ValidadorAsignarEtiquetasTareaComando() =>
        RuleFor(comando => comando.EtiquetaIds).NotNull().Must(ids => ids.Count <= CatalogoEtiquetas.MaximoPorElemento)
            .WithMessage($"Máximo {CatalogoEtiquetas.MaximoPorElemento} etiquetas.");
}

public sealed class ManejadorAsignarEtiquetasTareaComando : IRequestHandler<AsignarEtiquetasTareaComando, TareaResumenDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly INotificadorTiempoReal _notificador;

    public ManejadorAsignarEtiquetasTareaComando(IContextoAplicacion contexto, INotificadorTiempoReal notificador)
    {
        _contexto = contexto;
        _notificador = notificador;
    }

    public async Task<TareaResumenDto> Handle(AsignarEtiquetasTareaComando comando, CancellationToken tokenCancelacion)
    {
        var tarea = await AccesoTareas.ObtenerRastreadaAsync(_contexto, comando.TareaId, tokenCancelacion);
        var ids = (await CatalogoEtiquetas.ObtenerAsync(_contexto, comando.EtiquetaIds, tokenCancelacion)).Select(etiqueta => etiqueta.Id).ToHashSet();

        var actuales = await _contexto.TareasEtiquetas.Where(relacion => relacion.TareaId == tarea.Id).ToListAsync(tokenCancelacion);
        _contexto.TareasEtiquetas.RemoveRange(actuales.Where(relacion => !ids.Contains(relacion.EtiquetaId)));
        foreach (var id in ids.Where(id => actuales.All(relacion => relacion.EtiquetaId != id)))
            _contexto.TareasEtiquetas.Add(new TareaEtiqueta { TareaId = tarea.Id, EtiquetaId = id });
        tarea.FechaActualizacion = DateTime.UtcNow;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);

        var resumen = await AccesoTareas.ObtenerResumenAsync(_contexto, tarea.Id, tokenCancelacion);
        await _notificador.NotificarTareaActualizadaAsync(resumen, tokenCancelacion);
        return resumen;
    }
}
