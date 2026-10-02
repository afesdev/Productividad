using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Dominio.ObjetosValor;

/// <summary>
/// Transiciones válidas del flujo de tickets. Es la única fuente de verdad: el backend la valida
/// y el frontend la recibe para mostrar solo las acciones posibles.
/// </summary>
public static class MaquinaEstadosTicket
{
    private static readonly Dictionary<EstadoTicket, EstadoTicket[]> Transiciones = new()
    {
        [EstadoTicket.Nuevo] = [EstadoTicket.Asignado, EstadoTicket.Cancelado],
        [EstadoTicket.Asignado] = [EstadoTicket.EnAnalisis, EstadoTicket.PendienteCliente, EstadoTicket.Cancelado],
        [EstadoTicket.EnAnalisis] = [EstadoTicket.EnDesarrollo, EstadoTicket.PendienteCliente, EstadoTicket.Cerrado, EstadoTicket.Cancelado],
        [EstadoTicket.PendienteCliente] = [EstadoTicket.EnAnalisis, EstadoTicket.EnDesarrollo, EstadoTicket.Cancelado],
        [EstadoTicket.EnDesarrollo] = [EstadoTicket.EnRevision, EstadoTicket.PendienteCliente, EstadoTicket.Cancelado],
        [EstadoTicket.EnRevision] = [EstadoTicket.EnPruebas, EstadoTicket.EnDesarrollo],
        [EstadoTicket.EnPruebas] = [EstadoTicket.Aprobado, EstadoTicket.Devuelto],
        [EstadoTicket.Devuelto] = [EstadoTicket.EnDesarrollo],
        [EstadoTicket.Aprobado] = [EstadoTicket.EnProduccion],
        [EstadoTicket.EnProduccion] = [EstadoTicket.Cerrado],
        [EstadoTicket.Cerrado] = [EstadoTicket.EnAnalisis],
        [EstadoTicket.Cancelado] = [],
    };

    /// <summary>Tipos que normalmente no generan código: pueden cerrarse directamente tras el análisis.</summary>
    public static bool RequiereCodigo(TipoTicket tipo) => tipo is TipoTicket.Ajuste or TipoTicket.NuevoDesarrollo or TipoTicket.Incidencia;

    public static IReadOnlyList<EstadoTicket> ObtenerSiguientes(EstadoTicket estadoActual, TipoTicket tipo) =>
        Transiciones[estadoActual]
            .Where(siguiente => !(estadoActual == EstadoTicket.EnAnalisis && siguiente == EstadoTicket.Cerrado && RequiereCodigo(tipo)))
            .ToList();

    public static bool EsTransicionValida(EstadoTicket desde, EstadoTicket hacia, TipoTicket tipo) => ObtenerSiguientes(desde, tipo).Contains(hacia);

    public static bool EstaAbierto(EstadoTicket estado) => estado is not (EstadoTicket.Cerrado or EstadoTicket.Cancelado);

    /// <summary>Estados en los que el trabajo se considera entregado (para el SLA de resolución).</summary>
    public static bool EsResolucion(EstadoTicket estado) => estado is EstadoTicket.EnProduccion or EstadoTicket.Cerrado;

    /// <summary>Camino principal que se dibuja como línea de progreso en la interfaz.</summary>
    public static readonly EstadoTicket[] CaminoPrincipal =
    [
        EstadoTicket.Nuevo, EstadoTicket.Asignado, EstadoTicket.EnAnalisis, EstadoTicket.EnDesarrollo, EstadoTicket.EnRevision,
        EstadoTicket.EnPruebas, EstadoTicket.Aprobado, EstadoTicket.EnProduccion, EstadoTicket.Cerrado
    ];
}
