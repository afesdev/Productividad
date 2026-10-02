using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Persistencia.Configuraciones;

public sealed class ConfiguracionColaSoporte : IEntityTypeConfiguration<ColaSoporte>
{
    public void Configure(EntityTypeBuilder<ColaSoporte> entidad)
    {
        entidad.HasKey(cola => cola.Id);
        entidad.Property(cola => cola.Nombre).HasMaxLength(100).IsRequired();
        entidad.Property(cola => cola.Descripcion).HasMaxLength(250);

        entidad.HasData(new ColaSoporte
        {
            Id = ValoresSemillaSoporte.IdColaGeneral,
            Nombre = "General",
            Descripcion = "Cola por defecto para todos los tickets.",
            EstaActiva = true
        });
    }
}

public sealed class ConfiguracionPoliticaSla : IEntityTypeConfiguration<PoliticaSla>
{
    public void Configure(EntityTypeBuilder<PoliticaSla> entidad)
    {
        entidad.HasKey(politica => politica.Id);
        entidad.Property(politica => politica.Nombre).HasMaxLength(100).IsRequired();

        entidad.HasData(ValoresSemillaSoporte.PoliticasPorPrioridad.Values.Select(politica => new PoliticaSla
        {
            Id = politica.Id,
            Nombre = politica.Nombre,
            MinutosPrimeraRespuesta = politica.MinutosPrimeraRespuesta,
            MinutosResolucion = politica.MinutosResolucion,
            EstaActiva = true
        }));
    }
}

public sealed class ConfiguracionTicket : IEntityTypeConfiguration<Ticket>
{
    public void Configure(EntityTypeBuilder<Ticket> entidad)
    {
        entidad.HasKey(ticket => ticket.Id);

        entidad.Property(ticket => ticket.NumeroTicket).UseIdentityColumn(1000, 1).ValueGeneratedOnAdd();
        entidad.Property(ticket => ticket.NumeroTicket).Metadata.SetAfterSaveBehavior(PropertySaveBehavior.Ignore);
        entidad.HasIndex(ticket => ticket.NumeroTicket).IsUnique();

        entidad.Property(ticket => ticket.CorreoSolicitante).HasMaxLength(256).IsRequired();
        entidad.Property(ticket => ticket.NombreSolicitante).HasMaxLength(150).IsRequired();
        entidad.Property(ticket => ticket.Asunto).HasMaxLength(250).IsRequired();
        entidad.Property(ticket => ticket.NumeroExterno).HasMaxLength(50);
        entidad.Property(ticket => ticket.IdSeguimiento).HasMaxLength(100);
        entidad.Property(ticket => ticket.HorasDedicadas).HasPrecision(6, 2);
        entidad.HasIndex(ticket => ticket.NumeroExterno);
        entidad.HasIndex(ticket => new { ticket.AgenteAsignadoId, ticket.Estado });
        entidad.HasIndex(ticket => ticket.Estado);

        entidad.HasOne<ColaSoporte>().WithMany().HasForeignKey(ticket => ticket.ColaSoporteId).OnDelete(DeleteBehavior.Restrict);
        entidad.HasOne<PoliticaSla>().WithMany().HasForeignKey(ticket => ticket.PoliticaSlaId).OnDelete(DeleteBehavior.Restrict);
        entidad.HasOne<Tarea>().WithMany().HasForeignKey(ticket => ticket.TareaRelacionadaId).OnDelete(DeleteBehavior.Restrict);
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(ticket => ticket.AgenteAsignadoId).OnDelete(DeleteBehavior.Restrict);
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(ticket => ticket.CreadoPor).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConfiguracionMensajeTicket : IEntityTypeConfiguration<MensajeTicket>
{
    public void Configure(EntityTypeBuilder<MensajeTicket> entidad)
    {
        entidad.HasKey(mensaje => mensaje.Id);
        entidad.Property(mensaje => mensaje.CorreoRemitente).HasMaxLength(256).IsRequired();
        entidad.Property(mensaje => mensaje.NombreRemitente).HasMaxLength(150).IsRequired();
        entidad.Property(mensaje => mensaje.CuerpoMensaje).IsRequired();
        entidad.HasOne<Ticket>().WithMany(ticket => ticket.Mensajes)
            .HasForeignKey(mensaje => mensaje.TicketId).OnDelete(DeleteBehavior.Cascade);
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(mensaje => mensaje.UsuarioId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConfiguracionRepositorio : IEntityTypeConfiguration<Repositorio>
{
    public void Configure(EntityTypeBuilder<Repositorio> entidad)
    {
        entidad.HasKey(repositorio => repositorio.Id);
        entidad.Property(repositorio => repositorio.Nombre).HasMaxLength(100).IsRequired();
        entidad.Property(repositorio => repositorio.Propietario).HasMaxLength(100).IsRequired();
        entidad.Property(repositorio => repositorio.NombreRepositorio).HasMaxLength(100).IsRequired();
        entidad.Property(repositorio => repositorio.RamaPrincipal).HasMaxLength(250).IsRequired();
        entidad.Property(repositorio => repositorio.RamaDesarrollo).HasMaxLength(250).IsRequired();
        entidad.HasIndex(repositorio => new { repositorio.UsuarioId, repositorio.Propietario, repositorio.NombreRepositorio }).IsUnique();
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(repositorio => repositorio.UsuarioId).OnDelete(DeleteBehavior.Restrict);
        // Borrar el proyecto deja el repositorio sin proyecto.
        entidad.HasOne<ProyectoSoporte>().WithMany().HasForeignKey(repositorio => repositorio.ProyectoSoporteId).OnDelete(DeleteBehavior.SetNull);
    }
}

/// <summary>
/// Catálogo por usuario sin filtro global (como los repositorios): en un ticket compartido
/// el asignado debe ver los proyectos que puso el creador. El filtro se aplica al listar y al asignar.
/// </summary>
public sealed class ConfiguracionProyectoSoporte : IEntityTypeConfiguration<ProyectoSoporte>
{
    public void Configure(EntityTypeBuilder<ProyectoSoporte> entidad)
    {
        entidad.HasKey(proyecto => proyecto.Id);
        entidad.Property(proyecto => proyecto.Nombre).HasMaxLength(100).IsRequired();
        entidad.Property(proyecto => proyecto.Descripcion).HasMaxLength(500);
        entidad.Property(proyecto => proyecto.Color).HasMaxLength(20).IsUnicode(false).IsRequired();
        entidad.HasIndex(proyecto => new { proyecto.UsuarioId, proyecto.Nombre }).IsUnique();
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(proyecto => proyecto.UsuarioId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConfiguracionTicketProyecto : IEntityTypeConfiguration<TicketProyecto>
{
    public void Configure(EntityTypeBuilder<TicketProyecto> entidad)
    {
        entidad.HasKey(relacion => relacion.Id);
        entidad.HasIndex(relacion => new { relacion.TicketId, relacion.ProyectoSoporteId }).IsUnique();
        entidad.HasIndex(relacion => relacion.ProyectoSoporteId);
        entidad.HasOne<Ticket>().WithMany().HasForeignKey(relacion => relacion.TicketId).OnDelete(DeleteBehavior.Cascade);
        entidad.HasOne<ProyectoSoporte>().WithMany().HasForeignKey(relacion => relacion.ProyectoSoporteId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ConfiguracionRamaTicket : IEntityTypeConfiguration<RamaTicket>
{
    public void Configure(EntityTypeBuilder<RamaTicket> entidad)
    {
        entidad.HasKey(rama => rama.Id);
        entidad.Property(rama => rama.NombreRama).HasMaxLength(250).IsRequired();
        entidad.Property(rama => rama.RamaBase).HasMaxLength(250).IsRequired();
        entidad.Property(rama => rama.RamaDestino).HasMaxLength(250).IsRequired();
        entidad.Property(rama => rama.PullRequestUrl).HasMaxLength(500);
        entidad.HasIndex(rama => new { rama.TicketId, rama.RepositorioId, rama.NombreRama }).IsUnique();

        // Los tickets no se eliminan (se cancelan), así que no hay cascada desde Tickets.
        entidad.HasOne<Ticket>().WithMany().HasForeignKey(rama => rama.TicketId).OnDelete(DeleteBehavior.Restrict);
        entidad.HasOne(rama => rama.Repositorio).WithMany().HasForeignKey(rama => rama.RepositorioId).OnDelete(DeleteBehavior.Restrict);
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(rama => rama.CreadoPor).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConfiguracionArchivoModificado : IEntityTypeConfiguration<ArchivoModificado>
{
    public void Configure(EntityTypeBuilder<ArchivoModificado> entidad)
    {
        entidad.HasKey(archivo => archivo.Id);
        entidad.Property(archivo => archivo.RutaArchivo).HasMaxLength(500).IsRequired();
        entidad.Property(archivo => archivo.RutaAnterior).HasMaxLength(500);
        entidad.HasOne<RamaTicket>().WithMany(rama => rama.Archivos).HasForeignKey(archivo => archivo.RamaTicketId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ConfiguracionCommitRama : IEntityTypeConfiguration<CommitRama>
{
    public void Configure(EntityTypeBuilder<CommitRama> entidad)
    {
        entidad.HasKey(commit => commit.Id);
        entidad.Property(commit => commit.Sha).HasMaxLength(40).IsUnicode(false).IsRequired();
        entidad.Property(commit => commit.Mensaje).HasMaxLength(2000).IsRequired();
        entidad.Property(commit => commit.Autor).HasMaxLength(150).IsRequired();
        entidad.Property(commit => commit.Url).HasMaxLength(500).IsRequired();
        entidad.HasOne<RamaTicket>().WithMany(rama => rama.Commits).HasForeignKey(commit => commit.RamaTicketId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ConfiguracionDespliegueTicket : IEntityTypeConfiguration<DespliegueTicket>
{
    public void Configure(EntityTypeBuilder<DespliegueTicket> entidad)
    {
        entidad.HasKey(despliegue => despliegue.Id);
        entidad.Property(despliegue => despliegue.Referencia).HasMaxLength(200);
        entidad.Property(despliegue => despliegue.Notas).HasMaxLength(2000);
        entidad.Property(despliegue => despliegue.NotasResultado).HasMaxLength(2000);
        entidad.HasIndex(despliegue => despliegue.TicketId);
        entidad.HasOne<Ticket>().WithMany().HasForeignKey(despliegue => despliegue.TicketId).OnDelete(DeleteBehavior.Restrict);
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(despliegue => despliegue.DesplegadoPor).OnDelete(DeleteBehavior.Restrict);
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(despliegue => despliegue.EvaluadoPor).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConfiguracionEventoTicket : IEntityTypeConfiguration<EventoTicket>
{
    public void Configure(EntityTypeBuilder<EventoTicket> entidad)
    {
        entidad.HasKey(evento => evento.Id);
        entidad.Property(evento => evento.EstadoAnterior).HasConversion<string>().HasMaxLength(30).IsUnicode(false);
        entidad.Property(evento => evento.EstadoNuevo).HasConversion<string>().HasMaxLength(30).IsUnicode(false);
        entidad.Property(evento => evento.Descripcion).HasMaxLength(500).IsRequired();
        entidad.Property(evento => evento.Comentario).HasMaxLength(4000);
        entidad.HasIndex(evento => new { evento.TicketId, evento.FechaEvento });
        entidad.HasOne<Ticket>().WithMany().HasForeignKey(evento => evento.TicketId).OnDelete(DeleteBehavior.Restrict);
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(evento => evento.UsuarioId).OnDelete(DeleteBehavior.Restrict);
    }
}
