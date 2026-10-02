namespace SolucionProductividad.Dominio.Excepciones;

/// <summary>
/// Usuario autenticado sin permiso sobre el recurso (HTTP 403).
/// </summary>
public class ExcepcionAccesoDenegado : ExcepcionDominio
{
    public ExcepcionAccesoDenegado(string mensaje = "No tiene permisos para acceder a este recurso.") : base(mensaje) { }
}
