namespace SolucionProductividad.Aplicacion.Contratos.Seguridad;

public interface IServicioHashContrasena
{
    string GenerarHash(string contrasena);
    bool VerificarHash(string contrasena, string hashAlmacenado);
}
