using System.Globalization;
using System.Text;

namespace SolucionProductividad.Aplicacion.Comun.Utilidades;

public static class GeneradorSlug
{
    /// <summary>"Arquitectura del Núcleo" → "arquitectura-del-nucleo".</summary>
    public static string Generar(string texto, int longitudMaxima = 80)
    {
        var textoNormalizado = texto.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var constructor = new StringBuilder(textoNormalizado.Length);
        var ultimoFueGuion = false;

        foreach (var caracter in textoNormalizado)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(caracter) == UnicodeCategory.NonSpacingMark)
                continue;

            if (char.IsLetterOrDigit(caracter) && caracter < 128)
            {
                constructor.Append(caracter);
                ultimoFueGuion = false;
            }
            else if (!ultimoFueGuion && constructor.Length > 0)
            {
                constructor.Append('-');
                ultimoFueGuion = true;
            }
        }

        var slug = constructor.ToString().Trim('-');
        if (slug.Length > longitudMaxima)
            slug = slug[..longitudMaxima].Trim('-');

        return slug.Length == 0 ? "sin-titulo" : slug;
    }
}
