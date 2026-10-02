using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Dominio.ObjetosValor;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Tickets;

/// <summary>
/// Operaciones comunes del flujo: cargar el ticket, registrar eventos en el historial y transicionar de estado.
/// Todas las acciones (manuales o automáticas) pasan por aquí para que el historial quede completo.
/// </summary>
internal static class FlujoTickets
{
    public static readonly Dictionary<EstadoTicket, string> NombresEstado = new()
    {
        [EstadoTicket.Nuevo] = "Nuevo",
        [EstadoTicket.Asignado] = "Asignado",
        [EstadoTicket.EnAnalisis] = "En análisis",
        [EstadoTicket.PendienteCliente] = "Pendiente del cliente",
        [EstadoTicket.EnDesarrollo] = "En desarrollo",
        [EstadoTicket.EnRevision] = "En revisión (PR)",
        [EstadoTicket.EnPruebas] = "En pruebas",
        [EstadoTicket.Devuelto] = "Devuelto",
        [EstadoTicket.Aprobado] = "Aprobado",
        [EstadoTicket.EnProduccion] = "En producción",
        [EstadoTicket.Cerrado] = "Cerrado",
        [EstadoTicket.Cancelado] = "Cancelado",
    };

    public static async Task<Ticket> ObtenerRastreadoAsync(IContextoAplicacion contexto, Guid ticketId, CancellationToken tokenCancelacion) =>
        await contexto.Tickets.FirstOrDefaultAsync(ticket => ticket.Id == ticketId, tokenCancelacion)
        ?? throw new ExcepcionEntidadNoEncontrada("el ticket", ticketId);

    public static void RegistrarEvento(
        IContextoAplicacion contexto,
        Ticket ticket,
        TipoEventoTicket tipoEvento,
        string descripcion,
        Guid usuarioId,
        string? comentario = null,
        EstadoTicket? estadoAnterior = null,
        EstadoTicket? estadoNuevo = null)
    {
        contexto.EventosTicket.Add(new EventoTicket
        {
            TicketId = ticket.Id,
            TipoEvento = tipoEvento,
            Descripcion = descripcion.Length > 500 ? descripcion[..500] : descripcion,
            Comentario = string.IsNullOrWhiteSpace(comentario) ? null : comentario.Trim(),
            EstadoAnterior = estadoAnterior,
            EstadoNuevo = estadoNuevo,
            UsuarioId = usuarioId,
        });
        ticket.FechaActualizacion = DateTime.UtcNow;
    }

    /// <summary>Transición con evento en el historial. Lanza si la máquina de estados no la permite.</summary>
    public static void Transicionar(IContextoAplicacion contexto, Ticket ticket, EstadoTicket nuevoEstado, Guid usuarioId, string? comentario, string? motivo = null)
    {
        var anterior = ticket.CambiarEstado(nuevoEstado, DateTime.UtcNow);
        var descripcion = $"{NombresEstado[anterior]} → {NombresEstado[nuevoEstado]}" + (motivo is null ? string.Empty : $" ({motivo})");
        RegistrarEvento(contexto, ticket, TipoEventoTicket.CambioEstado, descripcion, usuarioId, comentario, anterior, nuevoEstado);
    }

    /// <summary>Transición automática: solo ocurre si es válida desde el estado actual (si no, se ignora).</summary>
    public static bool IntentarTransicionar(IContextoAplicacion contexto, Ticket ticket, EstadoTicket nuevoEstado, Guid usuarioId, string motivo)
    {
        if (!MaquinaEstadosTicket.EsTransicionValida(ticket.Estado, nuevoEstado, ticket.Tipo))
            return false;
        Transicionar(contexto, ticket, nuevoEstado, usuarioId, comentario: null, motivo);
        return true;
    }
}
