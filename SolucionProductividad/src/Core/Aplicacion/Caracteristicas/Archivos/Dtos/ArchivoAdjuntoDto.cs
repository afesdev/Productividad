using System.Linq.Expressions;
using SolucionProductividad.Dominio.Entidades;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Archivos.Dtos;

public sealed record ArchivoAdjuntoDto(
    Guid Id,
    string NombreArchivo,
    string TipoContenido,
    long TamanoEnBytes,
    string UrlDescarga,
    DateTime FechaCreacion)
{
    /// <summary>Snippet listo para insertar en el editor: imagen embebida o enlace.</summary>
    public string SnippetMarkdown
    {
        get
        {
            var textoAlternativo = NombreArchivo.Replace("[", "(").Replace("]", ")");
            return TipoContenido.StartsWith("image/", StringComparison.OrdinalIgnoreCase)
                ? $"![{textoAlternativo}]({UrlDescarga})"
                : $"[{textoAlternativo}]({UrlDescarga})";
        }
    }
}

public static class ProyeccionesAdjunto
{
    public static readonly Expression<Func<ArchivoAdjunto, ArchivoAdjuntoDto>> ADto = adjunto => new ArchivoAdjuntoDto(
        adjunto.Id,
        adjunto.NombreArchivo,
        adjunto.TipoContenido,
        adjunto.TamanoEnBytes,
        adjunto.UrlDescarga,
        adjunto.FechaCreacion);
}
