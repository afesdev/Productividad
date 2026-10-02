namespace SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Dtos;

public sealed record UsuarioDto(Guid Id, string Correo, string NombreUsuario, string NombreCompleto, bool EstaActivo, IReadOnlyList<string> Roles);

public sealed record RespuestaAutenticacionDto(
    string TokenAcceso,
    DateTime FechaExpiracionAcceso,
    string TokenRefresco,
    DateTime FechaExpiracionRefresco,
    UsuarioDto Usuario);

/// <summary>Reglas compartidas del nombre de usuario.</summary>
public static class ReglasNombreUsuario
{
    /// <summary>3 a 30 caracteres: letras, números, punto, guion o guion bajo; empieza con letra o número.</summary>
    public const string Patron = "^[a-z0-9][a-z0-9._-]{2,29}$";

    public static string Normalizar(string nombreUsuario) => nombreUsuario.Trim().TrimStart('@').ToLowerInvariant();
}
