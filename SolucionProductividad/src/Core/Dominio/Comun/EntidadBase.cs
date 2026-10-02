namespace SolucionProductividad.Dominio.Comun;

/// <summary>
/// Clase base para todas las entidades del dominio con identificador GUID.
/// </summary>
public abstract class EntidadBase
{
    public Guid Id { get; set; } = Guid.NewGuid();
}
