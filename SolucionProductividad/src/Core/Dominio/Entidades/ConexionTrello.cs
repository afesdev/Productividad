using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

/// <summary>
/// Cuenta de Trello conectada por el usuario (una por usuario, solo lectura). Los tableros y tarjetas no se guardan:
/// se leen de la API de Trello al consultarlos. El token da acceso de lectura a todos sus tableros, así que se guarda cifrado.
/// </summary>
[PrefijoTabla("ConexionesTrello", "Tre")]
public class ConexionTrello : EntidadBase
{
    public Guid UsuarioId { get; set; }
    public string TokenCifrado { get; set; } = string.Empty;
    /// <summary>Id del miembro en Trello: distingue los tableros que administra y las tarjetas asignadas.</summary>
    public string IdMiembro { get; set; } = string.Empty;
    public string NombreMiembro { get; set; } = string.Empty;
    public string UsuarioMiembro { get; set; } = string.Empty;
    public DateTime FechaConexion { get; set; } = DateTime.UtcNow;
}
