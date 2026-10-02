using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

[PrefijoTabla("Usuarios", "Usu")]
public class Usuario : EntidadBase
{
    public string Correo { get; set; } = string.Empty;
    /// <summary>Identificador público único (minúsculas); también sirve para iniciar sesión.</summary>
    public string NombreUsuario { get; set; } = string.Empty;
    public string NombreCompleto { get; set; } = string.Empty;
    public string HashContrasena { get; set; } = string.Empty;
    public bool EstaActivo { get; set; } = true;
    public DateTime? FechaUltimoAcceso { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;

    public ICollection<UsuarioRol> Roles { get; set; } = new List<UsuarioRol>();
}
