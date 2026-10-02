using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Marcadores;

/// <param name="Titulo">Título actual de la entidad (no el guardado al marcar: si se renombra, el marcador lo refleja).</param>
/// <param name="Referencia">WEB-105, TCK-1042, la fecha del diario o el icono del documento.</param>
public sealed record MarcadorDto(Guid Id, TipoEntidad TipoEntidad, Guid EntidadId, string Titulo, string? Referencia);

// ---------- Listar ----------

/// <summary>Marcadores del usuario (incluye los documentos favoritos). Los de entidades que ya no existen o no ve se omiten.</summary>
public sealed record ListarMarcadoresConsulta : IRequest<IReadOnlyList<MarcadorDto>>;

public sealed class ManejadorListarMarcadoresConsulta : IRequestHandler<ListarMarcadoresConsulta, IReadOnlyList<MarcadorDto>>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorListarMarcadoresConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<IReadOnlyList<MarcadorDto>> Handle(ListarMarcadoresConsulta consulta, CancellationToken tokenCancelacion)
    {
        // El filtro global limita los marcadores (y las entidades) a lo que el usuario ve.
        var marcadores = await _contexto.Marcadores.AsNoTracking()
            .OrderBy(marcador => marcador.IndiceOrden)
            .ThenBy(marcador => marcador.FechaCreacion)
            .ToListAsync(tokenCancelacion);
        List<Guid> Ids(TipoEntidad tipo) => marcadores.Where(marcador => marcador.TipoEntidad == tipo).Select(marcador => marcador.EntidadId).ToList();

        var idsTareas = Ids(TipoEntidad.Tarea);
        var tareas = await _contexto.Tareas.AsNoTracking()
            .Where(tarea => idsTareas.Contains(tarea.Id))
            .Select(tarea => new { tarea.Id, tarea.Titulo, Referencia = tarea.ListaTareas!.Proyecto!.ClavePrefijo + "-" + tarea.NumeroTarea })
            .ToDictionaryAsync(tarea => tarea.Id, tarea => (tarea.Titulo, (string?)tarea.Referencia), tokenCancelacion);
        var idsTickets = Ids(TipoEntidad.Ticket);
        var tickets = await _contexto.Tickets.AsNoTracking()
            .Where(ticket => idsTickets.Contains(ticket.Id))
            .Select(ticket => new { ticket.Id, ticket.Asunto, ticket.NumeroTicket })
            .ToDictionaryAsync(ticket => ticket.Id, ticket => (ticket.Asunto, (string?)("TCK-" + ticket.NumeroTicket)), tokenCancelacion);
        var idsDocumentos = Ids(TipoEntidad.Documento);
        var documentos = await _contexto.DocumentosMarkdown.AsNoTracking()
            .Where(documento => idsDocumentos.Contains(documento.Id) && !documento.EstaArchivado)
            .Select(documento => new { documento.Id, documento.Titulo, documento.Icono })
            .ToDictionaryAsync(documento => documento.Id, documento => (documento.Titulo, documento.Icono), tokenCancelacion);
        var idsRegistros = Ids(TipoEntidad.RegistroDiario);
        var registros = await _contexto.RegistrosDiarios.AsNoTracking()
            .Where(registro => idsRegistros.Contains(registro.Id))
            .Select(registro => new { registro.Id, registro.FechaLog })
            .ToDictionaryAsync(registro => registro.Id, registro => registro.FechaLog, tokenCancelacion);

        var resultado = new List<MarcadorDto>();
        foreach (var marcador in marcadores)
        {
            (string Titulo, string? Referencia)? datos = marcador.TipoEntidad switch
            {
                TipoEntidad.Tarea when tareas.TryGetValue(marcador.EntidadId, out var tarea) => tarea,
                TipoEntidad.Ticket when tickets.TryGetValue(marcador.EntidadId, out var ticket) => ticket,
                TipoEntidad.Documento when documentos.TryGetValue(marcador.EntidadId, out var documento) => documento,
                // Un día del diario no tiene título propio: se usa el guardado al marcarlo ("Diario 24/09/2026").
                TipoEntidad.RegistroDiario when registros.TryGetValue(marcador.EntidadId, out var fecha) => (marcador.Titulo, fecha.ToString("yyyy-MM-dd")),
                _ => null
            };
            if (datos is { } encontrados)
                resultado.Add(new MarcadorDto(marcador.Id, marcador.TipoEntidad, marcador.EntidadId, encontrados.Titulo, encontrados.Referencia));
        }
        return resultado;
    }
}

// ---------- Marcar / desmarcar ----------

/// <summary>Marca o desmarca una entidad. Devuelve si queda marcada.</summary>
public sealed record AlternarMarcadorComando(TipoEntidad TipoEntidad, Guid EntidadId) : IRequest<bool>;

public sealed class ValidadorAlternarMarcadorComando : AbstractValidator<AlternarMarcadorComando>
{
    public ValidadorAlternarMarcadorComando()
    {
        RuleFor(comando => comando.TipoEntidad).IsInEnum();
        RuleFor(comando => comando.EntidadId).NotEmpty();
    }
}

public sealed class ManejadorAlternarMarcadorComando : IRequestHandler<AlternarMarcadorComando, bool>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorAlternarMarcadorComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<bool> Handle(AlternarMarcadorComando comando, CancellationToken tokenCancelacion)
    {
        var existente = await _contexto.Marcadores.FirstOrDefaultAsync(
            marcador => marcador.TipoEntidad == comando.TipoEntidad && marcador.EntidadId == comando.EntidadId, tokenCancelacion);
        if (existente is not null)
        {
            _contexto.Marcadores.Remove(existente);
            await _contexto.GuardarCambiosAsync(tokenCancelacion);
            return false;
        }

        var titulo = await ObtenerTituloAsync(comando.TipoEntidad, comando.EntidadId, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el elemento a marcar", comando.EntidadId);
        var siguienteIndice = await _contexto.Marcadores.Select(marcador => (int?)marcador.IndiceOrden).MaxAsync(tokenCancelacion) ?? -1;
        _contexto.Marcadores.Add(new Marcador
        {
            UsuarioId = _usuarioActual.ObtenerUsuarioIdRequerido(),
            TipoEntidad = comando.TipoEntidad,
            EntidadId = comando.EntidadId,
            Titulo = titulo.Length > 200 ? titulo[..200] : titulo,
            IndiceOrden = siguienteIndice + 1
        });
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return true;
    }

    /// <summary>Título de la entidad si existe y el usuario la ve (filtros globales); null si no.</summary>
    private async Task<string?> ObtenerTituloAsync(TipoEntidad tipo, Guid id, CancellationToken tokenCancelacion) => tipo switch
    {
        TipoEntidad.Tarea => await _contexto.Tareas.Where(tarea => tarea.Id == id).Select(tarea => tarea.Titulo).FirstOrDefaultAsync(tokenCancelacion),
        TipoEntidad.Ticket => await _contexto.Tickets.Where(ticket => ticket.Id == id).Select(ticket => ticket.Asunto).FirstOrDefaultAsync(tokenCancelacion),
        TipoEntidad.Documento => await _contexto.DocumentosMarkdown.Where(documento => documento.Id == id && !documento.EstaArchivado).Select(documento => documento.Titulo).FirstOrDefaultAsync(tokenCancelacion),
        TipoEntidad.RegistroDiario => (await _contexto.RegistrosDiarios.Where(registro => registro.Id == id).Select(registro => (DateOnly?)registro.FechaLog).FirstOrDefaultAsync(tokenCancelacion)) is { } fecha
            ? $"Diario {fecha:dd/MM/yyyy}"
            : null,
        _ => null
    };
}
