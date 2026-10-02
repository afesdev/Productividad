using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

/// <summary>
/// Tramo de tiempo trabajado. Se asocia a una tarea, a un ticket o a ninguno (tiempo libre con descripción).
/// Sin FechaFin es el cronómetro en marcha: a lo sumo uno por usuario.
/// </summary>
[PrefijoTabla("RegistrosTiempo", "Rgt")]
public class RegistroTiempo : EntidadBase
{
    public Guid? TareaId { get; set; }
    public Guid? TicketId { get; set; }
    public Guid UsuarioId { get; set; }
    public DateTime FechaInicio { get; set; }
    public DateTime? FechaFin { get; set; }
    /// <summary>Columna calculada en SQL Server: DATEDIFF(MINUTE, inicio, fin).</summary>
    public int? MinutosTranscurridos { get; private set; }
    public string? Descripcion { get; set; }

    public bool EstaEnCurso => FechaFin is null;

    /// <summary>Duración en horas (dos decimales) hasta el fin, o hasta <paramref name="ahoraUtc"/> si sigue en curso.</summary>
    public decimal Horas(DateTime ahoraUtc) => Math.Round((decimal)((FechaFin ?? ahoraUtc) - FechaInicio).TotalHours, 2, MidpointRounding.AwayFromZero);
}
