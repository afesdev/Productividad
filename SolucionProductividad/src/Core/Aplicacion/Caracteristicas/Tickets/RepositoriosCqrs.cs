using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Tickets;

/// <summary>
/// Los repositorios son de quien los registra. No usan filtro global porque una rama creada en un ticket
/// compartido (creador ↔ asignado) debe seguir mostrándose a ambos; el filtro se aplica aquí y al vincular ramas.
/// </summary>
public sealed record ListarRepositoriosConsulta(bool IncluirInactivos = false) : IRequest<IReadOnlyList<RepositorioDto>>;

public sealed class ManejadorListarRepositoriosConsulta : IRequestHandler<ListarRepositoriosConsulta, IReadOnlyList<RepositorioDto>>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorListarRepositoriosConsulta(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<IReadOnlyList<RepositorioDto>> Handle(ListarRepositoriosConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        return await _contexto.Repositorios.AsNoTracking()
            .Where(repositorio => repositorio.UsuarioId == usuarioId && (consulta.IncluirInactivos || repositorio.EstaActivo))
            .OrderBy(repositorio => repositorio.Nombre)
            .Select(repositorio => new RepositorioDto(repositorio.Id, repositorio.Nombre, repositorio.Propietario, repositorio.NombreRepositorio,
                repositorio.RamaPrincipal, repositorio.RamaDesarrollo, repositorio.EstaActivo, repositorio.ProyectoSoporteId,
                _contexto.ProyectosSoporte.Where(proyecto => proyecto.Id == repositorio.ProyectoSoporteId).Select(proyecto => proyecto.Nombre).FirstOrDefault()))
            .ToListAsync(tokenCancelacion);
    }
}

// ---------- Grafo de commits (estilo GitLens) ----------

/// <param name="TicketId">Ticket al que está vinculada la rama en la app, si lo hay.</param>
public sealed record RamaGrafoDto(string Nombre, string ShaPunta, DateTime FechaUltimoCommit, bool EsPrincipal, bool EsDesarrollo, Guid? TicketId, string? ClaveTicket);

public sealed record CommitGrafoDto(string Sha, string Mensaje, string Autor, DateTime Fecha, string Url, IReadOnlyList<string> Padres);

public sealed record GrafoRepositorioDto(Guid RepositorioId, string Nombre, string NombreCompleto, string UrlWeb, int DiasRecientes, IReadOnlyList<RamaGrafoDto> Ramas, IReadOnlyList<CommitGrafoDto> Commits);

/// <summary>Rama principal, rama de desarrollo y las ramas con commits en los últimos <see cref="DiasRecientes"/> días.</summary>
public sealed record ObtenerGrafoRepositorioConsulta(Guid RepositorioId) : IRequest<GrafoRepositorioDto>
{
    public const int DiasRecientes = 30;
    public const int MaximoRamasRecientes = 30;
}

public sealed class ManejadorObtenerGrafoRepositorioConsulta : IRequestHandler<ObtenerGrafoRepositorioConsulta, GrafoRepositorioDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioGitHub _gitHub;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorObtenerGrafoRepositorioConsulta(IContextoAplicacion contexto, IServicioGitHub gitHub, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _gitHub = gitHub;
        _usuarioActual = usuarioActual;
    }

    public async Task<GrafoRepositorioDto> Handle(ObtenerGrafoRepositorioConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var repositorio = await _contexto.Repositorios.AsNoTracking()
            .FirstOrDefaultAsync(existente => existente.Id == consulta.RepositorioId && existente.UsuarioId == usuarioId, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el repositorio", consulta.RepositorioId);

        var grafo = await _gitHub.ObtenerGrafoAsync(repositorio.Propietario, repositorio.NombreRepositorio,
            [repositorio.RamaPrincipal, repositorio.RamaDesarrollo], ObtenerGrafoRepositorioConsulta.MaximoRamasRecientes, tokenCancelacion);

        var desde = DateTime.UtcNow.AddDays(-ObtenerGrafoRepositorioConsulta.DiasRecientes);
        var ramas = grafo.Ramas
            .Where(rama => rama.Nombre == repositorio.RamaPrincipal || rama.Nombre == repositorio.RamaDesarrollo || rama.FechaUltimoCommit >= desde)
            .ToList();

        // Solo se dibujan los commits alcanzables desde las ramas que quedan (las antiguas aportaban historial ajeno).
        var porSha = grafo.Commits.ToDictionary(commit => commit.Sha);
        var alcanzables = new HashSet<string>();
        var pendientes = new Stack<string>(ramas.Select(rama => rama.ShaPunta));
        while (pendientes.TryPop(out var sha))
        {
            if (!porSha.TryGetValue(sha, out var commit) || !alcanzables.Add(sha))
                continue;
            foreach (var padre in commit.Padres)
                pendientes.Push(padre);
        }

        var ticketsPorRama = await _contexto.RamasTicket.AsNoTracking()
            .Where(rama => rama.RepositorioId == repositorio.Id)
            .Join(_contexto.Tickets, rama => rama.TicketId, ticket => ticket.Id, (rama, ticket) => new { rama.NombreRama, ticket.Id, ticket.NumeroTicket, ticket.NumeroExterno })
            .ToListAsync(tokenCancelacion);

        var ramasDto = ramas
            .Select(rama =>
            {
                var ticket = ticketsPorRama.FirstOrDefault(vinculo => vinculo.NombreRama == rama.Nombre);
                return new RamaGrafoDto(rama.Nombre, rama.ShaPunta, rama.FechaUltimoCommit,
                    rama.Nombre == repositorio.RamaPrincipal, rama.Nombre == repositorio.RamaDesarrollo,
                    ticket?.Id, ticket is null ? null : ticket.NumeroExterno ?? $"TCK-{ticket.NumeroTicket}");
            })
            .OrderByDescending(rama => rama.EsPrincipal)
            .ThenByDescending(rama => rama.EsDesarrollo)
            .ThenByDescending(rama => rama.FechaUltimoCommit)
            .ToList();

        var commits = grafo.Commits
            .Where(commit => alcanzables.Contains(commit.Sha))
            .Select(commit => new CommitGrafoDto(commit.Sha, commit.Mensaje, commit.Autor, commit.Fecha, commit.Url, commit.Padres))
            .ToList();

        return new GrafoRepositorioDto(repositorio.Id, repositorio.Nombre, $"{repositorio.Propietario}/{repositorio.NombreRepositorio}",
            $"https://github.com/{repositorio.Propietario}/{repositorio.NombreRepositorio}", ObtenerGrafoRepositorioConsulta.DiasRecientes, ramasDto, commits);
    }
}

public sealed record ArchivoCommitDto(string Ruta, string? RutaAnterior, TipoCambioArchivo TipoCambio, int LineasAgregadas, int LineasEliminadas, string? Parche);

public sealed record DetalleCommitDto(
    string Sha,
    string Mensaje,
    string Autor,
    DateTime Fecha,
    string Url,
    IReadOnlyList<string> Padres,
    int LineasAgregadas,
    int LineasEliminadas,
    IReadOnlyList<ArchivoCommitDto> Archivos,
    bool ArchivosTruncados);

/// <summary>Detalle de un commit del grafo (se consulta al abrirlo; no se guarda).</summary>
public sealed record ObtenerCommitRepositorioConsulta(Guid RepositorioId, string Sha) : IRequest<DetalleCommitDto>;

public sealed class ValidadorObtenerCommitRepositorioConsulta : AbstractValidator<ObtenerCommitRepositorioConsulta>
{
    public ValidadorObtenerCommitRepositorioConsulta() =>
        RuleFor(consulta => consulta.Sha).NotEmpty().Matches("^[0-9a-fA-F]{7,40}$").WithMessage("SHA de commit no válido.");
}

public sealed class ManejadorObtenerCommitRepositorioConsulta : IRequestHandler<ObtenerCommitRepositorioConsulta, DetalleCommitDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioGitHub _gitHub;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorObtenerCommitRepositorioConsulta(IContextoAplicacion contexto, IServicioGitHub gitHub, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _gitHub = gitHub;
        _usuarioActual = usuarioActual;
    }

    public async Task<DetalleCommitDto> Handle(ObtenerCommitRepositorioConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var repositorio = await _contexto.Repositorios.AsNoTracking()
            .FirstOrDefaultAsync(existente => existente.Id == consulta.RepositorioId && existente.UsuarioId == usuarioId, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el repositorio", consulta.RepositorioId);

        var commit = await _gitHub.ObtenerCommitAsync(repositorio.Propietario, repositorio.NombreRepositorio, consulta.Sha, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el commit", consulta.Sha);

        return new DetalleCommitDto(commit.Sha, commit.Mensaje, commit.Autor, commit.Fecha, commit.Url, commit.Padres, commit.LineasAgregadas, commit.LineasEliminadas,
            commit.Archivos.Select(archivo => new ArchivoCommitDto(archivo.Ruta, archivo.RutaAnterior, archivo.TipoCambio, archivo.LineasAgregadas, archivo.LineasEliminadas, archivo.Parche)).ToList(),
            commit.ArchivosTruncados);
    }
}

/// <summary>Guarda (crea o actualiza) un repositorio verificando en GitHub que existan el repositorio y sus ramas.</summary>
/// <param name="Id">null para crear.</param>
/// <param name="RamaPrincipal">Vacía = la rama por defecto del repositorio en GitHub.</param>
/// <param name="ProyectoSoporteId">Proyecto al que pertenece (opcional).</param>
public sealed record GuardarRepositorioComando(
    Guid? Id,
    string Nombre,
    string Propietario,
    string NombreRepositorio,
    string? RamaPrincipal,
    string RamaDesarrollo,
    bool EstaActivo = true,
    Guid? ProyectoSoporteId = null) : IRequest<Guid>;

public sealed class ValidadorGuardarRepositorioComando : AbstractValidator<GuardarRepositorioComando>
{
    public ValidadorGuardarRepositorioComando()
    {
        RuleFor(comando => comando.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(comando => comando.Propietario).NotEmpty().MaximumLength(100).Matches("^[A-Za-z0-9-]+$").WithMessage("Usuario u organización de GitHub no válido.");
        RuleFor(comando => comando.NombreRepositorio).NotEmpty().MaximumLength(100).Matches(@"^[A-Za-z0-9._-]+$").WithMessage("Nombre de repositorio no válido.");
        RuleFor(comando => comando.RamaDesarrollo).NotEmpty().MaximumLength(250);
        RuleFor(comando => comando.RamaPrincipal).MaximumLength(250);
    }
}

public sealed class ManejadorGuardarRepositorioComando : IRequestHandler<GuardarRepositorioComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioGitHub _gitHub;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorGuardarRepositorioComando(IContextoAplicacion contexto, IServicioGitHub gitHub, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _gitHub = gitHub;
        _usuarioActual = usuarioActual;
    }

    public async Task<Guid> Handle(GuardarRepositorioComando comando, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var propietario = comando.Propietario.Trim();
        var nombreRepositorio = comando.NombreRepositorio.Trim();

        Repositorio? repositorio = null;
        if (comando.Id is { } id)
        {
            repositorio = await _contexto.Repositorios.FirstOrDefaultAsync(existente => existente.Id == id && existente.UsuarioId == usuarioId, tokenCancelacion)
                ?? throw new ExcepcionEntidadNoEncontrada("el repositorio", id);
        }

        var repositorioGitHub = await _gitHub.ObtenerRepositorioAsync(propietario, nombreRepositorio, tokenCancelacion);
        var ramaPrincipal = string.IsNullOrWhiteSpace(comando.RamaPrincipal) ? repositorioGitHub.RamaPorDefecto : comando.RamaPrincipal.Trim();
        var ramaDesarrollo = comando.RamaDesarrollo.Trim();

        foreach (var rama in new[] { ramaPrincipal, ramaDesarrollo })
        {
            if (await _gitHub.ObtenerShaRamaAsync(propietario, nombreRepositorio, rama, tokenCancelacion) is null)
                throw new ExcepcionDominio($"La rama \"{rama}\" no existe en {repositorioGitHub.NombreCompleto}.");
        }

        var duplicado = await _contexto.Repositorios.AnyAsync(existente =>
            existente.UsuarioId == usuarioId && existente.Propietario == propietario && existente.NombreRepositorio == nombreRepositorio && existente.Id != comando.Id,
            tokenCancelacion);
        if (duplicado)
            throw new ExcepcionConflicto($"Ya registraste {propietario}/{nombreRepositorio}.");

        if (comando.ProyectoSoporteId is { } proyectoId
            && !await _contexto.ProyectosSoporte.AnyAsync(proyecto => proyecto.Id == proyectoId && proyecto.UsuarioId == usuarioId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("el proyecto", proyectoId);

        if (repositorio is null)
        {
            repositorio = new Repositorio { UsuarioId = usuarioId };
            _contexto.Repositorios.Add(repositorio);
        }

        repositorio.Nombre = comando.Nombre.Trim();
        repositorio.Propietario = propietario;
        repositorio.NombreRepositorio = nombreRepositorio;
        repositorio.RamaPrincipal = ramaPrincipal;
        repositorio.RamaDesarrollo = ramaDesarrollo;
        repositorio.EstaActivo = comando.EstaActivo;
        repositorio.ProyectoSoporteId = comando.ProyectoSoporteId;

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return repositorio.Id;
    }
}
