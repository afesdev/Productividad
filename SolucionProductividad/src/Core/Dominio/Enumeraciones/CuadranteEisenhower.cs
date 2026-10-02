namespace SolucionProductividad.Dominio.Enumeraciones;

public enum CuadranteEisenhower
{
    /// <summary>Urgente e importante.</summary>
    Hacer,
    /// <summary>Importante, no urgente.</summary>
    Programar,
    /// <summary>Urgente, no importante.</summary>
    Delegar,
    /// <summary>Ni urgente ni importante.</summary>
    Eliminar
}
