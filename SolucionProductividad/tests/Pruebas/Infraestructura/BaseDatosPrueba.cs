using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SolucionProductividad.Aplicacion;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Persistencia.Consultas;
using SolucionProductividad.Persistencia.Contexto;
using Microsoft.Extensions.Options;
using SolucionProductividad.Servicios.Opciones;
using SolucionProductividad.Servicios.Seguridad;
using SolucionProductividad.Servicios.Reporte;
using SolucionProductividad.Servicios.WikiLinks;

namespace SolucionProductividad.Pruebas.Infraestructura;

/// <summary>
/// Base de datos SQL Server real (LocalDB) creada con las migraciones y eliminada al terminar.
/// Se usa SQL Server y no un proveedor en memoria porque el esquema depende de IDENTITY, columnas calculadas y FKs reales.
/// Cadena configurable con la variable PRODUCTIVIDAD_PRUEBAS_SERVIDOR (por defecto (localdb)\MSSQLLocalDB).
/// </summary>
public sealed class BaseDatosPrueba : IAsyncLifetime
{
    public string CadenaConexion { get; } =
        $"Server={Environment.GetEnvironmentVariable("PRODUCTIVIDAD_PRUEBAS_SERVIDOR") ?? @"(localdb)\MSSQLLocalDB"};" +
        $"Database=ProductividadPruebas_{Guid.NewGuid():N};Trusted_Connection=True;TrustServerCertificate=True";

    public async Task InitializeAsync()
    {
        await using var contexto = CrearContexto();
        await contexto.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        await using var contexto = CrearContexto();
        await contexto.Database.EnsureDeletedAsync();
    }

    public ContextoProductividad CrearContexto() =>
        new(new DbContextOptionsBuilder<ContextoProductividad>().UseSqlServer(CadenaConexion).Options);

    /// <summary>Contenedor con MediatR + validación reales y dobles de prueba para lo externo (Firebase, SignalR, sesión).</summary>
    public EscenarioPrueba CrearEscenario(Usuario usuario, bool esAdministrador = false)
    {
        var usuarioActual = new UsuarioActualFalso(usuario.Id, esAdministrador);
        var notificador = new NotificadorFalso();
        var almacenamiento = new AlmacenamientoFalso();
        var gitHub = new GitHubFalso();

        var servicios = new ServiceCollection();
        servicios.AddLogging();
        servicios.AgregarAplicacion();
        servicios.AddDbContext<ContextoProductividad>(opciones => opciones.UseSqlServer(CadenaConexion));
        servicios.AddScoped<IContextoAplicacion>(proveedor => proveedor.GetRequiredService<ContextoProductividad>());
        servicios.AddScoped<IServicioProcesadorBacklinks, ServicioProcesadorBacklinks>();
        servicios.AddSingleton(new FabricaConexionesSql(CadenaConexion));
        servicios.AddScoped<IConsultasBusqueda, ConsultasBusquedaDapper>();
        servicios.AddScoped<IConsultasAnalitica, ConsultasAnaliticaDapper>();
        servicios.AddSingleton<IServicioUsuarioActual>(usuarioActual);
        servicios.AddSingleton<INotificadorTiempoReal>(notificador);
        servicios.AddSingleton<IServicioAlmacenamientoFirebase>(almacenamiento);
        servicios.AddSingleton<IServicioGitHub>(gitHub);
        servicios.AddSingleton<IGeneradorExcelReporte, GeneradorExcelReporte>();
        servicios.AddSingleton<IServicioHashContrasena, ServicioHashContrasena>();
        servicios.AddSingleton<IServicioCifradoBoveda>(new ServicioCifradoBoveda(Options.Create(new OpcionesBoveda { LlaveMaestraBase64 = Convert.ToBase64String(new byte[32]) })));
        servicios.AddSingleton<IServicioTokensJwt>(new ServicioTokensJwt(Options.Create(new OpcionesJwt { LlaveFirma = new string('k', 48) })));

        return new EscenarioPrueba(servicios.BuildServiceProvider(), notificador, almacenamiento, gitHub);
    }

    public async Task<Usuario> CrearUsuarioAsync(string nombre = "Usuario Prueba")
    {
        var sufijo = Guid.NewGuid().ToString("N");
        var usuario = new Usuario { Correo = $"{sufijo}@prueba.local", NombreUsuario = $"u{sufijo[..20]}", NombreCompleto = nombre, HashContrasena = "no-aplica" };
        await using var contexto = CrearContexto();
        contexto.Usuarios.Add(usuario);
        await contexto.SaveChangesAsync();
        return usuario;
    }
}

[CollectionDefinition(Nombre)]
public sealed class ColeccionBaseDatos : ICollectionFixture<BaseDatosPrueba>
{
    public const string Nombre = "Base de datos SQL Server";
}
