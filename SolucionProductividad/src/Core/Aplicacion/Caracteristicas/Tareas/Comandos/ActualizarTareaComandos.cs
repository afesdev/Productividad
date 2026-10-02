using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Comandos;

// ---------- Mover entre cuadrantes (drag & drop de la Matriz de Eisenhower) ----------

public sealed record MoverTareaCuadranteComando(Guid TareaId, CuadranteEisenhower Cuadrante) : IRequest<TareaResumenDto>;

public sealed class ValidadorMoverTareaCuadranteComando : AbstractValidator<MoverTareaCuadranteComando>
{
    public ValidadorMoverTareaCuadranteComando()
    {
        RuleFor(comando => comando.TareaId).NotEmpty();
        RuleFor(comando => comando.Cuadrante).IsInEnum();
    }
}

public sealed class ManejadorMoverTareaCuadranteComando : IRequestHandler<MoverTareaCuadranteComando, TareaResumenDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly INotificadorTiempoReal _notificador;

    public ManejadorMoverTareaCuadranteComando(IContextoAplicacion contexto, INotificadorTiempoReal notificador)
    {
        _contexto = contexto;
        _notificador = notificador;
    }

    public async Task<TareaResumenDto> Handle(MoverTareaCuadranteComando comando, CancellationToken tokenCancelacion)
    {
        var tarea = await AccesoTareas.ObtenerRastreadaAsync(_contexto, comando.TareaId, tokenCancelacion);
        tarea.MoverACuadrante(comando.Cuadrante);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);

        var resumen = await AccesoTareas.ObtenerResumenAsync(_contexto, tarea.Id, tokenCancelacion);
        await _notificador.NotificarTareaActualizadaAsync(resumen, tokenCancelacion);
        return resumen;
    }
}

// ---------- Cambiar estado / columna (Kanban) ----------

public sealed record CambiarEstadoTareaComando(Guid TareaId, EstadoTarea Estado) : IRequest<TareaResumenDto>;

public sealed class ValidadorCambiarEstadoTareaComando : AbstractValidator<CambiarEstadoTareaComando>
{
    public ValidadorCambiarEstadoTareaComando()
    {
        RuleFor(comando => comando.TareaId).NotEmpty();
        RuleFor(comando => comando.Estado).IsInEnum();
    }
}

public sealed class ManejadorCambiarEstadoTareaComando : IRequestHandler<CambiarEstadoTareaComando, TareaResumenDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly INotificadorTiempoReal _notificador;

    public ManejadorCambiarEstadoTareaComando(IContextoAplicacion contexto, INotificadorTiempoReal notificador)
    {
        _contexto = contexto;
        _notificador = notificador;
    }

    public async Task<TareaResumenDto> Handle(CambiarEstadoTareaComando comando, CancellationToken tokenCancelacion)
    {
        var tarea = await AccesoTareas.ObtenerRastreadaAsync(_contexto, comando.TareaId, tokenCancelacion);
        tarea.CambiarEstado(comando.Estado);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);

        var resumen = await AccesoTareas.ObtenerResumenAsync(_contexto, tarea.Id, tokenCancelacion);
        await _notificador.NotificarTareaActualizadaAsync(resumen, tokenCancelacion);
        return resumen;
    }
}

internal static class AccesoTareas
{
    public static async Task<Tarea> ObtenerRastreadaAsync(IContextoAplicacion contexto, Guid tareaId, CancellationToken tokenCancelacion) =>
        await contexto.Tareas.FirstOrDefaultAsync(tarea => tarea.Id == tareaId, tokenCancelacion)
        ?? throw new ExcepcionEntidadNoEncontrada("la tarea", tareaId);

    public static async Task<TareaResumenDto> ObtenerResumenAsync(IContextoAplicacion contexto, Guid tareaId, CancellationToken tokenCancelacion) =>
        await contexto.Tareas.AsNoTracking()
            .Where(tarea => tarea.Id == tareaId)
            .Select(ProyeccionesTarea.AResumen)
            .FirstOrDefaultAsync(tokenCancelacion)
        ?? throw new ExcepcionEntidadNoEncontrada("la tarea", tareaId);
}
