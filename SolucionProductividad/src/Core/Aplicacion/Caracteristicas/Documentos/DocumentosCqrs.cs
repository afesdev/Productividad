using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Comun.Utilidades;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Documentos;

public sealed record EtiquetaDto(Guid Id, string Nombre, string Color);

public sealed record DocumentoResumenDto(
    Guid Id,
    Guid? ProyectoId,
    Guid? DocumentoPadreId,
    Guid? CarpetaDocumentoId,
    string Titulo,
    string RutaEsquema,
    string? Icono,
    bool EstaArchivado,
    bool EsFavorito,
    DateTime FechaActualizacion,
    DateTime? FechaArchivado,
    IReadOnlyList<EtiquetaDto> Etiquetas,
    EstadoDocumento Estado,
    DateTime? FechaRevision,
    bool PorRevisar);

public sealed record DocumentoDetalleDto(
    Guid Id,
    Guid? ProyectoId,
    Guid? DocumentoPadreId,
    Guid? CarpetaDocumentoId,
    string Titulo,
    string RutaEsquema,
    string ContenidoMarkdown,
    string? Icono,
    bool EstaArchivado,
    bool EsFavorito,
    Guid CreadoPor,
    DateTime FechaCreacion,
    DateTime FechaActualizacion,
    int TotalVersiones,
    IReadOnlyList<EtiquetaDto> Etiquetas,
    EstadoDocumento Estado,
    DateTime? FechaRevision,
    bool PorRevisar,
    Guid? DocumentoReemplazoId,
    string? TituloReemplazo);

/// <summary>Resultado del guardado: la versión creada (si hubo) permite mostrar "Versión 4 guardada".</summary>
public sealed record DocumentoGuardadoDto(DateTime FechaActualizacion, string RutaEsquema, int? NumeroVersionCreada);

public sealed record BacklinkDto(TipoEntidad TipoOrigen, Guid OrigenId, string Titulo);

public enum VistaDocumentos
{
    Activos,
    Favoritos,
    Papelera,
    Borradores,
    /// <summary>Con fecha de revisión cumplida y no obsoletos.</summary>
    PorRevisar,
    Obsoletos
}

internal static class VigenciaDocumento
{
    /// <summary>Un documento obsoleto no se revisa: ya se sabe que no aplica.</summary>
    public static bool PorRevisar(EstadoDocumento estado, DateTime? fechaRevision, DateTime ahoraUtc) =>
        estado != EstadoDocumento.Obsoleto && fechaRevision is { } fecha && fecha <= ahoraUtc;
}

internal static class RutasDocumento
{
    public const int LongitudMaximaRuta = 220;

    /// <summary>Construye "padre/slug" garantizando unicidad (entre los documentos del usuario) con sufijo numérico.</summary>
    public static async Task<string> GenerarRutaUnicaAsync(
        IContextoAplicacion contexto, string? rutaPadre, string titulo, Guid? documentoExcluidoId, CancellationToken tokenCancelacion)
    {
        var prefijo = string.IsNullOrEmpty(rutaPadre) ? string.Empty : rutaPadre + "/";
        var espacioDisponible = Math.Max(10, LongitudMaximaRuta - prefijo.Length - 4);
        var rutaBase = prefijo + GeneradorSlug.Generar(titulo, Math.Min(80, espacioDisponible));

        var rutaCandidata = rutaBase;
        for (var sufijo = 2; await contexto.DocumentosMarkdown.AnyAsync(
                 documento => documento.RutaEsquema == rutaCandidata && documento.Id != documentoExcluidoId, tokenCancelacion); sufijo++)
        {
            rutaCandidata = $"{rutaBase}-{sufijo}";
        }

        return rutaCandidata;
    }

    /// <summary>Al cambiar la ruta de un documento, sus descendientes cambian el prefijo.</summary>
    public static async Task ReubicarDescendientesAsync(IContextoAplicacion contexto, string rutaAnterior, string rutaNueva, CancellationToken tokenCancelacion)
    {
        var prefijoAnterior = rutaAnterior + "/";
        var descendientes = await contexto.DocumentosMarkdown
            .Where(documento => documento.RutaEsquema.StartsWith(prefijoAnterior))
            .ToListAsync(tokenCancelacion);

        foreach (var descendiente in descendientes)
        {
            var rutaReubicada = rutaNueva + "/" + descendiente.RutaEsquema[prefijoAnterior.Length..];
            descendiente.RutaEsquema = rutaReubicada.Length <= LongitudMaximaRuta ? rutaReubicada : rutaReubicada[..LongitudMaximaRuta];
        }
    }

    /// <summary>El documento y todas sus subpáginas (recorrido por DocumentoPadreId).</summary>
    public static async Task<List<DocumentoMarkdown>> ObtenerConDescendientesAsync(IContextoAplicacion contexto, DocumentoMarkdown raiz, CancellationToken tokenCancelacion)
    {
        var resultado = new List<DocumentoMarkdown> { raiz };
        var nivel = new List<Guid> { raiz.Id };
        while (nivel.Count > 0)
        {
            var hijos = await contexto.DocumentosMarkdown
                .Where(documento => documento.DocumentoPadreId != null && nivel.Contains(documento.DocumentoPadreId.Value))
                .ToListAsync(tokenCancelacion);
            resultado.AddRange(hijos);
            nivel = hijos.Select(hijo => hijo.Id).ToList();
        }
        return resultado;
    }
}

/// <summary>Política de versiones: una instantánea cuando se pide explícitamente o si la última tiene más de 10 minutos.</summary>
internal static class PoliticaVersiones
{
    public static readonly TimeSpan IntervaloMinimo = TimeSpan.FromMinutes(10);

    public static async Task<int?> CrearSiCorrespondeAsync(
        IContextoAplicacion contexto, DocumentoMarkdown documento, Guid usuarioId, bool forzar, CancellationToken tokenCancelacion)
    {
        var ultima = await contexto.VersionesDocumento
            .Where(version => version.DocumentoId == documento.Id)
            .OrderByDescending(version => version.NumeroVersion)
            .Select(version => new { version.NumeroVersion, version.Titulo, version.ContenidoMarkdown, version.FechaCreacion })
            .FirstOrDefaultAsync(tokenCancelacion);

        var sinCambios = ultima is not null && ultima.Titulo == documento.Titulo && ultima.ContenidoMarkdown == documento.ContenidoMarkdown;
        if (sinCambios)
            return null;
        if (!forzar && ultima is not null && DateTime.UtcNow - ultima.FechaCreacion < IntervaloMinimo)
            return null;

        var numero = (ultima?.NumeroVersion ?? 0) + 1;
        contexto.VersionesDocumento.Add(new VersionDocumento
        {
            DocumentoId = documento.Id,
            NumeroVersion = numero,
            Titulo = documento.Titulo,
            ContenidoMarkdown = documento.ContenidoMarkdown,
            CreadoPor = usuarioId
        });
        return numero;
    }
}

// ---------- Crear ----------

public sealed record CrearDocumentoComando(
    Guid? ProyectoId,
    Guid? DocumentoPadreId,
    string Titulo,
    string ContenidoMarkdown,
    string? Icono,
    Guid? CarpetaDocumentoId = null) : IRequest<Guid>;

public sealed class ValidadorCrearDocumentoComando : AbstractValidator<CrearDocumentoComando>
{
    public ValidadorCrearDocumentoComando()
    {
        RuleFor(comando => comando.Titulo).NotEmpty().MaximumLength(200);
        RuleFor(comando => comando.ContenidoMarkdown).NotNull();
        RuleFor(comando => comando.Icono).MaximumLength(50);
    }
}

public sealed class ManejadorCrearDocumentoComando : IRequestHandler<CrearDocumentoComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;
    private readonly IServicioProcesadorBacklinks _procesadorBacklinks;

    public ManejadorCrearDocumentoComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual, IServicioProcesadorBacklinks procesadorBacklinks)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
        _procesadorBacklinks = procesadorBacklinks;
    }

    public async Task<Guid> Handle(CrearDocumentoComando comando, CancellationToken tokenCancelacion)
    {
        string? rutaPadre = null;
        var carpetaId = comando.CarpetaDocumentoId;

        if (comando.DocumentoPadreId is { } documentoPadreId)
        {
            var padre = await _contexto.DocumentosMarkdown
                .Where(documento => documento.Id == documentoPadreId && !documento.EstaArchivado)
                .Select(documento => new { documento.RutaEsquema, documento.CarpetaDocumentoId })
                .FirstOrDefaultAsync(tokenCancelacion)
                ?? throw new ExcepcionEntidadNoEncontrada("el documento padre", documentoPadreId);
            rutaPadre = padre.RutaEsquema;
            // Una subpágina vive en la misma carpeta que su página padre.
            carpetaId = padre.CarpetaDocumentoId;
        }

        if (carpetaId is { } idCarpeta && !await _contexto.CarpetasDocumento.AnyAsync(carpeta => carpeta.Id == idCarpeta, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("la carpeta", idCarpeta);

        var documento = new DocumentoMarkdown
        {
            ProyectoId = comando.ProyectoId,
            DocumentoPadreId = comando.DocumentoPadreId,
            CarpetaDocumentoId = carpetaId,
            Titulo = comando.Titulo.Trim(),
            ContenidoMarkdown = comando.ContenidoMarkdown,
            Icono = comando.Icono,
            Estado = EstadoDocumento.Borrador,
            CreadoPor = _usuarioActual.ObtenerUsuarioIdRequerido()
        };
        documento.RutaEsquema = await RutasDocumento.GenerarRutaUnicaAsync(_contexto, rutaPadre, documento.Titulo, null, tokenCancelacion);

        _contexto.DocumentosMarkdown.Add(documento);
        await _procesadorBacklinks.ProcesarWikiLinksAsync(documento.ContenidoMarkdown, documento.Id, nameof(TipoEntidad.Documento), tokenCancelacion);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return documento.Id;
    }
}

// ---------- Guardar (autoguardado; Ctrl+S fuerza una versión) ----------

public sealed record ActualizarDocumentoComando(Guid Id, string Titulo, string ContenidoMarkdown, string? Icono, bool CrearVersion = false) : IRequest<DocumentoGuardadoDto>;

public sealed class ValidadorActualizarDocumentoComando : AbstractValidator<ActualizarDocumentoComando>
{
    public ValidadorActualizarDocumentoComando()
    {
        RuleFor(comando => comando.Id).NotEmpty();
        RuleFor(comando => comando.Titulo).NotEmpty().MaximumLength(200);
        RuleFor(comando => comando.ContenidoMarkdown).NotNull();
        RuleFor(comando => comando.Icono).MaximumLength(50);
    }
}

public sealed class ManejadorActualizarDocumentoComando : IRequestHandler<ActualizarDocumentoComando, DocumentoGuardadoDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioProcesadorBacklinks _procesadorBacklinks;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorActualizarDocumentoComando(IContextoAplicacion contexto, IServicioProcesadorBacklinks procesadorBacklinks, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _procesadorBacklinks = procesadorBacklinks;
        _usuarioActual = usuarioActual;
    }

    public async Task<DocumentoGuardadoDto> Handle(ActualizarDocumentoComando comando, CancellationToken tokenCancelacion)
    {
        var documento = await _contexto.DocumentosMarkdown.FirstOrDefaultAsync(documento => documento.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el documento", comando.Id);
        if (documento.EstaArchivado)
            throw new ExcepcionDominio("El documento está en la papelera. Restáuralo para editarlo.");

        var tituloNuevo = comando.Titulo.Trim();
        if (tituloNuevo != documento.Titulo)
        {
            var rutaAnterior = documento.RutaEsquema;
            var indiceSeparador = rutaAnterior.LastIndexOf('/');
            var rutaPadre = indiceSeparador < 0 ? null : rutaAnterior[..indiceSeparador];
            documento.RutaEsquema = await RutasDocumento.GenerarRutaUnicaAsync(_contexto, rutaPadre, tituloNuevo, documento.Id, tokenCancelacion);
            await RutasDocumento.ReubicarDescendientesAsync(_contexto, rutaAnterior, documento.RutaEsquema, tokenCancelacion);
        }

        var huboCambios = tituloNuevo != documento.Titulo || comando.ContenidoMarkdown != documento.ContenidoMarkdown || comando.Icono != documento.Icono;
        documento.Titulo = tituloNuevo;
        documento.ContenidoMarkdown = comando.ContenidoMarkdown;
        documento.Icono = comando.Icono;
        if (huboCambios)
            documento.FechaActualizacion = DateTime.UtcNow;

        var versionCreada = await PoliticaVersiones.CrearSiCorrespondeAsync(_contexto, documento, _usuarioActual.ObtenerUsuarioIdRequerido(), comando.CrearVersion, tokenCancelacion);

        await _procesadorBacklinks.ProcesarWikiLinksAsync(documento.ContenidoMarkdown, documento.Id, nameof(TipoEntidad.Documento), tokenCancelacion);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return new DocumentoGuardadoDto(documento.FechaActualizacion, documento.RutaEsquema, versionCreada);
    }
}

// ---------- Consultas ----------

internal static class ConsultasApoyoDocumentos
{
    public static async Task<ILookup<Guid, EtiquetaDto>> ObtenerEtiquetasPorDocumentoAsync(IContextoAplicacion contexto, IReadOnlyCollection<Guid> idsDocumentos, CancellationToken tokenCancelacion)
    {
        var relaciones = await (
                from relacion in contexto.DocumentosEtiquetas.AsNoTracking()
                join etiqueta in contexto.EtiquetasDocumento on relacion.EtiquetaId equals etiqueta.Id
                where idsDocumentos.Contains(relacion.DocumentoId)
                orderby etiqueta.Nombre
                select new { relacion.DocumentoId, Etiqueta = new EtiquetaDto(etiqueta.Id, etiqueta.Nombre, etiqueta.Color) })
            .ToListAsync(tokenCancelacion);
        return relaciones.ToLookup(relacion => relacion.DocumentoId, relacion => relacion.Etiqueta);
    }

    public static async Task<HashSet<Guid>> ObtenerFavoritosAsync(IContextoAplicacion contexto, CancellationToken tokenCancelacion) =>
        (await contexto.Marcadores.AsNoTracking()
            .Where(marcador => marcador.TipoEntidad == TipoEntidad.Documento)
            .Select(marcador => marcador.EntidadId)
            .ToListAsync(tokenCancelacion))
        .ToHashSet();
}

public sealed record ObtenerDocumentoPorIdConsulta(Guid Id) : IRequest<DocumentoDetalleDto>;

public sealed class ManejadorObtenerDocumentoPorIdConsulta : IRequestHandler<ObtenerDocumentoPorIdConsulta, DocumentoDetalleDto>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorObtenerDocumentoPorIdConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<DocumentoDetalleDto> Handle(ObtenerDocumentoPorIdConsulta consulta, CancellationToken tokenCancelacion)
    {
        var documento = await _contexto.DocumentosMarkdown.AsNoTracking().FirstOrDefaultAsync(documento => documento.Id == consulta.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el documento", consulta.Id);

        var etiquetas = await ConsultasApoyoDocumentos.ObtenerEtiquetasPorDocumentoAsync(_contexto, [documento.Id], tokenCancelacion);
        var esFavorito = await _contexto.Marcadores.AnyAsync(marcador => marcador.TipoEntidad == TipoEntidad.Documento && marcador.EntidadId == documento.Id, tokenCancelacion);
        var totalVersiones = await _contexto.VersionesDocumento.CountAsync(version => version.DocumentoId == documento.Id, tokenCancelacion);
        var tituloReemplazo = documento.DocumentoReemplazoId is { } reemplazoId
            ? await _contexto.DocumentosMarkdown.Where(otro => otro.Id == reemplazoId).Select(otro => otro.Titulo).FirstOrDefaultAsync(tokenCancelacion)
            : null;

        return new DocumentoDetalleDto(documento.Id, documento.ProyectoId, documento.DocumentoPadreId, documento.CarpetaDocumentoId, documento.Titulo,
            documento.RutaEsquema, documento.ContenidoMarkdown, documento.Icono, documento.EstaArchivado, esFavorito, documento.CreadoPor,
            documento.FechaCreacion, documento.FechaActualizacion, totalVersiones, etiquetas[documento.Id].ToList(),
            documento.Estado, documento.FechaRevision, VigenciaDocumento.PorRevisar(documento.Estado, documento.FechaRevision, DateTime.UtcNow),
            tituloReemplazo is null ? null : documento.DocumentoReemplazoId, tituloReemplazo);
    }
}

public sealed record ListarDocumentosConsulta(
    VistaDocumentos Vista = VistaDocumentos.Activos,
    Guid? CarpetaDocumentoId = null,
    Guid? EtiquetaId = null,
    string? Texto = null) : IRequest<IReadOnlyList<DocumentoResumenDto>>;

public sealed class ManejadorListarDocumentosConsulta : IRequestHandler<ListarDocumentosConsulta, IReadOnlyList<DocumentoResumenDto>>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorListarDocumentosConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<IReadOnlyList<DocumentoResumenDto>> Handle(ListarDocumentosConsulta consulta, CancellationToken tokenCancelacion)
    {
        var favoritos = await ConsultasApoyoDocumentos.ObtenerFavoritosAsync(_contexto, tokenCancelacion);

        var documentos = _contexto.DocumentosMarkdown.AsNoTracking()
            .Where(documento => documento.EstaArchivado == (consulta.Vista == VistaDocumentos.Papelera));

        var ahora = DateTime.UtcNow;
        documentos = consulta.Vista switch
        {
            VistaDocumentos.Favoritos => documentos.Where(documento => favoritos.Contains(documento.Id)),
            VistaDocumentos.Borradores => documentos.Where(documento => documento.Estado == EstadoDocumento.Borrador),
            VistaDocumentos.Obsoletos => documentos.Where(documento => documento.Estado == EstadoDocumento.Obsoleto),
            VistaDocumentos.PorRevisar => documentos.Where(documento =>
                documento.Estado != EstadoDocumento.Obsoleto && documento.FechaRevision != null && documento.FechaRevision <= ahora),
            _ => documentos
        };
        if (consulta.CarpetaDocumentoId is { } carpetaId)
            documentos = documentos.Where(documento => documento.CarpetaDocumentoId == carpetaId);
        if (consulta.EtiquetaId is { } etiquetaId)
            documentos = documentos.Where(documento => _contexto.DocumentosEtiquetas.Any(relacion => relacion.DocumentoId == documento.Id && relacion.EtiquetaId == etiquetaId));
        if (!string.IsNullOrWhiteSpace(consulta.Texto))
        {
            var texto = consulta.Texto.Trim();
            documentos = documentos.Where(documento => documento.Titulo.Contains(texto) || documento.ContenidoMarkdown.Contains(texto));
        }

        var lista = await documentos
            .OrderBy(documento => documento.RutaEsquema)
            .Select(documento => new
            {
                documento.Id,
                documento.ProyectoId,
                documento.DocumentoPadreId,
                documento.CarpetaDocumentoId,
                documento.Titulo,
                documento.RutaEsquema,
                documento.Icono,
                documento.EstaArchivado,
                documento.FechaActualizacion,
                documento.FechaArchivado,
                documento.Estado,
                documento.FechaRevision
            })
            .ToListAsync(tokenCancelacion);

        var etiquetas = await ConsultasApoyoDocumentos.ObtenerEtiquetasPorDocumentoAsync(_contexto, lista.Select(documento => documento.Id).ToList(), tokenCancelacion);

        return lista.Select(documento => new DocumentoResumenDto(documento.Id, documento.ProyectoId, documento.DocumentoPadreId, documento.CarpetaDocumentoId,
                documento.Titulo, documento.RutaEsquema, documento.Icono, documento.EstaArchivado, favoritos.Contains(documento.Id),
                documento.FechaActualizacion, documento.FechaArchivado, etiquetas[documento.Id].ToList(),
                documento.Estado, documento.FechaRevision, VigenciaDocumento.PorRevisar(documento.Estado, documento.FechaRevision, ahora)))
            .ToList();
    }
}

/// <summary>Quién enlaza a esta entidad mediante WikiLinks (solo orígenes visibles para el usuario).</summary>
public sealed record ObtenerBacklinksConsulta(TipoEntidad TipoDestino, Guid DestinoId) : IRequest<IReadOnlyList<BacklinkDto>>;

public sealed class ManejadorObtenerBacklinksConsulta : IRequestHandler<ObtenerBacklinksConsulta, IReadOnlyList<BacklinkDto>>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorObtenerBacklinksConsulta(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<IReadOnlyList<BacklinkDto>> Handle(ObtenerBacklinksConsulta consulta, CancellationToken tokenCancelacion)
    {
        var referencias = await _contexto.ReferenciasEntidades.AsNoTracking()
            .Where(referencia => referencia.TipoDestino == consulta.TipoDestino && referencia.DestinoId == consulta.DestinoId)
            .Select(referencia => new { referencia.TipoOrigen, referencia.OrigenId })
            .Distinct()
            .ToListAsync(tokenCancelacion);

        var idsPorTipo = referencias.ToLookup(referencia => referencia.TipoOrigen, referencia => referencia.OrigenId);

        // Los documentos en la papelera no cuentan como referencias activas.
        var idsDocumentos = idsPorTipo[TipoEntidad.Documento].ToList();
        var documentos = await _contexto.DocumentosMarkdown.AsNoTracking()
            .Where(documento => idsDocumentos.Contains(documento.Id) && !documento.EstaArchivado)
            .Select(documento => new BacklinkDto(TipoEntidad.Documento, documento.Id, documento.Titulo))
            .ToListAsync(tokenCancelacion);

        var idsTareas = idsPorTipo[TipoEntidad.Tarea].ToList();
        var tareas = await _contexto.Tareas.AsNoTracking()
            .Where(tarea => idsTareas.Contains(tarea.Id))
            .Select(tarea => new BacklinkDto(TipoEntidad.Tarea, tarea.Id, tarea.Titulo))
            .ToListAsync(tokenCancelacion);

        var idsTickets = idsPorTipo[TipoEntidad.Ticket].ToList();
        var tickets = await _contexto.Tickets.AsNoTracking()
            .Where(ticket => idsTickets.Contains(ticket.Id))
            .Select(ticket => new BacklinkDto(TipoEntidad.Ticket, ticket.Id, "TCK-" + ticket.NumeroTicket + " " + ticket.Asunto))
            .ToListAsync(tokenCancelacion);

        // Las bitácoras son privadas: solo se muestran las del usuario actual.
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var idsRegistros = idsPorTipo[TipoEntidad.RegistroDiario].ToList();
        var registros = (await _contexto.RegistrosDiarios.AsNoTracking()
                .Where(registro => idsRegistros.Contains(registro.Id) && registro.UsuarioId == usuarioId)
                .Select(registro => new { registro.Id, registro.FechaLog })
                .ToListAsync(tokenCancelacion))
            .Select(registro => new BacklinkDto(TipoEntidad.RegistroDiario, registro.Id, $"Bitácora {registro.FechaLog:yyyy-MM-dd}"));

        return documentos.Concat(tareas).Concat(tickets).Concat(registros).ToList();
    }
}
