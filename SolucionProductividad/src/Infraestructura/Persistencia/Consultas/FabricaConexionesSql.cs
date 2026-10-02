using System.Data.Common;
using Microsoft.Data.SqlClient;

namespace SolucionProductividad.Persistencia.Consultas;

/// <summary>Conexiones ligeras para consultas de lectura con Dapper.</summary>
public sealed class FabricaConexionesSql
{
    private readonly string _cadenaConexion;

    public FabricaConexionesSql(string cadenaConexion) => _cadenaConexion = cadenaConexion;

    public async Task<DbConnection> AbrirConexionAsync(CancellationToken tokenCancelacion)
    {
        var conexion = new SqlConnection(_cadenaConexion);
        await conexion.OpenAsync(tokenCancelacion);
        return conexion;
    }
}
