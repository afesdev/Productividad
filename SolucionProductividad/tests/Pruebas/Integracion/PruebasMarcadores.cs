using SolucionProductividad.Aplicacion.Caracteristicas.Diario;
using SolucionProductividad.Aplicacion.Caracteristicas.Documentos;
using SolucionProductividad.Aplicacion.Caracteristicas.Marcadores;
using SolucionProductividad.Aplicacion.Caracteristicas.Proyectos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Comandos;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasMarcadores
{
    private readonly BaseDatosPrueba _baseDatos;

    public PruebasMarcadores(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    [Fact]
    public async Task Marcar_tareas_tickets_documentos_y_dias()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Marcador");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        var clave = new string(Guid.NewGuid().ToString("N").Where(char.IsLetter).Take(5).ToArray()).PadRight(4, 'X').ToUpperInvariant();
        var proyectoId = await escenario.EnviarAsync(new CrearProyectoComando("Marcas", clave, null));
        var listaId = (await escenario.EnviarAsync(new ListarListasTareasConsulta(proyectoId))).Single().Id;
        var tareaId = await escenario.EnviarAsync(new CrearTareaComando(listaId, "Configurar CI", null, false, true, null));
        var ticketId = await escenario.EnviarAsync(new CrearTicketComando("Menú roto", TipoTicket.Ajuste, Prioridad.Media, "Ana", "ana@empresa.com", null, null));
        var documentoId = await escenario.EnviarAsync(new CrearDocumentoComando(null, null, "Guía", "", "📘"));
        var fecha = new DateOnly(2026, 9, 24);
        var registroId = await escenario.EnviarAsync(new GuardarNotaDiarioComando(fecha, "Día clave", null, null));

        Assert.True(await escenario.EnviarAsync(new AlternarMarcadorComando(TipoEntidad.Tarea, tareaId)));
        Assert.True(await escenario.EnviarAsync(new AlternarMarcadorComando(TipoEntidad.Ticket, ticketId)));
        Assert.True(await escenario.EnviarAsync(new AlternarMarcadorComando(TipoEntidad.RegistroDiario, registroId)));
        // Los documentos favoritos son marcadores: aparecen en la misma lista.
        await escenario.EnviarAsync(new MarcarFavoritoDocumentoComando(documentoId, true));

        var marcadores = await escenario.EnviarAsync(new ListarMarcadoresConsulta());
        Assert.Equal([TipoEntidad.Tarea, TipoEntidad.Ticket, TipoEntidad.RegistroDiario, TipoEntidad.Documento], marcadores.Select(marcador => marcador.TipoEntidad));
        Assert.StartsWith($"{clave}-", marcadores[0].Referencia);
        Assert.StartsWith("TCK-", marcadores[1].Referencia);
        Assert.Equal("2026-09-24", marcadores[2].Referencia);
        Assert.Equal("📘", marcadores[3].Referencia);

        // El título se lee de la entidad: renombrar la tarea se refleja.
        await escenario.EnviarAsync(new ActualizarTareaComando(tareaId, "Configurar CI/CD", null, Prioridad.Media, false, true, null, null));
        Assert.Equal("Configurar CI/CD", (await escenario.EnviarAsync(new ListarMarcadoresConsulta()))[0].Titulo);

        // Alternar de nuevo desmarca.
        Assert.False(await escenario.EnviarAsync(new AlternarMarcadorComando(TipoEntidad.Ticket, ticketId)));
        Assert.DoesNotContain(await escenario.EnviarAsync(new ListarMarcadoresConsulta()), marcador => marcador.TipoEntidad == TipoEntidad.Ticket);

        // No se puede marcar lo que no existe ni lo de otro usuario; y cada uno ve solo los suyos.
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenario.EnviarAsync(new AlternarMarcadorComando(TipoEntidad.Tarea, Guid.NewGuid())));
        var otro = await _baseDatos.CrearUsuarioAsync("Otro marcador");
        using var escenarioOtro = _baseDatos.CrearEscenario(otro);
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenarioOtro.EnviarAsync(new AlternarMarcadorComando(TipoEntidad.Tarea, tareaId)));
        Assert.Empty(await escenarioOtro.EnviarAsync(new ListarMarcadoresConsulta()));

        // Borrar la tarea elimina su marcador.
        await escenario.EnviarAsync(new EliminarTareaComando(tareaId));
        Assert.DoesNotContain(await escenario.EnviarAsync(new ListarMarcadoresConsulta()), marcador => marcador.EntidadId == tareaId);
    }
}
