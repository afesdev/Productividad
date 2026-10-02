using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Persistencia.Consultas;
using SolucionProductividad.Persistencia.Contexto;

namespace SolucionProductividad.Persistencia;

public static class InyeccionDependencias
{
    public const string NombreCadenaConexion = "Productividad";

    public static IServiceCollection AgregarPersistencia(this IServiceCollection servicios, IConfiguration configuracion)
    {
        var cadenaConexion = configuracion.GetConnectionString(NombreCadenaConexion)
            ?? throw new InvalidOperationException($"Falta la cadena de conexión 'ConnectionStrings:{NombreCadenaConexion}'.");

        servicios.AddDbContext<ContextoProductividad>(opciones =>
            opciones.UseSqlServer(cadenaConexion, sql =>
            {
                sql.MigrationsAssembly(typeof(ContextoProductividad).Assembly.FullName);
                sql.EnableRetryOnFailure(3);
            }));

        servicios.AddScoped<IContextoAplicacion>(proveedor => proveedor.GetRequiredService<ContextoProductividad>());
        servicios.AddSingleton(new FabricaConexionesSql(cadenaConexion));
        servicios.AddScoped<IConsultasAnalitica, ConsultasAnaliticaDapper>();
        servicios.AddScoped<IConsultasBusqueda, ConsultasBusquedaDapper>();

        return servicios;
    }
}
