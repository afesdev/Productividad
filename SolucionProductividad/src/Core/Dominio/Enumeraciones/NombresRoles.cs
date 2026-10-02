namespace SolucionProductividad.Dominio.Enumeraciones;

/// <summary>
/// Nombres de los roles base del sistema. Se siembran en la tabla Roles.
/// </summary>
public static class NombresRoles
{
    public const string Administrador = "Administrador";
    public const string Agente = "Agente";
    public const string Miembro = "Miembro";

    public static readonly Guid IdAdministrador = Guid.Parse("7a1f0a4e-0c1b-4a8e-9f59-1d0a6b1e0001");
    public static readonly Guid IdAgente = Guid.Parse("7a1f0a4e-0c1b-4a8e-9f59-1d0a6b1e0002");
    public static readonly Guid IdMiembro = Guid.Parse("7a1f0a4e-0c1b-4a8e-9f59-1d0a6b1e0003");
}
