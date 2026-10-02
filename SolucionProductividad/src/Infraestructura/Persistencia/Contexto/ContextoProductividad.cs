using System.Reflection;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Comun;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Persistencia.Contexto;

public sealed class ContextoProductividad : DbContext, IContextoAplicacion
{
    private static readonly HashSet<string> PropiedadesFechaAutomatica = new() { "FechaCreacion", "FechaActualizacion", "FechaAsignacion" };

    // Aislamiento por usuario: EF evalúa estos campos en cada consulta de esta instancia del contexto.
    private readonly bool _aplicarFiltrosUsuario;
    private readonly IServicioUsuarioActual? _usuarioActual;

    /// <param name="usuarioActual">
    /// Con sesión (API): los datos quedan filtrados al usuario; sin usuario autenticado no se ve nada.
    /// Sin servicio (migraciones, herramientas, aserciones de pruebas): modo sistema, sin filtros.
    /// </param>
    public ContextoProductividad(DbContextOptions<ContextoProductividad> opciones, IServicioUsuarioActual? usuarioActual = null) : base(opciones)
    {
        _usuarioActual = usuarioActual;
        _aplicarFiltrosUsuario = usuarioActual is not null;
    }

    private Guid UsuarioIdActual => _usuarioActual?.UsuarioId ?? Guid.Empty;

    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Rol> Roles => Set<Rol>();
    public DbSet<UsuarioRol> UsuariosRoles => Set<UsuarioRol>();
    public DbSet<TokenRefresco> TokensRefresco => Set<TokenRefresco>();

    public DbSet<Proyecto> Proyectos => Set<Proyecto>();
    public DbSet<Carpeta> Carpetas => Set<Carpeta>();
    public DbSet<ListaTareas> ListasTareas => Set<ListaTareas>();
    public DbSet<Tarea> Tareas => Set<Tarea>();
    public DbSet<RegistroTiempo> RegistrosTiempo => Set<RegistroTiempo>();
    public DbSet<ColaSoporte> ColasSoporte => Set<ColaSoporte>();
    public DbSet<PoliticaSla> PoliticasSla => Set<PoliticaSla>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<MensajeTicket> MensajesTicket => Set<MensajeTicket>();
    public DbSet<DocumentoMarkdown> DocumentosMarkdown => Set<DocumentoMarkdown>();
    public DbSet<RegistroDiario> RegistrosDiarios => Set<RegistroDiario>();
    public DbSet<EntradaDiario> EntradasDiario => Set<EntradaDiario>();
    public DbSet<ArchivoAdjunto> ArchivosAdjuntos => Set<ArchivoAdjunto>();
    public DbSet<ReferenciaEntidad> ReferenciasEntidades => Set<ReferenciaEntidad>();
    public DbSet<SecretoBoveda> BovedaSecretos => Set<SecretoBoveda>();
    public DbSet<Marcador> Marcadores => Set<Marcador>();
    public DbSet<Repositorio> Repositorios => Set<Repositorio>();
    public DbSet<ProyectoSoporte> ProyectosSoporte => Set<ProyectoSoporte>();
    public DbSet<TicketProyecto> TicketsProyectos => Set<TicketProyecto>();
    public DbSet<RamaTicket> RamasTicket => Set<RamaTicket>();
    public DbSet<ArchivoModificado> ArchivosModificados => Set<ArchivoModificado>();
    public DbSet<CommitRama> CommitsRama => Set<CommitRama>();
    public DbSet<DespliegueTicket> DesplieguesTicket => Set<DespliegueTicket>();
    public DbSet<EventoTicket> EventosTicket => Set<EventoTicket>();
    public DbSet<CarpetaDocumento> CarpetasDocumento => Set<CarpetaDocumento>();
    public DbSet<EtiquetaDocumento> EtiquetasDocumento => Set<EtiquetaDocumento>();
    public DbSet<DocumentoEtiqueta> DocumentosEtiquetas => Set<DocumentoEtiqueta>();
    public DbSet<VersionDocumento> VersionesDocumento => Set<VersionDocumento>();
    public DbSet<Lienzo> Lienzos => Set<Lienzo>();
    public DbSet<ConexionCalendario> ConexionesCalendario => Set<ConexionCalendario>();
    public DbSet<TableroReporte> TablerosReporte => Set<TableroReporte>();

    public Task<int> GuardarCambiosAsync(CancellationToken tokenCancelacion = default) => SaveChangesAsync(tokenCancelacion);

    protected override void ConfigureConventions(ModelConfigurationBuilder configuracion)
    {
        // Fechas siempre en UTC al guardar y marcadas como UTC al leer.
        configuracion.Properties<DateTime>().HaveConversion<ConvertidorFechaUtc>();
        configuracion.Properties<DateTime?>().HaveConversion<ConvertidorFechaUtcNulable>();

        // Los enums se guardan como VARCHAR legible, igual que en el DDL ('Pendiente', 'EnProgreso'...).
        configuracion.Properties<EstadoTarea>().HaveConversion<string>().HaveMaxLength(30).AreUnicode(false);
        configuracion.Properties<EstadoTicket>().HaveConversion<string>().HaveMaxLength(30).AreUnicode(false);
        configuracion.Properties<EstadoDocumento>().HaveConversion<string>().HaveMaxLength(20).AreUnicode(false);
        configuracion.Properties<Prioridad>().HaveConversion<string>().HaveMaxLength(20).AreUnicode(false);
        configuracion.Properties<EntornoBoveda>().HaveConversion<string>().HaveMaxLength(20).AreUnicode(false);
        configuracion.Properties<TipoEntidad>().HaveConversion<string>().HaveMaxLength(30).AreUnicode(false);
        configuracion.Properties<TipoTicket>().HaveConversion<string>().HaveMaxLength(30).AreUnicode(false);
        configuracion.Properties<EstadoPullRequest>().HaveConversion<string>().HaveMaxLength(20).AreUnicode(false);
        configuracion.Properties<TipoCambioArchivo>().HaveConversion<string>().HaveMaxLength(20).AreUnicode(false);
        configuracion.Properties<AmbienteDespliegue>().HaveConversion<string>().HaveMaxLength(20).AreUnicode(false);
        configuracion.Properties<ResultadoDespliegue>().HaveConversion<string>().HaveMaxLength(20).AreUnicode(false);
        configuracion.Properties<TipoEventoTicket>().HaveConversion<string>().HaveMaxLength(40).AreUnicode(false);
    }

    protected override void OnModelCreating(ModelBuilder constructorModelo)
    {
        constructorModelo.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        AplicarConvencionPrefijos(constructorModelo);
        AplicarFiltrosPorUsuario(constructorModelo);
    }

    /// <summary>
    /// Cada usuario ve solo lo suyo (también el Administrador). Se aplica aquí para que ninguna consulta pueda olvidarlo.
    /// Proyectos → carpetas, listas y tareas heredan el dueño del proyecto; tickets: creados por el usuario o asignados a él.
    /// </summary>
    private void AplicarFiltrosPorUsuario(ModelBuilder constructorModelo)
    {
        constructorModelo.Entity<Proyecto>().HasQueryFilter(proyecto => !_aplicarFiltrosUsuario || proyecto.PropietarioId == UsuarioIdActual);
        constructorModelo.Entity<Carpeta>().HasQueryFilter(carpeta =>
            !_aplicarFiltrosUsuario || Proyectos.Any(proyecto => proyecto.Id == carpeta.ProyectoId && proyecto.PropietarioId == UsuarioIdActual));
        constructorModelo.Entity<ListaTareas>().HasQueryFilter(lista =>
            !_aplicarFiltrosUsuario || lista.Proyecto!.PropietarioId == UsuarioIdActual);
        constructorModelo.Entity<Tarea>().HasQueryFilter(tarea =>
            !_aplicarFiltrosUsuario || tarea.ListaTareas!.Proyecto!.PropietarioId == UsuarioIdActual);
        constructorModelo.Entity<RegistroTiempo>().HasQueryFilter(registro => !_aplicarFiltrosUsuario || registro.UsuarioId == UsuarioIdActual);
        constructorModelo.Entity<DocumentoMarkdown>().HasQueryFilter(documento => !_aplicarFiltrosUsuario || documento.CreadoPor == UsuarioIdActual);
        constructorModelo.Entity<RegistroDiario>().HasQueryFilter(registro => !_aplicarFiltrosUsuario || registro.UsuarioId == UsuarioIdActual);
        constructorModelo.Entity<EntradaDiario>().HasQueryFilter(entrada => !_aplicarFiltrosUsuario || entrada.RegistroDiario!.UsuarioId == UsuarioIdActual);
        constructorModelo.Entity<Ticket>().HasQueryFilter(ticket =>
            !_aplicarFiltrosUsuario || ticket.CreadoPor == UsuarioIdActual || ticket.AgenteAsignadoId == UsuarioIdActual);
        constructorModelo.Entity<SecretoBoveda>().HasQueryFilter(secreto => !_aplicarFiltrosUsuario || secreto.CreadoPor == UsuarioIdActual);
        constructorModelo.Entity<Marcador>().HasQueryFilter(marcador => !_aplicarFiltrosUsuario || marcador.UsuarioId == UsuarioIdActual);
        constructorModelo.Entity<CarpetaDocumento>().HasQueryFilter(carpeta => !_aplicarFiltrosUsuario || carpeta.UsuarioId == UsuarioIdActual);
        constructorModelo.Entity<EtiquetaDocumento>().HasQueryFilter(etiqueta => !_aplicarFiltrosUsuario || etiqueta.UsuarioId == UsuarioIdActual);
        constructorModelo.Entity<DocumentoEtiqueta>().HasQueryFilter(relacion =>
            !_aplicarFiltrosUsuario || DocumentosMarkdown.Any(documento => documento.Id == relacion.DocumentoId && documento.CreadoPor == UsuarioIdActual));
        constructorModelo.Entity<VersionDocumento>().HasQueryFilter(version =>
            !_aplicarFiltrosUsuario || DocumentosMarkdown.Any(documento => documento.Id == version.DocumentoId && documento.CreadoPor == UsuarioIdActual));
        constructorModelo.Entity<Lienzo>().HasQueryFilter(lienzo => !_aplicarFiltrosUsuario || lienzo.UsuarioId == UsuarioIdActual);
        constructorModelo.Entity<ConexionCalendario>().HasQueryFilter(conexion => !_aplicarFiltrosUsuario || conexion.UsuarioId == UsuarioIdActual);
        constructorModelo.Entity<TableroReporte>().HasQueryFilter(tablero => !_aplicarFiltrosUsuario || tablero.UsuarioId == UsuarioIdActual);
    }

    /// <summary>
    /// Regla obligatoria del esquema: cada columna lleva el prefijo de 3 letras de su tabla, sin separador (TarTitulo, UsuCorreo...).
    /// Se resuelve una sola vez aquí a partir de [PrefijoTabla] en lugar de repetir HasColumnName en cada configuración.
    /// </summary>
    private static void AplicarConvencionPrefijos(ModelBuilder constructorModelo)
    {
        foreach (var tipoEntidad in constructorModelo.Model.GetEntityTypes())
        {
            var atributoPrefijo = tipoEntidad.ClrType.GetCustomAttribute<PrefijoTablaAttribute>()
                ?? throw new InvalidOperationException($"La entidad {tipoEntidad.ClrType.Name} no declara [PrefijoTabla].");

            tipoEntidad.SetTableName(atributoPrefijo.NombreTabla);

            foreach (var propiedad in tipoEntidad.GetProperties())
            {
                propiedad.SetColumnName($"{atributoPrefijo.Prefijo}{propiedad.Name}");

                if (propiedad.Name == nameof(EntidadBase.Id))
                    propiedad.SetDefaultValueSql("NEWID()");
                else if (PropiedadesFechaAutomatica.Contains(propiedad.Name))
                    propiedad.SetDefaultValueSql("SYSUTCDATETIME()");
            }
        }
    }
}
