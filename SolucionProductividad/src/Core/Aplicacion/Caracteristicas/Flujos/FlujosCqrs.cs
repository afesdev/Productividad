using System.Text;
using System.Text.Json;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Flujos;

// ---------- DTOs ----------

public sealed record FlujoResumenDto(Guid Id, string Titulo, string? Sistema, string? Descripcion, int Pasos, DateTime FechaCreacion, DateTime FechaActualizacion);

public sealed record FlujoDetalleDto(Guid Id, string Titulo, string? Sistema, string? Descripcion, string ContenidoJson, DateTime FechaCreacion, DateTime FechaActualizacion);

public sealed record FlujoGuardadoDto(DateTime FechaActualizacion);

// ---------- Contenido ----------

/// <summary>
/// El contenido es el JSON del editor: { version, nodos: [{ id, tipo, titulo, tecnico, descripcion, x, y }], conexiones: [...] }.
/// El backend no lo interpreta salvo para extraer el texto buscable y contar los pasos.
/// </summary>
internal static class ContenidoFlujo
{
    public const string Vacio = "{\"version\":1,\"nodos\":[],\"conexiones\":[]}";
    public const int MaximoCaracteres = 5_000_000;

    public static (string TextoBuscable, int Pasos) Analizar(string contenidoJson)
    {
        try
        {
            using var documento = JsonDocument.Parse(contenidoJson);
            if (!documento.RootElement.TryGetProperty("nodos", out var nodos) || nodos.ValueKind != JsonValueKind.Array)
                return (string.Empty, 0);

            var texto = new StringBuilder();
            foreach (var nodo in nodos.EnumerateArray())
                foreach (var campo in new[] { "titulo", "tecnico", "descripcion" })
                    if (nodo.TryGetProperty(campo, out var valor) && valor.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(valor.GetString()))
                        texto.Append(valor.GetString()!.Trim()).Append('\n');
            return (texto.ToString(), nodos.GetArrayLength());
        }
        catch (JsonException)
        {
            throw new ExcepcionDominio("El contenido del flujo no es un JSON válido.");
        }
    }

    public static int ContarPasos(string contenidoJson)
    {
        try
        {
            using var documento = JsonDocument.Parse(contenidoJson);
            return documento.RootElement.TryGetProperty("nodos", out var nodos) && nodos.ValueKind == JsonValueKind.Array ? nodos.GetArrayLength() : 0;
        }
        catch (JsonException)
        {
            return 0;
        }
    }
}

// ---------- Listar ----------

/// <param name="Texto">Busca en título, sistema, descripción y en el texto de los pasos (SP, vistas, endpoints…).</param>
public sealed record ListarFlujosConsulta(string? Texto = null) : IRequest<IReadOnlyList<FlujoResumenDto>>;

public sealed class ManejadorListarFlujosConsulta : IRequestHandler<ListarFlujosConsulta, IReadOnlyList<FlujoResumenDto>>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorListarFlujosConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<IReadOnlyList<FlujoResumenDto>> Handle(ListarFlujosConsulta consulta, CancellationToken tokenCancelacion)
    {
        var flujos = _contexto.Flujos.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(consulta.Texto))
        {
            var texto = consulta.Texto.Trim();
            flujos = flujos.Where(flujo =>
                flujo.Titulo.Contains(texto) || (flujo.Sistema != null && flujo.Sistema.Contains(texto)) ||
                (flujo.Descripcion != null && flujo.Descripcion.Contains(texto)) || flujo.TextoBuscable.Contains(texto));
        }

        var filas = await flujos
            .OrderByDescending(flujo => flujo.FechaActualizacion)
            .Select(flujo => new { flujo.Id, flujo.Titulo, flujo.Sistema, flujo.Descripcion, flujo.ContenidoJson, flujo.FechaCreacion, flujo.FechaActualizacion })
            .ToListAsync(tokenCancelacion);
        return filas
            .Select(flujo => new FlujoResumenDto(flujo.Id, flujo.Titulo, flujo.Sistema, flujo.Descripcion, ContenidoFlujo.ContarPasos(flujo.ContenidoJson), flujo.FechaCreacion, flujo.FechaActualizacion))
            .ToList();
    }
}

public sealed record ListarSistemasFlujoConsulta : IRequest<IReadOnlyList<string>>;

public sealed class ManejadorListarSistemasFlujoConsulta : IRequestHandler<ListarSistemasFlujoConsulta, IReadOnlyList<string>>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorListarSistemasFlujoConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<IReadOnlyList<string>> Handle(ListarSistemasFlujoConsulta consulta, CancellationToken tokenCancelacion) =>
        await _contexto.Flujos.AsNoTracking()
            .Where(flujo => flujo.Sistema != null)
            .Select(flujo => flujo.Sistema!)
            .Distinct()
            .OrderBy(sistema => sistema)
            .ToListAsync(tokenCancelacion);
}

// ---------- Obtener ----------

public sealed record ObtenerFlujoConsulta(Guid Id) : IRequest<FlujoDetalleDto>;

public sealed class ManejadorObtenerFlujoConsulta : IRequestHandler<ObtenerFlujoConsulta, FlujoDetalleDto>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorObtenerFlujoConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<FlujoDetalleDto> Handle(ObtenerFlujoConsulta consulta, CancellationToken tokenCancelacion) =>
        await _contexto.Flujos.AsNoTracking()
            .Where(flujo => flujo.Id == consulta.Id)
            .Select(flujo => new FlujoDetalleDto(flujo.Id, flujo.Titulo, flujo.Sistema, flujo.Descripcion, flujo.ContenidoJson, flujo.FechaCreacion, flujo.FechaActualizacion))
            .FirstOrDefaultAsync(tokenCancelacion)
        ?? throw new ExcepcionEntidadNoEncontrada("el flujo", consulta.Id);
}

// ---------- Crear / datos generales ----------

public sealed record CrearFlujoComando(string Titulo, string? Sistema, string? Descripcion) : IRequest<Guid>;

public sealed class ValidadorCrearFlujoComando : AbstractValidator<CrearFlujoComando>
{
    public ValidadorCrearFlujoComando()
    {
        RuleFor(comando => comando.Titulo).NotEmpty().MaximumLength(200).WithName("Título");
        RuleFor(comando => comando.Sistema).MaximumLength(100);
        RuleFor(comando => comando.Descripcion).MaximumLength(1000);
    }
}

public sealed class ManejadorCrearFlujoComando : IRequestHandler<CrearFlujoComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorCrearFlujoComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<Guid> Handle(CrearFlujoComando comando, CancellationToken tokenCancelacion)
    {
        var flujo = new Flujo
        {
            UsuarioId = _usuarioActual.ObtenerUsuarioIdRequerido(),
            Titulo = comando.Titulo.Trim(),
            Sistema = Limpiar(comando.Sistema),
            Descripcion = Limpiar(comando.Descripcion),
            ContenidoJson = ContenidoFlujo.Vacio
        };
        _contexto.Flujos.Add(flujo);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return flujo.Id;
    }

    internal static string? Limpiar(string? texto) => string.IsNullOrWhiteSpace(texto) ? null : texto.Trim();
}

public sealed record ActualizarDatosFlujoComando(Guid Id, string Titulo, string? Sistema, string? Descripcion) : IRequest;

public sealed class ValidadorActualizarDatosFlujoComando : AbstractValidator<ActualizarDatosFlujoComando>
{
    public ValidadorActualizarDatosFlujoComando()
    {
        RuleFor(comando => comando.Titulo).NotEmpty().MaximumLength(200).WithName("Título");
        RuleFor(comando => comando.Sistema).MaximumLength(100);
        RuleFor(comando => comando.Descripcion).MaximumLength(1000);
    }
}

public sealed class ManejadorActualizarDatosFlujoComando : IRequestHandler<ActualizarDatosFlujoComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorActualizarDatosFlujoComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(ActualizarDatosFlujoComando comando, CancellationToken tokenCancelacion)
    {
        var flujo = await _contexto.Flujos.FirstOrDefaultAsync(existente => existente.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el flujo", comando.Id);
        flujo.Titulo = comando.Titulo.Trim();
        flujo.Sistema = ManejadorCrearFlujoComando.Limpiar(comando.Sistema);
        flujo.Descripcion = ManejadorCrearFlujoComando.Limpiar(comando.Descripcion);
        flujo.FechaActualizacion = DateTime.UtcNow;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Guardar contenido (autoguardado) ----------

public sealed record GuardarContenidoFlujoComando(Guid Id, string ContenidoJson) : IRequest<FlujoGuardadoDto>;

public sealed class ValidadorGuardarContenidoFlujoComando : AbstractValidator<GuardarContenidoFlujoComando>
{
    public ValidadorGuardarContenidoFlujoComando() =>
        RuleFor(comando => comando.ContenidoJson).NotEmpty().MaximumLength(ContenidoFlujo.MaximoCaracteres).WithName("Contenido");
}

public sealed class ManejadorGuardarContenidoFlujoComando : IRequestHandler<GuardarContenidoFlujoComando, FlujoGuardadoDto>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorGuardarContenidoFlujoComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<FlujoGuardadoDto> Handle(GuardarContenidoFlujoComando comando, CancellationToken tokenCancelacion)
    {
        var (textoBuscable, _) = ContenidoFlujo.Analizar(comando.ContenidoJson);
        var flujo = await _contexto.Flujos.FirstOrDefaultAsync(existente => existente.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el flujo", comando.Id);
        flujo.ContenidoJson = comando.ContenidoJson;
        flujo.TextoBuscable = textoBuscable;
        flujo.FechaActualizacion = DateTime.UtcNow;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return new FlujoGuardadoDto(flujo.FechaActualizacion);
    }
}

// ---------- Duplicar / eliminar ----------

public sealed record DuplicarFlujoComando(Guid Id) : IRequest<Guid>;

public sealed class ManejadorDuplicarFlujoComando : IRequestHandler<DuplicarFlujoComando, Guid>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorDuplicarFlujoComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<Guid> Handle(DuplicarFlujoComando comando, CancellationToken tokenCancelacion)
    {
        var original = await _contexto.Flujos.AsNoTracking().FirstOrDefaultAsync(flujo => flujo.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el flujo", comando.Id);
        var copia = new Flujo
        {
            UsuarioId = original.UsuarioId,
            Titulo = (original.Titulo + " (copia)")[..Math.Min(original.Titulo.Length + 8, 200)],
            Sistema = original.Sistema,
            Descripcion = original.Descripcion,
            ContenidoJson = original.ContenidoJson,
            TextoBuscable = original.TextoBuscable
        };
        _contexto.Flujos.Add(copia);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return copia.Id;
    }
}

public sealed record EliminarFlujoComando(Guid Id) : IRequest;

public sealed class ManejadorEliminarFlujoComando : IRequestHandler<EliminarFlujoComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorEliminarFlujoComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(EliminarFlujoComando comando, CancellationToken tokenCancelacion)
    {
        var flujo = await _contexto.Flujos.FirstOrDefaultAsync(existente => existente.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el flujo", comando.Id);
        _contexto.Flujos.Remove(flujo);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Generar con IA ----------

/// <summary>
/// Convierte la descripción libre de un proceso en el texto de pasos del editor (la misma sintaxis que escribe el usuario),
/// que el frontend interpreta y dibuja. Así la IA no fabrica JSON ni posiciones y el resultado siempre se puede revisar como texto.
/// </summary>
public sealed record GenerarFlujoConIAComando(string Descripcion) : IRequest<string>;

public sealed class ValidadorGenerarFlujoConIAComando : AbstractValidator<GenerarFlujoConIAComando>
{
    public const int MaximoCaracteres = 12_000;

    public ValidadorGenerarFlujoConIAComando() =>
        RuleFor(comando => comando.Descripcion).NotEmpty().MaximumLength(MaximoCaracteres).WithName("Descripción");
}

public sealed class ManejadorGenerarFlujoConIAComando : IRequestHandler<GenerarFlujoConIAComando, string>
{
    public const string Instrucciones = """
        Conviertes la descripción de un proceso de software en un diagrama de flujo escrito con una sintaxis de texto.
        Responde SOLO con las líneas del flujo: sin explicaciones, sin saludos y sin envolverlas en ```.

        SINTAXIS (una línea por paso):
          tipo: Título funcional | detalle técnico
        El "| detalle técnico" es opcional: úsalo para nombres de vistas/archivos, procedimientos, endpoints, tablas o reglas.

        TIPOS permitidos (usa exactamente estas palabras):
          inicio      → punto de partida (opcional)
          usuario     → lo que hace la persona (clic, escribe, elige)
          vista       → pantalla o página que se muestra o carga
          validacion  → pregunta o regla que se comprueba; SIEMPRE con ramas
          sp          → procedimiento almacenado o consulta SQL
          api         → llamada a un endpoint o servicio propio
          externo     → sistema o servicio de terceros
          proceso     → lógica o cálculo interno que no encaja en lo anterior
          salida      → resultado: archivo, correo, mensaje, notificación
          error       → mensaje o fin con error (termina esa rama)
          fin         → fin correcto del proceso (termina esa rama)

        RAMAS: las líneas de una rama van con 2 espacios más de sangría que la validación y empiezan con [Etiqueta]:
          validacion: ¿Fechas válidas? | Fin - Inicio <= 6 meses
            [No] error: Muestra "Rango inválido"
            [Sí] api: Genera el certificado | POST /api/certificados
              sp: Consulta los registros | sp_GenerarCertificado
        Los pasos siguientes de una rama van con la misma sangría que su primera línea, sin etiqueta.
        Al volver a la sangría de la validación, el paso se conecta con el final de todas las ramas que no terminaron en error o fin.
        Para saltar a un paso que ya existe: -> Título exacto de ese paso (opcional con [Etiqueta] delante).

        REGLAS:
        - Escribe en español, con títulos cortos y claros (máximo unas 8 palabras).
        - Respeta el orden y los nombres técnicos de la descripción (archivos, SP, endpoints) tal cual.
        - No inventes pasos, validaciones ni nombres técnicos que no estén en la descripción.
        - Cada validación debe tener al menos dos ramas.
        """;

    private readonly IServicioIA _ia;

    public ManejadorGenerarFlujoConIAComando(IServicioIA ia) => _ia = ia;

    public async Task<string> Handle(GenerarFlujoConIAComando comando, CancellationToken tokenCancelacion)
    {
        var respuesta = await _ia.CompletarAsync(Instrucciones, comando.Descripcion.Trim(), tokenCancelacion);
        var texto = QuitarCerco(respuesta.Trim());
        if (string.IsNullOrWhiteSpace(texto))
            throw new ExcepcionDominio("La IA no devolvió ningún paso. Describe el proceso con más detalle e intenta de nuevo.");
        return texto;
    }

    /// <summary>Algunos modelos envuelven la respuesta en ``` aunque se les pida que no.</summary>
    internal static string QuitarCerco(string texto)
    {
        if (!texto.StartsWith("```", StringComparison.Ordinal)) return texto;
        var lineas = texto.Split('\n').ToList();
        lineas.RemoveAt(0);
        if (lineas.Count > 0 && lineas[^1].Trim().StartsWith("```", StringComparison.Ordinal)) lineas.RemoveAt(lineas.Count - 1);
        return string.Join('\n', lineas).Trim();
    }
}
