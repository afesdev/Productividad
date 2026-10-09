using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

/// <summary>
/// Preferencia de la interfaz guardada en el servidor para que sea la misma en cualquier equipo
/// (p. ej. "inicio.widgets": qué widgets muestra la página de Inicio y en qué orden). El valor es JSON opaco.
/// </summary>
[PrefijoTabla("PreferenciasUsuario", "Pre")]
public class PreferenciaUsuario : EntidadBase
{
    public Guid UsuarioId { get; set; }
    public string Clave { get; set; } = string.Empty;
    public string ValorJson { get; set; } = string.Empty;
    public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;
}
