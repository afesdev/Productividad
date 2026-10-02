using SolucionProductividad.Aplicacion.Caracteristicas.Diario;
using SolucionProductividad.Aplicacion.Caracteristicas.Proyectos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Consultas;
using SolucionProductividad.Aplicacion.Comun.Excepciones;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasDiarioConversionYRango
{
    private readonly BaseDatosPrueba _baseDatos;

    public PruebasDiarioConversionYRango(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    [Fact]
    public async Task Convertir_entrada_en_tarea_y_consultar_rango()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Conversor");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        var clave = new string(Guid.NewGuid().ToString("N").Where(char.IsLetter).Take(5).ToArray()).PadRight(4, 'X').ToUpperInvariant();
        var proyectoId = await escenario.EnviarAsync(new CrearProyectoComando("Diario", clave, null));
        var listaId = (await escenario.EnviarAsync(new ListarListasTareasConsulta(proyectoId))).Single().Id;
        var fecha = new DateOnly(2026, 9, 21);

        var entradaId = await escenario.EnviarAsync(new CrearEntradaDiarioComando(fecha, TipoEntradaDiario.Bloqueo, "Pedir acceso a producción", "Hablar con infraestructura", null, null));
        var hechaId = await escenario.EnviarAsync(new CrearEntradaDiarioComando(fecha, TipoEntradaDiario.Tarea, "Revisar PR", null, null, null, Completada: true));

        // Convertir: crea la tarea con el detalle como descripción y deja el vínculo.
        var tareaId = await escenario.EnviarAsync(new ConvertirEntradaEnTareaComando(entradaId, listaId, null, true, true));
        var tarea = await escenario.EnviarAsync(new ObtenerTareaPorIdConsulta(tareaId));
        Assert.Equal("Pedir acceso a producción", tarea.Resumen.Titulo);
        Assert.Equal("Hablar con infraestructura", tarea.DescripcionMarkdown);
        var dia = await escenario.EnviarAsync(new ObtenerDiaDiarioConsulta(fecha));
        var convertida = dia.Entradas.Single(entrada => entrada.Id == entradaId);
        Assert.Equal(tareaId, convertida.TareaId);
        Assert.StartsWith($"{clave}-", convertida.ClaveTarea);

        // Una entrada de tarea ya completada crea la tarea completada; no se convierte dos veces.
        var tareaHechaId = await escenario.EnviarAsync(new ConvertirEntradaEnTareaComando(hechaId, listaId, "Revisar PR del portal", false, true));
        Assert.Equal(EstadoTarea.Completada, (await escenario.EnviarAsync(new ObtenerTareaPorIdConsulta(tareaHechaId))).Resumen.Estado);
        await Assert.ThrowsAsync<ExcepcionConflicto>(() => escenario.EnviarAsync(new ConvertirEntradaEnTareaComando(hechaId, listaId, null, false, true)));

        // Borrar la tarea deja la entrada sin vínculo (y se puede volver a convertir).
        await escenario.EnviarAsync(new EliminarTareaComando(tareaId));
        Assert.Null((await escenario.EnviarAsync(new ObtenerDiaDiarioConsulta(fecha))).Entradas.Single(entrada => entrada.Id == entradaId).TareaId);

        // Otro usuario no puede convertir entradas ajenas.
        var otro = await _baseDatos.CrearUsuarioAsync("Otro conversor");
        using var escenarioOtro = _baseDatos.CrearEscenario(otro);
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenarioOtro.EnviarAsync(new ConvertirEntradaEnTareaComando(entradaId, listaId, null, false, true)));

        // Rango (vista semanal / exportación): solo días con registro, con sus entradas.
        await escenario.EnviarAsync(new GuardarNotaDiarioComando(fecha.AddDays(2), "## Notas\nDía tranquilo", 3, 3));
        var semana = await escenario.EnviarAsync(new ObtenerRangoDiarioConsulta(fecha, fecha.AddDays(6)));
        Assert.Equal([fecha, fecha.AddDays(2)], semana.Select(registro => registro.Fecha));
        Assert.Equal(2, semana[0].Entradas.Count);
        Assert.Contains("Día tranquilo", semana[1].ContenidoMarkdown);
        await Assert.ThrowsAsync<ExcepcionValidacion>(() => escenario.EnviarAsync(new ObtenerRangoDiarioConsulta(fecha, fecha.AddDays(100))));
        Assert.Empty(await escenarioOtro.EnviarAsync(new ObtenerRangoDiarioConsulta(fecha, fecha.AddDays(6))));
    }
}
