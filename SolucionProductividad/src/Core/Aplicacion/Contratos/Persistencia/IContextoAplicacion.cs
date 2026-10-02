using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Dominio.Entidades;

namespace SolucionProductividad.Aplicacion.Contratos.Persistencia;

/// <summary>
/// Unidad de trabajo EF Core expuesta a la capa de aplicación.
/// </summary>
public interface IContextoAplicacion
{
    DbSet<Usuario> Usuarios { get; }
    DbSet<Rol> Roles { get; }
    DbSet<UsuarioRol> UsuariosRoles { get; }
    DbSet<TokenRefresco> TokensRefresco { get; }

    DbSet<Proyecto> Proyectos { get; }
    DbSet<Carpeta> Carpetas { get; }
    DbSet<ListaTareas> ListasTareas { get; }
    DbSet<Tarea> Tareas { get; }
    DbSet<RegistroTiempo> RegistrosTiempo { get; }
    DbSet<ColaSoporte> ColasSoporte { get; }
    DbSet<PoliticaSla> PoliticasSla { get; }
    DbSet<Ticket> Tickets { get; }
    DbSet<MensajeTicket> MensajesTicket { get; }
    DbSet<DocumentoMarkdown> DocumentosMarkdown { get; }
    DbSet<RegistroDiario> RegistrosDiarios { get; }
    DbSet<EntradaDiario> EntradasDiario { get; }
    DbSet<ArchivoAdjunto> ArchivosAdjuntos { get; }
    DbSet<ReferenciaEntidad> ReferenciasEntidades { get; }
    DbSet<SecretoBoveda> BovedaSecretos { get; }
    DbSet<Marcador> Marcadores { get; }
    DbSet<Repositorio> Repositorios { get; }
    DbSet<ProyectoSoporte> ProyectosSoporte { get; }
    DbSet<TicketProyecto> TicketsProyectos { get; }
    DbSet<RamaTicket> RamasTicket { get; }
    DbSet<ArchivoModificado> ArchivosModificados { get; }
    DbSet<CommitRama> CommitsRama { get; }
    DbSet<DespliegueTicket> DesplieguesTicket { get; }
    DbSet<EventoTicket> EventosTicket { get; }
    DbSet<CarpetaDocumento> CarpetasDocumento { get; }
    DbSet<EtiquetaDocumento> EtiquetasDocumento { get; }
    DbSet<DocumentoEtiqueta> DocumentosEtiquetas { get; }
    DbSet<VersionDocumento> VersionesDocumento { get; }
    DbSet<Lienzo> Lienzos { get; }

    Task<int> GuardarCambiosAsync(CancellationToken tokenCancelacion = default);
}
