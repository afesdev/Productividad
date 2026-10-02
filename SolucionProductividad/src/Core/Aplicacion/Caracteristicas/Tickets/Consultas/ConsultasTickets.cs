using System.Linq.Expressions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Archivos.Dtos;
using SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Dominio.ObjetosValor;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Consultas;

public enum VistaTickets
{
    MisAbiertos,
    Abiertos,
    SinAsignar,
    EnPruebas,
    Cerrados,
    Todos
}

// ---------- Listado ----------

public sealed record ListarTicketsConsulta(VistaTickets Vista = VistaTickets.Abiertos, string? Texto = null, TipoTicket? Tipo = null, Guid? ProyectoId = null)
    : IRequest<IReadOnlyList<TicketResumenDto>>;

public sealed class ManejadorListarTicketsConsulta : IRequestHandler<ListarTicketsConsulta, IReadOnlyList<TicketResumenDto>>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorListarTicketsConsulta(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<IReadOnlyList<TicketResumenDto>> Handle(ListarTicketsConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var tickets = _contexto.Tickets.AsNoTracking();

        tickets = consulta.Vista switch
        {
            VistaTickets.MisAbiertos => tickets.Where(ticket => ticket.AgenteAsignadoId == usuarioId).Where(ProyeccionesTicket.EstaAbierto),
            VistaTickets.Abiertos => tickets.Where(ProyeccionesTicket.EstaAbierto),
            VistaTickets.SinAsignar => tickets.Where(ticket => ticket.AgenteAsignadoId == null).Where(ProyeccionesTicket.EstaAbierto),
            VistaTickets.EnPruebas => tickets.Where(ticket => ticket.Estado == EstadoTicket.EnPruebas || ticket.Estado == EstadoTicket.Aprobado),
            VistaTickets.Cerrados => tickets.Where(ticket => ticket.Estado == EstadoTicket.Cerrado || ticket.Estado == EstadoTicket.Cancelado),
            _ => tickets
        };

        if (consulta.Tipo is { } tipo)
            tickets = tickets.Where(ticket => ticket.Tipo == tipo);

        if (!string.IsNullOrWhiteSpace(consulta.Texto))
        {
            var texto = consulta.Texto.Trim();
            var numero = int.TryParse(texto.Replace("TCK-", string.Empty, StringComparison.OrdinalIgnoreCase), out var valor) ? valor : -1;
            tickets = tickets.Where(ticket => ticket.NumeroTicket == numero || ticket.Asunto.Contains(texto) || ticket.NombreSolicitante.Contains(texto)
                || (ticket.NumeroExterno != null && ticket.NumeroExterno.Contains(texto))
                || (ticket.IdSeguimiento != null && ticket.IdSeguimiento.Contains(texto)));
        }

        if (consulta.ProyectoId is { } proyectoId)
            tickets = tickets.Where(ticket => _contexto.TicketsProyectos.Any(relacion => relacion.TicketId == ticket.Id && relacion.ProyectoSoporteId == proyectoId));

        var resultado = await tickets
            .OrderByDescending(ticket => ticket.FechaActualizacion)
            .Take(300)
            .Select(ProyeccionesTicket.AResumen(_contexto))
            .ToListAsync(tokenCancelacion);

        return resultado;
    }
}

internal static class ProyeccionesTicket
{
    public static readonly Expression<Func<Ticket, bool>> EstaAbierto =
        ticket => ticket.Estado != EstadoTicket.Cerrado && ticket.Estado != EstadoTicket.Cancelado;

    public static Expression<Func<Ticket, TicketResumenDto>> AResumen(IContextoAplicacion contexto) => ticket => new TicketResumenDto(
        ticket.Id,
        ticket.NumeroTicket,
        ticket.Asunto,
        ticket.Tipo,
        ticket.Estado,
        ticket.Prioridad,
        ticket.NombreSolicitante,
        ticket.AgenteAsignadoId,
        contexto.Usuarios.Where(usuario => usuario.Id == ticket.AgenteAsignadoId).Select(usuario => usuario.NombreCompleto).FirstOrDefault(),
        ticket.FechaCreacion,
        ticket.FechaActualizacion,
        ticket.FechaLimiteResolucion,
        ticket.FechaResolucion,
        ticket.NumeroExterno,
        (from relacion in contexto.TicketsProyectos
         join proyecto in contexto.ProyectosSoporte on relacion.ProyectoSoporteId equals proyecto.Id
         where relacion.TicketId == ticket.Id
         orderby proyecto.Nombre
         select new ProyectoTicketDto(proyecto.Id, proyecto.Nombre, proyecto.Color)).ToList());
}

// ---------- Conteos para las pestañas ----------

public sealed record ObtenerConteoTicketsConsulta : IRequest<ConteoTicketsDto>;

public sealed class ManejadorObtenerConteoTicketsConsulta : IRequestHandler<ObtenerConteoTicketsConsulta, ConteoTicketsDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorObtenerConteoTicketsConsulta(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<ConteoTicketsDto> Handle(ObtenerConteoTicketsConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var ahora = DateTime.UtcNow;
        var abiertos = _contexto.Tickets.AsNoTracking().Where(ProyeccionesTicket.EstaAbierto);

        return new ConteoTicketsDto(
            await abiertos.CountAsync(ticket => ticket.AgenteAsignadoId == usuarioId, tokenCancelacion),
            await abiertos.CountAsync(ticket => ticket.AgenteAsignadoId == null, tokenCancelacion),
            await abiertos.CountAsync(ticket => ticket.Estado == EstadoTicket.EnPruebas || ticket.Estado == EstadoTicket.Aprobado, tokenCancelacion),
            await abiertos.CountAsync(ticket => ticket.FechaResolucion == null && ticket.FechaLimiteResolucion < ahora, tokenCancelacion),
            await abiertos.CountAsync(tokenCancelacion));
    }
}

// ---------- Detalle completo ----------

public sealed record ObtenerTicketDetalleConsulta(Guid Id) : IRequest<TicketDetalleDto>;

public sealed class ManejadorObtenerTicketDetalleConsulta : IRequestHandler<ObtenerTicketDetalleConsulta, TicketDetalleDto>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorObtenerTicketDetalleConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<TicketDetalleDto> Handle(ObtenerTicketDetalleConsulta consulta, CancellationToken tokenCancelacion)
    {
        var ticket = await _contexto.Tickets.AsNoTracking().FirstOrDefaultAsync(ticket => ticket.Id == consulta.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el ticket", consulta.Id);

        var resumen = await _contexto.Tickets.AsNoTracking().Where(candidato => candidato.Id == ticket.Id).Select(ProyeccionesTicket.AResumen(_contexto)).FirstAsync(tokenCancelacion);

        var ramas = await _contexto.RamasTicket.AsNoTracking()
            .Where(rama => rama.TicketId == ticket.Id)
            .OrderBy(rama => rama.FechaCreacion)
            .Select(rama => new RamaTicketDto(
                rama.Id,
                rama.RepositorioId,
                rama.Repositorio!.Propietario + "/" + rama.Repositorio.NombreRepositorio,
                "https://github.com/" + rama.Repositorio.Propietario + "/" + rama.Repositorio.NombreRepositorio,
                rama.NombreRama,
                rama.RamaBase,
                rama.RamaDestino,
                rama.PullRequestNumero,
                rama.PullRequestUrl,
                rama.PullRequestEstado,
                rama.PullRequestFechaFusion,
                rama.TotalCommits,
                rama.TotalArchivos,
                rama.LineasAgregadas,
                rama.LineasEliminadas,
                rama.FechaUltimaSincronizacion,
                rama.FechaCreacion,
                new List<ArchivoModificadoDto>(),
                new List<CommitRamaDto>()))
            .ToListAsync(tokenCancelacion);

        // Archivos y commits en consultas aparte: juntos en un JOIN multiplicarían filas (archivos × commits).
        var idsRamas = ramas.Select(rama => rama.Id).ToList();
        var archivosPorRama = (await _contexto.ArchivosModificados.AsNoTracking()
                .Where(archivo => idsRamas.Contains(archivo.RamaTicketId))
                .OrderBy(archivo => archivo.RutaArchivo)
                .Select(archivo => new
                {
                    archivo.RamaTicketId,
                    Dto = new ArchivoModificadoDto(archivo.Id, archivo.RutaArchivo, archivo.RutaAnterior, archivo.TipoCambio, archivo.LineasAgregadas, archivo.LineasEliminadas, archivo.Parche != null)
                })
                .ToListAsync(tokenCancelacion))
            .ToLookup(archivo => archivo.RamaTicketId, archivo => archivo.Dto);
        var commitsPorRama = (await _contexto.CommitsRama.AsNoTracking()
                .Where(commit => idsRamas.Contains(commit.RamaTicketId))
                .OrderByDescending(commit => commit.FechaCommit)
                .Select(commit => new { commit.RamaTicketId, Dto = new CommitRamaDto(commit.Sha, commit.Mensaje, commit.Autor, commit.FechaCommit, commit.Url) })
                .ToListAsync(tokenCancelacion))
            .ToLookup(commit => commit.RamaTicketId, commit => commit.Dto);
        ramas = ramas.Select(rama => rama with { Archivos = archivosPorRama[rama.Id].ToList(), Commits = commitsPorRama[rama.Id].ToList() }).ToList();

        var despliegues = await _contexto.DesplieguesTicket.AsNoTracking()
            .Where(despliegue => despliegue.TicketId == ticket.Id)
            .OrderByDescending(despliegue => despliegue.FechaDespliegue)
            .Select(despliegue => new DespliegueTicketDto(
                despliegue.Id,
                despliegue.Ambiente,
                despliegue.Referencia,
                despliegue.Notas,
                despliegue.Resultado,
                despliegue.NotasResultado,
                _contexto.Usuarios.Where(usuario => usuario.Id == despliegue.DesplegadoPor).Select(usuario => usuario.NombreCompleto).FirstOrDefault() ?? "—",
                _contexto.Usuarios.Where(usuario => usuario.Id == despliegue.EvaluadoPor).Select(usuario => usuario.NombreCompleto).FirstOrDefault(),
                despliegue.FechaDespliegue,
                despliegue.FechaResultado))
            .ToListAsync(tokenCancelacion);

        var mensajes = await _contexto.MensajesTicket.AsNoTracking()
            .Where(mensaje => mensaje.TicketId == ticket.Id)
            .OrderBy(mensaje => mensaje.FechaCreacion)
            .Select(mensaje => new MensajeTicketDto(mensaje.Id, mensaje.NombreRemitente, mensaje.CorreoRemitente, mensaje.EsNotaInterna, mensaje.CuerpoMensaje, mensaje.UsuarioId, mensaje.FechaCreacion))
            .ToListAsync(tokenCancelacion);

        var eventos = await _contexto.EventosTicket.AsNoTracking()
            .Where(evento => evento.TicketId == ticket.Id)
            .OrderByDescending(evento => evento.FechaEvento)
            .Select(evento => new EventoTicketDto(
                evento.Id,
                evento.TipoEvento,
                evento.EstadoAnterior,
                evento.EstadoNuevo,
                evento.Descripcion,
                evento.Comentario,
                _contexto.Usuarios.Where(usuario => usuario.Id == evento.UsuarioId).Select(usuario => usuario.NombreCompleto).FirstOrDefault() ?? "—",
                evento.FechaEvento))
            .ToListAsync(tokenCancelacion);

        var adjuntos = await _contexto.ArchivosAdjuntos.AsNoTracking()
            .Where(adjunto => adjunto.TicketId == ticket.Id)
            .OrderByDescending(adjunto => adjunto.FechaCreacion)
            .Select(ProyeccionesAdjunto.ADto)
            .ToListAsync(tokenCancelacion);

        var tarea = ticket.TareaRelacionadaId is null
            ? null
            : await _contexto.Tareas.AsNoTracking()
                .Where(tarea => tarea.Id == ticket.TareaRelacionadaId)
                .Select(tarea => new TareaVinculadaDto(tarea.Id, tarea.ListaTareas!.Proyecto!.ClavePrefijo + "-" + tarea.NumeroTarea, tarea.Titulo, tarea.Estado))
                .FirstOrDefaultAsync(tokenCancelacion);

        var nombreCola = await _contexto.ColasSoporte.Where(cola => cola.Id == ticket.ColaSoporteId).Select(cola => cola.Nombre).FirstOrDefaultAsync(tokenCancelacion) ?? "—";
        var nombrePolitica = await _contexto.PoliticasSla.Where(politica => politica.Id == ticket.PoliticaSlaId).Select(politica => politica.Nombre).FirstOrDefaultAsync(tokenCancelacion);
        var nombreCreador = await _contexto.Usuarios.Where(usuario => usuario.Id == ticket.CreadoPor).Select(usuario => usuario.NombreCompleto).FirstOrDefaultAsync(tokenCancelacion) ?? "—";

        return new TicketDetalleDto(
            resumen,
            ticket.CorreoSolicitante,
            ticket.DescripcionMarkdown,
            ticket.DocumentacionMarkdown,
            ticket.IdSeguimiento,
            ticket.HorasDedicadas,
            ticket.FechaVencimiento,
            nombreCola,
            nombrePolitica,
            ticket.FechaLimitePrimeraRespuesta,
            ticket.FechaPrimeraRespuesta,
            ticket.FechaCierre,
            nombreCreador,
            tarea,
            MaquinaEstadosTicket.ObtenerSiguientes(ticket.Estado, ticket.Tipo),
            ramas,
            despliegues,
            mensajes,
            eventos,
            adjuntos);
    }
}

// ---------- Personas a las que se puede asignar ----------

public sealed record ListarUsuariosAsignablesConsulta : IRequest<IReadOnlyList<UsuarioAsignableDto>>;

public sealed class ManejadorListarUsuariosAsignablesConsulta : IRequestHandler<ListarUsuariosAsignablesConsulta, IReadOnlyList<UsuarioAsignableDto>>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorListarUsuariosAsignablesConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<IReadOnlyList<UsuarioAsignableDto>> Handle(ListarUsuariosAsignablesConsulta consulta, CancellationToken tokenCancelacion) =>
        await _contexto.Usuarios.AsNoTracking()
            .Where(usuario => usuario.EstaActivo)
            .OrderBy(usuario => usuario.NombreCompleto)
            .Select(usuario => new UsuarioAsignableDto(usuario.Id, usuario.NombreCompleto, usuario.NombreUsuario))
            .ToListAsync(tokenCancelacion);
}

// ---------- Diferencia (diff) de un archivo modificado ----------

public sealed record ObtenerDiferenciaArchivoConsulta(Guid ArchivoModificadoId) : IRequest<DiferenciaArchivoDto>;

public sealed class ManejadorObtenerDiferenciaArchivoConsulta : IRequestHandler<ObtenerDiferenciaArchivoConsulta, DiferenciaArchivoDto>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorObtenerDiferenciaArchivoConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<DiferenciaArchivoDto> Handle(ObtenerDiferenciaArchivoConsulta consulta, CancellationToken tokenCancelacion)
    {
        // El join con Tickets aplica el filtro por usuario: solo quien ve el ticket ve sus diferencias.
        return await (
                from archivo in _contexto.ArchivosModificados.AsNoTracking()
                join rama in _contexto.RamasTicket on archivo.RamaTicketId equals rama.Id
                join ticket in _contexto.Tickets on rama.TicketId equals ticket.Id
                where archivo.Id == consulta.ArchivoModificadoId
                select new DiferenciaArchivoDto(archivo.Id, archivo.RutaArchivo, archivo.RutaAnterior, archivo.TipoCambio, archivo.Parche))
            .FirstOrDefaultAsync(tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el archivo modificado", consulta.ArchivoModificadoId);
    }
}

// ---------- Detectar ramas del ticket en GitHub ----------
// Las ramas se crean fuera de la app con la convención del equipo (ver ConvencionRamas):
// Ajuste/AndresEspitia-Ticket1468-AjusteMenuEnDispositivos, donde 1468 es el Nº de ticket externo.

public sealed record DetectarRamasTicketConsulta(Guid TicketId) : IRequest<DeteccionRamasDto>;

public sealed class ManejadorDetectarRamasTicketConsulta : IRequestHandler<DetectarRamasTicketConsulta, DeteccionRamasDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioGitHub _gitHub;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorDetectarRamasTicketConsulta(IContextoAplicacion contexto, IServicioGitHub gitHub, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _gitHub = gitHub;
        _usuarioActual = usuarioActual;
    }

    public async Task<DeteccionRamasDto> Handle(DetectarRamasTicketConsulta consulta, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var ticket = await _contexto.Tickets.AsNoTracking().FirstOrDefaultAsync(ticket => ticket.Id == consulta.TicketId, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el ticket", consulta.TicketId);
        var nombreDesarrollador = await _contexto.Usuarios.AsNoTracking()
            .Where(usuario => usuario.Id == usuarioId)
            .Select(usuario => usuario.NombreCompleto)
            .FirstOrDefaultAsync(tokenCancelacion) ?? string.Empty;

        var repositorios = await _contexto.Repositorios.AsNoTracking()
            .Where(repositorio => repositorio.UsuarioId == usuarioId && repositorio.EstaActivo)
            .OrderBy(repositorio => repositorio.Nombre)
            .ToListAsync(tokenCancelacion);
        var proyectosDelTicket = await _contexto.TicketsProyectos.AsNoTracking()
            .Where(relacion => relacion.TicketId == ticket.Id)
            .Select(relacion => relacion.ProyectoSoporteId)
            .ToListAsync(tokenCancelacion);
        var nombresProyecto = await _contexto.ProyectosSoporte.AsNoTracking()
            .Where(proyecto => proyecto.UsuarioId == usuarioId || proyectosDelTicket.Contains(proyecto.Id))
            .ToDictionaryAsync(proyecto => proyecto.Id, proyecto => proyecto.Nombre, tokenCancelacion);
        var vinculadas = (await _contexto.RamasTicket.AsNoTracking()
                .Where(rama => rama.TicketId == ticket.Id)
                .Select(rama => new { rama.RepositorioId, rama.NombreRama })
                .ToListAsync(tokenCancelacion))
            .Select(rama => (rama.RepositorioId, rama.NombreRama))
            .ToHashSet();

        var ramas = new List<RamaDetectadaDto>();
        var avisos = new List<string>();
        foreach (var repositorio in repositorios)
        {
            try
            {
                var nombres = await _gitHub.ListarRamasAsync(repositorio.Propietario, repositorio.NombreRepositorio, tokenCancelacion);
                ramas.AddRange(nombres
                    .Where(nombre => ConvencionRamas.Coincide(nombre, ticket) && !vinculadas.Contains((repositorio.Id, nombre)))
                    .Select(nombre => new RamaDetectadaDto(repositorio.Id, repositorio.Nombre, repositorio.NombreCompleto, nombre,
                        repositorio.ProyectoSoporteId is { } proyectoId ? nombresProyecto.GetValueOrDefault(proyectoId) : null,
                        repositorio.ProyectoSoporteId is { } idProyecto && proyectosDelTicket.Contains(idProyecto))));
            }
            catch (ExcepcionDominio excepcion)
            {
                avisos.Add($"{repositorio.NombreCompleto}: {excepcion.Message}");
            }
        }

        // Primero las ramas de los repositorios de los proyectos del ticket.
        var ordenadas = ramas.OrderByDescending(rama => rama.EsDeProyectoDelTicket).ThenBy(rama => rama.NombreRepositorio).ToList();
        return new DeteccionRamasDto(ConvencionRamas.Claves(ticket), ConvencionRamas.Sugerir(ticket, nombreDesarrollador), ordenadas, avisos);
    }
}
