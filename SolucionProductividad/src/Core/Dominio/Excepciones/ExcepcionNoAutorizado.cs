namespace SolucionProductividad.Dominio.Excepciones;

/// <summary>
/// Credenciales inválidas o sesión no válida (HTTP 401).
/// </summary>
public class ExcepcionNoAutorizado : ExcepcionDominio
{
    public ExcepcionNoAutorizado(string mensaje = "Credenciales inválidas.") : base(mensaje) { }
}
