namespace SolucionProductividad.Dominio.Enumeraciones;

/// <summary>
/// Flujo de un ticket: Nuevo → Asignado → EnAnalisis → EnDesarrollo → EnRevision (PR a Desarrollo)
/// → EnPruebas (app de desarrollo) → Aprobado → EnProduccion → Cerrado. Las transiciones válidas viven en MaquinaEstadosTicket.
/// </summary>
public enum EstadoTicket
{
    Nuevo,
    Asignado,
    EnAnalisis,
    PendienteCliente,
    EnDesarrollo,
    EnRevision,
    EnPruebas,
    Devuelto,
    Aprobado,
    EnProduccion,
    Cerrado,
    Cancelado
}
