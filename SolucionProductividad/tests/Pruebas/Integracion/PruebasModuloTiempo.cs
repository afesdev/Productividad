using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Proyectos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Comandos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Tiempo;
using SolucionProductividad.Aplicacion.Comun.Excepciones;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasModuloTiempo
{
    private readonly BaseDatosPrueba _baseDatos;

    public PruebasModuloTiempo(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    [Fact]
    public async Task Cronometro_uno_a_la_vez_y_suma_al_ticket()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Cronometrista");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        var clave = new string(Guid.NewGuid().ToString("N").Where(char.IsLetter).Take(5).ToArray()).PadRight(4, 'X').ToUpperInvariant();
        var proyectoId = await escenario.EnviarAsync(new CrearProyectoComando("Tiempo", clave, null));
        var listaId = (await escenario.EnviarAsync(new ListarListasTareasConsulta(proyectoId))).Single().Id;
        var tareaId = await escenario.EnviarAsync(new CrearTareaComando(listaId, "Configurar CI", null, false, true, null));
        var ticketId = await escenario.EnviarAsync(new CrearTicketComando("Reporte lento", TipoTicket.Soporte, Prioridad.Media, "Ana", "ana@empresa.com", null, null,
            HorasDedicadas: 1m));

        Assert.Null(await escenario.EnviarAsync(new ObtenerCronometroActivoConsulta()));

        // Validaciones: un solo destino; tiempo libre requiere descripción.
        await Assert.ThrowsAsync<ExcepcionValidacion>(() => escenario.EnviarAsync(new IniciarCronometroComando(tareaId, ticketId, null)));
        await Assert.ThrowsAsync<ExcepcionValidacion>(() => escenario.EnviarAsync(new IniciarCronometroComando(null, null, " ")));

        var enTarea = await escenario.EnviarAsync(new IniciarCronometroComando(tareaId, null, null));
        Assert.StartsWith($"{clave}-", enTarea.Clave);
        Assert.Equal("Configurar CI", enTarea.Titulo);

        // Iniciar otro detiene el anterior: nunca hay dos en marcha.
        var enTicket = await escenario.EnviarAsync(new IniciarCronometroComando(null, ticketId, null));
        var activo = await escenario.EnviarAsync(new ObtenerCronometroActivoConsulta());
        Assert.Equal(enTicket.Id, activo!.Id);
        Assert.StartsWith("TCK-", activo.Clave);

        // Simula 90 minutos de trabajo y detiene: se suman 1,5 h al ticket (tenía 1 h).
        await using (var contexto = _baseDatos.CrearContexto())
        {
            var registro = await contexto.RegistrosTiempo.SingleAsync(existente => existente.Id == enTicket.Id);
            registro.FechaInicio = DateTime.UtcNow.AddMinutes(-90);
            await contexto.SaveChangesAsync();
        }
        var detenido = await escenario.EnviarAsync(new DetenerCronometroComando());
        Assert.NotNull(detenido!.FechaFin);
        Assert.InRange(detenido.Minutos, 89, 91);
        Assert.Null(await escenario.EnviarAsync(new DetenerCronometroComando()));
        var ticket = await escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(ticketId));
        Assert.Equal(2.5m, ticket.HorasDedicadas);
        Assert.Contains(ticket.Eventos, evento => evento.TipoEvento == TipoEventoTicket.TiempoRegistrado);

        // Borrar el tramo descuenta sus horas.
        await escenario.EnviarAsync(new EliminarRegistroTiempoComando(enTicket.Id));
        Assert.Equal(1m, (await escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(ticketId))).HorasDedicadas);

        // Historial de hoy: queda el tramo de la tarea.
        var hoy = await escenario.EnviarAsync(new ListarRegistrosTiempoConsulta(DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1)));
        Assert.Equal(enTarea.Id, Assert.Single(hoy).Id);
    }

    [Fact]
    public async Task Registro_manual_edicion_y_privacidad()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Manual");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        var ticketId = await escenario.EnviarAsync(new CrearTicketComando("Migración", TipoTicket.Ajuste, Prioridad.Baja, "Luis", "luis@empresa.com", null, null));
        var inicio = DateTime.UtcNow.Date.AddDays(-1).AddHours(14);

        // Tramo libre (reunión) y tramo de ticket.
        var libreId = await escenario.EnviarAsync(new GuardarRegistroTiempoComando(null, null, null, "Reunión de planificación", inicio, inicio.AddMinutes(45)));
        var ticketRegistroId = await escenario.EnviarAsync(new GuardarRegistroTiempoComando(null, null, ticketId, null, inicio.AddHours(1), inicio.AddHours(3)));
        Assert.Equal(2m, (await escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(ticketId))).HorasDedicadas);

        // Editar el tramo del ticket: se descuenta lo anterior y se suma lo nuevo.
        await escenario.EnviarAsync(new GuardarRegistroTiempoComando(ticketRegistroId, null, ticketId, "Scripts", inicio.AddHours(1), inicio.AddHours(1.5)));
        Assert.Equal(0.5m, (await escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(ticketId))).HorasDedicadas);

        var registros = await escenario.EnviarAsync(new ListarRegistrosTiempoConsulta(inicio.AddHours(-1), inicio.AddHours(5)));
        Assert.Equal("Reunión de planificación", registros.Single(registro => registro.Id == libreId).Titulo);
        Assert.Equal(45, registros.Single(registro => registro.Id == libreId).Minutos);

        // Reglas del tramo.
        await Assert.ThrowsAsync<ExcepcionValidacion>(() => escenario.EnviarAsync(new GuardarRegistroTiempoComando(null, null, null, "Al revés", inicio, inicio.AddMinutes(-5))));
        await Assert.ThrowsAsync<ExcepcionValidacion>(() => escenario.EnviarAsync(new GuardarRegistroTiempoComando(null, null, null, "Eterno", inicio, inicio.AddHours(25))));
        await Assert.ThrowsAsync<ExcepcionValidacion>(() =>
            escenario.EnviarAsync(new GuardarRegistroTiempoComando(null, null, null, "Futuro", DateTime.UtcNow.AddHours(1), DateTime.UtcNow.AddHours(2))));

        // Otro usuario no ve ni toca estos registros.
        var otro = await _baseDatos.CrearUsuarioAsync("Ajeno tiempo");
        using var escenarioOtro = _baseDatos.CrearEscenario(otro);
        Assert.Empty(await escenarioOtro.EnviarAsync(new ListarRegistrosTiempoConsulta(inicio.AddHours(-1), inicio.AddHours(5))));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenarioOtro.EnviarAsync(new EliminarRegistroTiempoComando(libreId)));
        // Ni registrar tiempo en un ticket que no ve.
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenarioOtro.EnviarAsync(new IniciarCronometroComando(null, ticketId, null)));
    }
}
