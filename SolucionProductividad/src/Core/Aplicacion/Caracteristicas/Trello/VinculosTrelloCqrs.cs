using System.Text;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Comandos;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Trello;

// ---------- DTOs ----------

/// <summary>Vínculo con los datos guardados de la tarjeta y el destino (tarea o ticket) ya resuelto para mostrarlo.</summary>
public sealed record VinculoTrelloDto(
    Guid Id,
    string IdTarjeta,
    string NombreTarjeta,
    string NombreTablero,
    string UrlTarjeta,
    Guid? TareaId,
    Guid? TicketId,
    string? ClaveDestino,
    string? TituloDestino,
    DateTime FechaVinculo);

internal static class VinculosTrello
{
    /// <summary>Proyección con la clave y el título del destino; el filtro global ya limita los vínculos al usuario actual.</summary>
    public static IQueryable<VinculoTrelloDto> Proyectar(IContextoAplicacion contexto, IQueryable<VinculoTrello> vinculos) =>
        from vinculo in vinculos
        join tarea in contexto.Tareas on vinculo.TareaId equals tarea.Id into tareas
        from tarea in tareas.DefaultIfEmpty()
        join ticket in contexto.Tickets on vinculo.TicketId equals ticket.Id into tickets
        from ticket in tickets.DefaultIfEmpty()
        orderby vinculo.FechaVinculo
        select new VinculoTrelloDto(
            vinculo.Id,
            vinculo.IdTarjeta,
            vinculo.NombreTarjeta,
            vinculo.NombreTablero,
            vinculo.UrlTarjeta,
            vinculo.TareaId,
            vinculo.TicketId,
            tarea != null ? tarea.ListaTareas!.Proyecto!.ClavePrefijo + "-" + tarea.NumeroTarea : ticket != null ? "TCK-" + ticket.NumeroTicket : null,
            tarea != null ? tarea.Titulo : ticket != null ? ticket.Asunto : null,
            vinculo.FechaVinculo);

    public static string Recortar(string texto, int maximo) => texto.Length <= maximo ? texto : texto[..maximo];
}

// ---------- Listar ----------

/// <summary>Vínculos de una tarea, de un ticket o de una tarjeta de Trello (exactamente un filtro).</summary>
public sealed record ListarVinculosTrelloConsulta(Guid? TareaId, Guid? TicketId, string? IdTarjeta) : IRequest<IReadOnlyList<VinculoTrelloDto>>;

public sealed class ValidadorListarVinculosTrelloConsulta : AbstractValidator<ListarVinculosTrelloConsulta>
{
    public ValidadorListarVinculosTrelloConsulta()
    {
        RuleFor(consulta => consulta)
            .Must(consulta => (consulta.TareaId is not null ? 1 : 0) + (consulta.TicketId is not null ? 1 : 0) + (consulta.IdTarjeta is not null ? 1 : 0) == 1)
            .WithName("Filtro").WithMessage("Indica una tarea, un ticket o una tarjeta.");
        RuleFor(consulta => consulta.IdTarjeta).Must(ReglasTrello.EsIdValido).When(consulta => consulta.IdTarjeta is not null).WithMessage("El identificador de la tarjeta no es válido.");
    }
}

public sealed class ManejadorListarVinculosTrelloConsulta : IRequestHandler<ListarVinculosTrelloConsulta, IReadOnlyList<VinculoTrelloDto>>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorListarVinculosTrelloConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<IReadOnlyList<VinculoTrelloDto>> Handle(ListarVinculosTrelloConsulta consulta, CancellationToken tokenCancelacion)
    {
        var vinculos = _contexto.VinculosTrello.AsNoTracking();
        vinculos = consulta.TareaId is { } tareaId ? vinculos.Where(vinculo => vinculo.TareaId == tareaId)
            : consulta.TicketId is { } ticketId ? vinculos.Where(vinculo => vinculo.TicketId == ticketId)
            : vinculos.Where(vinculo => vinculo.IdTarjeta == consulta.IdTarjeta);
        return await VinculosTrello.Proyectar(_contexto, vinculos).ToListAsync(tokenCancelacion);
    }
}

// ---------- Vincular ----------

/// <summary><paramref name="Tarjeta"/>: id, enlace corto o URL de la tarjeta. Exactamente uno de tarea o ticket.</summary>
public sealed record VincularTarjetaTrelloComando(string Tarjeta, Guid? TareaId, Guid? TicketId) : IRequest<VinculoTrelloDto>;

public sealed class ValidadorVincularTarjetaTrelloComando : AbstractValidator<VincularTarjetaTrelloComando>
{
    public ValidadorVincularTarjetaTrelloComando()
    {
        RuleFor(comando => comando.Tarjeta)
            .Must(tarjeta => ReglasTrello.ExtraerReferenciaTarjeta(tarjeta) is not null)
            .WithName("Tarjeta").WithMessage("Indica una tarjeta de Trello (su enlace https://trello.com/c/… o su id).");
        RuleFor(comando => comando)
            .Must(comando => comando.TareaId is null != (comando.TicketId is null))
            .WithName("Destino").WithMessage("La tarjeta se vincula a una tarea o a un ticket.");
    }
}

public sealed class ManejadorVincularTarjetaTrelloComando : IRequestHandler<VincularTarjetaTrelloComando, VinculoTrelloDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;
    private readonly IServicioTrello _trello;
    private readonly IServicioCifradoBoveda _cifrado;

    public ManejadorVincularTarjetaTrelloComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual, IServicioTrello trello, IServicioCifradoBoveda cifrado)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
        _trello = trello;
        _cifrado = cifrado;
    }

    public async Task<VinculoTrelloDto> Handle(VincularTarjetaTrelloComando comando, CancellationToken tokenCancelacion)
    {
        // El destino debe existir y ser visible para el usuario (filtros globales).
        if (comando.TareaId is { } tareaId && !await _contexto.Tareas.AnyAsync(tarea => tarea.Id == tareaId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("la tarea", tareaId);
        if (comando.TicketId is { } ticketId && !await _contexto.Tickets.AnyAsync(ticket => ticket.Id == ticketId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("el ticket", ticketId);

        // Leer la tarjeta valida que el usuario tiene acceso y resuelve el enlace corto al id largo.
        var (token, _) = await ConexionTrelloActual.ObtenerAsync(_contexto, _cifrado, tokenCancelacion);
        var tarjeta = await _trello.ObtenerTarjetaAsync(token, ReglasTrello.ExtraerReferenciaTarjeta(comando.Tarjeta)!, tokenCancelacion);

        var vinculo = await VincularAsync(_contexto, _usuarioActual.ObtenerUsuarioIdRequerido(), tarjeta, comando.TareaId, comando.TicketId, tokenCancelacion);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return await VinculosTrello.Proyectar(_contexto, _contexto.VinculosTrello.AsNoTracking().Where(existente => existente.Id == vinculo.Id)).SingleAsync(tokenCancelacion);
    }

    internal static async Task<VinculoTrello> VincularAsync(IContextoAplicacion contexto, Guid usuarioId, TarjetaTrelloDetalle tarjeta, Guid? tareaId, Guid? ticketId, CancellationToken tokenCancelacion)
    {
        var repetido = await contexto.VinculosTrello.AnyAsync(
            vinculo => vinculo.IdTarjeta == tarjeta.Id && vinculo.TareaId == tareaId && vinculo.TicketId == ticketId, tokenCancelacion);
        if (repetido)
            throw new ExcepcionConflicto($"La tarjeta \"{tarjeta.Nombre}\" ya está vinculada.");

        var vinculo = new VinculoTrello
        {
            UsuarioId = usuarioId,
            IdTarjeta = tarjeta.Id,
            NombreTarjeta = VinculosTrello.Recortar(tarjeta.Nombre, 500),
            NombreTablero = VinculosTrello.Recortar(tarjeta.NombreTablero, 200),
            UrlTarjeta = VinculosTrello.Recortar(tarjeta.Url, 300),
            TareaId = tareaId,
            TicketId = ticketId,
        };
        contexto.VinculosTrello.Add(vinculo);
        return vinculo;
    }
}

// ---------- Desvincular ----------

public sealed record DesvincularTarjetaTrelloComando(Guid Id) : IRequest;

public sealed class ManejadorDesvincularTarjetaTrelloComando : IRequestHandler<DesvincularTarjetaTrelloComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorDesvincularTarjetaTrelloComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(DesvincularTarjetaTrelloComando comando, CancellationToken tokenCancelacion)
    {
        var vinculo = await _contexto.VinculosTrello.FirstOrDefaultAsync(existente => existente.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el vínculo con Trello", comando.Id);
        _contexto.VinculosTrello.Remove(vinculo);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Importar como tarea ----------

/// <summary>
/// Crea una tarea con el título, la descripción, los checklists (como lista de casillas) y el vencimiento de la tarjeta,
/// y la deja vinculada. Devuelve el Id de la tarea. Trello no cambia.
/// </summary>
public sealed record ImportarTarjetaTrelloComando(string Tarjeta, Guid ListaTareaId) : IRequest<Guid>;

public sealed class ValidadorImportarTarjetaTrelloComando : AbstractValidator<ImportarTarjetaTrelloComando>
{
    public ValidadorImportarTarjetaTrelloComando()
    {
        RuleFor(comando => comando.Tarjeta).Must(tarjeta => ReglasTrello.ExtraerReferenciaTarjeta(tarjeta) is not null).WithName("Tarjeta").WithMessage("La tarjeta de Trello no es válida.");
        RuleFor(comando => comando.ListaTareaId).NotEmpty().WithName("Lista");
    }
}

public sealed class ManejadorImportarTarjetaTrelloComando : IRequestHandler<ImportarTarjetaTrelloComando, Guid>
{
    private const int MaximoDescripcion = 20_000;

    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;
    private readonly IServicioTrello _trello;
    private readonly IServicioCifradoBoveda _cifrado;
    private readonly ISender _mediador;

    public ManejadorImportarTarjetaTrelloComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual, IServicioTrello trello, IServicioCifradoBoveda cifrado, ISender mediador)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
        _trello = trello;
        _cifrado = cifrado;
        _mediador = mediador;
    }

    public async Task<Guid> Handle(ImportarTarjetaTrelloComando comando, CancellationToken tokenCancelacion)
    {
        var (token, _) = await ConexionTrelloActual.ObtenerAsync(_contexto, _cifrado, tokenCancelacion);
        var tarjeta = await _trello.ObtenerTarjetaAsync(token, ReglasTrello.ExtraerReferenciaTarjeta(comando.Tarjeta)!, tokenCancelacion);

        // La creación pasa por el comando de Tareas: mismas validaciones, numeración y notificaciones.
        var tareaId = await _mediador.Send(new CrearTareaComando(
            comando.ListaTareaId,
            VinculosTrello.Recortar(tarjeta.Nombre.Trim(), 200),
            Descripcion(tarjeta),
            false,
            false,
            tarjeta.Vencimiento), tokenCancelacion);

        await ManejadorVincularTarjetaTrelloComando.VincularAsync(_contexto, _usuarioActual.ObtenerUsuarioIdRequerido(), tarjeta, tareaId, null, tokenCancelacion);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return tareaId;
    }

    private static string Descripcion(TarjetaTrelloDetalle tarjeta)
    {
        var texto = new StringBuilder();
        if (!string.IsNullOrWhiteSpace(tarjeta.Descripcion))
            texto.AppendLine(tarjeta.Descripcion.Trim()).AppendLine();
        foreach (var checklist in tarjeta.Checklists)
        {
            texto.AppendLine($"**{checklist.Nombre}**").AppendLine();
            foreach (var elemento in checklist.Elementos)
                texto.AppendLine($"- [{(elemento.Hecho ? "x" : " ")}] {elemento.Nombre}");
            texto.AppendLine();
        }
        // Corchetes del título escapados para no romper el enlace Markdown.
        var titulo = tarjeta.Nombre.Replace("[", "\\[").Replace("]", "\\]");
        texto.Append($"Importada de Trello: [{titulo}]({tarjeta.Url}) · {tarjeta.NombreTablero}");
        var resultado = texto.ToString();
        return resultado.Length <= MaximoDescripcion ? resultado : resultado[..MaximoDescripcion];
    }
}

// ---------- Buscar tarjetas ----------

/// <summary>
/// Búsqueda para el selector de tarjetas: si el texto es un enlace o id de tarjeta, devuelve esa tarjeta; si no, usa la
/// búsqueda de Trello.
/// </summary>
public sealed record BuscarTarjetasTrelloConsulta(string Texto) : IRequest<IReadOnlyList<TarjetaAsignadaTrello>>;

public sealed class ManejadorBuscarTarjetasTrelloConsulta : IRequestHandler<BuscarTarjetasTrelloConsulta, IReadOnlyList<TarjetaAsignadaTrello>>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioTrello _trello;
    private readonly IServicioCifradoBoveda _cifrado;

    public ManejadorBuscarTarjetasTrelloConsulta(IContextoAplicacion contexto, IServicioTrello trello, IServicioCifradoBoveda cifrado)
    {
        _contexto = contexto;
        _trello = trello;
        _cifrado = cifrado;
    }

    public async Task<IReadOnlyList<TarjetaAsignadaTrello>> Handle(BuscarTarjetasTrelloConsulta consulta, CancellationToken tokenCancelacion)
    {
        var (token, _) = await ConexionTrelloActual.ObtenerAsync(_contexto, _cifrado, tokenCancelacion);
        var texto = consulta.Texto?.Trim() ?? string.Empty;

        // Un enlace pegado (o un id) se resuelve directamente; un enlace corto suelto de 8 letras podría ser una palabra, así que solo cuenta como URL.
        var referencia = ReglasTrello.ExtraerReferenciaTarjeta(texto);
        if (referencia is not null && (ReglasTrello.EsIdValido(texto) || texto.Contains("trello.com", StringComparison.OrdinalIgnoreCase)))
        {
            var tarjeta = await _trello.ObtenerTarjetaAsync(token, referencia, tokenCancelacion);
            return
            [
                new TarjetaAsignadaTrello(
                    new TarjetaTrello(tarjeta.Id, tarjeta.Nombre, tarjeta.IdTablero, string.Empty, 0, tarjeta.Inicio, tarjeta.Vencimiento, tarjeta.VencimientoCompletado,
                        tarjeta.Etiquetas, tarjeta.Miembros.Select(miembro => miembro.Id).ToList(), tarjeta.Url, tarjeta.Comentarios.Count, tarjeta.Adjuntos.Count,
                        tarjeta.Checklists.Sum(checklist => checklist.Elementos.Count), tarjeta.Checklists.Sum(checklist => checklist.Elementos.Count(elemento => elemento.Hecho)),
                        !string.IsNullOrWhiteSpace(tarjeta.Descripcion), null),
                    tarjeta.NombreTablero,
                    tarjeta.NombreLista,
                    null),
            ];
        }
        return await _trello.BuscarTarjetasAsync(token, texto, tokenCancelacion);
    }
}
