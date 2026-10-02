using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;

namespace SolucionProductividad.APIWeb.Hubs;

/// <summary>
/// Canal en tiempo real. Los clientes se suscriben a un proyecto para recibir cambios de tareas.
/// </summary>
[Authorize]
public sealed class HubNotificaciones : Hub
{
    public const string Ruta = "/hubs/notificaciones";
    public const string EventoTareaActualizada = "TareaActualizada";
    public const string EventoTareaEliminada = "TareaEliminada";

    private readonly IContextoAplicacion _contexto;

    public HubNotificaciones(IContextoAplicacion contexto) => _contexto = contexto;

    public static string NombreGrupoProyecto(Guid proyectoId) => $"proyecto:{proyectoId}";

    /// <summary>Solo el dueño del proyecto puede escuchar sus cambios.</summary>
    public async Task SuscribirseAProyecto(Guid proyectoId)
    {
        // El usuario se toma de la conexión autenticada (no del HttpContext) y se valida sin depender del filtro global.
        var usuarioId = Guid.TryParse(Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value, out var id) ? id : Guid.Empty;
        var esDueno = await _contexto.Proyectos.IgnoreQueryFilters().AnyAsync(proyecto => proyecto.Id == proyectoId && proyecto.PropietarioId == usuarioId);
        if (!esDueno)
            throw new HubException("Proyecto no encontrado.");

        await Groups.AddToGroupAsync(Context.ConnectionId, NombreGrupoProyecto(proyectoId));
    }

    public Task DesuscribirseDeProyecto(Guid proyectoId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, NombreGrupoProyecto(proyectoId));
}

public sealed class NotificadorSignalR : INotificadorTiempoReal
{
    private readonly IHubContext<HubNotificaciones> _contextoHub;

    public NotificadorSignalR(IHubContext<HubNotificaciones> contextoHub) => _contextoHub = contextoHub;

    public Task NotificarTareaActualizadaAsync(TareaResumenDto tarea, CancellationToken tokenCancelacion = default) =>
        _contextoHub.Clients
            .Group(HubNotificaciones.NombreGrupoProyecto(tarea.ProyectoId))
            .SendAsync(HubNotificaciones.EventoTareaActualizada, tarea, tokenCancelacion);

    public Task NotificarTareaEliminadaAsync(Guid proyectoId, Guid tareaId, CancellationToken tokenCancelacion = default) =>
        _contextoHub.Clients
            .Group(HubNotificaciones.NombreGrupoProyecto(proyectoId))
            .SendAsync(HubNotificaciones.EventoTareaEliminada, tareaId, tokenCancelacion);
}
