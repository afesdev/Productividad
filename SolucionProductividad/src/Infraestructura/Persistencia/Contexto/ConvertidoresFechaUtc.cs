using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace SolucionProductividad.Persistencia.Contexto;

/// <summary>
/// Todas las fechas se guardan en UTC. SQL Server (datetime2) no almacena la zona, así que al leer
/// EF entrega DateTimeKind.Unspecified; este convertidor las marca como UTC para que la API las envíe con "Z"
/// y el navegador las convierta correctamente a la hora local del usuario.
/// </summary>
public sealed class ConvertidorFechaUtc : ValueConverter<DateTime, DateTime>
{
    public ConvertidorFechaUtc()
        : base(
            fecha => AUtc(fecha),
            fecha => DateTime.SpecifyKind(fecha, DateTimeKind.Utc))
    {
    }

    /// <summary>Local → UTC; sin zona se asume que ya es UTC (así se generan en todo el backend).</summary>
    internal static DateTime AUtc(DateTime fecha) => fecha.Kind switch
    {
        DateTimeKind.Local => fecha.ToUniversalTime(),
        DateTimeKind.Unspecified => DateTime.SpecifyKind(fecha, DateTimeKind.Utc),
        _ => fecha
    };
}

public sealed class ConvertidorFechaUtcNulable : ValueConverter<DateTime?, DateTime?>
{
    public ConvertidorFechaUtcNulable()
        : base(
            fecha => fecha.HasValue ? ConvertidorFechaUtc.AUtc(fecha.Value) : fecha,
            fecha => fecha.HasValue ? DateTime.SpecifyKind(fecha.Value, DateTimeKind.Utc) : fecha)
    {
    }
}
