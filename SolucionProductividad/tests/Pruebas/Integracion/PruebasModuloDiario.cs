using SolucionProductividad.Aplicacion.Caracteristicas.Diario;
using SolucionProductividad.Aplicacion.Comun.Excepciones;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasModuloDiario
{
    private readonly BaseDatosPrueba _baseDatos;

    public PruebasModuloDiario(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    [Fact]
    public async Task Nota_del_dia_entradas_calendario_y_explorar()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Diarista");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        var hoy = new DateOnly(2026, 9, 24);

        // Un día sin nada escrito no crea registro.
        var vacio = await escenario.EnviarAsync(new ObtenerDiaDiarioConsulta(hoy));
        Assert.Null(vacio.RegistroId);
        Assert.Empty(vacio.Entradas);

        // La primera entrada crea el registro del día.
        var decisionId = await escenario.EnviarAsync(new CrearEntradaDiarioComando(hoy, TipoEntradaDiario.Decision, "Usar Redis para la caché", "Menos latencia que SQL", null, null));
        await escenario.EnviarAsync(new CrearEntradaDiarioComando(hoy, TipoEntradaDiario.Evento, "Daily", null, new TimeOnly(9, 30), new TimeOnly(9, 45)));
        await escenario.EnviarAsync(new CrearEntradaDiarioComando(hoy, TipoEntradaDiario.Aprendizaje, "AsNoTracking en consultas grandes", null, null, null));
        var tareaId = await escenario.EnviarAsync(new CrearEntradaDiarioComando(hoy, TipoEntradaDiario.Tarea, "Revisar PR", null, null, null));

        // La nota se guarda en el mismo registro, con ánimo y energía.
        await escenario.EnviarAsync(new GuardarNotaDiarioComando(hoy, "## Intención\nCerrar el ticket de IVA", 4, 3));
        var dia = await escenario.EnviarAsync(new ObtenerDiaDiarioConsulta(hoy));
        Assert.NotNull(dia.RegistroId);
        Assert.Equal((byte)4, dia.Animo);
        Assert.Contains("Cerrar el ticket", dia.ContenidoMarkdown);
        // Primero las entradas con hora, luego el resto por orden de creación.
        Assert.Equal(["Daily", "Usar Redis para la caché", "AsNoTracking en consultas grandes", "Revisar PR"], dia.Entradas.Select(entrada => entrada.Titulo));

        // Completar la tarea del día; en otros tipos "completada" no aplica.
        await escenario.EnviarAsync(new ActualizarEntradaDiarioComando(tareaId, TipoEntradaDiario.Tarea, "Revisar PR", null, null, null, true));
        await escenario.EnviarAsync(new ActualizarEntradaDiarioComando(decisionId, TipoEntradaDiario.Decision, "Usar Redis para la caché de sesiones", "Menos latencia", null, null, true));
        dia = await escenario.EnviarAsync(new ObtenerDiaDiarioConsulta(hoy));
        Assert.True(dia.Entradas.Single(entrada => entrada.Id == tareaId).Completada);
        Assert.False(dia.Entradas.Single(entrada => entrada.Id == decisionId).Completada);

        // Horario inválido.
        await Assert.ThrowsAsync<ExcepcionValidacion>(() =>
            escenario.EnviarAsync(new CrearEntradaDiarioComando(hoy, TipoEntradaDiario.Evento, "Al revés", null, new TimeOnly(11, 0), new TimeOnly(10, 0))));
        await Assert.ThrowsAsync<ExcepcionValidacion>(() => escenario.EnviarAsync(new GuardarNotaDiarioComando(hoy, "x", 9, null)));

        // Calendario del mes.
        await escenario.EnviarAsync(new CrearEntradaDiarioComando(hoy.AddDays(1), TipoEntradaDiario.Bloqueo, "Sin acceso a producción", null, null, null));
        var mes = await escenario.EnviarAsync(new ObtenerMesDiarioConsulta(2026, 9));
        var resumenHoy = mes.Single(resumen => resumen.Fecha == hoy);
        Assert.True(resumenHoy.TieneNota);
        Assert.Equal((1, 1, 1, 0), (resumenHoy.Decisiones, resumenHoy.Aprendizajes, resumenHoy.Eventos, resumenHoy.TareasPendientes));
        Assert.Equal(1, mes.Single(resumen => resumen.Fecha == hoy.AddDays(1)).Bloqueos);
        Assert.Empty(await escenario.EnviarAsync(new ObtenerMesDiarioConsulta(2026, 10)));

        // Explorar: todas las decisiones, o por texto.
        var decisiones = await escenario.EnviarAsync(new ExplorarEntradasDiarioConsulta(TipoEntradaDiario.Decision, null, null, null));
        Assert.Equal(hoy, Assert.Single(decisiones).Fecha);
        Assert.Single(await escenario.EnviarAsync(new ExplorarEntradasDiarioConsulta(null, "producción", null, null)));
        Assert.Empty(await escenario.EnviarAsync(new ExplorarEntradasDiarioConsulta(null, null, hoy.AddDays(2), null)));

        // Resolver la fecha de un registro (enlaces desde búsqueda y backlinks).
        Assert.Equal(hoy, await escenario.EnviarAsync(new ObtenerFechaRegistroDiarioConsulta(dia.RegistroId!.Value)));

        // Eliminar entrada.
        await escenario.EnviarAsync(new EliminarEntradaDiarioComando(tareaId));
        Assert.Equal(3, (await escenario.EnviarAsync(new ObtenerDiaDiarioConsulta(hoy))).Entradas.Count);
    }

    [Fact]
    public async Task El_diario_es_privado()
    {
        var duenio = await _baseDatos.CrearUsuarioAsync("Dueño diario");
        using var escenario = _baseDatos.CrearEscenario(duenio);
        var fecha = new DateOnly(2026, 9, 20);
        var entradaId = await escenario.EnviarAsync(new CrearEntradaDiarioComando(fecha, TipoEntradaDiario.Nota, "Privado", null, null, null));
        var registroId = (await escenario.EnviarAsync(new ObtenerDiaDiarioConsulta(fecha))).RegistroId!.Value;

        var otro = await _baseDatos.CrearUsuarioAsync("Curioso");
        using var escenarioOtro = _baseDatos.CrearEscenario(otro);
        Assert.Null((await escenarioOtro.EnviarAsync(new ObtenerDiaDiarioConsulta(fecha))).RegistroId);
        Assert.Empty(await escenarioOtro.EnviarAsync(new ObtenerMesDiarioConsulta(2026, 9)));
        Assert.Empty(await escenarioOtro.EnviarAsync(new ExplorarEntradasDiarioConsulta(null, "Privado", null, null)));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenarioOtro.EnviarAsync(new ObtenerFechaRegistroDiarioConsulta(registroId)));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenarioOtro.EnviarAsync(new EliminarEntradaDiarioComando(entradaId)));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() =>
            escenarioOtro.EnviarAsync(new ActualizarEntradaDiarioComando(entradaId, TipoEntradaDiario.Nota, "Hackeado", null, null, null, false)));

        // El mismo día, el otro usuario tiene su propio registro.
        await escenarioOtro.EnviarAsync(new GuardarNotaDiarioComando(fecha, "Mi día", null, null));
        Assert.Equal("Privado", Assert.Single((await escenario.EnviarAsync(new ObtenerDiaDiarioConsulta(fecha))).Entradas).Titulo);
    }
}
