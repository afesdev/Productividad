using System.Collections.Concurrent;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;

namespace SolucionProductividad.Pruebas.Infraestructura;

public sealed class EscenarioPrueba : IDisposable
{
    private readonly ServiceProvider _proveedor;

    public EscenarioPrueba(ServiceProvider proveedor, NotificadorFalso notificador, AlmacenamientoFalso almacenamiento, GitHubFalso gitHub)
    {
        _proveedor = proveedor;
        Notificador = notificador;
        Almacenamiento = almacenamiento;
        GitHub = gitHub;
    }

    public NotificadorFalso Notificador { get; }
    public AlmacenamientoFalso Almacenamiento { get; }
    /// <summary>Permite simular ramas y PRs creados fuera de la app.</summary>
    public GitHubFalso GitHub { get; }

    /// <summary>Cada envío usa su propio alcance (DbContext nuevo), igual que una petición HTTP.</summary>
    public async Task<TRespuesta> EnviarAsync<TRespuesta>(IRequest<TRespuesta> solicitud)
    {
        await using var alcance = _proveedor.CreateAsyncScope();
        return await alcance.ServiceProvider.GetRequiredService<ISender>().Send(solicitud);
    }

    public async Task EnviarAsync(IRequest solicitud)
    {
        await using var alcance = _proveedor.CreateAsyncScope();
        await alcance.ServiceProvider.GetRequiredService<ISender>().Send(solicitud);
    }

    public void Dispose() => _proveedor.Dispose();
}

public sealed class UsuarioActualFalso : IServicioUsuarioActual
{
    public UsuarioActualFalso(Guid usuarioId, bool esAdministrador)
    {
        UsuarioId = usuarioId;
        EsAdministrador = esAdministrador;
    }

    public Guid? UsuarioId { get; }
    public string? Correo => "prueba@prueba.local";
    public string? NombreCompleto => "Usuario Prueba";
    public bool EsAdministrador { get; }
    public bool TieneRol(string nombreRol) => EsAdministrador && nombreRol == "Administrador";
}

public sealed class NotificadorFalso : INotificadorTiempoReal
{
    public ConcurrentBag<TareaResumenDto> TareasActualizadas { get; } = new();
    public ConcurrentBag<Guid> TareasEliminadas { get; } = new();

    public Task NotificarTareaActualizadaAsync(TareaResumenDto tarea, CancellationToken tokenCancelacion = default)
    {
        TareasActualizadas.Add(tarea);
        return Task.CompletedTask;
    }

    public Task NotificarTareaEliminadaAsync(Guid proyectoId, Guid tareaId, CancellationToken tokenCancelacion = default)
    {
        TareasEliminadas.Add(tareaId);
        return Task.CompletedTask;
    }
}

/// <summary>GitHub en memoria (solo lectura, como el real): las pruebas siembran ramas y PRs "creados fuera"; comparación fija de 2 archivos y 1 commit.</summary>
public sealed class GitHubFalso : IServicioGitHub
{
    public ConcurrentDictionary<string, string> Ramas { get; } = new(new Dictionary<string, string> { ["main"] = "sha-main", ["Desarrollo"] = "sha-dev" });
    public ConcurrentDictionary<string, PullRequestGitHub> PullRequests { get; } = new();

    public Task<RepositorioGitHub> ObtenerRepositorioAsync(string propietario, string repositorio, CancellationToken tokenCancelacion = default) =>
        Task.FromResult(new RepositorioGitHub($"{propietario}/{repositorio}", "main", true, $"https://github.com/{propietario}/{repositorio}"));

    public Task<string?> ObtenerShaRamaAsync(string propietario, string repositorio, string rama, CancellationToken tokenCancelacion = default) =>
        Task.FromResult(Ramas.TryGetValue(rama, out var sha) ? sha : null);

    public Task<IReadOnlyList<string>> ListarRamasAsync(string propietario, string repositorio, CancellationToken tokenCancelacion = default) =>
        Task.FromResult<IReadOnlyList<string>>(Ramas.Keys.ToList());

    private static readonly ComparacionGitHub CambiosFijos = new(1,
        [
            new ArchivoCambiadoGitHub("src/Api/FacturasController.cs", null, Dominio.Enumeraciones.TipoCambioArchivo.Modificado, 12, 3,
                "@@ -10,3 +10,3 @@ public class FacturasController\n     var subtotal = Sumar();\n-    var iva = subtotal * 0.12m;\n+    var iva = Math.Round(subtotal * 0.15m, 2);\n     return subtotal + iva;"),
            new ArchivoCambiadoGitHub("src/Web/Factura.tsx", null, Dominio.Enumeraciones.TipoCambioArchivo.Agregado, 25, 0)
        ],
        [new CommitGitHub("abc1234567890", "Corrige cálculo de IVA", "Dev", DateTime.UtcNow, "https://github.com/x/y/commit/abc")]);

    // Como GitHub: con el PR fusionado los commits ya están en la base y main...rama no devuelve nada.
    public Task<ComparacionGitHub> CompararAsync(string propietario, string repositorio, string ramaBase, string ramaTrabajo, CancellationToken tokenCancelacion = default) =>
        Task.FromResult(PullRequests.TryGetValue(ramaTrabajo, out var pullRequest) && pullRequest.Estado == Dominio.Enumeraciones.EstadoPullRequest.Fusionado
            ? new ComparacionGitHub(0, [], [])
            : CambiosFijos);

    public GrafoGitHub Grafo { get; set; } = new([], []);

    public Task<DetalleCommitGitHub?> ObtenerCommitAsync(string propietario, string repositorio, string sha, CancellationToken tokenCancelacion = default) =>
        Task.FromResult<DetalleCommitGitHub?>(sha == "abc1234"
            ? new DetalleCommitGitHub("abc1234", "Corrige cálculo de IVA\n\nRedondea a 2 decimales.", "Dev", DateTime.UtcNow, "https://github.com/x/y/commit/abc1234", ["m1"], 12, 3, CambiosFijos.Archivos, false)
            : null);

    public Task<GrafoGitHub> ObtenerGrafoAsync(string propietario, string repositorio, IReadOnlyList<string> ramasFijas, int maximoRamasRecientes, CancellationToken tokenCancelacion = default) =>
        Task.FromResult(Grafo);

    public Task<ComparacionGitHub> ObtenerCambiosPullRequestAsync(string propietario, string repositorio, int numero, CancellationToken tokenCancelacion = default) =>
        Task.FromResult(CambiosFijos);

    public Task<PullRequestGitHub?> BuscarPullRequestAsync(string propietario, string repositorio, string ramaTrabajo, CancellationToken tokenCancelacion = default) =>
        Task.FromResult(PullRequests.TryGetValue(ramaTrabajo, out var pullRequest) ? pullRequest : null);

    public Task<PullRequestGitHub> ObtenerPullRequestAsync(string propietario, string repositorio, int numero, CancellationToken tokenCancelacion = default) =>
        Task.FromResult(PullRequests.Values.First(pullRequest => pullRequest.Numero == numero));
}

public sealed class AlmacenamientoFalso : IServicioAlmacenamientoFirebase
{
    public ConcurrentBag<string> RutasSubidas { get; } = new();
    public ConcurrentBag<string> RutasEliminadas { get; } = new();

    public Task<string> SubirArchivoAsync(Stream flujoArchivo, string rutaDestino, string tipoContenido, CancellationToken tokenCancelacion = default)
    {
        RutasSubidas.Add(rutaDestino);
        return Task.FromResult($"https://almacenamiento.falso/{rutaDestino}");
    }

    public Task EliminarArchivoAsync(string rutaFirebaseStorage, CancellationToken tokenCancelacion = default)
    {
        RutasEliminadas.Add(rutaFirebaseStorage);
        return Task.CompletedTask;
    }
}
