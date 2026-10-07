namespace SolucionProductividad.Dominio.Enumeraciones;

/// <summary>
/// Tipos de entidad usados en referencias cruzadas (backlinks) y marcadores.
/// </summary>
public enum TipoEntidad
{
    Tarea,
    Ticket,
    Documento,
    RegistroDiario,
    /// <summary>Diagrama de proceso. Se enlaza con [[Flujo: Título]].</summary>
    Flujo
}
