using SolucionProductividad.Aplicacion.Caracteristicas.Preferencias;
using SolucionProductividad.Aplicacion.Caracteristicas.Proyectos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Consultas;
using SolucionProductividad.Aplicacion.Comun.Excepciones;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

/// <summary>Lo que necesita la página de Inicio: preferencias guardadas en el servidor y tareas por vencer de todos los proyectos.</summary>
[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasInicio
{
    private readonly BaseDatosPrueba _baseDatos;

    public PruebasInicio(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    [Fact]
    public async Task Las_preferencias_se_guardan_por_usuario_y_se_reemplazan()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Con preferencias");
        var otro = await _baseDatos.CrearUsuarioAsync("Sin preferencias");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        using var escenarioOtro = _baseDatos.CrearEscenario(otro);

        Assert.Null(await escenario.EnviarAsync(new ObtenerPreferenciaConsulta("inicio.widgets")));

        await escenario.EnviarAsync(new GuardarPreferenciaComando("inicio.widgets", """{"widgets":[{"id":"agenda","ancho":2}]}"""));
        await escenario.EnviarAsync(new GuardarPreferenciaComando("inicio.widgets", """{"widgets":[{"id":"tickets","ancho":1}]}"""));
        Assert.Contains("tickets", await escenario.EnviarAsync(new ObtenerPreferenciaConsulta("inicio.widgets")));

        // Cada usuario ve solo las suyas.
        Assert.Null(await escenarioOtro.EnviarAsync(new ObtenerPreferenciaConsulta("inicio.widgets")));

        await Assert.ThrowsAsync<ExcepcionValidacion>(() => escenario.EnviarAsync(new GuardarPreferenciaComando("inicio.widgets", "{no es json")));
        await Assert.ThrowsAsync<ExcepcionValidacion>(() => escenario.EnviarAsync(new GuardarPreferenciaComando("../Clave Rara", "{}")));
    }

    [Fact]
    public async Task La_agenda_trae_tareas_abiertas_vencidas_y_proximas_de_todos_los_proyectos()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Con agenda");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        var ahora = DateTime.UtcNow;

        async Task<Guid> ListaDeProyectoNuevo(string nombre)
        {
            var clave = new string(Guid.NewGuid().ToString("N").Where(char.IsLetter).Take(5).ToArray()).PadRight(4, 'X').ToUpperInvariant();
            var proyectoId = await escenario.EnviarAsync(new CrearProyectoComando(nombre, clave, null));
            return (await escenario.EnviarAsync(new ListarListasTareasConsulta(proyectoId))).Single().Id;
        }

        var listaA = await ListaDeProyectoNuevo("Web");
        var listaB = await ListaDeProyectoNuevo("Móvil");
        await escenario.EnviarAsync(new CrearTareaComando(listaA, "Vencida", null, false, false, ahora.AddDays(-2)));
        await escenario.EnviarAsync(new CrearTareaComando(listaB, "Vence pronto", null, false, false, ahora.AddDays(3)));
        await escenario.EnviarAsync(new CrearTareaComando(listaA, "Vence en un mes", null, false, false, ahora.AddDays(30)));
        await escenario.EnviarAsync(new CrearTareaComando(listaB, "Sin fecha", null, false, false, null));
        var hecha = await escenario.EnviarAsync(new CrearTareaComando(listaA, "Hecha y vencida", null, false, false, ahora.AddDays(-1)));
        await escenario.EnviarAsync(new CambiarEstadoTareaComando(hecha, EstadoTarea.Completada));

        var agenda = await escenario.EnviarAsync(new ObtenerAgendaTareasConsulta(7));

        Assert.Equal(["Vencida", "Vence pronto"], agenda.Select(tarea => tarea.Titulo));
        Assert.Equal("Móvil", agenda[1].NombreProyecto);
        Assert.Matches("^[A-Z]+-\\d+$", agenda[0].Clave);
    }
}
