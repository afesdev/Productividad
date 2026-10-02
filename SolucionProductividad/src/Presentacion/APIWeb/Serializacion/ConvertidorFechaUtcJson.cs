using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SolucionProductividad.APIWeb.Serializacion;

/// <summary>
/// Toda fecha sale de la API en ISO 8601 UTC con "Z" (ej. 2026-09-24T20:15:00.0000000Z), incluidas las que
/// vienen de Dapper sin zona. Al recibir: con zona se convierte a UTC; sin zona se asume UTC.
/// </summary>
public sealed class ConvertidorFechaUtcJson : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader lector, Type tipo, JsonSerializerOptions opciones)
    {
        var texto = lector.GetString() ?? throw new JsonException("Fecha vacía.");
        var fecha = DateTime.Parse(texto, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);
        return fecha.Kind switch
        {
            DateTimeKind.Local => fecha.ToUniversalTime(),
            DateTimeKind.Unspecified => DateTime.SpecifyKind(fecha, DateTimeKind.Utc),
            _ => fecha
        };
    }

    public override void Write(Utf8JsonWriter escritor, DateTime valor, JsonSerializerOptions opciones)
    {
        var utc = valor.Kind switch
        {
            DateTimeKind.Local => valor.ToUniversalTime(),
            DateTimeKind.Unspecified => DateTime.SpecifyKind(valor, DateTimeKind.Utc),
            _ => valor
        };
        escritor.WriteStringValue(utc.ToString("O", CultureInfo.InvariantCulture));
    }
}
