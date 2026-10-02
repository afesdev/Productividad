using System.Security.Cryptography;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;

namespace SolucionProductividad.Servicios.Seguridad;

/// <summary>
/// PBKDF2-HMAC-SHA256 (recomendación OWASP: 600.000 iteraciones).
/// Formato: "PBKDF2-SHA256$iteraciones$salBase64$hashBase64" — las iteraciones viajan con el hash para poder subirlas sin invalidar cuentas.
/// </summary>
public sealed class ServicioHashContrasena : IServicioHashContrasena
{
    private const string Algoritmo = "PBKDF2-SHA256";
    private const int Iteraciones = 600_000;
    private const int TamanoSal = 16;
    private const int TamanoHash = 32;

    public string GenerarHash(string contrasena)
    {
        var sal = RandomNumberGenerator.GetBytes(TamanoSal);
        var hash = Rfc2898DeriveBytes.Pbkdf2(contrasena, sal, Iteraciones, HashAlgorithmName.SHA256, TamanoHash);
        return $"{Algoritmo}${Iteraciones}${Convert.ToBase64String(sal)}${Convert.ToBase64String(hash)}";
    }

    public bool VerificarHash(string contrasena, string hashAlmacenado)
    {
        var partes = hashAlmacenado.Split('$');
        if (partes.Length != 4 || partes[0] != Algoritmo || !int.TryParse(partes[1], out var iteraciones))
            return false;

        try
        {
            var sal = Convert.FromBase64String(partes[2]);
            var hashEsperado = Convert.FromBase64String(partes[3]);
            var hashCalculado = Rfc2898DeriveBytes.Pbkdf2(contrasena, sal, iteraciones, HashAlgorithmName.SHA256, hashEsperado.Length);
            return CryptographicOperations.FixedTimeEquals(hashCalculado, hashEsperado);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
