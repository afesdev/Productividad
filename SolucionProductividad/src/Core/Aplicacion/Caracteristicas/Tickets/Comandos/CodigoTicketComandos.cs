using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Comandos;

// ---------- Vincular una rama de trabajo existente ----------
// La app es de solo lectura frente a GitHub: la rama se crea fuera (git, IDE, web) y aquí solo se vincula.

public sealed record VincularRamaTicketComando(Guid TicketId, Guid RepositorioId, string NombreRama) : IRequest<Guid>;

public sealed class ValidadorVincularRamaTicketComando : AbstractValidator<VincularRamaTicketComando>
{
    public ValidadorVincularRamaTicketComando()
    {
        RuleFor(comando => comando.RepositorioId).NotEmpty();
        RuleFor(comando => comando.NombreRama)
            .NotEmpty().WithMessage("Indica el nombre de la rama.")
            .MaximumLength(200)
            .Matches(@"^[A-Za-z0-9._/-]+$").WithMessage("La rama solo puede contener letras, números, '.', '_', '-' y '/'.");
    }
}

public sealed class ManejadorVincularRamaTicketComando : IRequestHandler<VincularRamaTicketComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioGitHub _gitHub;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorVincularRamaTicketComando(IContextoAplicacion contexto, IServicioGitHub gitHub, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _gitHub = gitHub;
        _usuarioActual = usuarioActual;
    }

    public async Task<Guid> Handle(VincularRamaTicketComando comando, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var ticket = await FlujoTickets.ObtenerRastreadoAsync(_contexto, comando.TicketId, tokenCancelacion);
        var repositorio = await _contexto.Repositorios.FirstOrDefaultAsync(
                repositorio => repositorio.Id == comando.RepositorioId && repositorio.UsuarioId == usuarioId && repositorio.EstaActivo, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el repositorio", comando.RepositorioId);
        var nombreRama = comando.NombreRama.Trim();

        if (await _contexto.RamasTicket.AnyAsync(rama => rama.TicketId == ticket.Id && rama.RepositorioId == repositorio.Id && rama.NombreRama == nombreRama, tokenCancelacion))
            throw new ExcepcionConflicto("Esa rama ya está vinculada al ticket.");

        if (await _gitHub.ObtenerShaRamaAsync(repositorio.Propietario, repositorio.NombreRepositorio, nombreRama, tokenCancelacion) is null)
            throw new ExcepcionDominio($"La rama {nombreRama} no existe en {repositorio.NombreCompleto}. Créala y súbela (git push) antes de vincularla.");

        var rama = new RamaTicket
        {
            TicketId = ticket.Id,
            RepositorioId = repositorio.Id,
            NombreRama = nombreRama,
            RamaBase = repositorio.RamaPrincipal,
            RamaDestino = repositorio.RamaDesarrollo,
            CreadoPor = usuarioId
        };
        _contexto.RamasTicket.Add(rama);

        FlujoTickets.RegistrarEvento(_contexto, ticket, TipoEventoTicket.RamaVinculada, $"Rama {nombreRama} vinculada ({repositorio.NombreCompleto})", usuarioId);

        // Tener una rama significa que el desarrollo empezó.
        FlujoTickets.IntentarTransicionar(_contexto, ticket, EstadoTicket.EnDesarrollo, usuarioId, "rama de trabajo");

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return rama.Id;
    }
}

// ---------- Sincronizar con GitHub: archivos, commits y estado del PR ----------

public sealed record SincronizarRamaTicketComando(Guid RamaTicketId) : IRequest;

public sealed class ManejadorSincronizarRamaTicketComando : IRequestHandler<SincronizarRamaTicketComando>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioGitHub _gitHub;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorSincronizarRamaTicketComando(IContextoAplicacion contexto, IServicioGitHub gitHub, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _gitHub = gitHub;
        _usuarioActual = usuarioActual;
    }

    public async Task Handle(SincronizarRamaTicketComando comando, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var rama = await _contexto.RamasTicket
            .Include(rama => rama.Repositorio)
            .Include(rama => rama.Archivos)
            .Include(rama => rama.Commits)
            .FirstOrDefaultAsync(rama => rama.Id == comando.RamaTicketId, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("la rama del ticket", comando.RamaTicketId);
        var ticket = await FlujoTickets.ObtenerRastreadoAsync(_contexto, rama.TicketId, tokenCancelacion);
        var repositorio = rama.Repositorio!;

        var pullRequest = rama.PullRequestNumero is { } numero
            ? await _gitHub.ObtenerPullRequestAsync(repositorio.Propietario, repositorio.NombreRepositorio, numero, tokenCancelacion)
            : await _gitHub.BuscarPullRequestAsync(repositorio.Propietario, repositorio.NombreRepositorio, rama.NombreRama, tokenCancelacion);

        // Una vez fusionado, main...rama queda vacío (sus commits ya están en main) y la rama suele borrarse:
        // los cambios se toman del PR, que no varía. Si no, main...rama es exactamente lo que el ticket cambió.
        var comparacion = pullRequest?.Estado == EstadoPullRequest.Fusionado
            ? await _gitHub.ObtenerCambiosPullRequestAsync(repositorio.Propietario, repositorio.NombreRepositorio, pullRequest.Numero, tokenCancelacion)
            : await _gitHub.CompararAsync(repositorio.Propietario, repositorio.NombreRepositorio, rama.RamaBase, rama.NombreRama, tokenCancelacion);

        var resumenAnterior = (rama.TotalCommits, rama.TotalArchivos, rama.LineasAgregadas, rama.LineasEliminadas, rama.PullRequestEstado);

        _contexto.ArchivosModificados.RemoveRange(rama.Archivos);
        _contexto.CommitsRama.RemoveRange(rama.Commits);
        foreach (var archivo in comparacion.Archivos)
        {
            _contexto.ArchivosModificados.Add(new ArchivoModificado
            {
                RamaTicketId = rama.Id,
                RutaArchivo = Recortar(archivo.Ruta, 500),
                RutaAnterior = archivo.RutaAnterior is null ? null : Recortar(archivo.RutaAnterior, 500),
                TipoCambio = archivo.TipoCambio,
                LineasAgregadas = archivo.LineasAgregadas,
                LineasEliminadas = archivo.LineasEliminadas,
                Parche = archivo.Parche
            });
        }
        foreach (var commit in comparacion.Commits)
        {
            _contexto.CommitsRama.Add(new CommitRama
            {
                RamaTicketId = rama.Id,
                Sha = commit.Sha,
                Mensaje = Recortar(commit.Mensaje, 2000),
                Autor = Recortar(commit.Autor, 150),
                FechaCommit = commit.Fecha,
                Url = commit.Url
            });
        }

        rama.TotalCommits = comparacion.TotalCommits;
        rama.TotalArchivos = comparacion.Archivos.Count;
        rama.LineasAgregadas = comparacion.Archivos.Sum(archivo => archivo.LineasAgregadas);
        rama.LineasEliminadas = comparacion.Archivos.Sum(archivo => archivo.LineasEliminadas);
        rama.FechaUltimaSincronizacion = DateTime.UtcNow;
        // Un PR distinto al guardado (el primero, o uno nuevo tras cerrar el anterior) se registra como detectado.
        var pullRequestDetectado = pullRequest is not null && pullRequest.Numero != rama.PullRequestNumero;
        if (pullRequest is not null)
        {
            rama.PullRequestNumero = pullRequest.Numero;
            rama.PullRequestUrl = pullRequest.Url;
            rama.PullRequestEstado = pullRequest.Estado;
            rama.PullRequestFechaFusion = pullRequest.FechaFusion;
            rama.RamaDestino = pullRequest.RamaDestino;
        }
        if (pullRequestDetectado)
        {
            FlujoTickets.RegistrarEvento(_contexto, ticket, TipoEventoTicket.PullRequestCreado,
                $"PR #{pullRequest!.Numero} detectado: {rama.NombreRama} → {pullRequest.RamaDestino} ({repositorio.NombreCompleto})", usuarioId);
            if (pullRequest.Estado == EstadoPullRequest.Abierto)
                FlujoTickets.IntentarTransicionar(_contexto, ticket, EstadoTicket.EnRevision, usuarioId, $"PR #{pullRequest.Numero}");
        }

        // El historial solo registra la sincronización cuando algo cambió.
        var resumenNuevo = (rama.TotalCommits, rama.TotalArchivos, rama.LineasAgregadas, rama.LineasEliminadas, rama.PullRequestEstado);
        if (resumenNuevo != resumenAnterior)
        {
            var estadoPr = rama.PullRequestNumero is null ? "sin PR" : $"PR #{rama.PullRequestNumero} {rama.PullRequestEstado}";
            FlujoTickets.RegistrarEvento(_contexto, ticket, TipoEventoTicket.Sincronizado,
                $"{rama.NombreRama}: {rama.TotalCommits} commits, {rama.TotalArchivos} archivos (+{rama.LineasAgregadas} −{rama.LineasEliminadas}), {estadoPr}",
                usuarioId);
        }

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }

    private static string Recortar(string texto, int longitud) => texto.Length > longitud ? texto[..longitud] : texto;
}

// ---------- Desvincular una rama (no la borra en GitHub) ----------

public sealed record DesvincularRamaTicketComando(Guid RamaTicketId) : IRequest;

public sealed class ManejadorDesvincularRamaTicketComando : IRequestHandler<DesvincularRamaTicketComando>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorDesvincularRamaTicketComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task Handle(DesvincularRamaTicketComando comando, CancellationToken tokenCancelacion)
    {
        var rama = await _contexto.RamasTicket.FirstOrDefaultAsync(rama => rama.Id == comando.RamaTicketId, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("la rama del ticket", comando.RamaTicketId);
        var ticket = await FlujoTickets.ObtenerRastreadoAsync(_contexto, rama.TicketId, tokenCancelacion);

        _contexto.RamasTicket.Remove(rama);
        FlujoTickets.RegistrarEvento(_contexto, ticket, TipoEventoTicket.Editado, $"Rama {rama.NombreRama} desvinculada del ticket", _usuarioActual.ObtenerUsuarioIdRequerido());
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}
