using SolucionProductividad.Aplicacion.Caracteristicas.Boveda;
using SolucionProductividad.Aplicacion.Caracteristicas.Busqueda.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Documentos;
using SolucionProductividad.Aplicacion.Caracteristicas.Proyectos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Consultas;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

/// <summary>Cada usuario ve solo lo suyo; el Administrador tampoco ve datos ajenos.</summary>
[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasAislamientoUsuarios
{
    private readonly BaseDatosPrueba _baseDatos;

    public PruebasAislamientoUsuarios(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    private sealed record DatosUsuario(Guid ProyectoId, Guid ListaId, Guid TareaId, int NumeroTarea, Guid DocumentoId, Guid TicketId, Guid SecretoId, Guid RepositorioId, string Marca);

    private static async Task<DatosUsuario> CrearDatosAsync(EscenarioPrueba escenario)
    {
        var marca = Guid.NewGuid().ToString("N")[..10];
        var proyectoId = await escenario.EnviarAsync(new CrearProyectoComando($"Proyecto {marca}", "PRIV", null));
        var listaId = (await escenario.EnviarAsync(new ListarListasTareasConsulta(proyectoId))).Single().Id;
        var tareaId = await escenario.EnviarAsync(new CrearTareaComando(listaId, $"Tarea {marca}", null, false, true, null));
        var numeroTarea = (await escenario.EnviarAsync(new ObtenerTareaPorIdConsulta(tareaId))).Resumen.NumeroTarea;
        var documentoId = await escenario.EnviarAsync(new CrearDocumentoComando(null, null, $"Documento {marca}", "contenido", null));
        var ticketId = await escenario.EnviarAsync(new CrearTicketComando($"Ticket {marca}", TipoTicket.Ajuste, Prioridad.Media, "Cliente", "c@x.com", null, null));
        var secretoId = await escenario.EnviarAsync(new GuardarSecretoComando(null, EntornoBoveda.Desarrollo, $"CLAVE_{marca}", "valor", null));
        var repositorioId = await escenario.EnviarAsync(new GuardarRepositorioComando(null, "Repo", "empresa", $"repo{marca}", null, "Desarrollo"));
        return new DatosUsuario(proyectoId, listaId, tareaId, numeroTarea, documentoId, ticketId, secretoId, repositorioId, marca);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Otro_usuario_no_ve_ni_modifica_nada_ajeno(bool esAdministrador)
    {
        var duena = await _baseDatos.CrearUsuarioAsync("Dueña");
        using var escenarioDuena = _baseDatos.CrearEscenario(duena);
        var datos = await CrearDatosAsync(escenarioDuena);

        var intruso = await _baseDatos.CrearUsuarioAsync("Intruso");
        using var escenario = _baseDatos.CrearEscenario(intruso, esAdministrador);

        Assert.DoesNotContain(await escenario.EnviarAsync(new ListarProyectosConsulta()), proyecto => proyecto.Id == datos.ProyectoId);
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenario.EnviarAsync(new ObtenerEstructuraProyectoConsulta(datos.ProyectoId)));
        Assert.Empty(await escenario.EnviarAsync(new ListarTareasProyectoConsulta(datos.ProyectoId)));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenario.EnviarAsync(new ObtenerTareaPorIdConsulta(datos.TareaId)));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenario.EnviarAsync(new CrearTareaComando(datos.ListaId, "Intrusa", null, false, false, null)));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenario.EnviarAsync(new ActualizarTareaComando(datos.TareaId, "x", null, Prioridad.Baja, false, false, null, null)));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenario.EnviarAsync(new CrearListaTareasComando(datos.ProyectoId, "Intrusa", null)));

        Assert.DoesNotContain(await escenario.EnviarAsync(new ListarDocumentosConsulta()), documento => documento.Id == datos.DocumentoId);
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenario.EnviarAsync(new ObtenerDocumentoPorIdConsulta(datos.DocumentoId)));

        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(datos.TicketId)));
        Assert.DoesNotContain(await escenario.EnviarAsync(new ListarTicketsConsulta(VistaTickets.Todos)), ticket => ticket.Id == datos.TicketId);

        Assert.DoesNotContain(await escenario.EnviarAsync(new ListarSecretosConsulta(null, null)), secreto => secreto.Id == datos.SecretoId);
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenario.EnviarAsync(new RevelarSecretoConsulta(datos.SecretoId)));

        Assert.DoesNotContain(await escenario.EnviarAsync(new ListarRepositoriosConsulta(true)), repositorio => repositorio.Id == datos.RepositorioId);

        // La búsqueda (Dapper, fuera de los filtros de EF) tampoco filtra datos ajenos.
        Assert.Empty(await escenario.EnviarAsync(new BuscarGlobalConsulta(datos.Marca)));
    }

    [Fact]
    public async Task Cada_usuario_puede_usar_la_misma_clave_de_proyecto_y_sus_wikilinks_no_cruzan()
    {
        var usuarioA = await _baseDatos.CrearUsuarioAsync("A");
        using var escenarioA = _baseDatos.CrearEscenario(usuarioA);
        var datosA = await CrearDatosAsync(escenarioA);

        var usuarioB = await _baseDatos.CrearUsuarioAsync("B");
        using var escenarioB = _baseDatos.CrearEscenario(usuarioB);
        var datosB = await CrearDatosAsync(escenarioB);
        Assert.NotEqual(datosA.ProyectoId, datosB.ProyectoId);

        // B enlaza la tarea de A por número: no debe resolverse ni aparecer como backlink para A.
        var documentoB = await escenarioB.EnviarAsync(new CrearDocumentoComando(null, null, $"Notas {datosB.Marca}", $"Ver [[#{datosA.NumeroTarea}]]", null));
        Assert.Empty(await escenarioA.EnviarAsync(new ObtenerBacklinksConsulta(TipoEntidad.Tarea, datosA.TareaId)));
        Assert.NotEqual(Guid.Empty, documentoB);
    }

    [Fact]
    public async Task Asignar_un_ticket_lo_comparte_con_el_responsable()
    {
        var creadora = await _baseDatos.CrearUsuarioAsync("Creadora");
        var responsable = await _baseDatos.CrearUsuarioAsync("Responsable");
        using var escenarioCreadora = _baseDatos.CrearEscenario(creadora);
        using var escenarioResponsable = _baseDatos.CrearEscenario(responsable);

        var ticketId = await escenarioCreadora.EnviarAsync(new CrearTicketComando("Compartido", TipoTicket.Soporte, Prioridad.Baja, "Cliente", "c@x.com", null, null));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenarioResponsable.EnviarAsync(new ObtenerTicketDetalleConsulta(ticketId)));

        await escenarioCreadora.EnviarAsync(new AsignarTicketComando(ticketId, responsable.Id));
        var detalle = await escenarioResponsable.EnviarAsync(new ObtenerTicketDetalleConsulta(ticketId));
        Assert.Equal(EstadoTicket.Asignado, detalle.Resumen.Estado);
    }
}
