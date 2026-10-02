using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

[PrefijoTabla("UsuariosRoles", "Uro")]
public class UsuarioRol : EntidadBase
{
    public Guid UsuarioId { get; set; }
    public Guid RolId { get; set; }
    public DateTime FechaAsignacion { get; set; } = DateTime.UtcNow;

    public Usuario? Usuario { get; set; }
    public Rol? Rol { get; set; }
}
