using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Persistencia.Configuraciones;

public sealed class ConfiguracionUsuario : IEntityTypeConfiguration<Usuario>
{
    public void Configure(EntityTypeBuilder<Usuario> entidad)
    {
        entidad.HasKey(usuario => usuario.Id);
        entidad.Property(usuario => usuario.Correo).HasMaxLength(256).IsRequired();
        entidad.Property(usuario => usuario.NombreUsuario).HasMaxLength(30).IsRequired();
        entidad.HasIndex(usuario => usuario.NombreUsuario).IsUnique();
        entidad.Property(usuario => usuario.NombreCompleto).HasMaxLength(150).IsRequired();
        entidad.Property(usuario => usuario.HashContrasena).HasMaxLength(200).IsUnicode(false).IsRequired();
        entidad.HasIndex(usuario => usuario.Correo).IsUnique();
    }
}

public sealed class ConfiguracionRol : IEntityTypeConfiguration<Rol>
{
    private static readonly DateTime FechaSiembra = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public void Configure(EntityTypeBuilder<Rol> entidad)
    {
        entidad.HasKey(rol => rol.Id);
        entidad.Property(rol => rol.Nombre).HasMaxLength(50).IsRequired();
        entidad.Property(rol => rol.Descripcion).HasMaxLength(250);
        entidad.HasIndex(rol => rol.Nombre).IsUnique();

        entidad.HasData(
            new Rol { Id = NombresRoles.IdAdministrador, Nombre = NombresRoles.Administrador, Descripcion = "Acceso total, gestión de usuarios y roles.", FechaCreacion = FechaSiembra },
            new Rol { Id = NombresRoles.IdAgente, Nombre = NombresRoles.Agente, Descripcion = "Atiende tickets de soporte.", FechaCreacion = FechaSiembra },
            new Rol { Id = NombresRoles.IdMiembro, Nombre = NombresRoles.Miembro, Descripcion = "Gestiona sus tareas, documentos y bóveda.", FechaCreacion = FechaSiembra });
    }
}

public sealed class ConfiguracionUsuarioRol : IEntityTypeConfiguration<UsuarioRol>
{
    public void Configure(EntityTypeBuilder<UsuarioRol> entidad)
    {
        entidad.HasKey(usuarioRol => usuarioRol.Id);
        entidad.HasIndex(usuarioRol => new { usuarioRol.UsuarioId, usuarioRol.RolId }).IsUnique();
        entidad.HasOne(usuarioRol => usuarioRol.Usuario).WithMany(usuario => usuario.Roles)
            .HasForeignKey(usuarioRol => usuarioRol.UsuarioId).OnDelete(DeleteBehavior.Cascade);
        entidad.HasOne(usuarioRol => usuarioRol.Rol).WithMany()
            .HasForeignKey(usuarioRol => usuarioRol.RolId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ConfiguracionTokenRefresco : IEntityTypeConfiguration<TokenRefresco>
{
    public void Configure(EntityTypeBuilder<TokenRefresco> entidad)
    {
        entidad.HasKey(token => token.Id);
        entidad.Property(token => token.TokenHash).HasMaxLength(128).IsUnicode(false).IsRequired();
        entidad.HasIndex(token => token.TokenHash).IsUnique();
        entidad.HasIndex(token => token.UsuarioId);
        entidad.HasOne(token => token.Usuario).WithMany()
            .HasForeignKey(token => token.UsuarioId).OnDelete(DeleteBehavior.Cascade);
    }
}
