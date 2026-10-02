using SolucionProductividad.Aplicacion.Caracteristicas.Archivos.Dtos;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Tickets.Dtos;

public enum EstadoSla
{
    SinSla,
    EnTiempo,
    PorVencer,
    Vencido,
    Cumplido,
    Incumplido
}

public sealed record TicketResumenDto(
    Guid Id,
    int NumeroTicket,
    string Asunto,
    TipoTicket Tipo,
    EstadoTicket Estado,
    Prioridad Prioridad,
    string NombreSolicitante,
    Guid? AgenteAsignadoId,
    string? NombreAgente,
    DateTime FechaCreacion,
    DateTime FechaActualizacion,
    DateTime? FechaLimiteResolucion,
    DateTime? FechaResolucion,
    string? NumeroExterno,
    IReadOnlyList<ProyectoTicketDto> Proyectos)
{
    public string Clave => $"TCK-{NumeroTicket}";

    /// <summary>Semáforo del SLA de resolución; "por vencer" cuando queda menos del 20 % del plazo.</summary>
    public EstadoSla EstadoSla
    {
        get
        {
            if (FechaLimiteResolucion is not { } limite)
                return EstadoSla.SinSla;
            if (FechaResolucion is { } resolucion)
                return resolucion <= limite ? EstadoSla.Cumplido : EstadoSla.Incumplido;
            if (Estado == EstadoTicket.Cancelado)
                return EstadoSla.SinSla;

            var ahora = DateTime.UtcNow;
            if (ahora > limite)
                return EstadoSla.Vencido;
            var plazoTotal = limite - FechaCreacion;
            return limite - ahora < plazoTotal * 0.2 ? EstadoSla.PorVencer : EstadoSla.EnTiempo;
        }
    }
}

public sealed record ArchivoModificadoDto(Guid Id, string RutaArchivo, string? RutaAnterior, TipoCambioArchivo TipoCambio, int LineasAgregadas, int LineasEliminadas, bool TieneParche);

public sealed record DiferenciaArchivoDto(Guid Id, string RutaArchivo, string? RutaAnterior, TipoCambioArchivo TipoCambio, string? Parche);

public sealed record CommitRamaDto(string Sha, string Mensaje, string Autor, DateTime FechaCommit, string Url)
{
    public string ShaCorto => Sha.Length > 7 ? Sha[..7] : Sha;
}

public sealed record RamaTicketDto(
    Guid Id,
    Guid RepositorioId,
    string NombreRepositorio,
    string UrlRepositorio,
    string NombreRama,
    string RamaBase,
    string RamaDestino,
    int? PullRequestNumero,
    string? PullRequestUrl,
    EstadoPullRequest? PullRequestEstado,
    DateTime? PullRequestFechaFusion,
    int TotalCommits,
    int TotalArchivos,
    int LineasAgregadas,
    int LineasEliminadas,
    DateTime? FechaUltimaSincronizacion,
    DateTime FechaCreacion,
    IReadOnlyList<ArchivoModificadoDto> Archivos,
    IReadOnlyList<CommitRamaDto> Commits)
{
    public string UrlRama => $"{UrlRepositorio}/tree/{NombreRama}";
    public string UrlComparacion => $"{UrlRepositorio}/compare/{RamaBase}...{NombreRama}";
}

public sealed record DespliegueTicketDto(
    Guid Id,
    AmbienteDespliegue Ambiente,
    string? Referencia,
    string? Notas,
    ResultadoDespliegue Resultado,
    string? NotasResultado,
    string NombreDesplegadoPor,
    string? NombreEvaluadoPor,
    DateTime FechaDespliegue,
    DateTime? FechaResultado);

public sealed record MensajeTicketDto(Guid Id, string NombreRemitente, string CorreoRemitente, bool EsNotaInterna, string CuerpoMensaje, Guid? UsuarioId, DateTime FechaCreacion);

public sealed record EventoTicketDto(
    Guid Id,
    TipoEventoTicket TipoEvento,
    EstadoTicket? EstadoAnterior,
    EstadoTicket? EstadoNuevo,
    string Descripcion,
    string? Comentario,
    string NombreUsuario,
    DateTime FechaEvento);

public sealed record TareaVinculadaDto(Guid Id, string Clave, string Titulo, EstadoTarea Estado);

public sealed record TicketDetalleDto(
    TicketResumenDto Resumen,
    string CorreoSolicitante,
    string? DescripcionMarkdown,
    string? DocumentacionMarkdown,
    string? IdSeguimiento,
    decimal? HorasDedicadas,
    DateTime? FechaVencimiento,
    string NombreCola,
    string? NombrePoliticaSla,
    DateTime? FechaLimitePrimeraRespuesta,
    DateTime? FechaPrimeraRespuesta,
    DateTime? FechaCierre,
    string NombreCreador,
    TareaVinculadaDto? TareaRelacionada,
    IReadOnlyList<EstadoTicket> TransicionesPermitidas,
    IReadOnlyList<RamaTicketDto> Ramas,
    IReadOnlyList<DespliegueTicketDto> Despliegues,
    IReadOnlyList<MensajeTicketDto> Mensajes,
    IReadOnlyList<EventoTicketDto> Eventos,
    IReadOnlyList<ArchivoAdjuntoDto> Adjuntos);

public sealed record ConteoTicketsDto(int MisAbiertos, int SinAsignar, int EnPruebas, int Vencidos, int Abiertos);

public sealed record UsuarioAsignableDto(Guid Id, string NombreCompleto, string NombreUsuario);

public sealed record RepositorioDto(
    Guid Id,
    string Nombre,
    string Propietario,
    string NombreRepositorio,
    string RamaPrincipal,
    string RamaDesarrollo,
    bool EstaActivo,
    Guid? ProyectoSoporteId,
    string? NombreProyecto)
{
    public string NombreCompleto => $"{Propietario}/{NombreRepositorio}";
    public string UrlWeb => $"https://github.com/{Propietario}/{NombreRepositorio}";
}

/// <param name="NombreProyecto">Proyecto del repositorio, si tiene.</param>
/// <param name="EsDeProyectoDelTicket">El repositorio pertenece a uno de los proyectos del ticket (se listan primero).</param>
public sealed record RamaDetectadaDto(Guid RepositorioId, string NombreRepositorio, string NombreCompleto, string NombreRama, string? NombreProyecto, bool EsDeProyectoDelTicket);

public sealed record ProyectoTicketDto(Guid Id, string Nombre, string Color);

public sealed record RepositorioProyectoDto(Guid Id, string Nombre, string NombreCompleto);

public sealed record ProyectoSoporteDto(
    Guid Id,
    string Nombre,
    string? Descripcion,
    string Color,
    bool EstaActivo,
    int TicketsAbiertos,
    int TotalTickets,
    IReadOnlyList<RepositorioProyectoDto> Repositorios);

/// <param name="Claves">Referencias que se buscan en el nombre de la rama, ej. ["Ticket1468", "TCK-1042"].</param>
/// <param name="NombreSugerido">Nombre recomendado para crear la rama fuera de la app, ej. Ajuste/AndresEspitia-Ticket1468-AjusteMenuEnDispositivos.</param>
/// <param name="Avisos">Repositorios que no se pudieron consultar (token sin acceso, repo renombrado…).</param>
public sealed record DeteccionRamasDto(IReadOnlyList<string> Claves, string NombreSugerido, IReadOnlyList<RamaDetectadaDto> Ramas, IReadOnlyList<string> Avisos);
