using System.Globalization;
using System.Text;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Grafo;

/// <summary>Tipo de nodo: las entidades más dos agrupadores (etiquetas y sistemas).</summary>
public enum TipoNodoGrafo
{
    Documento,
    Tarea,
    Ticket,
    RegistroDiario,
    Flujo,
    Etiqueta,
    Sistema
}

public enum TipoAristaGrafo
{
    /// <summary>[[Enlace]] escrito en el contenido.</summary>
    Enlace,
    Etiqueta,
    Sistema,
    /// <summary>Ticket ↔ tarea relacionada, entrada del diario → tarea creada desde ella.</summary>
    Relacion,
    /// <summary>Subpágina → página padre.</summary>
    Jerarquia
}

/// <param name="Id">"Tipo:Guid" (o "Sistema:nombre-normalizado"): único en el grafo.</param>
/// <param name="EntidadId">Id de la entidad para abrirla; en un sistema, el del proyecto de soporte si existe.</param>
/// <param name="Color">Clave de paleta (etiquetas y sistemas con proyecto de soporte).</param>
public sealed record NodoGrafoDto(string Id, TipoNodoGrafo Tipo, Guid? EntidadId, string Titulo, string? Referencia, string? Color);

public sealed record AristaGrafoDto(string Origen, string Destino, TipoAristaGrafo Tipo);

/// <param name="Recortado">true si se alcanzó el límite de nodos de algún tipo (se priorizan los más recientes).</param>
public sealed record GrafoDto(IReadOnlyList<NodoGrafoDto> Nodos, IReadOnlyList<AristaGrafoDto> Aristas, bool Recortado);

/// <summary>Grafo de conocimiento del usuario: entidades, [[enlaces]], etiquetas, sistemas y relaciones directas.</summary>
public sealed record ObtenerGrafoConsulta : IRequest<GrafoDto>;

public sealed class ManejadorObtenerGrafoConsulta : IRequestHandler<ObtenerGrafoConsulta, GrafoDto>
{
    /// <summary>Tope por tipo para que el grafo siga siendo usable y la consulta ligera.</summary>
    public const int MaximoPorTipo = 1500;

    private readonly IContextoAplicacion _contexto;

    public ManejadorObtenerGrafoConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public static string IdNodo(TipoNodoGrafo tipo, Guid id) => $"{tipo}:{id}";

    /// <summary>Por nombre y no por valor: los dos enumerados no tienen el mismo orden.</summary>
    private static TipoNodoGrafo ANodo(TipoEntidad tipo) => Enum.Parse<TipoNodoGrafo>(tipo.ToString());

    /// <summary>Mismo criterio que el frontend: sin mayúsculas ni tildes ("SYGNUS" = "Sygnus").</summary>
    public static string NormalizarSistema(string nombre)
    {
        var descompuesto = nombre.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var limpio = new StringBuilder(descompuesto.Length);
        foreach (var caracter in descompuesto)
            if (CharUnicodeInfo.GetUnicodeCategory(caracter) != UnicodeCategory.NonSpacingMark)
                limpio.Append(caracter);
        return limpio.ToString();
    }

    public async Task<GrafoDto> Handle(ObtenerGrafoConsulta consulta, CancellationToken tokenCancelacion)
    {
        // Los filtros globales limitan cada consulta a lo del usuario actual.
        var documentos = await _contexto.DocumentosMarkdown.AsNoTracking()
            .Where(documento => !documento.EstaArchivado)
            .OrderByDescending(documento => documento.FechaActualizacion)
            .Take(MaximoPorTipo + 1)
            .Select(documento => new { documento.Id, documento.Titulo, documento.Icono, documento.DocumentoPadreId })
            .ToListAsync(tokenCancelacion);
        var tareas = await _contexto.Tareas.AsNoTracking()
            .Where(tarea => tarea.Estado != EstadoTarea.Cancelada)
            .OrderByDescending(tarea => tarea.FechaActualizacion)
            .Take(MaximoPorTipo + 1)
            .Select(tarea => new { tarea.Id, tarea.Titulo, Clave = tarea.ListaTareas!.Proyecto!.ClavePrefijo + "-" + tarea.NumeroTarea })
            .ToListAsync(tokenCancelacion);
        var tickets = await _contexto.Tickets.AsNoTracking()
            .Where(ticket => ticket.Estado != EstadoTicket.Cancelado)
            .OrderByDescending(ticket => ticket.FechaActualizacion)
            .Take(MaximoPorTipo + 1)
            .Select(ticket => new { ticket.Id, ticket.Asunto, ticket.NumeroTicket, ticket.TareaRelacionadaId })
            .ToListAsync(tokenCancelacion);
        var flujos = await _contexto.Flujos.AsNoTracking()
            .OrderByDescending(flujo => flujo.FechaActualizacion)
            .Take(MaximoPorTipo + 1)
            .Select(flujo => new { flujo.Id, flujo.Titulo, flujo.Sistema })
            .ToListAsync(tokenCancelacion);
        var etiquetas = await _contexto.EtiquetasDocumento.AsNoTracking().Select(etiqueta => new { etiqueta.Id, etiqueta.Nombre, etiqueta.Color }).ToListAsync(tokenCancelacion);
        var proyectosSoporte = await _contexto.ProyectosSoporte.AsNoTracking().Select(proyecto => new { proyecto.Id, proyecto.Nombre, proyecto.Color }).ToListAsync(tokenCancelacion);

        var recortado = documentos.Count > MaximoPorTipo || tareas.Count > MaximoPorTipo || tickets.Count > MaximoPorTipo || flujos.Count > MaximoPorTipo;
        documentos = documentos.Take(MaximoPorTipo).ToList();
        tareas = tareas.Take(MaximoPorTipo).ToList();
        tickets = tickets.Take(MaximoPorTipo).ToList();
        flujos = flujos.Take(MaximoPorTipo).ToList();

        var nodos = new Dictionary<string, NodoGrafoDto>();
        void Agregar(NodoGrafoDto nodo) => nodos.TryAdd(nodo.Id, nodo);

        foreach (var documento in documentos)
            Agregar(new NodoGrafoDto(IdNodo(TipoNodoGrafo.Documento, documento.Id), TipoNodoGrafo.Documento, documento.Id, documento.Titulo, documento.Icono, null));
        foreach (var tarea in tareas)
            Agregar(new NodoGrafoDto(IdNodo(TipoNodoGrafo.Tarea, tarea.Id), TipoNodoGrafo.Tarea, tarea.Id, tarea.Titulo, tarea.Clave, null));
        foreach (var ticket in tickets)
            Agregar(new NodoGrafoDto(IdNodo(TipoNodoGrafo.Ticket, ticket.Id), TipoNodoGrafo.Ticket, ticket.Id, ticket.Asunto, $"TCK-{ticket.NumeroTicket}", null));
        foreach (var flujo in flujos)
            Agregar(new NodoGrafoDto(IdNodo(TipoNodoGrafo.Flujo, flujo.Id), TipoNodoGrafo.Flujo, flujo.Id, flujo.Titulo, flujo.Sistema, null));
        foreach (var etiqueta in etiquetas)
            Agregar(new NodoGrafoDto(IdNodo(TipoNodoGrafo.Etiqueta, etiqueta.Id), TipoNodoGrafo.Etiqueta, etiqueta.Id, etiqueta.Nombre, null, etiqueta.Color));

        // Sistemas unificados por nombre: proyectos de soporte y el campo libre de los flujos.
        string NodoSistema(string nombre) => $"{TipoNodoGrafo.Sistema}:{NormalizarSistema(nombre)}";
        foreach (var proyecto in proyectosSoporte)
            Agregar(new NodoGrafoDto(NodoSistema(proyecto.Nombre), TipoNodoGrafo.Sistema, proyecto.Id, proyecto.Nombre, "Proyecto de soporte", proyecto.Color));
        foreach (var sistema in flujos.Where(flujo => !string.IsNullOrWhiteSpace(flujo.Sistema)).Select(flujo => flujo.Sistema!.Trim()))
            Agregar(new NodoGrafoDto(NodoSistema(sistema), TipoNodoGrafo.Sistema, null, sistema, "Sistema de flujos", null));

        var aristas = new HashSet<AristaGrafoDto>();
        void Unir(string origen, string destino, TipoAristaGrafo tipo)
        {
            if (origen != destino && nodos.ContainsKey(origen) && nodos.ContainsKey(destino)) aristas.Add(new AristaGrafoDto(origen, destino, tipo));
        }

        // Días del diario: solo los que participan en un enlace o relación (si no, serían cientos de nodos sueltos).
        var idsTareas = tareas.Select(tarea => tarea.Id).ToHashSet();
        var diasConTarea = await _contexto.EntradasDiario.AsNoTracking()
            .Where(entrada => entrada.TareaId != null)
            .Select(entrada => new { entrada.RegistroDiarioId, TareaId = entrada.TareaId!.Value, entrada.RegistroDiario!.FechaLog })
            .ToListAsync(tokenCancelacion);

        // [[Enlaces]]: ReferenciasEntidades no tiene filtro global; se limita a los nodos visibles del usuario.
        var idsEntidades = nodos.Values.Where(nodo => nodo.EntidadId is not null && nodo.Tipo <= TipoNodoGrafo.Flujo).Select(nodo => nodo.EntidadId!.Value).ToList();
        var registrosDiario = await _contexto.RegistrosDiarios.AsNoTracking().Select(registro => new { registro.Id, registro.FechaLog }).ToListAsync(tokenCancelacion);
        var idsRegistros = registrosDiario.Select(registro => registro.Id).ToHashSet();
        var referencias = await _contexto.ReferenciasEntidades.AsNoTracking()
            .Where(referencia => idsEntidades.Contains(referencia.OrigenId) || idsEntidades.Contains(referencia.DestinoId) || idsRegistros.Contains(referencia.OrigenId))
            .Select(referencia => new { referencia.TipoOrigen, referencia.OrigenId, referencia.TipoDestino, referencia.DestinoId })
            .ToListAsync(tokenCancelacion);

        var fechaRegistro = registrosDiario.ToDictionary(registro => registro.Id, registro => registro.FechaLog);
        void AgregarDia(Guid registroId)
        {
            if (fechaRegistro.TryGetValue(registroId, out var fecha))
                Agregar(new NodoGrafoDto(IdNodo(TipoNodoGrafo.RegistroDiario, registroId), TipoNodoGrafo.RegistroDiario, registroId, $"Diario {fecha:dd/MM/yyyy}", fecha.ToString("yyyy-MM-dd"), null));
        }

        foreach (var referencia in referencias)
        {
            if (referencia.TipoOrigen == TipoEntidad.RegistroDiario) AgregarDia(referencia.OrigenId);
            if (referencia.TipoDestino == TipoEntidad.RegistroDiario) AgregarDia(referencia.DestinoId);
            Unir(IdNodo(ANodo(referencia.TipoOrigen), referencia.OrigenId), IdNodo(ANodo(referencia.TipoDestino), referencia.DestinoId), TipoAristaGrafo.Enlace);
        }
        foreach (var dia in diasConTarea.Where(dia => idsTareas.Contains(dia.TareaId)))
        {
            AgregarDia(dia.RegistroDiarioId);
            Unir(IdNodo(TipoNodoGrafo.RegistroDiario, dia.RegistroDiarioId), IdNodo(TipoNodoGrafo.Tarea, dia.TareaId), TipoAristaGrafo.Relacion);
        }

        // Etiquetas (catálogo compartido).
        foreach (var relacion in await _contexto.DocumentosEtiquetas.AsNoTracking().Select(relacion => new { relacion.DocumentoId, relacion.EtiquetaId }).ToListAsync(tokenCancelacion))
            Unir(IdNodo(TipoNodoGrafo.Documento, relacion.DocumentoId), IdNodo(TipoNodoGrafo.Etiqueta, relacion.EtiquetaId), TipoAristaGrafo.Etiqueta);
        foreach (var relacion in await _contexto.TicketsEtiquetas.AsNoTracking().Select(relacion => new { relacion.TicketId, relacion.EtiquetaId }).ToListAsync(tokenCancelacion))
            Unir(IdNodo(TipoNodoGrafo.Ticket, relacion.TicketId), IdNodo(TipoNodoGrafo.Etiqueta, relacion.EtiquetaId), TipoAristaGrafo.Etiqueta);
        foreach (var relacion in await _contexto.TareasEtiquetas.AsNoTracking().Select(relacion => new { relacion.TareaId, relacion.EtiquetaId }).ToListAsync(tokenCancelacion))
            Unir(IdNodo(TipoNodoGrafo.Tarea, relacion.TareaId), IdNodo(TipoNodoGrafo.Etiqueta, relacion.EtiquetaId), TipoAristaGrafo.Etiqueta);

        // Sistemas.
        var nombreProyecto = proyectosSoporte.ToDictionary(proyecto => proyecto.Id, proyecto => proyecto.Nombre);
        foreach (var relacion in await _contexto.TicketsProyectos.AsNoTracking().Select(relacion => new { relacion.TicketId, relacion.ProyectoSoporteId }).ToListAsync(tokenCancelacion))
            if (nombreProyecto.TryGetValue(relacion.ProyectoSoporteId, out var nombre))
                Unir(IdNodo(TipoNodoGrafo.Ticket, relacion.TicketId), NodoSistema(nombre), TipoAristaGrafo.Sistema);
        foreach (var flujo in flujos.Where(flujo => !string.IsNullOrWhiteSpace(flujo.Sistema)))
            Unir(IdNodo(TipoNodoGrafo.Flujo, flujo.Id), NodoSistema(flujo.Sistema!), TipoAristaGrafo.Sistema);

        // Relaciones directas y jerarquía.
        foreach (var ticket in tickets.Where(ticket => ticket.TareaRelacionadaId != null))
            Unir(IdNodo(TipoNodoGrafo.Ticket, ticket.Id), IdNodo(TipoNodoGrafo.Tarea, ticket.TareaRelacionadaId!.Value), TipoAristaGrafo.Relacion);
        foreach (var documento in documentos.Where(documento => documento.DocumentoPadreId != null))
            Unir(IdNodo(TipoNodoGrafo.Documento, documento.Id), IdNodo(TipoNodoGrafo.Documento, documento.DocumentoPadreId!.Value), TipoAristaGrafo.Jerarquia);

        return new GrafoDto(nodos.Values.ToList(), aristas.ToList(), recortado);
    }
}
