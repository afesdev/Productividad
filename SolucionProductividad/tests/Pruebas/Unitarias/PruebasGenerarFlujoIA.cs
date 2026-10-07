using SolucionProductividad.Aplicacion.Caracteristicas.Flujos;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Pruebas.Unitarias;

public class PruebasGenerarFlujoIA
{
    private sealed class IAFalsa(string respuesta) : IServicioIA
    {
        public string? InstruccionesRecibidas { get; private set; }

        public Task<string> CompletarAsync(string instrucciones, string contenido, CancellationToken tokenCancelacion = default)
        {
            InstruccionesRecibidas = instrucciones;
            return Task.FromResult(respuesta);
        }
    }

    [Fact]
    public async Task Quita_el_cerco_de_codigo_y_envia_la_sintaxis_en_las_instrucciones()
    {
        var ia = new IAFalsa("```text\nusuario: Pulsa Generar\nfin\n```");
        var texto = await new ManejadorGenerarFlujoConIAComando(ia).Handle(new GenerarFlujoConIAComando("El usuario pulsa generar"), default);

        Assert.Equal("usuario: Pulsa Generar\nfin", texto);
        Assert.Contains("validacion", ia.InstruccionesRecibidas);
        Assert.Contains("[Etiqueta]", ia.InstruccionesRecibidas);
    }

    [Fact]
    public async Task Una_respuesta_vacia_es_un_error_claro() =>
        await Assert.ThrowsAsync<ExcepcionDominio>(() => new ManejadorGenerarFlujoConIAComando(new IAFalsa("  ")).Handle(new GenerarFlujoConIAComando("x"), default));
}
