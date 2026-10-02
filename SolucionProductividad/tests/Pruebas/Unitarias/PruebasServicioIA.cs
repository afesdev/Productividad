using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Servicios.IA;
using SolucionProductividad.Servicios.Opciones;

namespace SolucionProductividad.Pruebas.Unitarias;

public class PruebasServicioIA
{
    /// <summary>Responde en orden los códigos dados y registra el modelo pedido en cada llamada.</summary>
    private sealed class ProveedorFalso(params HttpStatusCode[] codigos) : HttpMessageHandler
    {
        private int _llamada;
        public List<string> ModelosPedidos { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage solicitud, CancellationToken tokenCancelacion)
        {
            using var cuerpo = JsonDocument.Parse(await solicitud.Content!.ReadAsStringAsync(tokenCancelacion));
            ModelosPedidos.Add(cuerpo.RootElement.GetProperty("model").GetString()!);
            var codigo = codigos[Math.Min(_llamada++, codigos.Length - 1)];
            var json = codigo == HttpStatusCode.OK
                ? """{"choices":[{"message":{"role":"assistant","content":"Esta semana se terminó."}}]}"""
                : """[{"error":{"code":503,"message":"This model is currently experiencing high demand."}}]""";
            return new HttpResponseMessage(codigo) { Content = new StringContent(json, Encoding.UTF8, "application/json") };
        }
    }

    private static ServicioIA Crear(ProveedorFalso proveedor) => new(
        new HttpClient(proveedor),
        Options.Create(new OpcionesIA { ApiKey = "clave", Modelo = "principal", ModelosAlternativos = ["alterno"], ReintentosPorModelo = 2, PausaReintentoMs = 0 }));

    [Fact]
    public async Task Reintenta_el_mismo_modelo_ante_saturacion_temporal()
    {
        var proveedor = new ProveedorFalso(HttpStatusCode.ServiceUnavailable, HttpStatusCode.OK);
        Assert.Equal("Esta semana se terminó.", await Crear(proveedor).CompletarAsync("instrucciones", "esta semana se termino"));
        Assert.Equal(["principal", "principal"], proveedor.ModelosPedidos);
    }

    [Fact]
    public async Task Pasa_al_modelo_alternativo_si_el_principal_sigue_saturado()
    {
        var proveedor = new ProveedorFalso(HttpStatusCode.ServiceUnavailable, HttpStatusCode.ServiceUnavailable, HttpStatusCode.ServiceUnavailable, HttpStatusCode.OK);
        Assert.Equal("Esta semana se terminó.", await Crear(proveedor).CompletarAsync("instrucciones", "texto"));
        Assert.Equal(["principal", "principal", "principal", "alterno"], proveedor.ModelosPedidos);
    }

    [Fact]
    public async Task Si_todos_siguen_saturados_devuelve_un_mensaje_claro()
    {
        var proveedor = new ProveedorFalso(HttpStatusCode.ServiceUnavailable);
        var error = await Assert.ThrowsAsync<ExcepcionDominio>(() => Crear(proveedor).CompletarAsync("instrucciones", "texto"));
        Assert.Contains("saturado", error.Message);
        Assert.Equal(6, proveedor.ModelosPedidos.Count);
    }

    [Fact]
    public async Task No_reintenta_errores_que_no_son_temporales()
    {
        var proveedor = new ProveedorFalso(HttpStatusCode.Unauthorized);
        await Assert.ThrowsAsync<ExcepcionDominio>(() => Crear(proveedor).CompletarAsync("instrucciones", "texto"));
        Assert.Single(proveedor.ModelosPedidos);
    }
}
