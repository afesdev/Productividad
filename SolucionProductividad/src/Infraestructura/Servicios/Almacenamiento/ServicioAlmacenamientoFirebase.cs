using System.Net;
using Google;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Storage.V1;
using Microsoft.Extensions.Options;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Servicios.Opciones;
using Objeto = Google.Apis.Storage.v1.Data.Object;

namespace SolucionProductividad.Servicios.Almacenamiento;

/// <summary>
/// Firebase Storage es un bucket de Google Cloud Storage; se usa el SDK oficial de GCS con una cuenta de servicio.
/// La URL de descarga sigue el formato de Firebase (token en metadatos), así funciona igual que las generadas por el SDK web.
/// </summary>
public sealed class ServicioAlmacenamientoFirebase : IServicioAlmacenamientoFirebase
{
    private const string ClaveMetadatoTokenDescarga = "firebaseStorageDownloadTokens";

    private readonly OpcionesFirebase _opciones;
    private readonly Lazy<StorageClient> _clienteAlmacenamiento;

    public ServicioAlmacenamientoFirebase(IOptions<OpcionesFirebase> opciones)
    {
        _opciones = opciones.Value;
        // Creación diferida: la API arranca aunque Firebase aún no esté configurado en desarrollo.
        _clienteAlmacenamiento = new Lazy<StorageClient>(CrearCliente);
    }

    public async Task<string> SubirArchivoAsync(Stream flujoArchivo, string rutaDestino, string tipoContenido, CancellationToken tokenCancelacion = default)
    {
        var tokenDescarga = Guid.NewGuid().ToString();
        var objeto = new Objeto
        {
            Bucket = ObtenerNombreBucket(),
            Name = rutaDestino,
            ContentType = tipoContenido,
            CacheControl = "private, max-age=31536000",
            Metadata = new Dictionary<string, string> { [ClaveMetadatoTokenDescarga] = tokenDescarga }
        };

        await _clienteAlmacenamiento.Value.UploadObjectAsync(objeto, flujoArchivo, cancellationToken: tokenCancelacion);

        return $"https://firebasestorage.googleapis.com/v0/b/{objeto.Bucket}/o/{Uri.EscapeDataString(rutaDestino)}?alt=media&token={tokenDescarga}";
    }

    public async Task EliminarArchivoAsync(string rutaFirebaseStorage, CancellationToken tokenCancelacion = default)
    {
        try
        {
            await _clienteAlmacenamiento.Value.DeleteObjectAsync(ObtenerNombreBucket(), rutaFirebaseStorage, cancellationToken: tokenCancelacion);
        }
        catch (GoogleApiException excepcion) when (excepcion.HttpStatusCode == HttpStatusCode.NotFound)
        {
            // Idempotente: si ya no existe, el objetivo está cumplido.
        }
    }

    private string ObtenerNombreBucket() =>
        string.IsNullOrWhiteSpace(_opciones.NombreBucket)
            ? throw new InvalidOperationException("Configure Firebase:NombreBucket para habilitar la subida de archivos.")
            : _opciones.NombreBucket.Trim();

    private StorageClient CrearCliente()
    {
        if (string.IsNullOrWhiteSpace(_opciones.RutaCredenciales))
            return StorageClient.Create();

        // Trim: valores pegados en user-secrets suelen arrastrar saltos de línea.
        var credencial = GoogleCredential.FromFile(_opciones.RutaCredenciales.Trim());
        return StorageClient.Create(credencial);
    }
}
