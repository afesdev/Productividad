using System.Text;
using System.Text.RegularExpressions;
using FluentValidation;
using MediatR;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;

namespace SolucionProductividad.Aplicacion.Caracteristicas.IA;

public enum AccionTextoIA
{
    Mejorar,
    Corregir,
    Resumir
}

/// <summary>Reescribe un fragmento Markdown del editor (documentos, tickets, tareas, diario) y devuelve Markdown.</summary>
public sealed record TransformarTextoIAComando(AccionTextoIA Accion, string Texto) : IRequest<string>;

public sealed class ValidadorTransformarTextoIAComando : AbstractValidator<TransformarTextoIAComando>
{
    public const int MaximoCaracteres = 60000;

    public ValidadorTransformarTextoIAComando()
    {
        RuleFor(comando => comando.Accion).IsInEnum();
        RuleFor(comando => comando.Texto).NotEmpty().MaximumLength(MaximoCaracteres).WithName("Texto");
    }
}

public sealed partial class ManejadorTransformarTextoIAComando : IRequestHandler<TransformarTextoIAComando, string>
{
    /// <summary>Los modelos pierden contenido con textos largos: se procesa por secciones de este tamaño aproximado.</summary>
    public const int TamanoSeccion = 6000;

    /// <summary>Si al mejorar o corregir una sección la respuesta queda por debajo de esta proporción, se conserva la original.</summary>
    public const double ProporcionMinimaConservada = 0.6;

    private const string ReglasComunes = """
        Trabajas sobre documentación técnica escrita en Markdown por un desarrollador de software.
        Reglas obligatorias:
        - Responde SOLO con el Markdown resultante: sin explicaciones, sin saludos y sin envolverlo en ```.
        - Escribe en el mismo idioma del texto (normalmente español), con ortografía y tildes correctas.
        - Conserva EXACTAMENTE, sin traducir ni modificar: imágenes ![...](...), enlaces y sus URL, enlaces internos [[...]],
          bloques de código y `código en línea`, nombres de archivos, rutas, comandos, identificadores y términos técnicos.
        - No inventes datos, pasos ni resultados que no estén en el texto.
        """;

    private const string ReglasConservacion = """
        REGLA PRINCIPAL: no elimines contenido. Cada dato, paso, nombre, número, fecha, ejemplo, advertencia, imagen y enlace
        del original debe seguir apareciendo en tu respuesta. Si algo parece repetido o poco importante, déjalo igualmente.
        Ante la duda entre cambiar o conservar, conserva el texto original.
        Tu respuesta debe tener al menos tanto contenido como el original.
        """;

    private readonly IServicioIA _ia;

    public ManejadorTransformarTextoIAComando(IServicioIA ia) => _ia = ia;

    public async Task<string> Handle(TransformarTextoIAComando comando, CancellationToken tokenCancelacion)
    {
        var instrucciones = $"{ReglasComunes}\n{(comando.Accion == AccionTextoIA.Resumir ? string.Empty : ReglasConservacion)}\nTarea: {Tarea(comando.Accion)}";

        if (comando.Accion == AccionTextoIA.Resumir)
            return QuitarCercoMarkdown((await _ia.CompletarAsync(instrucciones, comando.Texto, tokenCancelacion)).Trim());

        var resultado = new StringBuilder();
        foreach (var seccion in DividirEnSecciones(comando.Texto, TamanoSeccion))
        {
            var respuesta = QuitarCercoMarkdown((await _ia.CompletarAsync(instrucciones, seccion, tokenCancelacion)).Trim());
            // Red de seguridad: si la IA recortó demasiado la sección, se conserva la original en lugar de perder contenido.
            var conservada = respuesta.Length >= seccion.Trim().Length * ProporcionMinimaConservada ? respuesta : seccion.Trim();
            if (resultado.Length > 0)
                resultado.Append("\n\n");
            resultado.Append(conservada);
        }
        return resultado.ToString();
    }

    private static string Tarea(AccionTextoIA accion) => accion switch
    {
        AccionTextoIA.Mejorar => """
            Mejora la redacción y la presentación para que sea documentación clara y profesional, SIN quitar información:
            corrige ortografía y tildes, reformula las frases confusas, ordena las ideas dentro de cada sección y agrega
            estructura donde ayude a leer (títulos ##/###, listas, tablas, **negritas**). Puedes añadir una frase de
            contexto o de transición si aclara, pero nunca elimines ni resumas lo que ya está escrito.
            """,
        AccionTextoIA.Corregir => """
            Corrige únicamente ortografía, tildes (incluidas las que cambian el sentido: esta/está, termino/terminó, publico/público),
            puntuación y concordancia. No cambies el estilo, el orden, la estructura ni el formato Markdown.
            """,
        AccionTextoIA.Resumir => """
            Resume el texto en Markdown: un párrafo breve con lo esencial y, si aplica, una lista con los puntos clave,
            decisiones y pendientes.
            """,
        _ => throw new ArgumentOutOfRangeException(nameof(accion))
    };

    /// <summary>
    /// Corta antes de cada título (fuera de bloques de código) y agrupa secciones consecutivas hasta <paramref name="tamano"/>.
    /// Una sección más grande que el tamaño se envía completa: no se parte a mitad de un párrafo.
    /// </summary>
    public static IReadOnlyList<string> DividirEnSecciones(string texto, int tamano)
    {
        var secciones = new List<string>();
        var actual = new StringBuilder();
        var dentroDeCodigo = false;
        foreach (var linea in texto.Replace("\r\n", "\n").Split('\n'))
        {
            if (linea.TrimStart().StartsWith("```"))
                dentroDeCodigo = !dentroDeCodigo;
            if (!dentroDeCodigo && linea.StartsWith('#') && actual.ToString().Trim().Length > 0)
            {
                secciones.Add(actual.ToString());
                actual.Clear();
            }
            actual.Append(linea).Append('\n');
        }
        if (actual.ToString().Trim().Length > 0)
            secciones.Add(actual.ToString());

        var agrupadas = new List<string>();
        var grupo = new StringBuilder();
        foreach (var seccion in secciones)
        {
            if (grupo.Length > 0 && grupo.Length + seccion.Length > tamano)
            {
                agrupadas.Add(grupo.ToString().Trim());
                grupo.Clear();
            }
            grupo.Append(seccion);
        }
        if (grupo.ToString().Trim().Length > 0)
            agrupadas.Add(grupo.ToString().Trim());
        return agrupadas;
    }

    /// <summary>Algunos modelos envuelven la respuesta en ```markdown … ``` pese a la instrucción.</summary>
    private static string QuitarCercoMarkdown(string texto)
    {
        var coincidencia = CercoMarkdown().Match(texto);
        return coincidencia.Success ? coincidencia.Groups[1].Value.Trim() : texto;
    }

    [GeneratedRegex(@"^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$", RegexOptions.IgnoreCase)]
    private static partial Regex CercoMarkdown();
}
