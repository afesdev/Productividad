namespace SolucionProductividad.Dominio.Enumeraciones;

/// <summary>
/// Cola y políticas de SLA sembradas en la base de datos. Cada prioridad usa su política por defecto.
/// </summary>
public static class ValoresSemillaSoporte
{
    public static readonly Guid IdColaGeneral = Guid.Parse("5c0a7e10-2b6f-4d1e-9a51-000000000001");

    public static readonly IReadOnlyDictionary<Prioridad, (Guid Id, string Nombre, int MinutosPrimeraRespuesta, int MinutosResolucion)> PoliticasPorPrioridad =
        new Dictionary<Prioridad, (Guid, string, int, int)>
        {
            [Prioridad.Urgente] = (Guid.Parse("5c0a7e10-2b6f-4d1e-9a51-000000000101"), "Urgente", 60, 8 * 60),
            [Prioridad.Alta] = (Guid.Parse("5c0a7e10-2b6f-4d1e-9a51-000000000102"), "Alta", 4 * 60, 24 * 60),
            [Prioridad.Media] = (Guid.Parse("5c0a7e10-2b6f-4d1e-9a51-000000000103"), "Media", 8 * 60, 72 * 60),
            [Prioridad.Baja] = (Guid.Parse("5c0a7e10-2b6f-4d1e-9a51-000000000104"), "Baja", 24 * 60, 120 * 60),
        };
}
