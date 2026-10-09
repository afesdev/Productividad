using SolucionProductividad.Aplicacion.Caracteristicas.Documentos;
using SolucionProductividad.Aplicacion.Caracteristicas.Etiquetas;
using SolucionProductividad.Aplicacion.Caracteristicas.Flujos;
using SolucionProductividad.Aplicacion.Caracteristicas.Grafo;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Comandos;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasGrafo
{
    private readonly BaseDatosPrueba _baseDatos;

    public PruebasGrafo(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    [Fact]
    public async Task El_grafo_une_enlaces_etiquetas_sistemas_y_jerarquia_solo_del_usuario()
    {
        var usuario = await _baseDatos.CrearUsuarioAsync("Grafista");
        var otro = await _baseDatos.CrearUsuarioAsync("Ajeno grafo");
        using var escenario = _baseDatos.CrearEscenario(usuario);
        using var escenarioOtro = _baseDatos.CrearEscenario(otro);
        var marca = Guid.NewGuid().ToString("N")[..6];

        // Sistema unificado: proyecto de soporte "SYGNUS…" y flujo con sistema "sygnus…".
        var proyecto = await escenario.EnviarAsync(new GuardarProyectoSoporteComando(null, $"SYGNUS{marca}", null, "violeta"));
        var ticket = await escenario.EnviarAsync(new CrearTicketComando("Caducidad PIN", TipoTicket.Incidencia, Prioridad.Alta, "Ana", "ana@empresa.com", null, usuario.Id, ProyectoIds: [proyecto]));
        var flujo = await escenario.EnviarAsync(new CrearFlujoComando($"Libranza {marca}", $"sygnus{marca}", null));

        var numero = (await escenario.EnviarAsync(new Aplicacion.Caracteristicas.Tickets.Consultas.ObtenerTicketDetalleConsulta(ticket))).Resumen.NumeroTicket;
        var padre = await escenario.EnviarAsync(new CrearDocumentoComando(null, null, $"Guía {marca}", $"Ver [[TCK-{numero}]] y [[Flujo: Libranza {marca}]]", null));
        var hija = await escenario.EnviarAsync(new CrearDocumentoComando(null, padre, $"Detalle {marca}", "Sin enlaces", null));
        var etiqueta = await escenario.EnviarAsync(new GuardarEtiquetaDocumentoComando(null, $"runbook{marca}", "verde"));
        await escenario.EnviarAsync(new AsignarEtiquetasDocumentoComando(padre, [etiqueta]));
        await escenario.EnviarAsync(new AsignarEtiquetasTicketComando(ticket, [etiqueta]));

        // Algo del otro usuario no debe aparecer.
        var ajeno = await escenarioOtro.EnviarAsync(new CrearDocumentoComando(null, null, $"Privado {marca}", "x", null));

        var grafo = await escenario.EnviarAsync(new ObtenerGrafoConsulta());
        bool Hay(TipoNodoGrafo tipoA, Guid a, string b, TipoAristaGrafo tipo) =>
            grafo.Aristas.Any(arista => arista.Tipo == tipo && arista.Origen == $"{tipoA}:{a}" && arista.Destino == b);

        Assert.True(Hay(TipoNodoGrafo.Documento, padre, $"Ticket:{ticket}", TipoAristaGrafo.Enlace), "[[TCK-n]]");
        Assert.True(Hay(TipoNodoGrafo.Documento, padre, $"Flujo:{flujo}", TipoAristaGrafo.Enlace), "[[Flujo: …]] ahora se registra como referencia");
        Assert.True(Hay(TipoNodoGrafo.Documento, hija, $"Documento:{padre}", TipoAristaGrafo.Jerarquia), "subpágina → padre");
        Assert.True(Hay(TipoNodoGrafo.Documento, padre, $"Etiqueta:{etiqueta}", TipoAristaGrafo.Etiqueta), "etiqueta del documento");
        Assert.True(Hay(TipoNodoGrafo.Ticket, ticket, $"Etiqueta:{etiqueta}", TipoAristaGrafo.Etiqueta), "etiqueta del ticket");

        // El ticket (por su proyecto de soporte) y el flujo (por su campo Sistema) llegan al MISMO nodo de sistema.
        var sistemaTicket = grafo.Aristas.Single(arista => arista.Origen == $"Ticket:{ticket}" && arista.Tipo == TipoAristaGrafo.Sistema).Destino;
        var sistemaFlujo = grafo.Aristas.Single(arista => arista.Origen == $"Flujo:{flujo}" && arista.Tipo == TipoAristaGrafo.Sistema).Destino;
        Assert.Equal(sistemaTicket, sistemaFlujo);
        Assert.Equal(proyecto, grafo.Nodos.Single(nodo => nodo.Id == sistemaTicket).EntidadId);

        Assert.DoesNotContain(grafo.Nodos, nodo => nodo.Id == $"Documento:{ajeno}");
        Assert.All(grafo.Aristas, arista => Assert.Contains(grafo.Nodos, nodo => nodo.Id == arista.Origen));
        Assert.All(grafo.Aristas, arista => Assert.Contains(grafo.Nodos, nodo => nodo.Id == arista.Destino));
    }
}
