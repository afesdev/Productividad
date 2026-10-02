using System.Text.RegularExpressions;

namespace SolucionProductividad.Aplicacion.Comun.Utilidades;

/// <summary>
/// Convierte Markdown de una línea (títulos del diario) en texto plano para destinos que no lo interpretan, como el
/// Excel de la empresa: "**9:00** - Revisión del [[TCK-1377]]" → "9:00 - Revisión del TCK-1377".
/// </summary>
public static partial class TextoPlanoMarkdown
{
    public static string Convertir(string? markdown)
    {
        if (string.IsNullOrWhiteSpace(markdown)) return string.Empty;
        var texto = markdown.Replace("\r\n", " ").Replace('\n', ' ');

        texto = Imagen().Replace(texto, "$1");
        texto = Enlace().Replace(texto, "$1");
        texto = WikiLink().Replace(texto, match => match.Groups[2].Success ? match.Groups[2].Value : match.Groups[1].Value);
        texto = Codigo().Replace(texto, "$1");
        texto = NegritaCursiva().Replace(texto, "$2");
        texto = Negrita().Replace(texto, "$2");
        texto = Cursiva().Replace(texto, "$2");
        texto = Tachado().Replace(texto, "$1");
        texto = Resaltado().Replace(texto, "$1");
        texto = PrefijoBloque().Replace(texto, string.Empty);
        texto = Escape().Replace(texto, "$1");
        return Espacios().Replace(texto, " ").Trim();
    }

    [GeneratedRegex(@"!\[([^\]]*)\]\([^)]*\)")]
    private static partial Regex Imagen();

    [GeneratedRegex(@"\[([^\]]+)\]\([^)]*\)")]
    private static partial Regex Enlace();

    /// <summary>[[Destino]] o [[Destino|Alias]] → el alias si lo hay.</summary>
    [GeneratedRegex(@"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")]
    private static partial Regex WikiLink();

    [GeneratedRegex(@"`+([^`]+)`+")]
    private static partial Regex Codigo();

    [GeneratedRegex(@"(\*\*\*|___)(.+?)\1")]
    private static partial Regex NegritaCursiva();

    [GeneratedRegex(@"(\*\*|__)(.+?)\1")]
    private static partial Regex Negrita();

    /// <summary>"_" solo cuenta como cursiva fuera de palabras, para no romper nombres como mi_variable.</summary>
    [GeneratedRegex(@"(\*|(?<![\p{L}\p{N}])_)(?!\s)(.+?)(?<!\s)(?:\*|_(?![\p{L}\p{N}]))")]
    private static partial Regex Cursiva();

    [GeneratedRegex(@"~~(.+?)~~")]
    private static partial Regex Tachado();

    [GeneratedRegex(@"==(.+?)==")]
    private static partial Regex Resaltado();

    /// <summary>Encabezado, cita o viñeta al inicio ("# ", "> ", "- ", "1. ", "- [ ] ").</summary>
    [GeneratedRegex(@"^\s*(?:#{1,6}\s+|>\s*|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+)")]
    private static partial Regex PrefijoBloque();

    [GeneratedRegex(@"\\([\\`*_{}\[\]()#+\-.!|~>=])")]
    private static partial Regex Escape();

    [GeneratedRegex(@"\s{2,}")]
    private static partial Regex Espacios();
}
