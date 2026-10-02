namespace SolucionProductividad.Dominio.Enumeraciones;

public enum TipoTicket
{
    Ajuste,
    NuevoDesarrollo,
    Incidencia,
    Auditoria,
    Soporte,
    Otro
}

public enum EstadoPullRequest
{
    Abierto,
    Fusionado,
    Cerrado
}

public enum TipoCambioArchivo
{
    Agregado,
    Modificado,
    Eliminado,
    Renombrado
}

public enum AmbienteDespliegue
{
    Desarrollo,
    Produccion
}

public enum ResultadoDespliegue
{
    Pendiente,
    Aprobado,
    Rechazado
}

/// <summary>Tipos de evento del historial (la línea de tiempo del ticket).</summary>
public enum TipoEventoTicket
{
    Creado,
    CambioEstado,
    Asignado,
    Editado,
    RamaCreada,
    RamaVinculada,
    PullRequestCreado,
    Sincronizado,
    Desplegado,
    PruebasAprobadas,
    PruebasRechazadas,
    TareaVinculada,
    DocumentacionActualizada,
    TiempoRegistrado
}
