using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Comandos;

// ---------- Registrar un despliegue ----------

/// <summary>
/// Desarrollo: el ticket pasa de "En revisión" a "En pruebas".
/// Producción: el ticket pasa de "Aprobado" a "En producción".
/// </summary>
public sealed record RegistrarDespliegueTicketComando(Guid TicketId, AmbienteDespliegue Ambiente, string? Referencia, string? Notas) : IRequest<Guid>;

public sealed class ValidadorRegistrarDespliegueTicketComando : AbstractValidator<RegistrarDespliegueTicketComando>
{
    public ValidadorRegistrarDespliegueTicketComando()
    {
        RuleFor(comando => comando.Ambiente).IsInEnum();
        RuleFor(comando => comando.Referencia).MaximumLength(200);
        RuleFor(comando => comando.Notas).MaximumLength(2000);
    }
}

public sealed class ManejadorRegistrarDespliegueTicketComando : IRequestHandler<RegistrarDespliegueTicketComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorRegistrarDespliegueTicketComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<Guid> Handle(RegistrarDespliegueTicketComando comando, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var ticket = await FlujoTickets.ObtenerRastreadoAsync(_contexto, comando.TicketId, tokenCancelacion);

        var (estadoRequerido, estadoSiguiente) = comando.Ambiente == AmbienteDespliegue.Desarrollo
            ? (EstadoTicket.EnRevision, EstadoTicket.EnPruebas)
            : (EstadoTicket.Aprobado, EstadoTicket.EnProduccion);

        if (ticket.Estado != estadoRequerido)
            throw new ExcepcionDominio($"Para registrar un despliegue en {comando.Ambiente} el ticket debe estar en \"{FlujoTickets.NombresEstado[estadoRequerido]}\".");

        var despliegue = new DespliegueTicket
        {
            TicketId = ticket.Id,
            Ambiente = comando.Ambiente,
            Referencia = comando.Referencia?.Trim(),
            Notas = comando.Notas?.Trim(),
            DesplegadoPor = usuarioId,
            // A producción no le siguen pruebas en este flujo: queda aprobado al registrarse.
            Resultado = comando.Ambiente == AmbienteDespliegue.Produccion ? ResultadoDespliegue.Aprobado : ResultadoDespliegue.Pendiente
        };
        _contexto.DesplieguesTicket.Add(despliegue);

        FlujoTickets.RegistrarEvento(_contexto, ticket, TipoEventoTicket.Desplegado,
            $"Desplegado en {comando.Ambiente}" + (string.IsNullOrWhiteSpace(despliegue.Referencia) ? string.Empty : $" ({despliegue.Referencia})"),
            usuarioId, comando.Notas);
        FlujoTickets.Transicionar(_contexto, ticket, estadoSiguiente, usuarioId, null, $"despliegue en {comando.Ambiente}");

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return despliegue.Id;
    }
}

// ---------- Resultado de las pruebas en Desarrollo ----------

public sealed record RegistrarResultadoPruebasComando(Guid TicketId, bool Aprobado, string? Notas) : IRequest;

public sealed class ValidadorRegistrarResultadoPruebasComando : AbstractValidator<RegistrarResultadoPruebasComando>
{
    public ValidadorRegistrarResultadoPruebasComando()
    {
        RuleFor(comando => comando.Notas).MaximumLength(2000);
        RuleFor(comando => comando.Notas).NotEmpty().When(comando => !comando.Aprobado)
            .WithMessage("Describa qué falló en las pruebas para poder corregirlo.");
    }
}

public sealed class ManejadorRegistrarResultadoPruebasComando : IRequestHandler<RegistrarResultadoPruebasComando>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorRegistrarResultadoPruebasComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task Handle(RegistrarResultadoPruebasComando comando, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var ticket = await FlujoTickets.ObtenerRastreadoAsync(_contexto, comando.TicketId, tokenCancelacion);
        if (ticket.Estado != EstadoTicket.EnPruebas)
            throw new ExcepcionDominio("El ticket no está en pruebas.");

        var despliegue = await _contexto.DesplieguesTicket
            .Where(despliegue => despliegue.TicketId == ticket.Id && despliegue.Ambiente == AmbienteDespliegue.Desarrollo && despliegue.Resultado == ResultadoDespliegue.Pendiente)
            .OrderByDescending(despliegue => despliegue.FechaDespliegue)
            .FirstOrDefaultAsync(tokenCancelacion)
            ?? throw new ExcepcionDominio("No hay un despliegue en Desarrollo pendiente de evaluar.");

        despliegue.Resultado = comando.Aprobado ? ResultadoDespliegue.Aprobado : ResultadoDespliegue.Rechazado;
        despliegue.NotasResultado = comando.Notas?.Trim();
        despliegue.EvaluadoPor = usuarioId;
        despliegue.FechaResultado = DateTime.UtcNow;

        FlujoTickets.RegistrarEvento(_contexto, ticket,
            comando.Aprobado ? TipoEventoTicket.PruebasAprobadas : TipoEventoTicket.PruebasRechazadas,
            comando.Aprobado ? "Pruebas aprobadas: listo para producción" : "Pruebas rechazadas: vuelve a desarrollo",
            usuarioId, comando.Notas);
        FlujoTickets.Transicionar(_contexto, ticket, comando.Aprobado ? EstadoTicket.Aprobado : EstadoTicket.Devuelto, usuarioId, null, "resultado de pruebas");

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}
