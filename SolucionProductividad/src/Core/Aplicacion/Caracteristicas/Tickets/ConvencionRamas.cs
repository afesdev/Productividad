using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Tickets;

/// <summary>
/// Convención de ramas del equipo: <c>Tipo/NombreDesarrollador-Ticket{NºExterno}-AsuntoEnPascalCase</c>,
/// ej. <c>Ajuste/AndresEspitia-Ticket1468-AjusteMenuEnDispositivos</c>.
/// El número es el del sistema de la empresa (Ticket.NumeroExterno); si el ticket no lo tiene se usa el interno (TCK1042).
/// </summary>
public static class ConvencionRamas
{
    private const int LongitudMaximaAsunto = 60;

    /// <summary>Carpeta de la rama según el tipo de ticket.</summary>
    public static string Prefijo(TipoTicket tipo) => tipo switch
    {
        TipoTicket.Ajuste => "Ajuste",
        TipoTicket.NuevoDesarrollo => "NuevoDesarrollo",
        TipoTicket.Incidencia => "Incidencia",
        TipoTicket.Auditoria => "Auditoria",
        TipoTicket.Soporte => "Soporte",
        _ => "Otro"
    };

    /// <summary>Dígitos del número externo usados en la rama: "1468" → "1468", "INC-55821" → "55821". Null si no tiene dígitos.</summary>
    public static string? NumeroParaRama(string? numeroExterno)
    {
        if (string.IsNullOrWhiteSpace(numeroExterno))
            return null;
        var digitos = Regex.Matches(numeroExterno, @"\d+");
        return digitos.Count == 0 ? null : digitos[^1].Value.TrimStart('0') is { Length: > 0 } numero ? numero : "0";
    }

    /// <summary>Referencias que se buscan en el nombre de la rama, para mostrarlas al usuario: ["Ticket1468", "TCK-1042"].</summary>
    public static IReadOnlyList<string> Claves(Ticket ticket) =>
        NumeroParaRama(ticket.NumeroExterno) is { } numero
            ? [$"Ticket{numero}", $"TCK-{ticket.NumeroTicket}"]
            : [$"TCK-{ticket.NumeroTicket}"];

    /// <summary>
    /// ¿La rama pertenece al ticket? Acepta "Ticket1468", "Ticket-1468", "ticket_01468" y el interno "TCK-1042"/"TCK1042",
    /// sin confundir 1468 con 14680.
    /// </summary>
    public static bool Coincide(string nombreRama, Ticket ticket)
    {
        if (NumeroParaRama(ticket.NumeroExterno) is { } numero
            && Regex.IsMatch(nombreRama, $@"ticket[-_ ]?0*{numero}(?![0-9])", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))
            return true;
        return Regex.IsMatch(nombreRama, $@"tck[-_]?0*{ticket.NumeroTicket}(?![0-9])", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    }

    /// <summary>Nombre recomendado para crear la rama fuera de la app.</summary>
    public static string Sugerir(Ticket ticket, string nombreDesarrollador)
    {
        var referencia = NumeroParaRama(ticket.NumeroExterno) is { } numero ? $"Ticket{numero}" : $"TCK{ticket.NumeroTicket}";
        var desarrollador = NombreCorto(nombreDesarrollador);
        var partes = new[] { desarrollador, referencia, PascalCase(ticket.Asunto, LongitudMaximaAsunto) }.Where(parte => parte.Length > 0);
        return $"{Prefijo(ticket.Tipo)}/{string.Join('-', partes)}";
    }

    /// <summary>
    /// Nombre + primer apellido en PascalCase: "Andrés Espitia" → "AndresEspitia", "Andrés Felipe Espitia Gómez" → "AndresEspitia"
    /// (con 4 palabras se asume nombre compuesto; con 3, nombre + dos apellidos).
    /// </summary>
    public static string NombreCorto(string nombreCompleto)
    {
        var palabras = Palabras(nombreCompleto);
        var elegidas = palabras.Count switch
        {
            0 => [],
            1 or 2 => palabras,
            3 => [palabras[0], palabras[1]],
            _ => [palabras[0], palabras[2]]
        };
        return string.Concat(elegidas.Select(Capitalizar));
    }

    /// <summary>"Ajuste menú en dispositivos (iOS)" → "AjusteMenuEnDispositivosIOS", cortado en palabra completa.</summary>
    public static string PascalCase(string texto, int longitudMaxima)
    {
        var resultado = new StringBuilder();
        foreach (var palabra in Palabras(texto).Select(Capitalizar))
        {
            if (resultado.Length + palabra.Length > longitudMaxima && resultado.Length > 0)
                break;
            resultado.Append(palabra);
        }
        return resultado.Length > longitudMaxima ? resultado.ToString(0, longitudMaxima) : resultado.ToString();
    }

    private static string Capitalizar(string palabra) => char.ToUpperInvariant(palabra[0]) + palabra[1..];

    /// <summary>Palabras sin tildes ni signos (solo letras y números ASCII).</summary>
    private static List<string> Palabras(string texto)
    {
        var sinTildes = new StringBuilder();
        foreach (var caracter in texto.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(caracter) != UnicodeCategory.NonSpacingMark)
                sinTildes.Append(caracter);
        }
        return Regex.Split(sinTildes.ToString().Normalize(NormalizationForm.FormC), "[^A-Za-z0-9]+")
            .Where(palabra => palabra.Length > 0)
            .ToList();
    }
}
