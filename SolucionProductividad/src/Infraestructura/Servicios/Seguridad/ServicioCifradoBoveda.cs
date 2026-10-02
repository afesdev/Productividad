using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Servicios.Opciones;

namespace SolucionProductividad.Servicios.Seguridad;

/// <summary>
/// AES-256 en modo GCM (cifrado autenticado): detecta cualquier alteración del texto cifrado.
/// Formato persistido: "v1:" + Base64(nonce[12] | tag[16] | textoCifrado).
/// El prefijo de versión permite rotar la llave maestra en el futuro sin ambigüedad.
/// </summary>
public sealed class ServicioCifradoBoveda : IServicioCifradoBoveda
{
    private const string PrefijoVersion = "v1:";
    private const int TamanoNonce = 12;
    private const int TamanoTag = 16;

    private readonly byte[] _llaveMaestra;

    public ServicioCifradoBoveda(IOptions<OpcionesBoveda> opciones)
    {
        try
        {
            _llaveMaestra = Convert.FromBase64String(opciones.Value.LlaveMaestraBase64);
        }
        catch (FormatException)
        {
            throw new InvalidOperationException("Boveda:LlaveMaestraBase64 no es Base64 válido.");
        }

        if (_llaveMaestra.Length != 32)
            throw new InvalidOperationException("Boveda:LlaveMaestraBase64 debe decodificar exactamente 32 bytes (AES-256).");
    }

    public string CifrarTexto(string textoPlano)
    {
        var bytesPlanos = Encoding.UTF8.GetBytes(textoPlano);
        var paquete = new byte[TamanoNonce + TamanoTag + bytesPlanos.Length];

        var nonce = paquete.AsSpan(0, TamanoNonce);
        var tag = paquete.AsSpan(TamanoNonce, TamanoTag);
        var textoCifrado = paquete.AsSpan(TamanoNonce + TamanoTag);

        RandomNumberGenerator.Fill(nonce);
        using var aes = new AesGcm(_llaveMaestra, TamanoTag);
        aes.Encrypt(nonce, bytesPlanos, textoCifrado, tag);

        return PrefijoVersion + Convert.ToBase64String(paquete);
    }

    public string DescifrarTexto(string textoCifrado)
    {
        if (!textoCifrado.StartsWith(PrefijoVersion, StringComparison.Ordinal))
            throw new CryptographicException("Formato de secreto no reconocido.");

        var paquete = Convert.FromBase64String(textoCifrado[PrefijoVersion.Length..]);
        if (paquete.Length < TamanoNonce + TamanoTag)
            throw new CryptographicException("Secreto cifrado corrupto.");

        var nonce = paquete.AsSpan(0, TamanoNonce);
        var tag = paquete.AsSpan(TamanoNonce, TamanoTag);
        var datosCifrados = paquete.AsSpan(TamanoNonce + TamanoTag);
        var bytesPlanos = new byte[datosCifrados.Length];

        using var aes = new AesGcm(_llaveMaestra, TamanoTag);
        aes.Decrypt(nonce, datosCifrados, tag, bytesPlanos);

        return Encoding.UTF8.GetString(bytesPlanos);
    }
}
