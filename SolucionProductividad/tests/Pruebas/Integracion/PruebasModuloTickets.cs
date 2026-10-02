using SolucionProductividad.Aplicacion.Caracteristicas.Tickets;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Dominio.ObjetosValor;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

public class PruebasMaquinaEstadosTicket
{
    [Fact]
    public void Un_ajuste_no_puede_cerrarse_sin_pasar_por_desarrollo()
    {
        Assert.DoesNotContain(EstadoTicket.Cerrado, MaquinaEstadosTicket.ObtenerSiguientes(EstadoTicket.EnAnalisis, TipoTicket.Ajuste));
        Assert.Contains(EstadoTicket.Cerrado, MaquinaEstadosTicket.ObtenerSiguientes(EstadoTicket.EnAnalisis, TipoTicket.Auditoria));
    }

    [Fact]
    public void No_se_salta_de_pruebas_a_produccion()
    {
        var ticket = new Ticket { Estado = EstadoTicket.EnPruebas, Tipo = TipoTicket.Ajuste };
        Assert.Throws<ExcepcionDominio>(() => ticket.CambiarEstado(EstadoTicket.EnProduccion, DateTime.UtcNow));
    }

    [Fact]
    public void Cerrar_registra_resolucion_y_reabrir_la_limpia()
    {
        var ticket = new Ticket { Estado = EstadoTicket.EnProduccion, Tipo = TipoTicket.Ajuste };
        ticket.CambiarEstado(EstadoTicket.Cerrado, DateTime.UtcNow);
        Assert.NotNull(ticket.FechaCierre);

        ticket.CambiarEstado(EstadoTicket.EnAnalisis, DateTime.UtcNow);
        Assert.Null(ticket.FechaCierre);
        Assert.Null(ticket.FechaResolucion);
    }
}

public class PruebasConvencionRamas
{
    private static Ticket CrearTicket(string? numeroExterno) =>
        new() { NumeroTicket = 1042, NumeroExterno = numeroExterno, Tipo = TipoTicket.Ajuste, Asunto = "Ajuste menú en dispositivos" };

    [Fact]
    public void Sugiere_el_nombre_con_la_convencion_del_equipo()
    {
        Assert.Equal("Ajuste/AndresEspitia-Ticket1468-AjusteMenuEnDispositivos", ConvencionRamas.Sugerir(CrearTicket("1468"), "Andrés Espitia"));
        // Sin Nº externo se usa la clave interna.
        Assert.Equal("Ajuste/AndresEspitia-TCK1042-AjusteMenuEnDispositivos", ConvencionRamas.Sugerir(CrearTicket(null), "Andrés Espitia"));
    }

    [Theory]
    [InlineData("Andrés Espitia", "AndresEspitia")]
    [InlineData("Andrés Espitia Gómez", "AndresEspitia")]
    [InlineData("Andrés Felipe Espitia Gómez", "AndresEspitia")]
    [InlineData("Íñigo", "Inigo")]
    public void Nombre_corto_del_desarrollador(string nombreCompleto, string esperado) =>
        Assert.Equal(esperado, ConvencionRamas.NombreCorto(nombreCompleto));

    [Theory]
    [InlineData("Ajuste/AndresEspitia-Ticket1468-AjusteMenuEnDispositivos", true)]
    [InlineData("ajuste/otro-ticket-1468-algo", true)]
    [InlineData("Ajuste/Ana-Ticket01468-Algo", true)]
    [InlineData("Ajuste/Ana-TCK1042-Algo", true)]
    [InlineData("Ajuste/Ana-Ticket14680-Algo", false)]
    [InlineData("Ajuste/Ana-Ticket146-Algo", false)]
    [InlineData("Ajuste/Ana-1468-Algo", false)]
    public void Detecta_la_rama_por_el_numero_externo_sin_confundir_numeros(string rama, bool esperado) =>
        Assert.Equal(esperado, ConvencionRamas.Coincide(rama, CrearTicket("1468")));

    [Theory]
    [InlineData("1468", "1468")]
    [InlineData("INC-55821", "55821")]
    [InlineData("  0077 ", "77")]
    [InlineData("SIN-NUMERO", null)]
    public void Numero_para_rama(string numeroExterno, string? esperado) =>
        Assert.Equal(esperado, ConvencionRamas.NumeroParaRama(numeroExterno));
}

[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasModuloTickets
{
    private readonly BaseDatosPrueba _baseDatos;

    public PruebasModuloTickets(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    [Fact]
    public async Task Grafo_del_repositorio_filtra_ramas_antiguas_y_enlaza_tickets()
    {
        var agente = await _baseDatos.CrearUsuarioAsync("Grafo");
        using var escenario = _baseDatos.CrearEscenario(agente);
        var repositorioId = await escenario.EnviarAsync(new GuardarRepositorioComando(null, "Web", "empresa", $"web{Guid.NewGuid():N}"[..20], null, "Desarrollo"));
        var ticketId = await escenario.EnviarAsync(new CrearTicketComando("Ajuste menú", TipoTicket.Ajuste, Prioridad.Media, "Ana", "ana@empresa.com", null, agente.Id,
            NumeroExterno: "Ticket1468"));
        escenario.GitHub.Ramas["Ajuste/Ana-Ticket1468-Menu"] = "c3";
        await escenario.EnviarAsync(new VincularRamaTicketComando(ticketId, repositorioId, "Ajuste/Ana-Ticket1468-Menu"));

        var ahora = DateTime.UtcNow;
        CommitGrafoGitHub Commit(string sha, int diasAtras, params string[] padres) => new(sha, $"commit {sha}", "Dev", ahora.AddDays(-diasAtras), $"https://github.com/x/{sha}", padres);
        escenario.GitHub.Grafo = new GrafoGitHub(
            [
                new RamaGrafoGitHub("main", "m2", ahora.AddDays(-1)),
                new RamaGrafoGitHub("Desarrollo", "d1", ahora.AddDays(-2)),
                new RamaGrafoGitHub("Ajuste/Ana-Ticket1468-Menu", "c3", ahora.AddDays(-3)),
                new RamaGrafoGitHub("Vieja/Abandonada", "v1", ahora.AddDays(-90)),
            ],
            [
                Commit("m2", 1, "m1", "c3"), // merge de la rama del ticket
                Commit("c3", 3, "m1"),
                Commit("d1", 2, "m1"),
                Commit("m1", 10, "fuera-del-historial"),
                Commit("v1", 90, "v0"),
                Commit("v0", 95),
            ]);

        var grafo = await escenario.EnviarAsync(new ObtenerGrafoRepositorioConsulta(repositorioId));

        Assert.Equal(["main", "Desarrollo", "Ajuste/Ana-Ticket1468-Menu"], grafo.Ramas.Select(rama => rama.Nombre));
        Assert.True(grafo.Ramas[0].EsPrincipal);
        Assert.True(grafo.Ramas[1].EsDesarrollo);
        var ramaTicket = grafo.Ramas[2];
        Assert.Equal(ticketId, ramaTicket.TicketId);
        Assert.Equal("Ticket1468", ramaTicket.ClaveTicket);
        // Los commits de la rama antigua no se dibujan; el padre fuera del historial se conserva como referencia.
        Assert.Equal(["m2", "c3", "d1", "m1"], grafo.Commits.Select(commit => commit.Sha));
        Assert.Equal(["m1", "c3"], grafo.Commits[0].Padres);

        // Detalle de un commit al hacer clic: mensaje completo, totales y archivos con su parche.
        var detalle = await escenario.EnviarAsync(new ObtenerCommitRepositorioConsulta(repositorioId, "abc1234"));
        Assert.Contains("Redondea a 2 decimales.", detalle.Mensaje);
        Assert.Equal(2, detalle.Archivos.Count);
        Assert.Contains(detalle.Archivos, archivo => archivo.Parche is not null && archivo.Parche.Contains("Math.Round"));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenario.EnviarAsync(new ObtenerCommitRepositorioConsulta(repositorioId, "fff9999")));
        await Assert.ThrowsAsync<Aplicacion.Comun.Excepciones.ExcepcionValidacion>(() => escenario.EnviarAsync(new ObtenerCommitRepositorioConsulta(repositorioId, "../../x")));

        var otro = await _baseDatos.CrearUsuarioAsync("Ajeno");
        using var escenarioAjeno = _baseDatos.CrearEscenario(otro);
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenarioAjeno.EnviarAsync(new ObtenerGrafoRepositorioConsulta(repositorioId)));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenarioAjeno.EnviarAsync(new ObtenerCommitRepositorioConsulta(repositorioId, "abc1234")));
    }

    [Fact]
    public async Task Flujo_completo_de_un_ajuste_con_github()
    {
        var agente = await _baseDatos.CrearUsuarioAsync("Agente");
        using var escenario = _baseDatos.CrearEscenario(agente);

        var repositorioId = await escenario.EnviarAsync(new GuardarRepositorioComando(null, "API", "empresa", $"api{Guid.NewGuid():N}"[..20], null, "Desarrollo"));
        var ticketId = await escenario.EnviarAsync(new CrearTicketComando("Corregir cálculo de IVA", TipoTicket.Ajuste, Prioridad.Alta,
            "Cliente", "cliente@empresa.com", "El IVA sale mal", agente.Id, FechaVencimiento: DateTime.UtcNow.AddDays(3)));

        var detalle = await escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(ticketId));
        Assert.Equal(EstadoTicket.Asignado, detalle.Resumen.Estado);
        Assert.NotNull(detalle.Resumen.FechaLimiteResolucion);
        Assert.Equal(EstadoSla.EnTiempo, detalle.Resumen.EstadoSla);

        await escenario.EnviarAsync(new CambiarEstadoTicketComando(ticketId, EstadoTicket.EnAnalisis, "Revisando"));

        // La rama se crea fuera de la app (solo lectura); sin Nº externo, la detección usa la clave interna.
        var clave = $"TCK-{detalle.Resumen.NumeroTicket}";
        var deteccion = await escenario.EnviarAsync(new DetectarRamasTicketConsulta(ticketId));
        Assert.Equal($"Ajuste/Agente-TCK{detalle.Resumen.NumeroTicket}-CorregirCalculoDeIVA", deteccion.NombreSugerido);
        Assert.Equal([clave], deteccion.Claves);
        Assert.Empty(deteccion.Ramas);

        escenario.GitHub.Ramas[deteccion.NombreSugerido] = "sha-rama";
        escenario.GitHub.Ramas[$"Ajuste/Otro-{clave}0-OtroTicket"] = "sha-otro"; // TCK-n0 no debe confundirse con TCK-n.
        deteccion = await escenario.EnviarAsync(new DetectarRamasTicketConsulta(ticketId));
        var detectada = Assert.Single(deteccion.Ramas);
        Assert.Equal(deteccion.NombreSugerido, detectada.NombreRama);

        // No se puede vincular una rama que no existe en GitHub.
        await Assert.ThrowsAsync<ExcepcionDominio>(() => escenario.EnviarAsync(new VincularRamaTicketComando(ticketId, repositorioId, "no/existe")));

        // Vincular la rama inicia el desarrollo y deja de aparecer como detectada.
        var ramaId = await escenario.EnviarAsync(new VincularRamaTicketComando(ticketId, detectada.RepositorioId, detectada.NombreRama));
        detalle = await escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(ticketId));
        Assert.Equal(EstadoTicket.EnDesarrollo, detalle.Resumen.Estado);
        Assert.Empty((await escenario.EnviarAsync(new DetectarRamasTicketConsulta(ticketId))).Ramas);

        // Sin despliegue registrado no se puede pasar a pruebas manualmente.
        await Assert.ThrowsAsync<ExcepcionDominio>(() => escenario.EnviarAsync(new CambiarEstadoTicketComando(ticketId, EstadoTicket.EnPruebas, null)));

        // El PR se abre fuera de la app; sincronizar lo detecta, lleva a revisión y trae archivos y commits.
        escenario.GitHub.PullRequests[deteccion.NombreSugerido] = new PullRequestGitHub(7, "Corrige IVA", "https://github.com/empresa/api/pull/7", EstadoPullRequest.Abierto, null, "Desarrollo");
        await escenario.EnviarAsync(new SincronizarRamaTicketComando(ramaId));
        detalle = await escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(ticketId));
        var rama = detalle.Ramas.Single();
        Assert.Equal(EstadoTicket.EnRevision, detalle.Resumen.Estado);
        Assert.Equal(EstadoPullRequest.Abierto, rama.PullRequestEstado);
        Assert.Equal(2, rama.Archivos.Count);
        Assert.Equal(37, rama.LineasAgregadas);
        Assert.Single(rama.Commits);

        // La diferencia queda guardada por archivo y solo la ve quien ve el ticket.
        var archivoConCambios = rama.Archivos.Single(archivo => archivo.TieneParche);
        var diferencia = await escenario.EnviarAsync(new ObtenerDiferenciaArchivoConsulta(archivoConCambios.Id));
        Assert.Contains("+    var iva = Math.Round", diferencia.Parche);
        var ajeno = await _baseDatos.CrearUsuarioAsync("Ajeno");
        using var escenarioAjeno = _baseDatos.CrearEscenario(ajeno);
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenarioAjeno.EnviarAsync(new ObtenerDiferenciaArchivoConsulta(archivoConCambios.Id)));

        // Fusionado el PR, main...rama queda vacío: los cambios se toman del PR y no se pierden.
        escenario.GitHub.PullRequests[deteccion.NombreSugerido] = new PullRequestGitHub(7, "Corrige IVA", "https://github.com/empresa/api/pull/7", EstadoPullRequest.Fusionado, DateTime.UtcNow, "main");
        await escenario.EnviarAsync(new SincronizarRamaTicketComando(ramaId));
        rama = (await escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(ticketId))).Ramas.Single();
        Assert.Equal(EstadoPullRequest.Fusionado, rama.PullRequestEstado);
        Assert.Equal(2, rama.Archivos.Count);
        Assert.Equal(37, rama.LineasAgregadas);
        Assert.Single(rama.Commits);

        // Despliegue en Desarrollo → pruebas → devuelto → otra vuelta → aprobado → producción → cerrado.
        await escenario.EnviarAsync(new RegistrarDespliegueTicketComando(ticketId, AmbienteDespliegue.Desarrollo, "v1.2.0-rc1", null));
        await Assert.ThrowsAsync<Aplicacion.Comun.Excepciones.ExcepcionValidacion>(() => escenario.EnviarAsync(new RegistrarResultadoPruebasComando(ticketId, false, null)));
        await escenario.EnviarAsync(new RegistrarResultadoPruebasComando(ticketId, false, "El redondeo sigue mal"));
        await escenario.EnviarAsync(new CambiarEstadoTicketComando(ticketId, EstadoTicket.EnDesarrollo, null));
        await escenario.EnviarAsync(new CambiarEstadoTicketComando(ticketId, EstadoTicket.EnRevision, null));
        await escenario.EnviarAsync(new RegistrarDespliegueTicketComando(ticketId, AmbienteDespliegue.Desarrollo, "v1.2.0-rc2", null));
        await escenario.EnviarAsync(new RegistrarResultadoPruebasComando(ticketId, true, "OK"));
        await escenario.EnviarAsync(new RegistrarDespliegueTicketComando(ticketId, AmbienteDespliegue.Produccion, "v1.2.0", null));
        await escenario.EnviarAsync(new CambiarEstadoTicketComando(ticketId, EstadoTicket.Cerrado, null));

        detalle = await escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(ticketId));
        Assert.Equal(EstadoTicket.Cerrado, detalle.Resumen.Estado);
        Assert.Equal(EstadoSla.Cumplido, detalle.Resumen.EstadoSla);
        Assert.Empty(detalle.TransicionesPermitidas.Where(estado => estado != EstadoTicket.EnAnalisis));
        Assert.Equal(3, detalle.Despliegues.Count);
        Assert.Contains(detalle.Despliegues, despliegue => despliegue.Resultado == ResultadoDespliegue.Rechazado && despliegue.NotasResultado == "El redondeo sigue mal");

        // El historial cuenta la historia completa (más reciente primero).
        var estadosRecorridos = detalle.Eventos.Where(evento => evento.EstadoNuevo is not null).Select(evento => evento.EstadoNuevo!.Value).Reverse().ToList();
        Assert.Equal(
            new[]
            {
                EstadoTicket.Nuevo, EstadoTicket.Asignado, EstadoTicket.EnAnalisis, EstadoTicket.EnDesarrollo, EstadoTicket.EnRevision,
                EstadoTicket.EnPruebas, EstadoTicket.Devuelto, EstadoTicket.EnDesarrollo, EstadoTicket.EnRevision, EstadoTicket.EnPruebas,
                EstadoTicket.Aprobado, EstadoTicket.EnProduccion, EstadoTicket.Cerrado
            },
            estadosRecorridos);
    }

    [Fact]
    public async Task Campos_externos_y_fecha_de_vencimiento_que_reemplaza_al_sla()
    {
        var agente = await _baseDatos.CrearUsuarioAsync("Agente campos");
        using var escenario = _baseDatos.CrearEscenario(agente);
        var externo = $"INC-{Guid.NewGuid():N}"[..20];
        var vence = DateTime.UtcNow.Date.AddDays(10).AddHours(23);

        var ticketId = await escenario.EnviarAsync(new CrearTicketComando("Reporte lento", TipoTicket.Soporte, Prioridad.Media, "Ana", "ana@empresa.com", null, null,
            NumeroExterno: $"  {externo}  ", IdSeguimiento: "REQ-77", HorasDedicadas: 1.5m, FechaVencimiento: vence));

        var detalle = await escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(ticketId));
        Assert.Equal(externo, detalle.Resumen.NumeroExterno);
        Assert.Equal("REQ-77", detalle.IdSeguimiento);
        Assert.Equal(1.5m, detalle.HorasDedicadas);
        Assert.Equal(vence, detalle.Resumen.FechaLimiteResolucion);

        // Se encuentra buscando por el número externo.
        Assert.Equal(ticketId, (await escenario.EnviarAsync(new ListarTicketsConsulta(VistaTickets.Todos, externo))).Single().Id);

        // Sin fecha de vencimiento el ticket no vence, aunque cambie la prioridad.
        await escenario.EnviarAsync(new ActualizarTicketComando(ticketId, "Reporte lento", TipoTicket.Soporte, Prioridad.Alta, "Ana", "ana@empresa.com", null,
            externo, "REQ-77", 3m, null));
        detalle = await escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(ticketId));
        Assert.Null(detalle.FechaVencimiento);
        Assert.Equal(3m, detalle.HorasDedicadas);
        Assert.Null(detalle.Resumen.FechaLimiteResolucion);
        Assert.Equal(EstadoSla.SinSla, detalle.Resumen.EstadoSla);

        // Con vencimiento, un cambio de prioridad no lo pisa.
        await escenario.EnviarAsync(new ActualizarTicketComando(ticketId, "Reporte lento", TipoTicket.Soporte, Prioridad.Urgente, "Ana", "ana@empresa.com", null,
            externo, "REQ-77", 3m, vence));
        detalle = await escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(ticketId));
        Assert.Equal(vence, detalle.Resumen.FechaLimiteResolucion);

        await Assert.ThrowsAsync<Aplicacion.Comun.Excepciones.ExcepcionValidacion>(() => escenario.EnviarAsync(new ActualizarTicketComando(ticketId, "Reporte lento",
            TipoTicket.Soporte, Prioridad.Urgente, "Ana", "ana@empresa.com", null, externo, "REQ-77", -1m, vence)));
    }

    [Fact]
    public async Task Proyectos_como_categorias_de_tickets_y_sus_repositorios()
    {
        var agente = await _baseDatos.CrearUsuarioAsync("Agente proyectos");
        using var escenario = _baseDatos.CrearEscenario(agente);
        var sufijo = Guid.NewGuid().ToString("N")[..8];

        var portalId = await escenario.EnviarAsync(new GuardarProyectoSoporteComando(null, $"Portal {sufijo}", "Portal de clientes", "azul"));
        var apiId = await escenario.EnviarAsync(new GuardarProyectoSoporteComando(null, $"API {sufijo}", null, "verde"));
        await Assert.ThrowsAsync<ExcepcionConflicto>(() => escenario.EnviarAsync(new GuardarProyectoSoporteComando(null, $"Portal {sufijo}", null, "rosa")));
        await Assert.ThrowsAsync<Aplicacion.Comun.Excepciones.ExcepcionValidacion>(() => escenario.EnviarAsync(new GuardarProyectoSoporteComando(null, "Otro", null, "#ff0000")));

        // Un repositorio pertenece a un proyecto.
        var repositorioId = await escenario.EnviarAsync(new GuardarRepositorioComando(null, "Web", "empresa", $"web{sufijo}", null, "Desarrollo", ProyectoSoporteId: portalId));

        // Un ticket que hay que ajustar en dos proyectos.
        var ticketId = await escenario.EnviarAsync(new CrearTicketComando("Menú roto en móviles", TipoTicket.Ajuste, Prioridad.Media, "Ana", "ana@empresa.com", null, null,
            NumeroExterno: "1468", ProyectoIds: [portalId, apiId]));
        var detalle = await escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(ticketId));
        Assert.Equal([$"API {sufijo}", $"Portal {sufijo}"], detalle.Resumen.Proyectos.Select(proyecto => proyecto.Nombre));

        // Filtro del listado por proyecto.
        Assert.Contains(await escenario.EnviarAsync(new ListarTicketsConsulta(VistaTickets.Todos, ProyectoId: apiId)), ticket => ticket.Id == ticketId);

        // Las ramas del repositorio de un proyecto del ticket se marcan y van primero.
        escenario.GitHub.Ramas["Ajuste/AgenteProyectos-Ticket1468-MenuRoto"] = "sha";
        var detectada = (await escenario.EnviarAsync(new DetectarRamasTicketConsulta(ticketId))).Ramas.First();
        Assert.Equal(repositorioId, detectada.RepositorioId);
        Assert.True(detectada.EsDeProyectoDelTicket);
        Assert.Equal($"Portal {sufijo}", detectada.NombreProyecto);

        // Editar deja solo los proyectos indicados y lo anota en el historial.
        await escenario.EnviarAsync(new ActualizarTicketComando(ticketId, "Menú roto en móviles", TipoTicket.Ajuste, Prioridad.Media, "Ana", "ana@empresa.com", null,
            "1468", null, null, null, [apiId]));
        detalle = await escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(ticketId));
        Assert.Equal(apiId, Assert.Single(detalle.Resumen.Proyectos).Id);
        Assert.Contains(detalle.Eventos, evento => evento.Descripcion.Contains($"proyectos: API {sufijo}"));

        // Proyecto ajeno: no se puede asignar.
        var otro = await _baseDatos.CrearUsuarioAsync("Otro");
        using var escenarioOtro = _baseDatos.CrearEscenario(otro);
        var ajenoId = await escenarioOtro.EnviarAsync(new GuardarProyectoSoporteComando(null, $"Ajeno {sufijo}", null, "gris"));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenario.EnviarAsync(new ActualizarTicketComando(ticketId, "Menú roto en móviles",
            TipoTicket.Ajuste, Prioridad.Media, "Ana", "ana@empresa.com", null, "1468", null, null, null, [apiId, ajenoId])));

        // Conteos del catálogo y borrado: el ticket y el repositorio quedan, sin el proyecto.
        var catalogo = await escenario.EnviarAsync(new ListarProyectosSoporteConsulta());
        Assert.Equal(1, catalogo.Single(proyecto => proyecto.Id == apiId).TicketsAbiertos);
        Assert.Equal("Web", Assert.Single(catalogo.Single(proyecto => proyecto.Id == portalId).Repositorios).Nombre);
        await escenario.EnviarAsync(new EliminarProyectoSoporteComando(apiId));
        await escenario.EnviarAsync(new EliminarProyectoSoporteComando(portalId));
        Assert.Empty((await escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(ticketId))).Resumen.Proyectos);
        Assert.Null((await escenario.EnviarAsync(new ListarRepositoriosConsulta())).Single(repositorio => repositorio.Id == repositorioId).ProyectoSoporteId);
    }

    [Fact]
    public async Task Listado_y_conteos_por_vista()
    {
        var agente = await _baseDatos.CrearUsuarioAsync("Agente listado");
        using var escenario = _baseDatos.CrearEscenario(agente);
        var asunto = $"Auditoría {Guid.NewGuid():N}";
        var ticketId = await escenario.EnviarAsync(new CrearTicketComando(asunto, TipoTicket.Auditoria, Prioridad.Baja, "Auditor", "a@b.com", null, null));

        var sinAsignar = await escenario.EnviarAsync(new ListarTicketsConsulta(VistaTickets.SinAsignar, asunto));
        Assert.Equal(ticketId, sinAsignar.Single().Id);

        await escenario.EnviarAsync(new AsignarTicketComando(ticketId, agente.Id));
        var mios = await escenario.EnviarAsync(new ListarTicketsConsulta(VistaTickets.MisAbiertos, asunto));
        Assert.Equal("Agente listado", mios.Single().NombreAgente);

        // Una auditoría puede cerrarse directamente tras el análisis.
        await escenario.EnviarAsync(new CambiarEstadoTicketComando(ticketId, EstadoTicket.EnAnalisis, null));
        await escenario.EnviarAsync(new CambiarEstadoTicketComando(ticketId, EstadoTicket.Cerrado, "Sin hallazgos"));
        Assert.Single(await escenario.EnviarAsync(new ListarTicketsConsulta(VistaTickets.Cerrados, asunto)));

        var conteos = await escenario.EnviarAsync(new ObtenerConteoTicketsConsulta());
        Assert.Equal(0, conteos.MisAbiertos);
    }
}
