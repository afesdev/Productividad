using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Servicios.Opciones;

namespace SolucionProductividad.Servicios.IA;

/// <summary>Cliente de "chat/completions" (formato OpenAI) con HttpClient; sirve para Gemini, Ollama, Groq u OpenRouter.</summary>
public sealed class ServicioIA : IServicioIA
{
    private static readonly JsonSerializerOptions OpcionesJson = new(JsonSerializerDefaults.Web) { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    private readonly HttpClient _clienteHttp;
    private readonly OpcionesIA _opciones;

    public ServicioIA(HttpClient clienteHttp, IOptions<OpcionesIA> opciones)
    {
        _clienteHttp = clienteHttp;
        _opciones = opciones.Value;
        _clienteHttp.BaseAddress = new Uri(_opciones.UrlBase.TrimEnd('/') + "/");
        if (!string.IsNullOrWhiteSpace(_opciones.ApiKey))
            _clienteHttp.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _opciones.ApiKey);
    }

    public async Task<string> CompletarAsync(string instrucciones, string contenido, CancellationToken tokenCancelacion = default)
    {
        // Ollama local no usa clave; los proveedores en la nube sí.
        if (string.IsNullOrWhiteSpace(_opciones.ApiKey) && !_clienteHttp.BaseAddress!.IsLoopback)
            throw new ExcepcionDominio("La IA no está configurada. Defina IA:ApiKey en la configuración de la API.");

        var mensajes = new[] { new MensajeChat("system", instrucciones), new MensajeChat("user", contenido) };
        var modelos = new[] { _opciones.Modelo }.Concat(_opciones.ModelosAlternativos).Where(modelo => !string.IsNullOrWhiteSpace(modelo)).Distinct().ToList();

        // Saturación del proveedor (frecuente en planes gratuitos): se reintenta y luego se pasa al siguiente modelo.
        for (var indiceModelo = 0; ; indiceModelo++)
        {
            var modelo = modelos[indiceModelo];
            for (var intento = 1; ; intento++)
            {
                using var respuesta = await EnviarAsync(new SolicitudChat(modelo, mensajes, 0.3), tokenCancelacion);
                if (respuesta.IsSuccessStatusCode)
                {
                    var cuerpo = await respuesta.Content.ReadFromJsonAsync<RespuestaChat>(OpcionesJson, tokenCancelacion);
                    var texto = cuerpo?.Choices?.FirstOrDefault()?.Message?.Content;
                    return string.IsNullOrWhiteSpace(texto) ? throw new ExcepcionDominio("La IA no devolvió contenido. Intenta de nuevo.") : texto;
                }

                var esTemporal = (int)respuesta.StatusCode >= 500;
                if (esTemporal && intento <= _opciones.ReintentosPorModelo)
                {
                    await Task.Delay(_opciones.PausaReintentoMs * intento, tokenCancelacion);
                    continue;
                }
                if (esTemporal && indiceModelo < modelos.Count - 1)
                    break;

                var detalle = await LeerDetalleErrorAsync(respuesta, tokenCancelacion);
                throw respuesta.StatusCode switch
                {
                    HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden => new ExcepcionDominio($"El proveedor de IA rechazó la clave. Verifique IA:ApiKey. {detalle}".Trim()),
                    HttpStatusCode.TooManyRequests => new ExcepcionDominio($"Se alcanzó el límite de uso de la IA. Intenta de nuevo en un minuto. {detalle}".Trim()),
                    HttpStatusCode.NotFound => new ExcepcionDominio($"El proveedor de IA no encontró el modelo «{modelo}» (IA:Modelo). {detalle}".Trim()),
                    HttpStatusCode.ServiceUnavailable => new ExcepcionDominio("El servicio de IA está saturado en este momento. Intenta de nuevo en unos minutos."),
                    _ => new ExcepcionDominio($"Error del servicio de IA ({(int)respuesta.StatusCode}). {detalle}".Trim())
                };
            }
        }
    }

    private async Task<HttpResponseMessage> EnviarAsync(SolicitudChat solicitud, CancellationToken tokenCancelacion)
    {
        try
        {
            return await _clienteHttp.PostAsJsonAsync("chat/completions", solicitud, OpcionesJson, tokenCancelacion);
        }
        catch (TaskCanceledException) when (!tokenCancelacion.IsCancellationRequested)
        {
            throw new ExcepcionDominio("La IA tardó demasiado en responder. Intenta con un texto más corto.");
        }
        catch (HttpRequestException)
        {
            throw new ExcepcionDominio("No se pudo conectar con el servicio de IA.");
        }
    }

    /// <summary>Mensaje del proveedor: OpenAI devuelve {"error":{…}}; Gemini, [{"error":{…}}].</summary>
    private static async Task<string> LeerDetalleErrorAsync(HttpResponseMessage respuesta, CancellationToken tokenCancelacion)
    {
        try
        {
            using var documento = JsonDocument.Parse(await respuesta.Content.ReadAsStringAsync(tokenCancelacion));
            var raiz = documento.RootElement.ValueKind == JsonValueKind.Array && documento.RootElement.GetArrayLength() > 0
                ? documento.RootElement[0]
                : documento.RootElement;
            var mensaje = raiz.TryGetProperty("error", out var error) && error.ValueKind == JsonValueKind.Object && error.TryGetProperty("message", out var texto)
                ? texto.GetString()
                : null;
            return string.IsNullOrWhiteSpace(mensaje) ? string.Empty : $"Detalle: {(mensaje.Length > 300 ? mensaje[..300] : mensaje)}";
        }
        catch (JsonException)
        {
            return string.Empty;
        }
    }

    private sealed record SolicitudChat(string Model, IReadOnlyList<MensajeChat> Messages, double Temperature);

    private sealed record MensajeChat(string Role, string Content);

    private sealed record RespuestaChat(List<OpcionChat>? Choices);

    private sealed record OpcionChat(MensajeChat? Message);
}
