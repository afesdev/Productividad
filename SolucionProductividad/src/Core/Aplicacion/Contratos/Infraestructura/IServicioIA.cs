namespace SolucionProductividad.Aplicacion.Contratos.Infraestructura;

/// <summary>
/// Modelo de lenguaje detrás de una API compatible con OpenAI (Gemini, Ollama, Groq, OpenRouter…); el proveedor se elige por configuración.
/// Los errores del proveedor se traducen a excepciones de dominio con mensajes en español.
/// </summary>
public interface IServicioIA
{
    /// <summary>Respuesta del modelo a <paramref name="contenido"/> siguiendo <paramref name="instrucciones"/> (mensaje de sistema).</summary>
    Task<string> CompletarAsync(string instrucciones, string contenido, CancellationToken tokenCancelacion = default);
}
