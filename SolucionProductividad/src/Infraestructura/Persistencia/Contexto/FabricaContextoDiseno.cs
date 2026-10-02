using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SolucionProductividad.Persistencia.Contexto;

/// <summary>
/// Permite ejecutar "dotnet ef migrations" sin arrancar la API (que exige Firebase y la llave AES configuradas).
/// La cadena solo se usa para "database update"; puede sobreescribirse con la variable PRODUCTIVIDAD_CADENA_CONEXION.
/// </summary>
public sealed class FabricaContextoDiseno : IDesignTimeDbContextFactory<ContextoProductividad>
{
    public ContextoProductividad CreateDbContext(string[] argumentos)
    {
        var cadenaConexion = Environment.GetEnvironmentVariable("PRODUCTIVIDAD_CADENA_CONEXION")
            ?? "Server=localhost;Database=Productividad;Trusted_Connection=True;TrustServerCertificate=True";

        var opciones = new DbContextOptionsBuilder<ContextoProductividad>()
            .UseSqlServer(cadenaConexion)
            .Options;

        return new ContextoProductividad(opciones);
    }
}
