using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Analitica.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Proyectos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Consultas;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasFechasUtc
{
    private readonly BaseDatosPrueba _baseDatos;

    public PruebasFechasUtc(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    [Fact]
    public async Task Las_fechas_se_guardan_y_se_leen_como_utc_sin_desfase()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync();
        using var escenario = _baseDatos.CrearEscenario(usuario);
        var proyectoId = await escenario.EnviarAsync(new CrearProyectoComando("Fechas", "FEC", null));
        var listaId = (await escenario.EnviarAsync(new ListarListasTareasConsulta(proyectoId))).Single().Id;

        // 23:59 del 23 de septiembre en Colombia (UTC-5) = 04:59 UTC del 24.
        var vencimiento = new DateTime(2026, 9, 24, 4, 59, 0, DateTimeKind.Utc);
        var tareaId = await escenario.EnviarAsync(new CrearTareaComando(listaId, "Con vencimiento", null, false, false, vencimiento));

        var detalle = await escenario.EnviarAsync(new ObtenerTareaPorIdConsulta(tareaId));
        Assert.Equal(DateTimeKind.Utc, detalle.Resumen.FechaVencimiento!.Value.Kind);
        Assert.Equal(vencimiento, detalle.Resumen.FechaVencimiento.Value);
        Assert.Equal(DateTimeKind.Utc, detalle.FechaCreacion.Kind);
        Assert.True(Math.Abs((detalle.FechaCreacion - DateTime.UtcNow).TotalMinutes) < 5, "La fecha de creación debe ser la hora UTC actual.");

        // Una fecha con zona local se convierte a UTC al guardarse.
        var local = new DateTime(2026, 9, 23, 23, 59, 0, DateTimeKind.Local);
        await escenario.EnviarAsync(new ActualizarTareaComando(tareaId, "Con vencimiento", null, Prioridad.Media, false, false, local, null));
        detalle = await escenario.EnviarAsync(new ObtenerTareaPorIdConsulta(tareaId));
        Assert.Equal(local.ToUniversalTime(), detalle.Resumen.FechaVencimiento!.Value);
    }

    [Theory]
    [InlineData(0, 21)]     // En UTC, el lunes 21 a las 03:00 pertenece a la semana del 21.
    [InlineData(-300, 14)]  // En Colombia son las 22:00 del domingo 20: semana del lunes 14.
    public async Task La_velocidad_semanal_agrupa_por_la_fecha_local_del_usuario(int desplazamientoMinutos, int diaInicioSemanaEsperado)
    {
        var usuario = await _baseDatos.CrearUsuarioAsync();
        using var escenario = _baseDatos.CrearEscenario(usuario);
        var proyectoId = await escenario.EnviarAsync(new CrearProyectoComando("Semanas", "SEM", null));
        var listaId = (await escenario.EnviarAsync(new ListarListasTareasConsulta(proyectoId))).Single().Id;
        var tareaId = await escenario.EnviarAsync(new CrearTareaComando(listaId, "Completada el domingo en la noche", null, false, false, null));

        await using (var contexto = _baseDatos.CrearContexto())
        {
            var tarea = await contexto.Tareas.SingleAsync(candidata => candidata.Id == tareaId);
            tarea.Estado = EstadoTarea.Completada;
            tarea.FechaActualizacion = new DateTime(2026, 9, 21, 3, 0, 0, DateTimeKind.Utc);
            await contexto.SaveChangesAsync();
        }

        var resumen = await escenario.EnviarAsync(new ObtenerResumenAnaliticaPersonalConsulta(
            usuario.Id, new DateTime(2026, 9, 7, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 9, 28, 0, 0, 0, DateTimeKind.Utc), desplazamientoMinutos));

        var semanaConTarea = resumen.VelocidadSemanal.Single(punto => punto.TareasCompletadas == 1);
        Assert.Equal(new DateTime(2026, 9, diaInicioSemanaEsperado), semanaConTarea.InicioSemana.Date);
        Assert.Equal(1, resumen.TareasCompletadas);
    }
}
