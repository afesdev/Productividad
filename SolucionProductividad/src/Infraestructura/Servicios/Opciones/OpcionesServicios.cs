using System.ComponentModel.DataAnnotations;

namespace SolucionProductividad.Servicios.Opciones;

public sealed class OpcionesFirebase
{
    public const string Seccion = "Firebase";

    /// <summary>Bucket de Firebase Storage, ej. "mi-proyecto.appspot.com" o "mi-proyecto.firebasestorage.app".</summary>
    public string NombreBucket { get; set; } = string.Empty;

    /// <summary>Ruta al JSON de la cuenta de servicio. Si se omite se usan las credenciales por defecto (GOOGLE_APPLICATION_CREDENTIALS).</summary>
    public string? RutaCredenciales { get; set; }
}

public sealed class OpcionesBoveda
{
    public const string Seccion = "Boveda";

    /// <summary>Llave maestra AES-256 en Base64 (32 bytes). Guardarla en user-secrets o variables de entorno, nunca en el repositorio.</summary>
    [Required(ErrorMessage = "Configure Boveda:LlaveMaestraBase64 (32 bytes en Base64).")]
    public string LlaveMaestraBase64 { get; set; } = string.Empty;
}

public sealed class OpcionesGitHub
{
    public const string Seccion = "GitHub";

    /// <summary>Token de GitHub (fine-grained). Guardarlo en user-secrets o variables de entorno, nunca en el repositorio.</summary>
    public string Token { get; set; } = string.Empty;

    public string UrlApi { get; set; } = "https://api.github.com";
}

/// <summary>Proveedor de IA con API compatible con OpenAI. Por defecto Gemini; para Ollama local: UrlBase "http://localhost:11434/v1/".</summary>
public sealed class OpcionesIA
{
    public const string Seccion = "IA";

    public string UrlBase { get; set; } = "https://generativelanguage.googleapis.com/v1beta/openai/";

    public string Modelo { get; set; } = "gemini-flash-latest";

    /// <summary>Se prueban en orden si el modelo principal sigue saturado (5xx) tras los reintentos.</summary>
    public string[] ModelosAlternativos { get; set; } = ["gemini-flash-lite-latest"];

    public int ReintentosPorModelo { get; set; } = 2;

    /// <summary>Pausa base entre reintentos; crece con cada intento.</summary>
    public int PausaReintentoMs { get; set; } = 1500;

    /// <summary>Clave del proveedor. Guardarla en user-secrets o en el appsettings del servidor, nunca en el repositorio.</summary>
    public string ApiKey { get; set; } = string.Empty;
}

public sealed class OpcionesJwt
{
    public const string Seccion = "Jwt";

    [Required] public string Emisor { get; set; } = "SolucionProductividad";
    [Required] public string Audiencia { get; set; } = "SolucionProductividad.Cliente";

    /// <summary>Secreto HMAC-SHA256 de al menos 32 caracteres. Guardarlo en user-secrets o variables de entorno.</summary>
    [Required(ErrorMessage = "Configure Jwt:LlaveFirma.")]
    [MinLength(32, ErrorMessage = "Jwt:LlaveFirma debe tener al menos 32 caracteres.")]
    public string LlaveFirma { get; set; } = string.Empty;

    [Range(1, 120)] public int MinutosVigenciaAcceso { get; set; } = 15;
    [Range(1, 90)] public int DiasVigenciaRefresco { get; set; } = 14;
}
