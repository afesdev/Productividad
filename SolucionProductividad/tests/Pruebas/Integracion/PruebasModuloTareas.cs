using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Documentos;
using SolucionProductividad.Aplicacion.Caracteristicas.Proyectos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Consultas;
using SolucionProductividad.Aplicacion.Comun.Excepciones;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasModuloTareas
{
    private readonly BaseDatosPrueba _baseDatos;

    public PruebasModuloTareas(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    private async Task<(EscenarioPrueba Escenario, Usuario Usuario, Guid ProyectoId, Guid ListaId)> PrepararProyectoAsync()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync();
        var escenario = _baseDatos.CrearEscenario(usuario);
        var clave = new string(Guid.NewGuid().ToString("N").Where(char.IsLetter).Take(6).ToArray()).PadRight(4, 'X').ToUpperInvariant();
        var proyectoId = await escenario.EnviarAsync(new CrearProyectoComando("Proyecto de prueba", clave, null));
        var listas = await escenario.EnviarAsync(new ListarListasTareasConsulta(proyectoId));
        return (escenario, usuario, proyectoId, listas.Single().Id);
    }

    private static Task<Guid> CrearTareaAsync(EscenarioPrueba escenario, Guid listaId, string titulo, Guid? tareaPadreId = null) =>
        escenario.EnviarAsync(new CrearTareaComando(listaId, titulo, null, false, true, null, TareaPadreId: tareaPadreId));

    [Fact]
    public async Task Crear_tarea_asigna_consecutivo_y_notifica()
    {
        var (escenario, _, proyectoId, listaId) = await PrepararProyectoAsync();

        var tareaId = await CrearTareaAsync(escenario, listaId, "Configurar CI");
        var detalle = await escenario.EnviarAsync(new ObtenerTareaPorIdConsulta(tareaId));

        Assert.True(detalle.Resumen.NumeroTarea >= 100);
        Assert.Equal(CuadranteEisenhower.Programar, detalle.Resumen.Cuadrante);
        Assert.Equal(proyectoId, detalle.Resumen.ProyectoId);
        Assert.Contains(escenario.Notificador.TareasActualizadas, tarea => tarea.Id == tareaId);
    }

    [Fact]
    public async Task Titulo_vacio_falla_la_validacion()
    {
        var (escenario, _, _, listaId) = await PrepararProyectoAsync();
        var excepcion = await Assert.ThrowsAsync<ExcepcionValidacion>(() => CrearTareaAsync(escenario, listaId, " "));
        Assert.Contains(nameof(CrearTareaComando.Titulo), excepcion.Errores.Keys);
    }

    [Fact]
    public async Task Subtarea_hereda_la_lista_del_padre_y_cuenta_en_el_resumen()
    {
        var (escenario, _, proyectoId, listaId) = await PrepararProyectoAsync();
        var otraListaId = await escenario.EnviarAsync(new CrearListaTareasComando(proyectoId, "Sprint 2", null));
        var padreId = await CrearTareaAsync(escenario, listaId, "Padre");

        // Aunque se indique otra lista, la subtarea queda en la del padre.
        var subtareaId = await escenario.EnviarAsync(new CrearTareaComando(otraListaId, "Hija", null, false, false, null, TareaPadreId: padreId));
        await escenario.EnviarAsync(new CambiarEstadoTareaComando(subtareaId, EstadoTarea.Completada));

        var padre = await escenario.EnviarAsync(new ObtenerTareaPorIdConsulta(padreId));
        Assert.Equal(listaId, padre.Subtareas.Single().ListaTareaId);
        Assert.Equal(1, padre.Resumen.TotalSubtareas);
        Assert.Equal(1, padre.Resumen.SubtareasCompletadas);
    }

    [Fact]
    public async Task Actualizar_tarea_sincroniza_los_backlinks()
    {
        var (escenario, _, _, listaId) = await PrepararProyectoAsync();
        var tituloDocumento = $"Guía {Guid.NewGuid():N}";
        var documentoId = await escenario.EnviarAsync(new CrearDocumentoComando(null, null, tituloDocumento, "contenido", null));
        var tareaId = await CrearTareaAsync(escenario, listaId, "Documentar");

        await escenario.EnviarAsync(new ActualizarTareaComando(tareaId, "Documentar API", $"Ver [[{tituloDocumento}]]", Prioridad.Alta, true, true, null, 2.5m));
        var backlinks = await escenario.EnviarAsync(new ObtenerBacklinksConsulta(TipoEntidad.Documento, documentoId));
        Assert.Contains(backlinks, backlink => backlink.OrigenId == tareaId && backlink.Titulo == "Documentar API");

        await escenario.EnviarAsync(new ActualizarTareaComando(tareaId, "Documentar API", "Sin enlaces", Prioridad.Alta, true, true, null, 2.5m));
        Assert.Empty(await escenario.EnviarAsync(new ObtenerBacklinksConsulta(TipoEntidad.Documento, documentoId)));

        var detalle = await escenario.EnviarAsync(new ObtenerTareaPorIdConsulta(tareaId));
        Assert.Equal(Prioridad.Alta, detalle.Resumen.Prioridad);
        Assert.Equal(CuadranteEisenhower.Hacer, detalle.Resumen.Cuadrante);
        Assert.Equal(2.5m, detalle.HorasEstimadas);
    }

    [Fact]
    public async Task Mover_tarea_cambia_estado_y_posicion()
    {
        var (escenario, _, proyectoId, listaId) = await PrepararProyectoAsync();
        var tareaA = await CrearTareaAsync(escenario, listaId, "A");
        var tareaB = await CrearTareaAsync(escenario, listaId, "B");
        var tareaC = await CrearTareaAsync(escenario, listaId, "C");

        var movida = await escenario.EnviarAsync(new MoverTareaComando(tareaC, listaId, EstadoTarea.EnProgreso, AntesDeTareaId: tareaA));

        Assert.Equal(EstadoTarea.EnProgreso, movida.Estado);
        var orden = (await escenario.EnviarAsync(new ListarTareasProyectoConsulta(proyectoId))).Select(tarea => tarea.Id).ToList();
        Assert.Equal(new[] { tareaC, tareaA, tareaB }, orden);
    }

    [Fact]
    public async Task Mover_tarea_a_otra_lista_arrastra_sus_subtareas()
    {
        var (escenario, _, proyectoId, listaId) = await PrepararProyectoAsync();
        var otraListaId = await escenario.EnviarAsync(new CrearListaTareasComando(proyectoId, "Sprint 2", null));
        var padreId = await CrearTareaAsync(escenario, listaId, "Padre");
        var subtareaId = await CrearTareaAsync(escenario, listaId, "Hija", padreId);

        await escenario.EnviarAsync(new MoverTareaComando(padreId, otraListaId, EstadoTarea.Pendiente, null));

        var subtarea = await escenario.EnviarAsync(new ObtenerTareaPorIdConsulta(subtareaId));
        Assert.Equal(otraListaId, subtarea.Resumen.ListaTareaId);
    }

    [Fact]
    public async Task No_se_puede_mover_a_una_lista_de_otro_proyecto()
    {
        var (escenario, _, _, listaId) = await PrepararProyectoAsync();
        var otroProyectoId = await escenario.EnviarAsync(new CrearProyectoComando("Otro proyecto", "OTRO", null));
        var listaOtroProyectoId = (await escenario.EnviarAsync(new ListarListasTareasConsulta(otroProyectoId))).Single().Id;
        var tareaId = await CrearTareaAsync(escenario, listaId, "Tarea");

        await Assert.ThrowsAsync<ExcepcionDominio>(() => escenario.EnviarAsync(new MoverTareaComando(tareaId, listaOtroProyectoId, EstadoTarea.Pendiente, null)));
    }

    [Fact]
    public async Task Eliminar_tarea_borra_subtareas_adjuntos_y_referencias()
    {
        var (escenario, usuario, _, listaId) = await PrepararProyectoAsync();
        var padreId = await CrearTareaAsync(escenario, listaId, "Padre");
        var subtareaId = await CrearTareaAsync(escenario, listaId, "Hija", padreId);

        await using (var contexto = _baseDatos.CrearContexto())
        {
            contexto.ArchivosAdjuntos.Add(new ArchivoAdjunto
            {
                NombreArchivo = "captura.png", TipoContenido = "image/png", TamanoEnBytes = 10,
                RutaFirebaseStorage = "adjuntos/prueba/captura.png", UrlDescarga = "https://x", TareaId = subtareaId, SubidoPor = usuario.Id
            });
            contexto.RegistrosTiempo.Add(new RegistroTiempo { TareaId = padreId, UsuarioId = usuario.Id, FechaInicio = DateTime.UtcNow.AddHours(-1), FechaFin = DateTime.UtcNow });
            contexto.ReferenciasEntidades.Add(new ReferenciaEntidad { TipoOrigen = TipoEntidad.Documento, OrigenId = Guid.NewGuid(), TipoDestino = TipoEntidad.Tarea, DestinoId = padreId });
            await contexto.SaveChangesAsync();
        }

        await escenario.EnviarAsync(new EliminarTareaComando(padreId));

        await using (var contexto = _baseDatos.CrearContexto())
        {
            Assert.False(await contexto.Tareas.AnyAsync(tarea => tarea.Id == padreId || tarea.Id == subtareaId));
            Assert.False(await contexto.ArchivosAdjuntos.AnyAsync(adjunto => adjunto.TareaId == subtareaId));
            Assert.False(await contexto.RegistrosTiempo.AnyAsync(registro => registro.TareaId == padreId));
            Assert.False(await contexto.ReferenciasEntidades.AnyAsync(referencia => referencia.DestinoId == padreId));
        }
        Assert.Contains("adjuntos/prueba/captura.png", escenario.Almacenamiento.RutasEliminadas);
        Assert.Contains(subtareaId, escenario.Notificador.TareasEliminadas);
    }

    [Fact]
    public async Task Nadie_mas_puede_eliminar_la_tarea_ni_siquiera_un_administrador()
    {
        var (escenario, _, _, listaId) = await PrepararProyectoAsync();
        var tareaId = await CrearTareaAsync(escenario, listaId, "Ajena");

        var otroUsuario = await _baseDatos.CrearUsuarioAsync("Otro");
        using var escenarioOtro = _baseDatos.CrearEscenario(otroUsuario);
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenarioOtro.EnviarAsync(new EliminarTareaComando(tareaId)));

        using var escenarioAdministrador = _baseDatos.CrearEscenario(otroUsuario, esAdministrador: true);
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenarioAdministrador.EnviarAsync(new EliminarTareaComando(tareaId)));

        await escenario.EnviarAsync(new EliminarTareaComando(tareaId));
    }

    [Fact]
    public async Task Carpetas_y_listas_respetan_sus_reglas()
    {
        var (escenario, _, proyectoId, listaId) = await PrepararProyectoAsync();
        var carpetaId = await escenario.EnviarAsync(new CrearCarpetaComando(proyectoId, "Backend", null));
        await escenario.EnviarAsync(new ActualizarListaTareasComando(listaId, "Backlog backend", carpetaId));

        var estructura = await escenario.EnviarAsync(new ObtenerEstructuraProyectoConsulta(proyectoId));
        Assert.Equal("Backlog backend", estructura.Carpetas.Single().Listas.Single().Nombre);

        // Una lista con tareas no se elimina.
        await CrearTareaAsync(escenario, listaId, "Tarea");
        await Assert.ThrowsAsync<ExcepcionConflicto>(() => escenario.EnviarAsync(new EliminarListaTareasComando(listaId)));

        // Al borrar la carpeta, sus listas pasan a la raíz.
        await escenario.EnviarAsync(new EliminarCarpetaComando(carpetaId));
        estructura = await escenario.EnviarAsync(new ObtenerEstructuraProyectoConsulta(proyectoId));
        Assert.Empty(estructura.Carpetas);
        Assert.Equal(1, estructura.ListasSinCarpeta.Single().TotalTareas);
    }
}
