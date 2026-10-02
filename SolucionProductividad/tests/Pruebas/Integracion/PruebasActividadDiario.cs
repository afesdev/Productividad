using SolucionProductividad.Aplicacion.Caracteristicas.Diario;
using SolucionProductividad.Aplicacion.Caracteristicas.Documentos;
using SolucionProductividad.Aplicacion.Caracteristicas.Proyectos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tiempo;
using SolucionProductividad.Aplicacion.Comun.Excepciones;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasActividadDiario
{
    private readonly BaseDatosPrueba _baseDatos;

    public PruebasActividadDiario(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    [Fact]
    public async Task Actividad_del_dia_y_revision_semanal()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Actividad");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        // Día UTC de hoy (desplazamiento 0) para no depender de la zona de la máquina de pruebas.
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);

        var clave = new string(Guid.NewGuid().ToString("N").Where(char.IsLetter).Take(5).ToArray()).PadRight(4, 'X').ToUpperInvariant();
        var proyectoId = await escenario.EnviarAsync(new CrearProyectoComando("Actividad", clave, null));
        var listaId = (await escenario.EnviarAsync(new ListarListasTareasConsulta(proyectoId))).Single().Id;
        var hechaId = await escenario.EnviarAsync(new CrearTareaComando(listaId, "Configurar CI", null, false, true, null));
        await escenario.EnviarAsync(new CrearTareaComando(listaId, "Documentar API", null, false, true, null));
        await escenario.EnviarAsync(new CambiarEstadoTareaComando(hechaId, EstadoTarea.Completada));

        var ticketId = await escenario.EnviarAsync(new CrearTicketComando("Menú roto", TipoTicket.Ajuste, Prioridad.Alta, "Ana", "ana@empresa.com", null, usuario.Id, NumeroExterno: "1468"));
        await escenario.EnviarAsync(new CambiarEstadoTicketComando(ticketId, EstadoTicket.EnAnalisis, "Revisando"));
        await escenario.EnviarAsync(new CrearDocumentoComando(null, null, "Guía de despliegue", "# Pasos", null));
        var ahora = DateTime.UtcNow;
        await escenario.EnviarAsync(new GuardarRegistroTiempoComando(null, null, ticketId, null, ahora.AddMinutes(-50), ahora.AddMinutes(-20)));
        await escenario.EnviarAsync(new GuardarRegistroTiempoComando(null, null, null, "Daily", ahora.AddMinutes(-15), ahora.AddMinutes(-5)));

        // ---------- Actividad del día ----------
        var actividad = await escenario.EnviarAsync(new ObtenerActividadDiaConsulta(hoy, 0));
        Assert.Equal("Configurar CI", Assert.Single(actividad.TareasCompletadas).Titulo);
        Assert.Equal(2, actividad.TareasCreadas.Count);
        Assert.StartsWith($"{clave}-", actividad.TareasCreadas[0].Clave);
        var ticket = Assert.Single(actividad.Tickets);
        Assert.Equal("1468", ticket.NumeroExterno);
        Assert.Contains(ticket.Eventos, evento => evento.Tipo == TipoEventoTicket.CambioEstado);
        Assert.Contains(ticket.Eventos, evento => evento.Tipo == TipoEventoTicket.TiempoRegistrado);
        Assert.True(Assert.Single(actividad.Documentos).Creado);
        Assert.Equal(40, actividad.MinutosRegistrados);
        Assert.Equal([30, 10], actividad.Tiempo.Select(total => total.Minutos));
        Assert.Equal("Daily", actividad.Tiempo[1].Titulo);

        // Otro día: nada.
        var ayer = await escenario.EnviarAsync(new ObtenerActividadDiaConsulta(hoy.AddDays(-1), 0));
        Assert.Empty(ayer.TareasCompletadas);
        Assert.Empty(ayer.Tickets);
        Assert.Equal(0, ayer.MinutosRegistrados);

        // ---------- Revisión de la semana ----------
        await escenario.EnviarAsync(new CrearEntradaDiarioComando(hoy, TipoEntradaDiario.Decision, "Usar Redis", null, null, null));
        await escenario.EnviarAsync(new CrearEntradaDiarioComando(hoy.AddDays(-2), TipoEntradaDiario.Aprendizaje, "AsNoTracking", null, null, null));
        await escenario.EnviarAsync(new CrearEntradaDiarioComando(hoy, TipoEntradaDiario.Tarea, "Revisar PR", null, null, null));
        await escenario.EnviarAsync(new GuardarNotaDiarioComando(hoy, "Buen día", 4, 2));
        await escenario.EnviarAsync(new GuardarNotaDiarioComando(hoy.AddDays(-2), "Regular", 2, null));

        var revision = await escenario.EnviarAsync(new ObtenerRevisionDiarioConsulta(hoy.AddDays(-6), hoy, 0));
        Assert.Equal(7, revision.Dias.Count);
        Assert.Equal(2, revision.DiasConRegistro);
        Assert.Equal(3m, revision.AnimoPromedio);
        Assert.Equal(2m, revision.EnergiaPromedio);
        Assert.Equal("Usar Redis", Assert.Single(revision.Decisiones).Entrada.Titulo);
        Assert.Single(revision.Aprendizajes);
        Assert.Equal((0, 1), (revision.TareasDiarioCompletadas, revision.TareasDiarioPendientes));
        Assert.Equal(40, revision.MinutosRegistrados);
        Assert.Equal(40, revision.Dias.Single(dia => dia.Fecha == hoy).Minutos);
        Assert.Equal((1, 2, 1), (revision.TareasCompletadas, revision.TareasCreadas, revision.TicketsTrabajados));

        await Assert.ThrowsAsync<ExcepcionValidacion>(() => escenario.EnviarAsync(new ObtenerRevisionDiarioConsulta(hoy.AddDays(-90), hoy, 0)));

        // Privacidad: otro usuario no ve nada de esto.
        var otro = await _baseDatos.CrearUsuarioAsync("Otro actividad");
        using var escenarioOtro = _baseDatos.CrearEscenario(otro);
        var ajena = await escenarioOtro.EnviarAsync(new ObtenerActividadDiaConsulta(hoy, 0));
        Assert.Empty(ajena.TareasCompletadas);
        Assert.Empty(ajena.Tickets);
        Assert.Empty(ajena.Documentos);
        Assert.Equal(0, (await escenarioOtro.EnviarAsync(new ObtenerRevisionDiarioConsulta(hoy.AddDays(-6), hoy, 0))).MinutosRegistrados);
    }
}
