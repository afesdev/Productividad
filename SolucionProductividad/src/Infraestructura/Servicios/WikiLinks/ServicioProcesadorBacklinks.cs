using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Servicios.WikiLinks;

/// <summary>
/// Motor de WikiLinks: resuelve [[...]] a entidades y sincroniza ReferenciasEntidades con un diff
/// (conserva las referencias existentes, agrega las nuevas y elimina las que ya no aparecen).
/// </summary>
public sealed partial class ServicioProcesadorBacklinks : IServicioProcesadorBacklinks
{
    private readonly IContextoAplicacion _contexto;

    public ServicioProcesadorBacklinks(IContextoAplicacion contexto) => _contexto = contexto;

    // [[destino]] o [[destino|texto visible]]
    [GeneratedRegex(@"\[\[([^\[\]|]+)(?:\|[^\[\]]*)?\]\]", RegexOptions.CultureInvariant)]
    private static partial Regex ExpresionWikiLink();

    [GeneratedRegex(@"^TCK-(\d+)$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex ExpresionTicket();

    [GeneratedRegex(@"^(?:#|[A-Za-z]{2,10}-)(\d+)$", RegexOptions.CultureInvariant)]
    private static partial Regex ExpresionTarea();

    public async Task<int> ProcesarWikiLinksAsync(string contenidoMarkdown, Guid entidadOrigenId, string tipoOrigen, CancellationToken tokenCancelacion = default)
    {
        if (!Enum.TryParse<TipoEntidad>(tipoOrigen, ignoreCase: true, out var tipoEntidadOrigen))
            throw new ArgumentException($"Tipo de origen no soportado: {tipoOrigen}.", nameof(tipoOrigen));

        var destinosResueltos = await ResolverDestinosAsync(ExtraerDestinos(contenidoMarkdown), tokenCancelacion);
        destinosResueltos.Remove((tipoEntidadOrigen, entidadOrigenId));

        var referenciasActuales = await _contexto.ReferenciasEntidades
            .Where(referencia => referencia.TipoOrigen == tipoEntidadOrigen && referencia.OrigenId == entidadOrigenId)
            .ToListAsync(tokenCancelacion);

        foreach (var referenciaObsoleta in referenciasActuales.Where(referencia => !destinosResueltos.Contains((referencia.TipoDestino, referencia.DestinoId))))
            _contexto.ReferenciasEntidades.Remove(referenciaObsoleta);

        var destinosExistentes = referenciasActuales.Select(referencia => (referencia.TipoDestino, referencia.DestinoId)).ToHashSet();
        foreach (var (tipoDestino, destinoId) in destinosResueltos.Where(destino => !destinosExistentes.Contains(destino)))
        {
            _contexto.ReferenciasEntidades.Add(new ReferenciaEntidad
            {
                TipoOrigen = tipoEntidadOrigen,
                OrigenId = entidadOrigenId,
                TipoDestino = tipoDestino,
                DestinoId = destinoId
            });
        }

        return destinosResueltos.Count;
    }

    private static IReadOnlyCollection<string> ExtraerDestinos(string contenidoMarkdown) =>
        ExpresionWikiLink().Matches(contenidoMarkdown ?? string.Empty)
            .Select(coincidencia => coincidencia.Groups[1].Value.Trim())
            .Where(destino => destino.Length is > 0 and <= 220)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

    private async Task<HashSet<(TipoEntidad Tipo, Guid Id)>> ResolverDestinosAsync(IReadOnlyCollection<string> destinos, CancellationToken tokenCancelacion)
    {
        var numerosTicket = new List<int>();
        var numerosTarea = new List<int>();
        var textosDocumento = new List<string>();

        foreach (var destino in destinos)
        {
            if (ExpresionTicket().Match(destino) is { Success: true } coincidenciaTicket && int.TryParse(coincidenciaTicket.Groups[1].Value, out var numeroTicket))
                numerosTicket.Add(numeroTicket);
            else if (ExpresionTarea().Match(destino) is { Success: true } coincidenciaTarea && int.TryParse(coincidenciaTarea.Groups[1].Value, out var numeroTarea))
                numerosTarea.Add(numeroTarea);
            else
                textosDocumento.Add(destino);
        }

        var resueltos = new HashSet<(TipoEntidad, Guid)>();

        if (numerosTicket.Count > 0)
        {
            var idsTickets = await _contexto.Tickets.Where(ticket => numerosTicket.Contains(ticket.NumeroTicket)).Select(ticket => ticket.Id).ToListAsync(tokenCancelacion);
            resueltos.UnionWith(idsTickets.Select(id => (TipoEntidad.Ticket, id)));
        }

        if (numerosTarea.Count > 0)
        {
            var idsTareas = await _contexto.Tareas.Where(tarea => numerosTarea.Contains(tarea.NumeroTarea)).Select(tarea => tarea.Id).ToListAsync(tokenCancelacion);
            resueltos.UnionWith(idsTareas.Select(id => (TipoEntidad.Tarea, id)));
        }

        if (textosDocumento.Count > 0)
        {
            // La intercalación por defecto de SQL Server no distingue mayúsculas, así que el emparejamiento es flexible.
            var idsDocumentos = await _contexto.DocumentosMarkdown
                .Where(documento => textosDocumento.Contains(documento.Titulo) || textosDocumento.Contains(documento.RutaEsquema))
                .Select(documento => documento.Id)
                .ToListAsync(tokenCancelacion);
            resueltos.UnionWith(idsDocumentos.Select(id => (TipoEntidad.Documento, id)));
        }

        return resueltos;
    }
}
