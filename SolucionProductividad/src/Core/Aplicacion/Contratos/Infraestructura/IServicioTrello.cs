using System.Text.RegularExpressions;

namespace SolucionProductividad.Aplicacion.Contratos.Infraestructura;

public sealed record MiembroTrello(string Id, string NombreCompleto, string Usuario, string Iniciales, string? UrlAvatar);

/// <summary><paramref name="Color"/>: nombre de color de Trello ("green", "red_dark"…) o null si la etiqueta no tiene color.</summary>
public sealed record EtiquetaTrello(string Id, string Nombre, string? Color);

public sealed record TableroTrelloResumen(
    string Id,
    string Nombre,
    string Url,
    string? ColorFondo,
    string? ImagenFondo,
    string? NombreWorkspace,
    bool Destacado,
    bool EsAdmin,
    DateTime? FechaUltimaActividad);

public sealed record ListaTrello(string Id, string Nombre, double Posicion);

public sealed record TarjetaTrello(
    string Id,
    string Nombre,
    string IdTablero,
    string IdLista,
    double Posicion,
    DateTime? Inicio,
    DateTime? Vencimiento,
    bool VencimientoCompletado,
    IReadOnlyList<EtiquetaTrello> Etiquetas,
    IReadOnlyList<string> IdMiembros,
    string Url,
    int Comentarios,
    int Adjuntos,
    int ElementosChecklist,
    int ElementosChecklistHechos,
    bool TieneDescripcion,
    string? ColorPortada,
    /// <summary>Adjunto usado como portada (imagen); se pide a la API como cualquier imagen de la tarjeta.</summary>
    string? IdAdjuntoPortada = null);

public sealed record TableroTrello(
    string Id,
    string Nombre,
    string Url,
    string? ColorFondo,
    string? ImagenFondo,
    IReadOnlyList<ListaTrello> Listas,
    IReadOnlyList<TarjetaTrello> Tarjetas,
    IReadOnlyList<MiembroTrello> Miembros,
    IReadOnlyList<EtiquetaTrello> Etiquetas);

/// <summary>Tarjeta asignada al usuario con el nombre de su tablero y lista (para "Mis tarjetas").</summary>
public sealed record TarjetaAsignadaTrello(TarjetaTrello Tarjeta, string NombreTablero, string NombreLista, string? ColorFondoTablero);

public sealed record ElementoChecklistTrello(string Id, string Nombre, bool Hecho);

public sealed record ChecklistTrello(string Id, string Nombre, IReadOnlyList<ElementoChecklistTrello> Elementos);

public sealed record ComentarioTrello(string Id, string Autor, string? UrlAvatarAutor, string Texto, DateTime Fecha);

/// <summary><paramref name="EsImagen"/>: imagen subida a Trello que la app puede mostrar a través de la API (ver DescargarImagenAdjuntoAsync).</summary>
public sealed record AdjuntoTrello(string Id, string Nombre, string Url, DateTime? Fecha, bool EsImagen);

public sealed record ImagenAdjuntoTrello(byte[] Contenido, string TipoContenido);

public sealed record TarjetaTrelloDetalle(
    string Id,
    string Nombre,
    string Descripcion,
    string Url,
    string IdTablero,
    string NombreTablero,
    string NombreLista,
    DateTime? Inicio,
    DateTime? Vencimiento,
    bool VencimientoCompletado,
    IReadOnlyList<EtiquetaTrello> Etiquetas,
    IReadOnlyList<MiembroTrello> Miembros,
    IReadOnlyList<ChecklistTrello> Checklists,
    IReadOnlyList<ComentarioTrello> Comentarios,
    IReadOnlyList<AdjuntoTrello> Adjuntos);

/// <summary>
/// Cliente de SOLO LECTURA de la API de Trello con el token de cada usuario. Cachea las respuestas un par de minutos
/// (Trello limita a ~100 peticiones cada 10 s por token); los errores se traducen a excepciones de dominio en español.
/// </summary>
public interface IServicioTrello
{
    /// <summary>API key del Power-Up; null si la integración no está configurada en el servidor.</summary>
    string? ApiKey { get; }

    /// <summary>Valida el token (sin caché) y devuelve el miembro dueño.</summary>
    Task<MiembroTrello> ObtenerMiembroActualAsync(string token, CancellationToken tokenCancelacion = default);

    /// <summary>Tableros abiertos que el usuario administra o en los que participa.</summary>
    Task<IReadOnlyList<TableroTrelloResumen>> ListarTablerosAsync(string token, string idMiembro, bool omitirCache, CancellationToken tokenCancelacion = default);

    Task<TableroTrello> ObtenerTableroAsync(string token, string idTablero, bool omitirCache, CancellationToken tokenCancelacion = default);

    /// <summary><paramref name="idTarjeta"/>: id largo o enlace corto (shortLink); ver <see cref="ReglasTrello.ExtraerReferenciaTarjeta"/>.</summary>
    Task<TarjetaTrelloDetalle> ObtenerTarjetaAsync(string token, string idTarjeta, CancellationToken tokenCancelacion = default);

    /// <summary>Búsqueda de Trello en tarjetas abiertas de todos los tableros del usuario (máx. 20 resultados).</summary>
    Task<IReadOnlyList<TarjetaAsignadaTrello>> BuscarTarjetasAsync(string token, string texto, CancellationToken tokenCancelacion = default);

    /// <summary>Tarjetas abiertas asignadas al usuario en tableros abiertos.</summary>
    Task<IReadOnlyList<TarjetaAsignadaTrello>> ListarMisTarjetasAsync(string token, string idMiembro, bool omitirCache, CancellationToken tokenCancelacion = default);

    /// <summary>
    /// Descarga una imagen subida a una tarjeta. Trello exige autenticación para descargar adjuntos, así que el navegador
    /// no puede pedirla directamente: la API la descarga con el token del usuario y la reenvía.
    /// </summary>
    Task<ImagenAdjuntoTrello> DescargarImagenAdjuntoAsync(string token, string idTarjeta, string idAdjunto, CancellationToken tokenCancelacion = default);

    /// <summary>Revoca el token en Trello (mejor esfuerzo: si falla, el usuario puede revocarlo desde su cuenta).</summary>
    Task RevocarTokenAsync(string token, CancellationToken tokenCancelacion = default);
}

/// <summary>Formatos que se aceptan antes de llamar a Trello: evita inyectar rutas o parámetros en la URL.</summary>
public static partial class ReglasTrello
{
    /// <summary>Tipos de imagen que se reenvían al navegador. SVG queda fuera: puede llevar scripts.</summary>
    public static readonly IReadOnlySet<string> TiposImagen = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "image/png", "image/jpeg", "image/gif", "image/webp",
    };

    public const long MaximoBytesImagen = 15 * 1024 * 1024;

    /// <summary>Los ids de Trello son ObjectId de 24 caracteres hexadecimales.</summary>
    public static bool EsIdValido(string? id) => id is not null && PatronId().IsMatch(id);

    /// <summary>Enlace corto de tarjeta (trello.com/c/{shortLink}): 8 caracteres alfanuméricos.</summary>
    public static bool EsEnlaceCortoValido(string? enlace) => enlace is not null && PatronEnlaceCorto().IsMatch(enlace);

    /// <summary>
    /// Id o enlace corto de una tarjeta a partir de lo que pegue el usuario: id largo, enlace corto o URL
    /// "https://trello.com/c/{shortLink}/…". Devuelve null si no es ninguno.
    /// </summary>
    public static string? ExtraerReferenciaTarjeta(string? entrada)
    {
        var texto = entrada?.Trim();
        if (string.IsNullOrEmpty(texto)) return null;
        if (EsIdValido(texto) || EsEnlaceCortoValido(texto)) return texto;
        if (Uri.TryCreate(texto, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps
            && uri.Host.Equals("trello.com", StringComparison.OrdinalIgnoreCase))
        {
            var partes = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (partes.Length >= 2 && partes[0] == "c" && EsEnlaceCortoValido(partes[1])) return partes[1];
        }
        return null;
    }

    /// <summary>Tokens de usuario: alfanuméricos (los actuales empiezan por "ATTA" y rondan los 76 caracteres).</summary>
    public static bool EsTokenValido(string? token) => token is not null && PatronToken().IsMatch(token);

    [GeneratedRegex("^[0-9a-fA-F]{24}$")]
    private static partial Regex PatronId();

    [GeneratedRegex("^[A-Za-z0-9]{8}$")]
    private static partial Regex PatronEnlaceCorto();

    [GeneratedRegex("^[A-Za-z0-9]{32,256}$")]
    private static partial Regex PatronToken();
}
