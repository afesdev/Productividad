namespace SolucionProductividad.Aplicacion.Contratos.Infraestructura;

public interface IServicioAlmacenamientoFirebase
{
    /// <summary>Sube el flujo a Firebase Storage y retorna la URL pública de descarga (con token).</summary>
    Task<string> SubirArchivoAsync(Stream flujoArchivo, string rutaDestino, string tipoContenido, CancellationToken tokenCancelacion = default);
    Task EliminarArchivoAsync(string rutaFirebaseStorage, CancellationToken tokenCancelacion = default);
}
