using Dapper;
using SolucionProductividad.Aplicacion.Caracteristicas.Busqueda.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Persistencia.Consultas;

/// <summary>
/// Búsqueda para la Paleta de Comandos: cuatro result sets en un solo viaje.
/// Dapper no pasa por los filtros globales de EF: cada consulta filtra explícitamente por @UsuarioId.
/// LIKE '%termino%' es suficiente a escala personal/equipo; con mucho volumen conviene un índice FULLTEXT.
/// </summary>
public sealed class ConsultasBusquedaDapper : IConsultasBusqueda
{
    private const string ConsultaBusqueda = """
        SELECT TOP (@Limite) t.TarId AS Id, t.TarTitulo AS Titulo,
               CONCAT(p.PryClavePrefijo, '-', t.TarNumeroTarea) AS Referencia, t.TarEstado AS Subtitulo
          FROM Tareas t
          JOIN ListasTareas l ON l.LstId = t.TarListaTareaId
          JOIN Proyectos p ON p.PryId = l.LstProyectoId
         WHERE p.PryPropietarioId = @UsuarioId
           AND (t.TarTitulo LIKE @Patron ESCAPE '\'
                OR CONCAT(p.PryClavePrefijo, '-', t.TarNumeroTarea) LIKE @Patron ESCAPE '\')
         ORDER BY t.TarFechaActualizacion DESC;

        SELECT TOP (@Limite) DocId AS Id, DocTitulo AS Titulo, DocRutaEsquema AS Referencia, NULL AS Subtitulo
          FROM DocumentosMarkdown
         WHERE DocCreadoPor = @UsuarioId
           AND DocEstaArchivado = 0
           AND (DocTitulo LIKE @Patron ESCAPE '\' OR DocRutaEsquema LIKE @Patron ESCAPE '\')
         ORDER BY DocFechaActualizacion DESC;

        SELECT TOP (@Limite) TckId AS Id, TckAsunto AS Titulo,
               CONCAT('TCK-', TckNumeroTicket) AS Referencia, TckEstado AS Subtitulo
          FROM Tickets
         WHERE (TckCreadoPor = @UsuarioId OR TckAgenteAsignadoId = @UsuarioId)
           AND (TckAsunto LIKE @Patron ESCAPE '\'
                OR CONCAT('TCK-', TckNumeroTicket) LIKE @Patron ESCAPE '\'
                OR TckCorreoSolicitante LIKE @Patron ESCAPE '\')
         ORDER BY TckFechaActualizacion DESC;

        SELECT TOP (@Limite) LogId AS Id, CONCAT(N'Bitácora ', CONVERT(VARCHAR(10), LogFechaLog, 23)) AS Titulo,
               CONVERT(VARCHAR(10), LogFechaLog, 23) AS Referencia, LEFT(LogContenidoMarkdown, 120) AS Subtitulo
          FROM RegistrosDiarios
         WHERE LogUsuarioId = @UsuarioId
           AND LogContenidoMarkdown LIKE @Patron ESCAPE '\'
         ORDER BY LogFechaLog DESC;
        """;

    private readonly FabricaConexionesSql _fabricaConexiones;

    public ConsultasBusquedaDapper(FabricaConexionesSql fabricaConexiones) => _fabricaConexiones = fabricaConexiones;

    public async Task<IReadOnlyList<ResultadoBusquedaDto>> BuscarAsync(string termino, Guid usuarioId, int limitePorTipo, CancellationToken tokenCancelacion = default)
    {
        await using var conexion = await _fabricaConexiones.AbrirConexionAsync(tokenCancelacion);

        var parametros = new DynamicParameters();
        parametros.Add("Patron", $"%{EscaparPatronLike(termino)}%");
        parametros.Add("Limite", limitePorTipo);
        parametros.Add("UsuarioId", usuarioId);

        using var lector = await conexion.QueryMultipleAsync(new CommandDefinition(ConsultaBusqueda, parametros, cancellationToken: tokenCancelacion));

        var resultados = new List<ResultadoBusquedaDto>();
        foreach (var tipo in new[] { TipoEntidad.Tarea, TipoEntidad.Documento, TipoEntidad.Ticket, TipoEntidad.RegistroDiario })
        {
            foreach (var resultado in await lector.ReadAsync<ResultadoBusquedaDto>())
            {
                resultado.Tipo = tipo;
                resultados.Add(resultado);
            }
        }

        return resultados;
    }

    private static string EscaparPatronLike(string termino) => termino
        .Replace(@"\", @"\\")
        .Replace("%", @"\%")
        .Replace("_", @"\_")
        .Replace("[", @"\[");
}
