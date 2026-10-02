using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SolucionProductividad.Dominio.Entidades;

namespace SolucionProductividad.Persistencia.Configuraciones;

public sealed class ConfiguracionDocumentoMarkdown : IEntityTypeConfiguration<DocumentoMarkdown>
{
    public void Configure(EntityTypeBuilder<DocumentoMarkdown> entidad)
    {
        entidad.HasKey(documento => documento.Id);
        entidad.Property(documento => documento.Titulo).HasMaxLength(200).IsRequired();
        entidad.Property(documento => documento.RutaEsquema).HasMaxLength(220).IsRequired();
        entidad.Property(documento => documento.ContenidoMarkdown).IsRequired();
        entidad.Property(documento => documento.Icono).HasMaxLength(50);
        entidad.HasIndex(documento => new { documento.CreadoPor, documento.RutaEsquema }).IsUnique();
        entidad.HasOne<DocumentoMarkdown>().WithMany().HasForeignKey(documento => documento.DocumentoReemplazoId).OnDelete(DeleteBehavior.Restrict);
        entidad.HasIndex(documento => documento.Titulo);

        entidad.HasOne<Proyecto>().WithMany().HasForeignKey(documento => documento.ProyectoId).OnDelete(DeleteBehavior.Restrict);
        entidad.HasOne<DocumentoMarkdown>().WithMany().HasForeignKey(documento => documento.DocumentoPadreId).OnDelete(DeleteBehavior.Restrict);
        entidad.HasOne<CarpetaDocumento>().WithMany().HasForeignKey(documento => documento.CarpetaDocumentoId).OnDelete(DeleteBehavior.Restrict);
        entidad.HasIndex(documento => new { documento.CreadoPor, documento.EstaArchivado, documento.CarpetaDocumentoId });
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(documento => documento.CreadoPor).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConfiguracionRegistroDiario : IEntityTypeConfiguration<RegistroDiario>
{
    public void Configure(EntityTypeBuilder<RegistroDiario> entidad)
    {
        entidad.HasKey(registro => registro.Id);
        entidad.Property(registro => registro.FechaLog).HasColumnType("date");
        entidad.Property(registro => registro.ContenidoMarkdown).IsRequired();
        entidad.HasIndex(registro => new { registro.UsuarioId, registro.FechaLog }).IsUnique().HasDatabaseName("UQ_Usuario_FechaLog");
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(registro => registro.UsuarioId).OnDelete(DeleteBehavior.Restrict);
        entidad.ToTable(tabla =>
        {
            tabla.HasCheckConstraint("CK_RegistrosDiarios_Animo", "[LogAnimo] IS NULL OR [LogAnimo] BETWEEN 1 AND 5");
            tabla.HasCheckConstraint("CK_RegistrosDiarios_Energia", "[LogEnergia] IS NULL OR [LogEnergia] BETWEEN 1 AND 5");
        });
    }
}

public sealed class ConfiguracionEntradaDiario : IEntityTypeConfiguration<EntradaDiario>
{
    public void Configure(EntityTypeBuilder<EntradaDiario> entidad)
    {
        entidad.HasKey(entrada => entrada.Id);
        entidad.Property(entrada => entrada.Tipo).HasConversion<string>().HasMaxLength(20).IsUnicode(false);
        entidad.Property(entrada => entrada.Titulo).HasMaxLength(500).IsRequired();
        entidad.Property(entrada => entrada.HoraInicio).HasColumnType("time(0)");
        entidad.Property(entrada => entrada.HoraFin).HasColumnType("time(0)");
        entidad.HasIndex(entrada => new { entrada.RegistroDiarioId, entrada.HoraInicio });
        entidad.HasIndex(entrada => entrada.Tipo);
        entidad.HasOne(entrada => entrada.RegistroDiario).WithMany(registro => registro.Entradas)
            .HasForeignKey(entrada => entrada.RegistroDiarioId).OnDelete(DeleteBehavior.Cascade);
        // Si se borra la tarea, la entrada se queda (pierde el vínculo).
        entidad.HasOne(entrada => entrada.Tarea).WithMany().HasForeignKey(entrada => entrada.TareaId).OnDelete(DeleteBehavior.SetNull);
        entidad.Property(entrada => entrada.EstadoReporte).HasConversion<string>().HasMaxLength(20).IsUnicode(false);
        // Borrar un tablero del catálogo no borra actividades: quedan sin tablero.
        entidad.HasOne(entrada => entrada.TableroReporte).WithMany().HasForeignKey(entrada => entrada.TableroReporteId).OnDelete(DeleteBehavior.SetNull);
        entidad.HasIndex(entrada => entrada.FechaReportado);
    }
}

public sealed class ConfiguracionTableroReporte : IEntityTypeConfiguration<TableroReporte>
{
    public void Configure(EntityTypeBuilder<TableroReporte> entidad)
    {
        entidad.HasKey(tablero => tablero.Id);
        entidad.Property(tablero => tablero.Nombre).HasMaxLength(150).IsRequired();
        entidad.HasIndex(tablero => new { tablero.UsuarioId, tablero.Nombre }).IsUnique();
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(tablero => tablero.UsuarioId).OnDelete(DeleteBehavior.Restrict);
        // Proyecto solo sirve para sugerir el tablero; si se borra el proyecto, el tablero sigue.
        entidad.HasOne(tablero => tablero.Proyecto).WithMany().HasForeignKey(tablero => tablero.ProyectoId).OnDelete(DeleteBehavior.SetNull);
    }
}

public sealed class ConfiguracionLienzo : IEntityTypeConfiguration<Lienzo>
{
    public void Configure(EntityTypeBuilder<Lienzo> entidad)
    {
        entidad.HasKey(lienzo => lienzo.Id);
        entidad.Property(lienzo => lienzo.Titulo).HasMaxLength(200).IsRequired();
        entidad.Property(lienzo => lienzo.ContenidoJson).IsRequired();
        entidad.HasIndex(lienzo => new { lienzo.UsuarioId, lienzo.FechaActualizacion });
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(lienzo => lienzo.UsuarioId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConfiguracionConexionCalendario : IEntityTypeConfiguration<ConexionCalendario>
{
    public void Configure(EntityTypeBuilder<ConexionCalendario> entidad)
    {
        entidad.HasKey(conexion => conexion.Id);
        // Cifrado (AES + Base64) de un enlace de hasta 2000 caracteres.
        entidad.Property(conexion => conexion.UrlIcsCifrada).HasMaxLength(4000).IsRequired();
        entidad.HasIndex(conexion => conexion.UsuarioId).IsUnique();
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(conexion => conexion.UsuarioId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConfiguracionArchivoAdjunto : IEntityTypeConfiguration<ArchivoAdjunto>
{
    public void Configure(EntityTypeBuilder<ArchivoAdjunto> entidad)
    {
        entidad.HasKey(adjunto => adjunto.Id);
        entidad.Property(adjunto => adjunto.NombreArchivo).HasMaxLength(255).IsRequired();
        entidad.Property(adjunto => adjunto.TipoContenido).HasMaxLength(100).IsRequired();
        entidad.Property(adjunto => adjunto.RutaFirebaseStorage).HasMaxLength(500).IsRequired();
        entidad.Property(adjunto => adjunto.UrlDescarga).HasMaxLength(1000).IsRequired();

        entidad.HasOne<Tarea>().WithMany().HasForeignKey(adjunto => adjunto.TareaId).OnDelete(DeleteBehavior.Cascade);
        entidad.HasOne<MensajeTicket>().WithMany().HasForeignKey(adjunto => adjunto.MensajeTicketId).OnDelete(DeleteBehavior.Cascade);
        entidad.HasOne<DocumentoMarkdown>().WithMany().HasForeignKey(adjunto => adjunto.DocumentoId).OnDelete(DeleteBehavior.Cascade);
        entidad.HasOne<RegistroDiario>().WithMany().HasForeignKey(adjunto => adjunto.RegistroDiarioId).OnDelete(DeleteBehavior.Cascade);
        // Restrict: Tickets ya cascadea hacia adjuntos a través de MensajesTicket (SQL Server no admite dos caminos de cascada).
        entidad.HasOne<Ticket>().WithMany().HasForeignKey(adjunto => adjunto.TicketId).OnDelete(DeleteBehavior.Restrict);
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(adjunto => adjunto.SubidoPor).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConfiguracionReferenciaEntidad : IEntityTypeConfiguration<ReferenciaEntidad>
{
    public void Configure(EntityTypeBuilder<ReferenciaEntidad> entidad)
    {
        entidad.HasKey(referencia => referencia.Id);
        entidad.HasIndex(referencia => new { referencia.TipoOrigen, referencia.OrigenId });
        entidad.HasIndex(referencia => new { referencia.TipoDestino, referencia.DestinoId });
    }
}

public sealed class ConfiguracionSecretoBoveda : IEntityTypeConfiguration<SecretoBoveda>
{
    public void Configure(EntityTypeBuilder<SecretoBoveda> entidad)
    {
        entidad.HasKey(secreto => secreto.Id);
        entidad.Property(secreto => secreto.NombreClave).HasMaxLength(150).IsRequired();
        entidad.Property(secreto => secreto.ValorCifrado).IsRequired();
        entidad.Property(secreto => secreto.Descripcion).HasMaxLength(250);

        // HasFilter(null): sin él, EF excluye los NULL y permitiría claves globales duplicadas.
        entidad.HasIndex(secreto => new { secreto.ProyectoId, secreto.Entorno, secreto.NombreClave }).IsUnique().HasFilter(null);

        entidad.HasOne<Proyecto>().WithMany().HasForeignKey(secreto => secreto.ProyectoId).OnDelete(DeleteBehavior.Restrict);
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(secreto => secreto.CreadoPor).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConfiguracionCarpetaDocumento : IEntityTypeConfiguration<CarpetaDocumento>
{
    public void Configure(EntityTypeBuilder<CarpetaDocumento> entidad)
    {
        entidad.HasKey(carpeta => carpeta.Id);
        entidad.Property(carpeta => carpeta.Nombre).HasMaxLength(100).IsRequired();
        entidad.Property(carpeta => carpeta.Color).HasMaxLength(20).IsUnicode(false);
        entidad.HasIndex(carpeta => new { carpeta.UsuarioId, carpeta.CarpetaPadreId });
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(carpeta => carpeta.UsuarioId).OnDelete(DeleteBehavior.Restrict);
        entidad.HasOne<CarpetaDocumento>().WithMany().HasForeignKey(carpeta => carpeta.CarpetaPadreId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConfiguracionEtiquetaDocumento : IEntityTypeConfiguration<EtiquetaDocumento>
{
    public void Configure(EntityTypeBuilder<EtiquetaDocumento> entidad)
    {
        entidad.HasKey(etiqueta => etiqueta.Id);
        entidad.Property(etiqueta => etiqueta.Nombre).HasMaxLength(50).IsRequired();
        entidad.Property(etiqueta => etiqueta.Color).HasMaxLength(20).IsUnicode(false).IsRequired();
        entidad.HasIndex(etiqueta => new { etiqueta.UsuarioId, etiqueta.Nombre }).IsUnique();
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(etiqueta => etiqueta.UsuarioId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConfiguracionDocumentoEtiqueta : IEntityTypeConfiguration<DocumentoEtiqueta>
{
    public void Configure(EntityTypeBuilder<DocumentoEtiqueta> entidad)
    {
        entidad.HasKey(relacion => relacion.Id);
        entidad.HasIndex(relacion => new { relacion.DocumentoId, relacion.EtiquetaId }).IsUnique();
        entidad.HasIndex(relacion => relacion.EtiquetaId);
        entidad.HasOne<DocumentoMarkdown>().WithMany().HasForeignKey(relacion => relacion.DocumentoId).OnDelete(DeleteBehavior.Cascade);
        entidad.HasOne<EtiquetaDocumento>().WithMany().HasForeignKey(relacion => relacion.EtiquetaId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ConfiguracionVersionDocumento : IEntityTypeConfiguration<VersionDocumento>
{
    public void Configure(EntityTypeBuilder<VersionDocumento> entidad)
    {
        entidad.HasKey(version => version.Id);
        entidad.Property(version => version.Titulo).HasMaxLength(200).IsRequired();
        entidad.Property(version => version.ContenidoMarkdown).IsRequired();
        entidad.HasIndex(version => new { version.DocumentoId, version.NumeroVersion }).IsUnique();
        entidad.HasOne<DocumentoMarkdown>().WithMany().HasForeignKey(version => version.DocumentoId).OnDelete(DeleteBehavior.Cascade);
        entidad.HasOne<Usuario>().WithMany().HasForeignKey(version => version.CreadoPor).OnDelete(DeleteBehavior.Restrict);
    }
}
