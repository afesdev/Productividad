namespace SolucionProductividad.Dominio.Enumeraciones;

/// <summary>Vigencia de un documento: si se puede confiar en él.</summary>
public enum EstadoDocumento
{
    Borrador,
    Vigente,
    /// <summary>Ya no aplica; puede indicar el documento que lo reemplaza.</summary>
    Obsoleto
}
