using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Aplicacion.Contratos.Infraestructura;

public sealed record RepositorioGitHub(string NombreCompleto, string RamaPorDefecto, bool EsPrivado, string UrlWeb);

public sealed record ArchivoCambiadoGitHub(string Ruta, string? RutaAnterior, TipoCambioArchivo TipoCambio, int LineasAgregadas, int LineasEliminadas, string? Parche = null);

public sealed record CommitGitHub(string Sha, string Mensaje, string Autor, DateTime Fecha, string Url);

public sealed record ComparacionGitHub(int TotalCommits, IReadOnlyList<ArchivoCambiadoGitHub> Archivos, IReadOnlyList<CommitGitHub> Commits);

public sealed record RamaGrafoGitHub(string Nombre, string ShaPunta, DateTime FechaUltimoCommit);

/// <param name="Padres">Un padre = commit normal; dos o más = merge. Pueden apuntar a commits fuera del historial traído.</param>
public sealed record CommitGrafoGitHub(string Sha, string Mensaje, string Autor, DateTime Fecha, string Url, IReadOnlyList<string> Padres);

public sealed record GrafoGitHub(IReadOnlyList<RamaGrafoGitHub> Ramas, IReadOnlyList<CommitGrafoGitHub> Commits);

/// <param name="Mensaje">Mensaje completo (título y cuerpo).</param>
/// <param name="ArchivosTruncados">GitHub entrega a lo sumo 300 archivos por commit.</param>
public sealed record DetalleCommitGitHub(
    string Sha,
    string Mensaje,
    string Autor,
    DateTime Fecha,
    string Url,
    IReadOnlyList<string> Padres,
    int LineasAgregadas,
    int LineasEliminadas,
    IReadOnlyList<ArchivoCambiadoGitHub> Archivos,
    bool ArchivosTruncados);

public sealed record PullRequestGitHub(int Numero, string Titulo, string Url, EstadoPullRequest Estado, DateTime? FechaFusion, string RamaDestino);

/// <summary>
/// Acceso de SOLO LECTURA a la API REST de GitHub. Ramas y pull requests se crean fuera de la app;
/// aquí solo se detectan, se vinculan al ticket y se sincronizan sus cambios.
/// Los errores de GitHub se traducen a excepciones de dominio con mensajes en español.
/// </summary>
public interface IServicioGitHub
{
    Task<RepositorioGitHub> ObtenerRepositorioAsync(string propietario, string repositorio, CancellationToken tokenCancelacion = default);

    /// <summary>SHA del último commit de la rama, o null si la rama no existe.</summary>
    Task<string?> ObtenerShaRamaAsync(string propietario, string repositorio, string rama, CancellationToken tokenCancelacion = default);

    /// <summary>Nombres de las ramas del repositorio (hasta 1000); el filtrado por ticket se hace en la aplicación.</summary>
    Task<IReadOnlyList<string>> ListarRamasAsync(string propietario, string repositorio, CancellationToken tokenCancelacion = default);

    /// <summary>Cambios de <paramref name="ramaTrabajo"/> respecto a <paramref name="ramaBase"/> (git diff base...trabajo).</summary>
    Task<ComparacionGitHub> CompararAsync(string propietario, string repositorio, string ramaBase, string ramaTrabajo, CancellationToken tokenCancelacion = default);

    /// <summary>PR cuyo origen es <paramref name="ramaTrabajo"/>, hacia cualquier rama destino: el abierto si existe, si no el más reciente.</summary>
    Task<PullRequestGitHub?> BuscarPullRequestAsync(string propietario, string repositorio, string ramaTrabajo, CancellationToken tokenCancelacion = default);

    Task<PullRequestGitHub> ObtenerPullRequestAsync(string propietario, string repositorio, int numero, CancellationToken tokenCancelacion = default);

    /// <summary>
    /// Historial reciente para dibujar el grafo: las ramas fijas (principal y desarrollo) con más profundidad y las
    /// <paramref name="maximoRamasRecientes"/> ramas con commits más recientes; los commits se devuelven sin duplicados.
    /// </summary>
    Task<GrafoGitHub> ObtenerGrafoAsync(string propietario, string repositorio, IReadOnlyList<string> ramasFijas, int maximoRamasRecientes, CancellationToken tokenCancelacion = default);

    /// <summary>Detalle de un commit con sus archivos y parches; null si no existe en el repositorio.</summary>
    Task<DetalleCommitGitHub?> ObtenerCommitAsync(string propietario, string repositorio, string sha, CancellationToken tokenCancelacion = default);

    /// <summary>Commits y archivos del PR; no cambian tras fusionarlo ni al borrar la rama (GitHub limita a 250 commits y 3000 archivos).</summary>
    Task<ComparacionGitHub> ObtenerCambiosPullRequestAsync(string propietario, string repositorio, int numero, CancellationToken tokenCancelacion = default);
}
