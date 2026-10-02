using SolucionProductividad.Aplicacion.Caracteristicas.Diario;
using SolucionProductividad.Aplicacion.Caracteristicas.Importacion;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Consultas;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Dtos;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasImportacion
{
    private readonly BaseDatosPrueba _baseDatos;

    public PruebasImportacion(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    [Fact]
    public async Task Importa_tickets_historicos_con_su_estado_y_proyecto_sin_duplicar()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Importador");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        var numero = new Random().Next(100_000, 999_999).ToString();
        var proyecto = $"Portal Cremil {numero}";

        var resultados = await escenario.EnviarAsync(new ImportarTicketsComando([
            new TicketImportadoDto(numero, "Información autorizaciones beneficiario", proyecto, EstadoTicket.EnProduccion, TipoTicket.Ajuste, Prioridad.Media,
                new DateOnly(2026, 8, 3), new DateOnly(2026, 8, 3), "### Rama\n`Ajustes/AndresEspitia-Ticket1428-Info`"),
            new TicketImportadoDto($"{numero}1", "Análisis de reportes", proyecto, EstadoTicket.EnPruebas, TipoTicket.NuevoDesarrollo, Prioridad.Alta,
                new DateOnly(2026, 9, 1), null, null),
        ]));
        Assert.All(resultados, resultado => Assert.Equal("creado", resultado.Resultado));

        var detalle = await escenario.EnviarAsync(new ObtenerTicketDetalleConsulta(resultados[0].Id!.Value));
        Assert.Equal(numero, detalle.Resumen.NumeroExterno);
        Assert.Equal(EstadoTicket.EnProduccion, detalle.Resumen.Estado);
        Assert.Equal(usuario.Id, detalle.Resumen.AgenteAsignadoId);
        Assert.Equal(new DateTime(2026, 8, 3, 12, 0, 0), detalle.Resumen.FechaCreacion);
        Assert.NotNull(detalle.Resumen.FechaResolucion);
        Assert.Contains("AndresEspitia-Ticket1428", detalle.DocumentacionMarkdown);
        Assert.Equal(proyecto, Assert.Single(detalle.Resumen.Proyectos).Nombre);

        // El proyecto se creó una sola vez para los dos tickets.
        var catalogo = await escenario.EnviarAsync(new ListarProyectosSoporteConsulta());
        Assert.Equal(2, Assert.Single(catalogo, existente => existente.Nombre == proyecto).TotalTickets);

        // Reimportar no duplica.
        var repeticion = await escenario.EnviarAsync(new ImportarTicketsComando([
            new TicketImportadoDto(numero, "Otra vez", proyecto, EstadoTicket.Cerrado, TipoTicket.Ajuste, Prioridad.Media, null, null, null),
        ]));
        Assert.Equal("omitido", Assert.Single(repeticion).Resultado);
        Assert.Single(await escenario.EnviarAsync(new ListarTicketsConsulta(VistaTickets.Todos, numero)), ticket => ticket.NumeroExterno == numero);
    }

    [Fact]
    public async Task Importa_notas_del_diario_sin_borrar_lo_existente()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Diario importado");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        var dia = new DateOnly(2026, 3, 25);
        await escenario.EnviarAsync(new GuardarNotaDiarioComando(dia.AddDays(1), "Nota escrita en la app", null, null));

        var resultados = await escenario.EnviarAsync(new ImportarNotasDiarioComando([
            new NotaDiarioImportadaDto(dia, "- 9:30 a 10:00 - Revisión de almacenamiento"),
            new NotaDiarioImportadaDto(dia.AddDays(1), "## Trabajo realizado\n**09:00** - Ticket 1317"),
            new NotaDiarioImportadaDto(dia.AddDays(2), "   "),
        ]));
        Assert.Equal(["creado", "actualizado", "omitido"], resultados.Select(resultado => resultado.Resultado));

        Assert.Equal("- 9:30 a 10:00 - Revisión de almacenamiento", (await escenario.EnviarAsync(new ObtenerDiaDiarioConsulta(dia))).ContenidoMarkdown);
        var combinado = (await escenario.EnviarAsync(new ObtenerDiaDiarioConsulta(dia.AddDays(1)))).ContenidoMarkdown;
        Assert.StartsWith("Nota escrita en la app", combinado);
        Assert.Contains("**09:00** - Ticket 1317", combinado);

        // Reimportar el mismo contenido no lo repite.
        var repeticion = await escenario.EnviarAsync(new ImportarNotasDiarioComando([new NotaDiarioImportadaDto(dia.AddDays(1), "## Trabajo realizado\n**09:00** - Ticket 1317")]));
        Assert.Equal("omitido", Assert.Single(repeticion).Resultado);
    }
}
