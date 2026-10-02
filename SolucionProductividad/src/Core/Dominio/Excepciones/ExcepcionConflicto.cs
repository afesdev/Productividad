namespace SolucionProductividad.Dominio.Excepciones;

/// <summary>
/// El recurso ya existe o el estado actual impide la operación (HTTP 409).
/// </summary>
public class ExcepcionConflicto : ExcepcionDominio
{
    public ExcepcionConflicto(string mensaje) : base(mensaje) { }
}
