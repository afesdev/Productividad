using SolucionProductividad.Aplicacion.Caracteristicas.IA;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;

namespace SolucionProductividad.Pruebas.Unitarias;

public class PruebasAsistenteTextoIA
{
    private sealed class IAFalsa(string respuesta) : IServicioIA
    {
        public string? Instrucciones { get; private set; }
        public string? Contenido { get; private set; }

        public Task<string> CompletarAsync(string instrucciones, string contenido, CancellationToken tokenCancelacion = default)
        {
            Instrucciones = instrucciones;
            Contenido = contenido;
            return Task.FromResult(respuesta);
        }
    }

    [Theory]
    [InlineData("```markdown\n# Título\n\nTexto\n```", "# Título\n\nTexto")]
    [InlineData("```\n- uno\n```", "- uno")]
    [InlineData("  # Sin cerco  \n", "# Sin cerco")]
    public async Task Devuelve_markdown_sin_el_cerco_que_agregan_algunos_modelos(string respuesta, string esperado)
    {
        var manejador = new ManejadorTransformarTextoIAComando(new IAFalsa(respuesta));
        Assert.Equal(esperado, await manejador.Handle(new TransformarTextoIAComando(AccionTextoIA.Mejorar, "texto"), CancellationToken.None));
    }

    [Fact]
    public async Task Si_la_IA_recorta_demasiado_una_seccion_se_conserva_la_original()
    {
        var original = "Paso 1: instalar el paquete.\nPaso 2: configurar la clave.\nPaso 3: reiniciar el servicio.";
        var manejador = new ManejadorTransformarTextoIAComando(new IAFalsa("Instalar y configurar."));
        Assert.Equal(original, await manejador.Handle(new TransformarTextoIAComando(AccionTextoIA.Mejorar, original), CancellationToken.None));
    }

    [Fact]
    public async Task Resumir_si_puede_acortar()
    {
        var manejador = new ManejadorTransformarTextoIAComando(new IAFalsa("Resumen."));
        Assert.Equal("Resumen.", await manejador.Handle(new TransformarTextoIAComando(AccionTextoIA.Resumir, new string('x', 500)), CancellationToken.None));
    }

    [Fact]
    public void Divide_por_titulos_sin_cortar_bloques_de_codigo_y_agrupa_hasta_el_tamano()
    {
        var texto = "Intro\n## A\n" + new string('a', 40) + "\n```bash\n# no es un título\necho hola\n```\n## B\n" + new string('b', 40) + "\n## C\ncorto";
        var secciones = ManejadorTransformarTextoIAComando.DividirEnSecciones(texto, 120);

        Assert.Equal(2, secciones.Count);
        Assert.StartsWith("Intro\n## A", secciones[0]);
        Assert.Contains("# no es un título", secciones[0]);
        Assert.StartsWith("## B", secciones[1]);
        Assert.Contains("## C", secciones[1]);
        // No se pierde ni se reordena ninguna línea.
        Assert.Equal(texto.Split('\n').Where(linea => linea.Length > 0), string.Join("\n", secciones).Split('\n').Where(linea => linea.Length > 0));
    }

    [Fact]
    public async Task Envia_el_texto_tal_cual_y_la_tarea_segun_la_accion()
    {
        var ia = new IAFalsa("ok");
        await new ManejadorTransformarTextoIAComando(ia).Handle(new TransformarTextoIAComando(AccionTextoIA.Corregir, "esta semana se termino"), CancellationToken.None);
        Assert.Equal("esta semana se termino", ia.Contenido);
        Assert.Contains("Corrige únicamente ortografía", ia.Instrucciones);
        Assert.Contains("[[...]]", ia.Instrucciones);
    }
}
