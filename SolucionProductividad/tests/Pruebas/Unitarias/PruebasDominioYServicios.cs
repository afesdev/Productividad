using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using SolucionProductividad.Aplicacion.Comun.Utilidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.ObjetosValor;
using SolucionProductividad.Servicios.Opciones;
using SolucionProductividad.Servicios.Seguridad;

namespace SolucionProductividad.Pruebas.Unitarias;

public class PruebasMatrizEisenhower
{
    [Theory]
    [InlineData(true, true, CuadranteEisenhower.Hacer)]
    [InlineData(false, true, CuadranteEisenhower.Programar)]
    [InlineData(true, false, CuadranteEisenhower.Delegar)]
    [InlineData(false, false, CuadranteEisenhower.Eliminar)]
    public void Banderas_y_cuadrante_son_equivalentes(bool esUrgente, bool esImportante, CuadranteEisenhower esperado)
    {
        Assert.Equal(esperado, MatrizEisenhower.ObtenerCuadrante(esUrgente, esImportante));
        Assert.Equal((esUrgente, esImportante), MatrizEisenhower.ObtenerBanderas(esperado));
    }
}

public class PruebasGeneradorSlug
{
    [Theory]
    [InlineData("Arquitectura del Núcleo", "arquitectura-del-nucleo")]
    [InlineData("  API  v2 / Autenticación!! ", "api-v2-autenticacion")]
    [InlineData("¿¡!?", "sin-titulo")]
    public void Normaliza_acentos_y_simbolos(string titulo, string esperado) => Assert.Equal(esperado, GeneradorSlug.Generar(titulo));
}

public class PruebasCifradoBoveda
{
    private static ServicioCifradoBoveda CrearServicio() =>
        new(Options.Create(new OpcionesBoveda { LlaveMaestraBase64 = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)) }));

    [Fact]
    public void Cifra_y_descifra_el_mismo_texto()
    {
        var servicio = CrearServicio();
        var cifrado = servicio.CifrarTexto("postgres://usuario:clave@host/db ñ");

        Assert.StartsWith("v1:", cifrado);
        Assert.DoesNotContain("postgres", cifrado);
        Assert.Equal("postgres://usuario:clave@host/db ñ", servicio.DescifrarTexto(cifrado));
    }

    [Fact]
    public void Usa_un_nonce_distinto_en_cada_cifrado()
    {
        var servicio = CrearServicio();
        Assert.NotEqual(servicio.CifrarTexto("mismo valor"), servicio.CifrarTexto("mismo valor"));
    }

    [Fact]
    public void Detecta_texto_cifrado_alterado()
    {
        var servicio = CrearServicio();
        var paquete = Convert.FromBase64String(servicio.CifrarTexto("secreto")[3..]);
        paquete[^1] ^= 0xFF;

        Assert.ThrowsAny<CryptographicException>(() => servicio.DescifrarTexto("v1:" + Convert.ToBase64String(paquete)));
    }

    [Fact]
    public void Rechaza_llaves_que_no_son_de_256_bits() =>
        Assert.Throws<InvalidOperationException>(() =>
            new ServicioCifradoBoveda(Options.Create(new OpcionesBoveda { LlaveMaestraBase64 = Convert.ToBase64String(new byte[16]) })));
}

public class PruebasHashContrasena
{
    [Fact]
    public void Verifica_solo_la_contrasena_correcta()
    {
        var servicio = new ServicioHashContrasena();
        var hash = servicio.GenerarHash("Clave12345");

        Assert.True(servicio.VerificarHash("Clave12345", hash));
        Assert.False(servicio.VerificarHash("clave12345", hash));
        Assert.False(servicio.VerificarHash("Clave12345", "formato-invalido"));
    }
}
