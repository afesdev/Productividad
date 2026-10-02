using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Contratos.Seguridad;

/// <summary>
/// Identidad del usuario autenticado en la petición actual (extraída del JWT).
/// </summary>
public interface IServicioUsuarioActual
{
    Guid? UsuarioId { get; }
    string? Correo { get; }
    string? NombreCompleto { get; }
    bool EsAdministrador { get; }
    bool TieneRol(string nombreRol);

    Guid ObtenerUsuarioIdRequerido() => UsuarioId ?? throw new ExcepcionNoAutorizado("Sesión no válida.");
}
