using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

/// <summary>
/// Calendario externo (Outlook/Teams) que el usuario publicó como enlace ICS. Una por usuario y solo de lectura:
/// los eventos no se guardan, se leen del enlace al consultarlos. El enlace da acceso al calendario sin iniciar
/// sesión, así que se guarda cifrado.
/// </summary>
[PrefijoTabla("ConexionesCalendario", "Cal")]
public class ConexionCalendario : EntidadBase
{
    public Guid UsuarioId { get; set; }
    public string UrlIcsCifrada { get; set; } = string.Empty;
    public DateTime FechaConexion { get; set; } = DateTime.UtcNow;
}
