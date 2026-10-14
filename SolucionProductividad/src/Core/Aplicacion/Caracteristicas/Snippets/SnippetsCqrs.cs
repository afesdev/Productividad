using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Documentos;
using SolucionProductividad.Aplicacion.Caracteristicas.Etiquetas;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Snippets;

// ---------- DTOs ----------

public sealed record SnippetDto(
    Guid Id,
    string Titulo,
    string Lenguaje,
    string Contenido,
    string? Descripcion,
    bool EsFavorito,
    int Usos,
    DateTime? FechaUltimoUso,
    DateTime FechaActualizacion,
    IReadOnlyList<EtiquetaDto> Etiquetas);

internal static class ReglasSnippet
{
    public const int MaximoContenido = 50_000;
    public const int MaximoListado = 500;

    /// <summary>Nombres de highlight.js en minúsculas ("sql", "csharp", "powershell", "c++"…) o "texto".</summary>
    public const string PatronLenguaje = "^[a-z0-9#+-]{1,30}$";

    public static IQueryable<SnippetDto> Proyectar(IQueryable<Snippet> snippets) =>
        snippets.Select(snippet => new SnippetDto(
            snippet.Id,
            snippet.Titulo,
            snippet.Lenguaje,
            snippet.Contenido,
            snippet.Descripcion,
            snippet.EsFavorito,
            snippet.Usos,
            snippet.FechaUltimoUso,
            snippet.FechaActualizacion,
            snippet.Etiquetas
                .Where(relacion => relacion.Etiqueta != null)
                .OrderBy(relacion => relacion.Etiqueta!.Nombre)
                .Select(relacion => new EtiquetaDto(relacion.Etiqueta!.Id, relacion.Etiqueta.Nombre, relacion.Etiqueta.Color))
                .ToList()));
}

// ---------- Listar ----------

/// <summary>Los favoritos primero y luego los más usados; el texto busca en título, descripción y contenido.</summary>
public sealed record ListarSnippetsConsulta(string? Texto = null, string? Lenguaje = null, Guid? EtiquetaId = null, bool SoloFavoritos = false) : IRequest<IReadOnlyList<SnippetDto>>;

public sealed class ManejadorListarSnippetsConsulta : IRequestHandler<ListarSnippetsConsulta, IReadOnlyList<SnippetDto>>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorListarSnippetsConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<IReadOnlyList<SnippetDto>> Handle(ListarSnippetsConsulta consulta, CancellationToken tokenCancelacion)
    {
        var snippets = _contexto.Snippets.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(consulta.Texto))
        {
            var texto = consulta.Texto.Trim();
            snippets = snippets.Where(snippet => snippet.Titulo.Contains(texto) || (snippet.Descripcion != null && snippet.Descripcion.Contains(texto)) || snippet.Contenido.Contains(texto));
        }
        if (!string.IsNullOrWhiteSpace(consulta.Lenguaje)) snippets = snippets.Where(snippet => snippet.Lenguaje == consulta.Lenguaje);
        if (consulta.EtiquetaId is { } etiquetaId) snippets = snippets.Where(snippet => snippet.Etiquetas.Any(relacion => relacion.EtiquetaId == etiquetaId));
        if (consulta.SoloFavoritos) snippets = snippets.Where(snippet => snippet.EsFavorito);

        return await ReglasSnippet.Proyectar(snippets
                .OrderByDescending(snippet => snippet.EsFavorito)
                .ThenByDescending(snippet => snippet.Usos)
                .ThenByDescending(snippet => snippet.FechaUltimoUso)
                .ThenBy(snippet => snippet.Titulo)
                .Take(ReglasSnippet.MaximoListado))
            .ToListAsync(tokenCancelacion);
    }
}

// ---------- Obtener ----------

public sealed record ObtenerSnippetConsulta(Guid Id) : IRequest<SnippetDto>;

public sealed class ManejadorObtenerSnippetConsulta : IRequestHandler<ObtenerSnippetConsulta, SnippetDto>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorObtenerSnippetConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<SnippetDto> Handle(ObtenerSnippetConsulta consulta, CancellationToken tokenCancelacion) =>
        await ReglasSnippet.Proyectar(_contexto.Snippets.AsNoTracking().Where(snippet => snippet.Id == consulta.Id)).FirstOrDefaultAsync(tokenCancelacion)
        ?? throw new ExcepcionEntidadNoEncontrada("el snippet", consulta.Id);
}

// ---------- Crear o actualizar ----------

/// <summary>Sin <paramref name="Id"/> crea uno nuevo; con él lo reemplaza (incluidas las etiquetas).</summary>
public sealed record GuardarSnippetComando(Guid? Id, string Titulo, string Lenguaje, string Contenido, string? Descripcion, IReadOnlyList<Guid> EtiquetaIds) : IRequest<SnippetDto>;

public sealed class ValidadorGuardarSnippetComando : AbstractValidator<GuardarSnippetComando>
{
    public ValidadorGuardarSnippetComando()
    {
        RuleFor(comando => comando.Titulo).NotEmpty().MaximumLength(200).WithName("Título");
        RuleFor(comando => comando.Lenguaje).NotEmpty().Matches(ReglasSnippet.PatronLenguaje).WithName("Lenguaje");
        RuleFor(comando => comando.Contenido).NotEmpty().MaximumLength(ReglasSnippet.MaximoContenido).WithName("Contenido");
        RuleFor(comando => comando.Descripcion).MaximumLength(1000).WithName("Descripción");
        RuleFor(comando => comando.EtiquetaIds).NotNull().Must(ids => ids.Count <= CatalogoEtiquetas.MaximoPorElemento)
            .WithMessage($"Máximo {CatalogoEtiquetas.MaximoPorElemento} etiquetas.");
    }
}

public sealed class ManejadorGuardarSnippetComando : IRequestHandler<GuardarSnippetComando, SnippetDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorGuardarSnippetComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<SnippetDto> Handle(GuardarSnippetComando comando, CancellationToken tokenCancelacion)
    {
        Snippet snippet;
        if (comando.Id is { } id)
        {
            snippet = await _contexto.Snippets.Include(existente => existente.Etiquetas).FirstOrDefaultAsync(existente => existente.Id == id, tokenCancelacion)
                ?? throw new ExcepcionEntidadNoEncontrada("el snippet", id);
        }
        else
        {
            snippet = new Snippet { UsuarioId = _usuarioActual.ObtenerUsuarioIdRequerido() };
            _contexto.Snippets.Add(snippet);
        }

        snippet.Titulo = comando.Titulo.Trim();
        snippet.Lenguaje = comando.Lenguaje.Trim();
        // El contenido se guarda tal cual: los espacios y saltos de línea importan en código.
        snippet.Contenido = comando.Contenido;
        snippet.Descripcion = string.IsNullOrWhiteSpace(comando.Descripcion) ? null : comando.Descripcion.Trim();
        snippet.FechaActualizacion = DateTime.UtcNow;

        var etiquetas = await CatalogoEtiquetas.ObtenerAsync(_contexto, comando.EtiquetaIds, tokenCancelacion);
        var ids = etiquetas.Select(etiqueta => etiqueta.Id).ToHashSet();
        foreach (var relacion in snippet.Etiquetas.Where(relacion => !ids.Contains(relacion.EtiquetaId)).ToList())
            _contexto.SnippetsEtiquetas.Remove(relacion);
        foreach (var etiquetaId in ids.Where(etiquetaId => snippet.Etiquetas.All(relacion => relacion.EtiquetaId != etiquetaId)))
            snippet.Etiquetas.Add(new SnippetEtiqueta { SnippetId = snippet.Id, EtiquetaId = etiquetaId });

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return await ReglasSnippet.Proyectar(_contexto.Snippets.AsNoTracking().Where(existente => existente.Id == snippet.Id)).FirstAsync(tokenCancelacion);
    }
}

// ---------- Eliminar ----------

public sealed record EliminarSnippetComando(Guid Id) : IRequest;

public sealed class ManejadorEliminarSnippetComando : IRequestHandler<EliminarSnippetComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorEliminarSnippetComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(EliminarSnippetComando comando, CancellationToken tokenCancelacion)
    {
        var snippet = await _contexto.Snippets.FirstOrDefaultAsync(existente => existente.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el snippet", comando.Id);
        _contexto.Snippets.Remove(snippet);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Favorito y uso ----------

/// <summary>Devuelve si quedó como favorito.</summary>
public sealed record AlternarFavoritoSnippetComando(Guid Id) : IRequest<bool>;

public sealed class ManejadorAlternarFavoritoSnippetComando : IRequestHandler<AlternarFavoritoSnippetComando, bool>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorAlternarFavoritoSnippetComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<bool> Handle(AlternarFavoritoSnippetComando comando, CancellationToken tokenCancelacion)
    {
        var snippet = await _contexto.Snippets.FirstOrDefaultAsync(existente => existente.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el snippet", comando.Id);
        snippet.EsFavorito = !snippet.EsFavorito;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return snippet.EsFavorito;
    }
}

/// <summary>Se llama al copiar o insertar: alimenta el orden "más usados". No cambia la fecha de actualización.</summary>
public sealed record RegistrarUsoSnippetComando(Guid Id) : IRequest;

public sealed class ManejadorRegistrarUsoSnippetComando : IRequestHandler<RegistrarUsoSnippetComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorRegistrarUsoSnippetComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(RegistrarUsoSnippetComando comando, CancellationToken tokenCancelacion)
    {
        var snippet = await _contexto.Snippets.FirstOrDefaultAsync(existente => existente.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el snippet", comando.Id);
        snippet.Usos++;
        snippet.FechaUltimoUso = DateTime.UtcNow;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}
