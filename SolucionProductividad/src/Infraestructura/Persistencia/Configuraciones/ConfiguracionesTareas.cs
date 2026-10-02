using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SolucionProductividad.Dominio.Entidades;

namespace SolucionProductividad.Persistencia.Configuraciones;

public sealed class ConfiguracionProyecto : IEntityTypeConfiguration<Proyecto>
{
    public void Configure(EntityTypeBuilder<Proyecto> entidad)
    {
        entidad.HasKey(proyecto => proyecto.Id);
        entidad.Property(proyecto => proyecto.Nombre).HasMaxLength(100).IsRequired();
        entidad.Property(proyecto => proyecto.ClavePrefijo).HasMaxLength(10).IsRequired();
        entidad.Property(proyecto => proyecto.Descripcion).HasMaxLength(500);
        // La clave es única por usuario: dos personas pueden tener cada una su proyecto "WEB".
        entidad.HasIndex(proyecto => new { proyecto.PropietarioId, proyecto.ClavePrefijo }).IsUnique();
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(proyecto => proyecto.PropietarioId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConfiguracionCarpeta : IEntityTypeConfiguration<Carpeta>
{
    public void Configure(EntityTypeBuilder<Carpeta> entidad)
    {
        entidad.HasKey(carpeta => carpeta.Id);
        entidad.Property(carpeta => carpeta.Nombre).HasMaxLength(100).IsRequired();
        entidad.Property(carpeta => carpeta.Icono).HasMaxLength(50);
        entidad.HasOne<Proyecto>().WithMany().HasForeignKey(carpeta => carpeta.ProyectoId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConfiguracionListaTareas : IEntityTypeConfiguration<ListaTareas>
{
    public void Configure(EntityTypeBuilder<ListaTareas> entidad)
    {
        entidad.HasKey(lista => lista.Id);
        entidad.Property(lista => lista.Nombre).HasMaxLength(100).IsRequired();
        entidad.HasOne(lista => lista.Proyecto).WithMany(proyecto => proyecto.ListasTareas)
            .HasForeignKey(lista => lista.ProyectoId).OnDelete(DeleteBehavior.Restrict);
        entidad.HasOne<Carpeta>().WithMany().HasForeignKey(lista => lista.CarpetaId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConfiguracionTarea : IEntityTypeConfiguration<Tarea>
{
    public void Configure(EntityTypeBuilder<Tarea> entidad)
    {
        entidad.HasKey(tarea => tarea.Id);
        entidad.Ignore(tarea => tarea.Cuadrante);

        // IDENTITY(100,1) sobre una columna que no es la llave primaria.
        entidad.Property(tarea => tarea.NumeroTarea).UseIdentityColumn(100, 1).ValueGeneratedOnAdd();
        entidad.Property(tarea => tarea.NumeroTarea).Metadata.SetAfterSaveBehavior(PropertySaveBehavior.Ignore);
        entidad.HasIndex(tarea => tarea.NumeroTarea).IsUnique();

        entidad.Property(tarea => tarea.Titulo).HasMaxLength(200).IsRequired();
        entidad.Property(tarea => tarea.HorasEstimadas).HasPrecision(5, 2);
        entidad.HasIndex(tarea => new { tarea.ListaTareaId, tarea.IndiceOrden });

        entidad.HasOne(tarea => tarea.ListaTareas).WithMany(lista => lista.Tareas)
            .HasForeignKey(tarea => tarea.ListaTareaId).OnDelete(DeleteBehavior.Restrict);
        entidad.HasOne(tarea => tarea.TareaPadre).WithMany(tarea => tarea.Subtareas)
            .HasForeignKey(tarea => tarea.TareaPadreId).OnDelete(DeleteBehavior.Restrict);
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(tarea => tarea.CreadoPor).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConfiguracionRegistroTiempo : IEntityTypeConfiguration<RegistroTiempo>
{
    public void Configure(EntityTypeBuilder<RegistroTiempo> entidad)
    {
        entidad.HasKey(registro => registro.Id);
        entidad.Property(registro => registro.MinutosTranscurridos)
            .HasComputedColumnSql("DATEDIFF(MINUTE, [RgtFechaInicio], [RgtFechaFin])");
        entidad.Property(registro => registro.Descripcion).HasMaxLength(250);
        entidad.Ignore(registro => registro.EstaEnCurso);
        entidad.HasIndex(registro => new { registro.UsuarioId, registro.FechaInicio });
        // Un solo cronómetro en marcha por usuario.
        entidad.HasIndex(registro => registro.UsuarioId).IsUnique().HasFilter("[RgtFechaFin] IS NULL").HasDatabaseName("UQ_RegistrosTiempo_UnoEnCurso");
        entidad.HasIndex(registro => registro.TicketId);
        entidad.ToTable(tabla =>
        {
            tabla.HasCheckConstraint("CK_RegistrosTiempo_UnDestino", "[RgtTareaId] IS NULL OR [RgtTicketId] IS NULL");
            tabla.HasCheckConstraint("CK_RegistrosTiempo_Rango", "[RgtFechaFin] IS NULL OR [RgtFechaFin] >= [RgtFechaInicio]");
        });

        entidad.HasOne<Tarea>().WithMany().HasForeignKey(registro => registro.TareaId).OnDelete(DeleteBehavior.Cascade);
        entidad.HasOne<Ticket>().WithMany().HasForeignKey(registro => registro.TicketId).OnDelete(DeleteBehavior.SetNull);
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(registro => registro.UsuarioId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConfiguracionMarcador : IEntityTypeConfiguration<Marcador>
{
    public void Configure(EntityTypeBuilder<Marcador> entidad)
    {
        entidad.HasKey(marcador => marcador.Id);
        entidad.Property(marcador => marcador.Titulo).HasMaxLength(200).IsRequired();
        entidad.HasIndex(marcador => new { marcador.UsuarioId, marcador.TipoEntidad, marcador.EntidadId }).IsUnique();
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(marcador => marcador.UsuarioId).OnDelete(DeleteBehavior.Cascade);
    }
}
