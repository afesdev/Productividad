using SolucionProductividad.Aplicacion.Caracteristicas.Busqueda.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Flujos;
using SolucionProductividad.Aplicacion.Comun.Excepciones;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasModuloFlujos
{
    private const string Contenido = """
        {"version":1,"nodos":[
          {"id":"n1","tipo":"usuario","titulo":"Pulsa Generar","x":0,"y":0},
          {"id":"n2","tipo":"sp","titulo":"Consulta registros","tecnico":"sp_GenerarCertificado","descripcion":"Filtra por rango","x":0,"y":100}
        ],"conexiones":[{"id":"c1","origen":"n1","destino":"n2","etiqueta":null}]}
        """;

    private readonly BaseDatosPrueba _baseDatos;

    public PruebasModuloFlujos(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    [Fact]
    public async Task Crear_guardar_buscar_duplicar_y_eliminar()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Diagramador");
        using var escenario = _baseDatos.CrearEscenario(usuario);

        var id = await escenario.EnviarAsync(new CrearFlujoComando("Certificado de consultas", " Cremil ", null));
        var nuevo = await escenario.EnviarAsync(new ObtenerFlujoConsulta(id));
        Assert.Equal("Cremil", nuevo.Sistema);
        Assert.Contains("\"nodos\":[]", nuevo.ContenidoJson);

        await escenario.EnviarAsync(new GuardarContenidoFlujoComando(id, Contenido));
        var lista = await escenario.EnviarAsync(new ListarFlujosConsulta());
        Assert.Equal(2, lista.Single(flujo => flujo.Id == id).Pasos);

        // La búsqueda llega al detalle técnico de los pasos.
        Assert.Single(await escenario.EnviarAsync(new ListarFlujosConsulta("sp_GenerarCertificado")));
        Assert.Empty(await escenario.EnviarAsync(new ListarFlujosConsulta("sp_Inexistente")));
        Assert.Equal(["Cremil"], await escenario.EnviarAsync(new ListarSistemasFlujoConsulta()));

        // Búsqueda global (paleta y [[enlaces]]): la referencia "Flujo: Título" es el destino del enlace.
        var global = Assert.Single(await escenario.EnviarAsync(new BuscarGlobalConsulta("sp_GenerarCertificado")), resultado => resultado.Tipo == TipoEntidad.Flujo);
        Assert.Equal("Flujo: Certificado de consultas", global.Referencia);
        Assert.Equal(id, global.Id);

        await escenario.EnviarAsync(new ActualizarDatosFlujoComando(id, "Certificado de integración", "", "Desde la vista de consultas"));
        var actualizado = await escenario.EnviarAsync(new ObtenerFlujoConsulta(id));
        Assert.Null(actualizado.Sistema);
        Assert.Equal("Desde la vista de consultas", actualizado.Descripcion);

        var copiaId = await escenario.EnviarAsync(new DuplicarFlujoComando(id));
        var copia = await escenario.EnviarAsync(new ObtenerFlujoConsulta(copiaId));
        Assert.Equal("Certificado de integración (copia)", copia.Titulo);
        Assert.Equal(actualizado.ContenidoJson, copia.ContenidoJson);
        Assert.Equal(2, (await escenario.EnviarAsync(new ListarFlujosConsulta("sp_GenerarCertificado"))).Count);

        await escenario.EnviarAsync(new EliminarFlujoComando(id));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenario.EnviarAsync(new ObtenerFlujoConsulta(id)));
    }

    [Fact]
    public async Task Rechaza_contenido_invalido_y_aisla_por_usuario()
    {
        var duena = await _baseDatos.CrearUsuarioAsync("Dueña flujos");
        var otro = await _baseDatos.CrearUsuarioAsync("Ajeno flujos");
        using var escenarioDuena = _baseDatos.CrearEscenario(duena);
        using var escenarioOtro = _baseDatos.CrearEscenario(otro);
        var id = await escenarioDuena.EnviarAsync(new CrearFlujoComando("Privado", null, null));

        await Assert.ThrowsAsync<ExcepcionDominio>(() => escenarioDuena.EnviarAsync(new GuardarContenidoFlujoComando(id, "{no es json")));
        await Assert.ThrowsAsync<ExcepcionValidacion>(() => escenarioDuena.EnviarAsync(new CrearFlujoComando("", null, null)));

        Assert.Empty(await escenarioOtro.EnviarAsync(new ListarFlujosConsulta()));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenarioOtro.EnviarAsync(new ObtenerFlujoConsulta(id)));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenarioOtro.EnviarAsync(new GuardarContenidoFlujoComando(id, Contenido)));
    }
}
