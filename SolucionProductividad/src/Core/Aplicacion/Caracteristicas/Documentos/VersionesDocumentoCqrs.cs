using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Documentos;

public sealed record VersionResumenDto(Guid Id, int NumeroVersion, string Titulo, string NombreAutor, DateTime FechaCreacion, int Caracteres);

public sealed record VersionDetalleDto(Guid Id, Guid DocumentoId, int NumeroVersion, string Titulo, string ContenidoMarkdown, string NombreAutor, DateTime FechaCreacion);

public sealed record ListarVersionesDocumentoConsulta(Guid DocumentoId) : IRequest<IReadOnlyList<VersionResumenDto>>;

public sealed class ManejadorListarVersionesDocumentoConsulta : IRequestHandler<ListarVersionesDocumentoConsulta, IReadOnlyList<VersionResumenDto>>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorListarVersionesDocumentoConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<IReadOnlyList<VersionResumenDto>> Handle(ListarVersionesDocumentoConsulta consulta, CancellationToken tokenCancelacion)
    {
        if (!await _contexto.DocumentosMarkdown.AnyAsync(documento => documento.Id == consulta.DocumentoId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("el documento", consulta.DocumentoId);

        return await _contexto.VersionesDocumento.AsNoTracking()
            .Where(version => version.DocumentoId == consulta.DocumentoId)
            .OrderByDescending(version => version.NumeroVersion)
            .Select(version => new VersionResumenDto(
                version.Id,
                version.NumeroVersion,
                version.Titulo,
                _contexto.Usuarios.Where(usuario => usuario.Id == version.CreadoPor).Select(usuario => usuario.NombreCompleto).FirstOrDefault() ?? "—",
                version.FechaCreacion,
                version.ContenidoMarkdown.Length))
            .ToListAsync(tokenCancelacion);
    }
}

public sealed record ObtenerVersionDocumentoConsulta(Guid VersionId) : IRequest<VersionDetalleDto>;

public sealed class ManejadorObtenerVersionDocumentoConsulta : IRequestHandler<ObtenerVersionDocumentoConsulta, VersionDetalleDto>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorObtenerVersionDocumentoConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<VersionDetalleDto> Handle(ObtenerVersionDocumentoConsulta consulta, CancellationToken tokenCancelacion) =>
        await _contexto.VersionesDocumento.AsNoTracking()
            .Where(version => version.Id == consulta.VersionId)
            .Select(version => new VersionDetalleDto(
                version.Id,
                version.DocumentoId,
                version.NumeroVersion,
                version.Titulo,
                version.ContenidoMarkdown,
                _contexto.Usuarios.Where(usuario => usuario.Id == version.CreadoPor).Select(usuario => usuario.NombreCompleto).FirstOrDefault() ?? "—",
                version.FechaCreacion))
            .FirstOrDefaultAsync(tokenCancelacion)
        ?? throw new ExcepcionEntidadNoEncontrada("la versión", consulta.VersionId);
}

/// <summary>
/// Devuelve el documento al contenido de una versión. Antes guarda el estado actual como versión,
/// así restaurar también se puede deshacer.
/// </summary>
public sealed record RestaurarVersionDocumentoComando(Guid VersionId) : IRequest<DocumentoGuardadoDto>;

public sealed class ManejadorRestaurarVersionDocumentoComando : IRequestHandler<RestaurarVersionDocumentoComando, DocumentoGuardadoDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;
    private readonly IServicioProcesadorBacklinks _procesadorBacklinks;

    public ManejadorRestaurarVersionDocumentoComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual, IServicioProcesadorBacklinks procesadorBacklinks)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
        _procesadorBacklinks = procesadorBacklinks;
    }

    public async Task<DocumentoGuardadoDto> Handle(RestaurarVersionDocumentoComando comando, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var version = await _contexto.VersionesDocumento.AsNoTracking().FirstOrDefaultAsync(version => version.Id == comando.VersionId, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("la versión", comando.VersionId);
        var documento = await _contexto.DocumentosMarkdown.FirstAsync(documento => documento.Id == version.DocumentoId, tokenCancelacion);
        if (documento.EstaArchivado)
            throw new ExcepcionDominio("El documento está en la papelera. Restáuralo para recuperar versiones.");

        // 1) Respaldo del estado actual; 2) contenido de la versión elegida (el título se conserva para no mover rutas).
        var versionRespaldo = await PoliticaVersiones.CrearSiCorrespondeAsync(_contexto, documento, usuarioId, forzar: true, tokenCancelacion);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);

        documento.ContenidoMarkdown = version.ContenidoMarkdown;
        documento.FechaActualizacion = DateTime.UtcNow;
        var versionRestaurada = await PoliticaVersiones.CrearSiCorrespondeAsync(_contexto, documento, usuarioId, forzar: true, tokenCancelacion);

        await _procesadorBacklinks.ProcesarWikiLinksAsync(documento.ContenidoMarkdown, documento.Id, nameof(TipoEntidad.Documento), tokenCancelacion);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return new DocumentoGuardadoDto(documento.FechaActualizacion, documento.RutaEsquema, versionRestaurada ?? versionRespaldo);
    }
}
