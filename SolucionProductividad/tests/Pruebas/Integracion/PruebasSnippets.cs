using SolucionProductividad.Aplicacion.Caracteristicas.Snippets;
using SolucionProductividad.Aplicacion.Comun.Excepciones;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

/// <summary>Biblioteca de snippets: guardar con etiquetas, buscar, ordenar por favoritos y usos, y aislamiento por usuario.</summary>
[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasSnippets
{
    private readonly BaseDatosPrueba _baseDatos;

    public PruebasSnippets(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    [Fact]
    public async Task Se_guardan_buscan_y_ordenan_por_favorito_y_uso_y_solo_los_ve_su_dueno()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Con snippets");
        var otro = await _baseDatos.CrearUsuarioAsync("Sin snippets");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        using var escenarioOtro = _baseDatos.CrearEscenario(otro);

        const string Consulta = "SELECT *\n  FROM Pagos\n WHERE ClienteId = {{clienteId}}";
        var pagos = await escenario.EnviarAsync(new GuardarSnippetComando(null, "Pagos de un cliente", "sql", Consulta, "Para soporte de pagos", []));
        var reinicio = await escenario.EnviarAsync(new GuardarSnippetComando(null, "Reiniciar IIS", "powershell", "iisreset /restart", null, []));

        // El contenido se guarda tal cual (espacios y saltos de línea incluidos).
        Assert.Equal(Consulta, pagos.Contenido);

        // Búsqueda en el contenido y por lenguaje.
        Assert.Equal([pagos.Id], (await escenario.EnviarAsync(new ListarSnippetsConsulta("ClienteId"))).Select(snippet => snippet.Id));
        Assert.Equal([reinicio.Id], (await escenario.EnviarAsync(new ListarSnippetsConsulta(Lenguaje: "powershell"))).Select(snippet => snippet.Id));

        // Los usados suben; los favoritos van antes que todo.
        await escenario.EnviarAsync(new RegistrarUsoSnippetComando(reinicio.Id));
        Assert.Equal(reinicio.Id, (await escenario.EnviarAsync(new ListarSnippetsConsulta())).First().Id);
        Assert.True(await escenario.EnviarAsync(new AlternarFavoritoSnippetComando(pagos.Id)));
        Assert.Equal(pagos.Id, (await escenario.EnviarAsync(new ListarSnippetsConsulta())).First().Id);

        // Validación y aislamiento.
        await Assert.ThrowsAsync<ExcepcionValidacion>(() => escenario.EnviarAsync(new GuardarSnippetComando(null, "Sin lenguaje válido", "SQL Server!", "x", null, [])));
        Assert.Empty(await escenarioOtro.EnviarAsync(new ListarSnippetsConsulta()));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenarioOtro.EnviarAsync(new ObtenerSnippetConsulta(pagos.Id)));

        await escenario.EnviarAsync(new EliminarSnippetComando(reinicio.Id));
        Assert.Single(await escenario.EnviarAsync(new ListarSnippetsConsulta()));
    }
}
