using SolucionProductividad.Aplicacion.Caracteristicas.Busqueda.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Documentos;
using SolucionProductividad.Aplicacion.Caracteristicas.Etiquetas;
using SolucionProductividad.Aplicacion.Caracteristicas.Proyectos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Consultas;
using SolucionProductividad.Aplicacion.Comun.Excepciones;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

/// <summary>Etiquetas en tickets y tareas, con el mismo catálogo que los documentos.</summary>
[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasEtiquetasTicketsTareas
{
    private readonly BaseDatosPrueba _baseDatos;

    public PruebasEtiquetasTicketsTareas(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    [Fact]
    public async Task Tickets_con_etiquetas_se_filtran_y_se_buscan_con_almohadilla()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Etiquetador tickets");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        var marca = Guid.NewGuid().ToString("N")[..6];
        var urgente = await escenario.EnviarAsync(new GuardarEtiquetaDocumentoComando(null, $"urgente{marca}", "rojo"));
        var cliente = await escenario.EnviarAsync(new GuardarEtiquetaDocumentoComando(null, $"cliente{marca}", "azul"));

        var conEtiquetas = await escenario.EnviarAsync(new CrearTicketComando("Menú roto", TipoTicket.Ajuste, Prioridad.Alta, "Ana", "ana@empresa.com", null, usuario.Id));
        var sinEtiquetas = await escenario.EnviarAsync(new CrearTicketComando("Lentitud", TipoTicket.Incidencia, Prioridad.Media, "Luis", "luis@empresa.com", null, usuario.Id));

        var asignadas = await escenario.EnviarAsync(new AsignarEtiquetasTicketComando(conEtiquetas, [urgente, cliente]));
        Assert.Equal([$"cliente{marca}", $"urgente{marca}"], asignadas.Select(etiqueta => etiqueta.Nombre)); // ordenadas

        // Las etiquetas viajan en el resumen y en el detalle.
        var lista = await escenario.EnviarAsync(new ListarTicketsConsulta(VistaTickets.Todos));
        Assert.Equal(2, lista.Single(ticket => ticket.Id == conEtiquetas).Etiquetas.Count);
        Assert.Empty(lista.Single(ticket => ticket.Id == sinEtiquetas).Etiquetas);
        Assert.Equal(2, (await escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(conEtiquetas))).Resumen.Etiquetas.Count);

        // Filtro por etiqueta en la lista.
        Assert.Equal([conEtiquetas], (await escenario.EnviarAsync(new ListarTicketsConsulta(VistaTickets.Todos, EtiquetaId: urgente))).Select(ticket => ticket.Id));

        // Ctrl+K: "#etiqueta".
        var busqueda = await escenario.EnviarAsync(new BuscarGlobalConsulta($"#urgente{marca}"));
        Assert.Contains(busqueda, resultado => resultado.Tipo == TipoEntidad.Ticket && resultado.Id == conEtiquetas);
        Assert.DoesNotContain(busqueda, resultado => resultado.Id == sinEtiquetas);

        // Reemplazar: quitar una deja la otra; borrar la etiqueta del catálogo la quita de los tickets.
        await escenario.EnviarAsync(new AsignarEtiquetasTicketComando(conEtiquetas, [cliente]));
        await escenario.EnviarAsync(new EliminarEtiquetaDocumentoComando(cliente));
        Assert.Empty((await escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(conEtiquetas))).Resumen.Etiquetas);
    }

    [Fact]
    public async Task Tareas_con_etiquetas_en_el_tablero_y_en_la_busqueda()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Etiquetador tareas");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        var marca = Guid.NewGuid().ToString("N")[..6];
        var etiqueta = await escenario.EnviarAsync(new GuardarEtiquetaDocumentoComando(null, $"backend{marca}", "violeta"));

        var clave = new string(Guid.NewGuid().ToString("N").Where(char.IsLetter).Take(5).ToArray()).PadRight(4, 'X').ToUpperInvariant();
        var proyectoId = await escenario.EnviarAsync(new CrearProyectoComando("Etiquetas", clave, null));
        var listaId = (await escenario.EnviarAsync(new ListarListasTareasConsulta(proyectoId))).Single().Id;
        var tareaId = await escenario.EnviarAsync(new CrearTareaComando(listaId, "Optimizar consultas", null, false, false, null));

        var resumen = await escenario.EnviarAsync(new AsignarEtiquetasTareaComando(tareaId, [etiqueta]));
        Assert.Equal($"backend{marca}", Assert.Single(resumen.Etiquetas).Nombre);
        // Se notifica al tablero en tiempo real con las etiquetas ya puestas.
        Assert.Contains(escenario.Notificador.TareasActualizadas, tarea => tarea.Id == tareaId && tarea.Etiquetas.Count == 1);

        var tablero = await escenario.EnviarAsync(new ListarTareasProyectoConsulta(proyectoId));
        Assert.Single(tablero.Single(tarea => tarea.Id == tareaId).Etiquetas);
        Assert.Single((await escenario.EnviarAsync(new ObtenerTareaPorIdConsulta(tareaId))).Resumen.Etiquetas);

        var busqueda = await escenario.EnviarAsync(new BuscarGlobalConsulta($"#backend{marca}"));
        Assert.Contains(busqueda, resultado => resultado.Tipo == TipoEntidad.Tarea && resultado.Id == tareaId);

        await escenario.EnviarAsync(new AsignarEtiquetasTareaComando(tareaId, []));
        Assert.Empty((await escenario.EnviarAsync(new ObtenerTareaPorIdConsulta(tareaId))).Resumen.Etiquetas);
    }

    [Fact]
    public async Task No_se_pueden_usar_etiquetas_de_otro_usuario()
    {
        var duena = await _baseDatos.CrearUsuarioAsync("Dueña etiqueta");
        var otro = await _baseDatos.CrearUsuarioAsync("Otro etiquetas");
        using var escenarioDuena = _baseDatos.CrearEscenario(duena);
        using var escenarioOtro = _baseDatos.CrearEscenario(otro);
        var ajena = await escenarioDuena.EnviarAsync(new GuardarEtiquetaDocumentoComando(null, "privada" + Guid.NewGuid().ToString("N")[..6], "gris"));
        var ticket = await escenarioOtro.EnviarAsync(new CrearTicketComando("Propio", TipoTicket.Ajuste, Prioridad.Baja, "Eva", "eva@empresa.com", null, otro.Id));

        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenarioOtro.EnviarAsync(new AsignarEtiquetasTicketComando(ticket, [ajena])));
        await Assert.ThrowsAsync<ExcepcionValidacion>(() =>
            escenarioOtro.EnviarAsync(new AsignarEtiquetasTicketComando(ticket, Enumerable.Range(0, 21).Select(_ => Guid.NewGuid()).ToList())));
    }
}
