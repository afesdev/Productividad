using ClosedXML.Excel;
using SolucionProductividad.Aplicacion.Caracteristicas.Diario;
using SolucionProductividad.Aplicacion.Caracteristicas.Proyectos;
using SolucionProductividad.Aplicacion.Caracteristicas.Reporte;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasReporteActividades
{
    private readonly BaseDatosPrueba _baseDatos;

    public PruebasReporteActividades(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    [Fact]
    public async Task Las_entradas_con_hora_forman_el_reporte_con_horas_estado_y_tablero()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Reportero");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        var dia = new DateOnly(2026, 10, 1);

        var tableroId = await escenario.EnviarAsync(new GuardarTableroReporteComando(null, "Sygnus Cremil", null, false));
        var conTablero = await escenario.EnviarAsync(new CrearEntradaDiarioComando(dia, TipoEntradaDiario.Evento, "Finalización de los web config", null, new TimeOnly(10, 0), new TimeOnly(11, 30), TableroReporteId: tableroId));
        var tareaPendiente = await escenario.EnviarAsync(new CrearEntradaDiarioComando(dia, TipoEntradaDiario.Tarea, "Pruebas de integración", null, new TimeOnly(14, 0), null));
        await escenario.EnviarAsync(new CrearEntradaDiarioComando(dia, TipoEntradaDiario.Nota, "Sin hora: no entra", null, null, null));
        await escenario.EnviarAsync(new CrearEntradaDiarioComando(dia.AddDays(5), TipoEntradaDiario.Evento, "Fuera del rango", null, new TimeOnly(8, 0), new TimeOnly(9, 0)));

        var filas = await escenario.EnviarAsync(new ObtenerReporteActividadesConsulta(dia, dia, SoloPendientes: false));

        Assert.Equal(2, filas.Count);
        var primera = filas[0];
        Assert.Equal(conTablero, primera.EntradaId);
        Assert.Equal(1.5m, primera.Horas);
        Assert.Equal("Sygnus Cremil", primera.NombreTablero);
        Assert.False(primera.TableroSugerido);
        Assert.Equal(EstadoActividadReporte.Terminada, primera.Estado);
        Assert.Equal(dia, primera.FechaSolicitud);

        var segunda = filas[1];
        Assert.Equal(tareaPendiente, segunda.EntradaId);
        Assert.Null(segunda.Horas); // falta hora de fin
        Assert.Equal(EstadoActividadReporte.EnProceso, segunda.Estado); // tarea no completada
        Assert.Null(segunda.TableroReporteId);
    }

    [Fact]
    public async Task Editar_la_fila_guarda_en_el_diario_y_sincroniza_la_tarea()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Editor de reporte");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        var dia = new DateOnly(2026, 10, 2);
        var tableroId = await escenario.EnviarAsync(new GuardarTableroReporteComando(null, "Interno", null, false));
        var entradaId = await escenario.EnviarAsync(new CrearEntradaDiarioComando(dia, TipoEntradaDiario.Tarea, "Revisar", null, new TimeOnly(9, 0), null));

        var fila = await escenario.EnviarAsync(new ActualizarFilaReporteComando(
            entradaId, "Revisión de PR del módulo de pagos", new TimeOnly(9, 0), new TimeOnly(13, 0), tableroId, new DateOnly(2026, 9, 30), EstadoActividadReporte.Terminada));

        Assert.Equal(4m, fila.Horas);
        Assert.Equal("Interno", fila.NombreTablero);
        Assert.Equal(new DateOnly(2026, 9, 30), fila.FechaSolicitud);
        Assert.True(fila.FechaSolicitudPersonalizada);

        var diaDiario = await escenario.EnviarAsync(new ObtenerDiaDiarioConsulta(dia));
        var entrada = diaDiario.Entradas.Single();
        Assert.Equal("Revisión de PR del módulo de pagos", entrada.Titulo);
        Assert.True(entrada.Completada); // Terminada en el reporte = casilla marcada en el diario
        Assert.Equal(tableroId, entrada.TableroReporteId);
    }

    [Fact]
    public async Task Marcar_reportadas_las_saca_de_pendientes_y_el_excel_tiene_las_columnas_de_la_empresa()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Exportador");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        var dia = new DateOnly(2026, 10, 5);
        var tableroId = await escenario.EnviarAsync(new GuardarTableroReporteComando(null, "Sygnus Cremil", null, false));
        var primera = await escenario.EnviarAsync(new CrearEntradaDiarioComando(dia, TipoEntradaDiario.Evento, "**Web** config", null, new TimeOnly(10, 0), new TimeOnly(14, 0), TableroReporteId: tableroId));
        var segunda = await escenario.EnviarAsync(new CrearEntradaDiarioComando(dia, TipoEntradaDiario.Evento, "Daily", null, new TimeOnly(8, 0), new TimeOnly(8, 15)));

        var archivo = await escenario.EnviarAsync(new ExportarReporteExcelConsulta([primera, segunda], "Andres Felipe Espitia"));
        Assert.Equal("Actividades 2026-10-05.xlsx", archivo.NombreArchivo);
        using (var libro = new XLWorkbook(new MemoryStream(archivo.Contenido)))
        {
            var hoja = libro.Worksheet(1);
            Assert.Equal("FECHA DE SOLICITUD", hoja.Cell(1, 1).GetString());
            Assert.Equal("HORAS DE TRABAJO EJECUTADAS", hoja.Cell(1, 11).GetString());
            // En el orden recibido, no por hora.
            Assert.Equal("Web config", hoja.Cell(2, 6).GetString());
            Assert.Equal(new DateTime(2026, 10, 5), hoja.Cell(2, 2).GetDateTime());
            Assert.Equal("Sygnus Cremil", hoja.Cell(2, 7).GetString());
            Assert.Equal("Andres Felipe Espitia", hoja.Cell(2, 8).GetString());
            Assert.Equal("Terminada", hoja.Cell(2, 9).GetString());
            Assert.True(hoja.Cell(2, 10).IsEmpty());
            Assert.Equal(4d, hoja.Cell(2, 11).GetDouble());
            Assert.Equal(0.25d, hoja.Cell(3, 11).GetDouble());
        }

        Assert.Equal(1, await escenario.EnviarAsync(new MarcarActividadesReportadasComando([primera], true)));
        var pendientes = await escenario.EnviarAsync(new ObtenerReporteActividadesConsulta(dia, dia, SoloPendientes: true));
        Assert.Equal([segunda], pendientes.Select(fila => fila.EntradaId));
        var todas = await escenario.EnviarAsync(new ObtenerReporteActividadesConsulta(dia, dia, SoloPendientes: false));
        Assert.NotNull(todas.Single(fila => fila.EntradaId == primera).FechaReportado);

        await escenario.EnviarAsync(new MarcarActividadesReportadasComando([primera], false));
        Assert.Equal(2, (await escenario.EnviarAsync(new ObtenerReporteActividadesConsulta(dia, dia, SoloPendientes: true))).Count);
    }

    [Fact]
    public async Task El_tablero_asociado_al_proyecto_se_sugiere_y_no_se_puede_borrar_si_tiene_actividades()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Sugerencias");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        var dia = new DateOnly(2026, 10, 6);
        var clave = new string(Guid.NewGuid().ToString("N").Where(char.IsLetter).Take(5).ToArray()).PadRight(4, 'X').ToUpperInvariant();
        var proyectoId = await escenario.EnviarAsync(new CrearProyectoComando("Cremil", clave, null));
        var tableroId = await escenario.EnviarAsync(new GuardarTableroReporteComando(null, "Sygnus Cremil", proyectoId, false));
        var listaId = (await escenario.EnviarAsync(new ListarListasTareasConsulta(proyectoId))).Single().Id;

        var entradaId = await escenario.EnviarAsync(new CrearEntradaDiarioComando(dia, TipoEntradaDiario.Tarea, "Ajustar reportes", null, new TimeOnly(15, 0), new TimeOnly(16, 0)));
        await escenario.EnviarAsync(new ConvertirEntradaEnTareaComando(entradaId, listaId, null, false, false));

        var fila = (await escenario.EnviarAsync(new ObtenerReporteActividadesConsulta(dia, dia, false))).Single();
        Assert.Equal(tableroId, fila.TableroReporteId);
        Assert.True(fila.TableroSugerido);
        Assert.NotNull(fila.ClaveTarea);

        // Nombres únicos por usuario; con actividades imputadas no se borra.
        await Assert.ThrowsAsync<ExcepcionConflicto>(() => escenario.EnviarAsync(new GuardarTableroReporteComando(null, "Sygnus Cremil", null, false)));
        await escenario.EnviarAsync(new ActualizarFilaReporteComando(entradaId, "Ajustar reportes", new TimeOnly(15, 0), new TimeOnly(16, 0), tableroId, null, EstadoActividadReporte.EnProceso));
        await Assert.ThrowsAsync<ExcepcionConflicto>(() => escenario.EnviarAsync(new EliminarTableroReporteComando(tableroId)));
    }

    [Fact]
    public async Task Otro_usuario_no_ve_ni_usa_tableros_ajenos()
    {
        var duena = await _baseDatos.CrearUsuarioAsync("Dueña tableros");
        var otro = await _baseDatos.CrearUsuarioAsync("Ajeno tableros");
        using var escenarioDuena = _baseDatos.CrearEscenario(duena);
        using var escenarioOtro = _baseDatos.CrearEscenario(otro);
        var tableroId = await escenarioDuena.EnviarAsync(new GuardarTableroReporteComando(null, "Privado", null, false));

        Assert.Empty(await escenarioOtro.EnviarAsync(new ListarTablerosReporteConsulta()));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() =>
            escenarioOtro.EnviarAsync(new CrearEntradaDiarioComando(new DateOnly(2026, 10, 7), TipoEntradaDiario.Evento, "x", null, new TimeOnly(9, 0), null, TableroReporteId: tableroId)));
    }
}
