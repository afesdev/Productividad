using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Documentos;

public sealed record CarpetaDocumentoDto(Guid Id, Guid? CarpetaPadreId, string Nombre, string? Color, int IndiceOrden, int TotalDocumentos);

public sealed record EtiquetaConConteoDto(Guid Id, string Nombre, string Color, int TotalDocumentos);

public sealed record EstructuraDocumentosDto(
    IReadOnlyList<CarpetaDocumentoDto> Carpetas,
    IReadOnlyList<EtiquetaConConteoDto> Etiquetas,
    int TotalDocumentos,
    int TotalFavoritos,
    int TotalPapelera);

/// <summary>Colores permitidos (claves de la paleta del frontend) para carpetas y etiquetas.</summary>
internal static class PaletaDocumentos
{
    public static readonly HashSet<string> Colores = ["gris", "rojo", "naranja", "ambar", "verde", "turquesa", "azul", "violeta", "rosa"];
}

// ---------- Estructura para la barra lateral ----------

public sealed record ObtenerEstructuraDocumentosConsulta : IRequest<EstructuraDocumentosDto>;

public sealed class ManejadorObtenerEstructuraDocumentosConsulta : IRequestHandler<ObtenerEstructuraDocumentosConsulta, EstructuraDocumentosDto>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorObtenerEstructuraDocumentosConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<EstructuraDocumentosDto> Handle(ObtenerEstructuraDocumentosConsulta consulta, CancellationToken tokenCancelacion)
    {
        var activos = _contexto.DocumentosMarkdown.AsNoTracking().Where(documento => !documento.EstaArchivado);

        var carpetas = await _contexto.CarpetasDocumento.AsNoTracking()
            .OrderBy(carpeta => carpeta.IndiceOrden).ThenBy(carpeta => carpeta.Nombre)
            .Select(carpeta => new CarpetaDocumentoDto(carpeta.Id, carpeta.CarpetaPadreId, carpeta.Nombre, carpeta.Color, carpeta.IndiceOrden,
                activos.Count(documento => documento.CarpetaDocumentoId == carpeta.Id)))
            .ToListAsync(tokenCancelacion);

        var etiquetas = await _contexto.EtiquetasDocumento.AsNoTracking()
            .OrderBy(etiqueta => etiqueta.Nombre)
            .Select(etiqueta => new EtiquetaConConteoDto(etiqueta.Id, etiqueta.Nombre, etiqueta.Color,
                _contexto.DocumentosEtiquetas.Count(relacion => relacion.EtiquetaId == etiqueta.Id && activos.Any(documento => documento.Id == relacion.DocumentoId))))
            .ToListAsync(tokenCancelacion);

        var favoritos = await ConsultasApoyoDocumentos.ObtenerFavoritosAsync(_contexto, tokenCancelacion);

        return new EstructuraDocumentosDto(
            carpetas,
            etiquetas,
            await activos.CountAsync(tokenCancelacion),
            await activos.CountAsync(documento => favoritos.Contains(documento.Id), tokenCancelacion),
            await _contexto.DocumentosMarkdown.CountAsync(documento => documento.EstaArchivado, tokenCancelacion));
    }
}

// ---------- Carpetas ----------

/// <param name="Id">null = crear.</param>
public sealed record GuardarCarpetaDocumentoComando(Guid? Id, string Nombre, Guid? CarpetaPadreId, string? Color) : IRequest<Guid>;

public sealed class ValidadorGuardarCarpetaDocumentoComando : AbstractValidator<GuardarCarpetaDocumentoComando>
{
    public ValidadorGuardarCarpetaDocumentoComando()
    {
        RuleFor(comando => comando.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(comando => comando.Color).Must(color => color is null || PaletaDocumentos.Colores.Contains(color)).WithMessage("Color no válido.");
        RuleFor(comando => comando.CarpetaPadreId).NotEqual(comando => comando.Id).When(comando => comando.Id.HasValue).WithMessage("Una carpeta no puede estar dentro de sí misma.");
    }
}

public sealed class ManejadorGuardarCarpetaDocumentoComando : IRequestHandler<GuardarCarpetaDocumentoComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorGuardarCarpetaDocumentoComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<Guid> Handle(GuardarCarpetaDocumentoComando comando, CancellationToken tokenCancelacion)
    {
        CarpetaDocumento carpeta;
        if (comando.Id is { } id)
        {
            carpeta = await _contexto.CarpetasDocumento.FirstOrDefaultAsync(existente => existente.Id == id, tokenCancelacion)
                ?? throw new ExcepcionEntidadNoEncontrada("la carpeta", id);
        }
        else
        {
            var siguienteIndice = await _contexto.CarpetasDocumento
                .Where(existente => existente.CarpetaPadreId == comando.CarpetaPadreId)
                .Select(existente => (int?)existente.IndiceOrden)
                .MaxAsync(tokenCancelacion) ?? -1;
            carpeta = new CarpetaDocumento { UsuarioId = _usuarioActual.ObtenerUsuarioIdRequerido(), IndiceOrden = siguienteIndice + 1 };
            _contexto.CarpetasDocumento.Add(carpeta);
        }

        if (comando.CarpetaPadreId is { } padreId)
        {
            // Recorre los ancestros del destino: si aparece la propia carpeta, moverla crearía un ciclo.
            var padres = await _contexto.CarpetasDocumento.AsNoTracking().ToDictionaryAsync(candidata => candidata.Id, candidata => candidata.CarpetaPadreId, tokenCancelacion);
            if (!padres.ContainsKey(padreId))
                throw new ExcepcionEntidadNoEncontrada("la carpeta destino", padreId);

            for (Guid? actual = padreId; actual is { } idActual; actual = padres.GetValueOrDefault(idActual))
            {
                if (idActual == carpeta.Id)
                    throw new ExcepcionDominio("No se puede mover una carpeta dentro de una de sus subcarpetas.");
            }
        }

        carpeta.Nombre = comando.Nombre.Trim();
        carpeta.CarpetaPadreId = comando.CarpetaPadreId;
        carpeta.Color = comando.Color;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return carpeta.Id;
    }
}

/// <summary>Eliminar una carpeta no borra su contenido: documentos y subcarpetas suben un nivel.</summary>
public sealed record EliminarCarpetaDocumentoComando(Guid Id) : IRequest;

public sealed class ManejadorEliminarCarpetaDocumentoComando : IRequestHandler<EliminarCarpetaDocumentoComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorEliminarCarpetaDocumentoComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(EliminarCarpetaDocumentoComando comando, CancellationToken tokenCancelacion)
    {
        var carpeta = await _contexto.CarpetasDocumento.FirstOrDefaultAsync(carpeta => carpeta.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("la carpeta", comando.Id);

        foreach (var documento in await _contexto.DocumentosMarkdown.Where(documento => documento.CarpetaDocumentoId == carpeta.Id).ToListAsync(tokenCancelacion))
            documento.CarpetaDocumentoId = carpeta.CarpetaPadreId;
        foreach (var subcarpeta in await _contexto.CarpetasDocumento.Where(subcarpeta => subcarpeta.CarpetaPadreId == carpeta.Id).ToListAsync(tokenCancelacion))
            subcarpeta.CarpetaPadreId = carpeta.CarpetaPadreId;

        _contexto.CarpetasDocumento.Remove(carpeta);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Etiquetas ----------

public sealed record GuardarEtiquetaDocumentoComando(Guid? Id, string Nombre, string Color) : IRequest<Guid>;

public sealed class ValidadorGuardarEtiquetaDocumentoComando : AbstractValidator<GuardarEtiquetaDocumentoComando>
{
    public ValidadorGuardarEtiquetaDocumentoComando()
    {
        RuleFor(comando => comando.Nombre).NotEmpty().MaximumLength(50);
        RuleFor(comando => comando.Color).Must(PaletaDocumentos.Colores.Contains).WithMessage("Color no válido.");
    }
}

public sealed class ManejadorGuardarEtiquetaDocumentoComando : IRequestHandler<GuardarEtiquetaDocumentoComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorGuardarEtiquetaDocumentoComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<Guid> Handle(GuardarEtiquetaDocumentoComando comando, CancellationToken tokenCancelacion)
    {
        var nombre = comando.Nombre.Trim().TrimStart('#');
        if (await _contexto.EtiquetasDocumento.AnyAsync(etiqueta => etiqueta.Nombre == nombre && etiqueta.Id != comando.Id, tokenCancelacion))
            throw new ExcepcionConflicto($"Ya tienes una etiqueta llamada \"{nombre}\".");

        EtiquetaDocumento etiqueta;
        if (comando.Id is { } id)
        {
            etiqueta = await _contexto.EtiquetasDocumento.FirstOrDefaultAsync(existente => existente.Id == id, tokenCancelacion)
                ?? throw new ExcepcionEntidadNoEncontrada("la etiqueta", id);
        }
        else
        {
            etiqueta = new EtiquetaDocumento { UsuarioId = _usuarioActual.ObtenerUsuarioIdRequerido() };
            _contexto.EtiquetasDocumento.Add(etiqueta);
        }

        etiqueta.Nombre = nombre;
        etiqueta.Color = comando.Color;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return etiqueta.Id;
    }
}

public sealed record EliminarEtiquetaDocumentoComando(Guid Id) : IRequest;

public sealed class ManejadorEliminarEtiquetaDocumentoComando : IRequestHandler<EliminarEtiquetaDocumentoComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorEliminarEtiquetaDocumentoComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(EliminarEtiquetaDocumentoComando comando, CancellationToken tokenCancelacion)
    {
        var etiqueta = await _contexto.EtiquetasDocumento.FirstOrDefaultAsync(etiqueta => etiqueta.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("la etiqueta", comando.Id);
        _contexto.EtiquetasDocumento.Remove(etiqueta);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

/// <summary>Reemplaza el conjunto de etiquetas del documento.</summary>
public sealed record AsignarEtiquetasDocumentoComando(Guid DocumentoId, IReadOnlyList<Guid> EtiquetaIds) : IRequest<IReadOnlyList<EtiquetaDto>>;

public sealed class ManejadorAsignarEtiquetasDocumentoComando : IRequestHandler<AsignarEtiquetasDocumentoComando, IReadOnlyList<EtiquetaDto>>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorAsignarEtiquetasDocumentoComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<IReadOnlyList<EtiquetaDto>> Handle(AsignarEtiquetasDocumentoComando comando, CancellationToken tokenCancelacion)
    {
        if (!await _contexto.DocumentosMarkdown.AnyAsync(documento => documento.Id == comando.DocumentoId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("el documento", comando.DocumentoId);

        var idsSolicitados = comando.EtiquetaIds.Distinct().ToList();
        var etiquetas = await _contexto.EtiquetasDocumento.Where(etiqueta => idsSolicitados.Contains(etiqueta.Id)).ToListAsync(tokenCancelacion);
        if (etiquetas.Count != idsSolicitados.Count)
            throw new ExcepcionEntidadNoEncontrada("la etiqueta", string.Join(", ", idsSolicitados.Except(etiquetas.Select(etiqueta => etiqueta.Id))));

        var actuales = await _contexto.DocumentosEtiquetas.Where(relacion => relacion.DocumentoId == comando.DocumentoId).ToListAsync(tokenCancelacion);
        _contexto.DocumentosEtiquetas.RemoveRange(actuales.Where(relacion => !idsSolicitados.Contains(relacion.EtiquetaId)));
        foreach (var etiquetaId in idsSolicitados.Where(id => actuales.All(relacion => relacion.EtiquetaId != id)))
            _contexto.DocumentosEtiquetas.Add(new DocumentoEtiqueta { DocumentoId = comando.DocumentoId, EtiquetaId = etiquetaId });

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return etiquetas.OrderBy(etiqueta => etiqueta.Nombre).Select(etiqueta => new EtiquetaDto(etiqueta.Id, etiqueta.Nombre, etiqueta.Color)).ToList();
    }
}

// ---------- Mover a otra carpeta ----------

/// <summary>Mueve el documento (y sus subpáginas) a una carpeta; si era subpágina, pasa a ser página raíz.</summary>
public sealed record MoverDocumentoComando(Guid Id, Guid? CarpetaDocumentoId) : IRequest;

public sealed class ManejadorMoverDocumentoComando : IRequestHandler<MoverDocumentoComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorMoverDocumentoComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(MoverDocumentoComando comando, CancellationToken tokenCancelacion)
    {
        var documento = await _contexto.DocumentosMarkdown.FirstOrDefaultAsync(documento => documento.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el documento", comando.Id);
        if (comando.CarpetaDocumentoId is { } carpetaId && !await _contexto.CarpetasDocumento.AnyAsync(carpeta => carpeta.Id == carpetaId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("la carpeta", carpetaId);

        if (documento.DocumentoPadreId is not null)
        {
            var rutaAnterior = documento.RutaEsquema;
            documento.DocumentoPadreId = null;
            documento.RutaEsquema = await RutasDocumento.GenerarRutaUnicaAsync(_contexto, null, documento.Titulo, documento.Id, tokenCancelacion);
            await RutasDocumento.ReubicarDescendientesAsync(_contexto, rutaAnterior, documento.RutaEsquema, tokenCancelacion);
        }

        foreach (var afectado in await RutasDocumento.ObtenerConDescendientesAsync(_contexto, documento, tokenCancelacion))
            afectado.CarpetaDocumentoId = comando.CarpetaDocumentoId;

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Vigencia: estado, fecha de revisión y reemplazo ----------

/// <param name="FechaRevision">A partir de esta fecha el documento aparece "por revisar". null = sin revisión programada.</param>
/// <param name="DocumentoReemplazoId">Solo aplica si el estado es Obsoleto; en otro caso se descarta.</param>
public sealed record ActualizarVigenciaDocumentoComando(Guid Id, EstadoDocumento Estado, DateTime? FechaRevision, Guid? DocumentoReemplazoId) : IRequest;

public sealed class ValidadorActualizarVigenciaDocumentoComando : AbstractValidator<ActualizarVigenciaDocumentoComando>
{
    public ValidadorActualizarVigenciaDocumentoComando()
    {
        RuleFor(comando => comando.Estado).IsInEnum();
        RuleFor(comando => comando.DocumentoReemplazoId).NotEqual(comando => comando.Id).When(comando => comando.DocumentoReemplazoId is not null)
            .WithMessage("Un documento no puede reemplazarse a sí mismo.");
    }
}

public sealed class ManejadorActualizarVigenciaDocumentoComando : IRequestHandler<ActualizarVigenciaDocumentoComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorActualizarVigenciaDocumentoComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(ActualizarVigenciaDocumentoComando comando, CancellationToken tokenCancelacion)
    {
        var documento = await _contexto.DocumentosMarkdown.FirstOrDefaultAsync(documento => documento.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el documento", comando.Id);

        var reemplazoId = comando.Estado == EstadoDocumento.Obsoleto ? comando.DocumentoReemplazoId : null;
        // El filtro por usuario del contexto garantiza que el reemplazo sea un documento propio.
        if (reemplazoId is { } idReemplazo && !await _contexto.DocumentosMarkdown.AnyAsync(otro => otro.Id == idReemplazo && !otro.EstaArchivado, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("el documento de reemplazo", idReemplazo);

        documento.Estado = comando.Estado;
        documento.FechaRevision = comando.FechaRevision;
        documento.DocumentoReemplazoId = reemplazoId;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Favoritos ----------

public sealed record MarcarFavoritoDocumentoComando(Guid Id, bool EsFavorito) : IRequest;

public sealed class ManejadorMarcarFavoritoDocumentoComando : IRequestHandler<MarcarFavoritoDocumentoComando>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorMarcarFavoritoDocumentoComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task Handle(MarcarFavoritoDocumentoComando comando, CancellationToken tokenCancelacion)
    {
        var titulo = await _contexto.DocumentosMarkdown.Where(documento => documento.Id == comando.Id).Select(documento => documento.Titulo).FirstOrDefaultAsync(tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el documento", comando.Id);
        var marcador = await _contexto.Marcadores.FirstOrDefaultAsync(marcador => marcador.TipoEntidad == TipoEntidad.Documento && marcador.EntidadId == comando.Id, tokenCancelacion);

        if (comando.EsFavorito && marcador is null)
        {
            var siguienteIndice = await _contexto.Marcadores.Select(existente => (int?)existente.IndiceOrden).MaxAsync(tokenCancelacion) ?? -1;
            _contexto.Marcadores.Add(new Marcador
            {
                UsuarioId = _usuarioActual.ObtenerUsuarioIdRequerido(),
                TipoEntidad = TipoEntidad.Documento,
                EntidadId = comando.Id,
                Titulo = titulo,
                IndiceOrden = siguienteIndice + 1
            });
        }
        else if (!comando.EsFavorito && marcador is not null)
        {
            _contexto.Marcadores.Remove(marcador);
        }

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Papelera ----------

/// <summary>Envía el documento y sus subpáginas a la papelera.</summary>
public sealed record MoverDocumentoAPapeleraComando(Guid Id) : IRequest;

public sealed class ManejadorMoverDocumentoAPapeleraComando : IRequestHandler<MoverDocumentoAPapeleraComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorMoverDocumentoAPapeleraComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(MoverDocumentoAPapeleraComando comando, CancellationToken tokenCancelacion)
    {
        var documento = await _contexto.DocumentosMarkdown.FirstOrDefaultAsync(documento => documento.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el documento", comando.Id);
        var ahora = DateTime.UtcNow;
        foreach (var afectado in await RutasDocumento.ObtenerConDescendientesAsync(_contexto, documento, tokenCancelacion))
        {
            afectado.EstaArchivado = true;
            afectado.FechaArchivado ??= ahora;
        }
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

public sealed record RestaurarDocumentoComando(Guid Id) : IRequest;

public sealed class ManejadorRestaurarDocumentoComando : IRequestHandler<RestaurarDocumentoComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorRestaurarDocumentoComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(RestaurarDocumentoComando comando, CancellationToken tokenCancelacion)
    {
        var documento = await _contexto.DocumentosMarkdown.FirstOrDefaultAsync(documento => documento.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el documento", comando.Id);

        // Si su página padre sigue en la papelera, se restaura como página raíz para que sea visible.
        if (documento.DocumentoPadreId is { } padreId &&
            await _contexto.DocumentosMarkdown.AnyAsync(padre => padre.Id == padreId && padre.EstaArchivado, tokenCancelacion))
        {
            var rutaAnterior = documento.RutaEsquema;
            documento.DocumentoPadreId = null;
            documento.RutaEsquema = await RutasDocumento.GenerarRutaUnicaAsync(_contexto, null, documento.Titulo, documento.Id, tokenCancelacion);
            await RutasDocumento.ReubicarDescendientesAsync(_contexto, rutaAnterior, documento.RutaEsquema, tokenCancelacion);
        }

        // Si su carpeta ya no existe, queda sin carpeta.
        if (documento.CarpetaDocumentoId is { } carpetaId && !await _contexto.CarpetasDocumento.AnyAsync(carpeta => carpeta.Id == carpetaId, tokenCancelacion))
            documento.CarpetaDocumentoId = null;

        foreach (var afectado in await RutasDocumento.ObtenerConDescendientesAsync(_contexto, documento, tokenCancelacion))
        {
            afectado.EstaArchivado = false;
            afectado.FechaArchivado = null;
        }
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

/// <summary>Borra definitivamente documentos en la papelera: el indicado (con sus subpáginas) o toda la papelera si Id es null.</summary>
public sealed record EliminarDocumentoDefinitivoComando(Guid? Id) : IRequest<int>;

public sealed class ManejadorEliminarDocumentoDefinitivoComando : IRequestHandler<EliminarDocumentoDefinitivoComando, int>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioAlmacenamientoFirebase _almacenamiento;
    private readonly ILogger<ManejadorEliminarDocumentoDefinitivoComando> _registrador;

    public ManejadorEliminarDocumentoDefinitivoComando(
        IContextoAplicacion contexto,
        IServicioAlmacenamientoFirebase almacenamiento,
        ILogger<ManejadorEliminarDocumentoDefinitivoComando> registrador)
    {
        _contexto = contexto;
        _almacenamiento = almacenamiento;
        _registrador = registrador;
    }

    public async Task<int> Handle(EliminarDocumentoDefinitivoComando comando, CancellationToken tokenCancelacion)
    {
        List<DocumentoMarkdown> aEliminar;
        if (comando.Id is { } id)
        {
            var documento = await _contexto.DocumentosMarkdown.FirstOrDefaultAsync(documento => documento.Id == id, tokenCancelacion)
                ?? throw new ExcepcionEntidadNoEncontrada("el documento", id);
            if (!documento.EstaArchivado)
                throw new ExcepcionDominio("Solo se eliminan definitivamente documentos que están en la papelera.");
            aEliminar = await RutasDocumento.ObtenerConDescendientesAsync(_contexto, documento, tokenCancelacion);
        }
        else
        {
            aEliminar = await _contexto.DocumentosMarkdown.Where(documento => documento.EstaArchivado).ToListAsync(tokenCancelacion);
        }
        if (aEliminar.Count == 0)
            return 0;

        var ids = aEliminar.Select(documento => documento.Id).ToList();

        // Subpáginas activas de un documento eliminado (caso raro): quedan como páginas raíz.
        foreach (var huerfano in await _contexto.DocumentosMarkdown.Where(documento => documento.DocumentoPadreId != null && ids.Contains(documento.DocumentoPadreId.Value) && !ids.Contains(documento.Id)).ToListAsync(tokenCancelacion))
            huerfano.DocumentoPadreId = null;

        // Documentos obsoletos que apuntaban a uno eliminado como reemplazo pierden esa referencia.
        foreach (var reemplazado in await _contexto.DocumentosMarkdown.Where(documento => documento.DocumentoReemplazoId != null && ids.Contains(documento.DocumentoReemplazoId.Value)).ToListAsync(tokenCancelacion))
            reemplazado.DocumentoReemplazoId = null;
        foreach (var documento in aEliminar)
            documento.DocumentoReemplazoId = null;

        var adjuntos = await _contexto.ArchivosAdjuntos.Where(adjunto => adjunto.DocumentoId != null && ids.Contains(adjunto.DocumentoId.Value)).ToListAsync(tokenCancelacion);
        _contexto.ArchivosAdjuntos.RemoveRange(adjuntos);
        _contexto.ReferenciasEntidades.RemoveRange(await _contexto.ReferenciasEntidades
            .Where(referencia => (referencia.TipoOrigen == TipoEntidad.Documento && ids.Contains(referencia.OrigenId))
                                 || (referencia.TipoDestino == TipoEntidad.Documento && ids.Contains(referencia.DestinoId)))
            .ToListAsync(tokenCancelacion));
        _contexto.Marcadores.RemoveRange(await _contexto.Marcadores
            .Where(marcador => marcador.TipoEntidad == TipoEntidad.Documento && ids.Contains(marcador.EntidadId))
            .ToListAsync(tokenCancelacion));
        _contexto.DocumentosMarkdown.RemoveRange(aEliminar);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);

        foreach (var adjunto in adjuntos)
        {
            try
            {
                await _almacenamiento.EliminarArchivoAsync(adjunto.RutaFirebaseStorage, CancellationToken.None);
            }
            catch (Exception excepcion)
            {
                _registrador.LogWarning(excepcion, "No se pudo eliminar {RutaFirebase} de Firebase Storage", adjunto.RutaFirebaseStorage);
            }
        }

        return ids.Count;
    }
}
