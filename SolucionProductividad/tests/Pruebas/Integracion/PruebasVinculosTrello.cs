using SolucionProductividad.Aplicacion.Caracteristicas.Proyectos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Trello;
using SolucionProductividad.Aplicacion.Comun.Excepciones;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

/// <summary>Fase 2 de Trello: vincular tarjetas a tareas/tickets e importarlas como tareas (Trello simulado, BD real).</summary>
[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasVinculosTrello
{
    private const string Token = "ATTAabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123";

    private readonly BaseDatosPrueba _baseDatos;

    public PruebasVinculosTrello(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    private static async Task<Guid> ListaDeProyectoNuevoAsync(EscenarioPrueba escenario)
    {
        var clave = new string(Guid.NewGuid().ToString("N").Where(char.IsLetter).Take(5).ToArray()).PadRight(4, 'X').ToUpperInvariant();
        var proyectoId = await escenario.EnviarAsync(new CrearProyectoComando("Con Trello", clave, null));
        return (await escenario.EnviarAsync(new ListarListasTareasConsulta(proyectoId))).Single().Id;
    }

    [Fact]
    public async Task Una_tarjeta_se_vincula_por_enlace_una_sola_vez_y_solo_la_ve_su_usuario()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Con Trello");
        var otro = await _baseDatos.CrearUsuarioAsync("Sin Trello");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        using var escenarioOtro = _baseDatos.CrearEscenario(otro);

        var lista = await ListaDeProyectoNuevoAsync(escenario);
        var tareaId = await escenario.EnviarAsync(new CrearTareaComando(lista, "Tarea con tarjeta", null, false, false, null));

        // Sin conexión no se puede vincular.
        await Assert.ThrowsAsync<ExcepcionConflicto>(() => escenario.EnviarAsync(new VincularTarjetaTrelloComando($"https://trello.com/c/{TrelloFalso.EnlaceCorto}/12-revisar", tareaId, null)));

        await escenario.EnviarAsync(new ConectarTrelloComando(Token));
        var vinculo = await escenario.EnviarAsync(new VincularTarjetaTrelloComando($"https://trello.com/c/{TrelloFalso.EnlaceCorto}/12-revisar", tareaId, null));

        // El enlace corto se guarda como id largo, con la clave y el título de la tarea.
        Assert.Equal(TrelloFalso.IdTarjeta, vinculo.IdTarjeta);
        Assert.Equal("Soporte", vinculo.NombreTablero);
        Assert.Matches("^[A-Z]+-\\d+$", vinculo.ClaveDestino);
        Assert.Equal("Tarea con tarjeta", vinculo.TituloDestino);

        await Assert.ThrowsAsync<ExcepcionConflicto>(() => escenario.EnviarAsync(new VincularTarjetaTrelloComando(TrelloFalso.IdTarjeta, tareaId, null)));
        await Assert.ThrowsAsync<ExcepcionValidacion>(() => escenario.EnviarAsync(new VincularTarjetaTrelloComando("no es una tarjeta", tareaId, null)));
        await Assert.ThrowsAsync<ExcepcionValidacion>(() => escenario.EnviarAsync(new VincularTarjetaTrelloComando(TrelloFalso.IdTarjeta, null, null)));

        Assert.Single(await escenario.EnviarAsync(new ListarVinculosTrelloConsulta(null, null, TrelloFalso.IdTarjeta)));
        Assert.Empty(await escenarioOtro.EnviarAsync(new ListarVinculosTrelloConsulta(null, null, TrelloFalso.IdTarjeta)));

        await escenario.EnviarAsync(new DesvincularTarjetaTrelloComando(vinculo.Id));
        Assert.Empty(await escenario.EnviarAsync(new ListarVinculosTrelloConsulta(tareaId, null, null)));
    }

    [Fact]
    public async Task Importar_una_tarjeta_crea_la_tarea_con_checklist_y_vencimiento_y_la_deja_vinculada()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Importa de Trello");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        await escenario.EnviarAsync(new ConectarTrelloComando(Token));
        var lista = await ListaDeProyectoNuevoAsync(escenario);

        var tareaId = await escenario.EnviarAsync(new ImportarTarjetaTrelloComando(TrelloFalso.EnlaceCorto, lista));

        var tarea = await escenario.EnviarAsync(new ObtenerTareaPorIdConsulta(tareaId));
        Assert.Equal("Revisar [SLA] de soporte", tarea.Resumen.Titulo);
        Assert.Equal(TrelloFalso.Vencimiento, tarea.Resumen.FechaVencimiento);
        Assert.Contains("**primera respuesta**", tarea.DescripcionMarkdown);
        Assert.Contains("- [x] Exportar datos", tarea.DescripcionMarkdown);
        Assert.Contains("- [ ] Comparar con el SLA", tarea.DescripcionMarkdown);
        Assert.Contains($"[Revisar \\[SLA\\] de soporte](https://trello.com/c/{TrelloFalso.EnlaceCorto})", tarea.DescripcionMarkdown);

        var vinculo = Assert.Single(await escenario.EnviarAsync(new ListarVinculosTrelloConsulta(tareaId, null, null)));
        Assert.Equal(TrelloFalso.IdTarjeta, vinculo.IdTarjeta);
    }
}
