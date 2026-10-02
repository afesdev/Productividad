namespace SolucionProductividad.Aplicacion.Caracteristicas.Analitica.Dtos;

/// <summary>
/// KPIs personales. Clase mutable para que Dapper la hidrate directamente desde la consulta.
/// </summary>
public sealed class ResumenAnaliticaPersonalDto
{
    public int TareasCompletadas { get; set; }
    public int TareasAbiertas { get; set; }
    public int TareasVencidas { get; set; }
    public int MinutosRegistrados { get; set; }
    public int TicketsAsignados { get; set; }
    public int TicketsResueltos { get; set; }
    /// <summary>% de tickets cuya primera respuesta llegó antes del límite de SLA (null si no hay datos).</summary>
    public decimal? PorcentajeSlaPrimeraRespuesta { get; set; }
    /// <summary>% de tickets resueltos antes del límite de SLA (null si no hay datos).</summary>
    public decimal? PorcentajeSlaResolucion { get; set; }
    public IReadOnlyList<PuntoVelocidadSemanalDto> VelocidadSemanal { get; set; } = Array.Empty<PuntoVelocidadSemanalDto>();
}

public sealed class PuntoVelocidadSemanalDto
{
    public DateTime InicioSemana { get; set; }
    public int TareasCompletadas { get; set; }
    public int MinutosRegistrados { get; set; }
}
