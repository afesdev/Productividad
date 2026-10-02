using Dapper;
using SolucionProductividad.Aplicacion.Caracteristicas.Analitica.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;

namespace SolucionProductividad.Persistencia.Consultas;

/// <summary>
/// KPIs personales en un único viaje a SQL Server (dos result sets).
/// Rango de fechas semiabierto: [FechaInicio, FechaFin).
/// Nota: el esquema no tiene fecha de completado; se usa TarFechaActualizacion de tareas en estado 'Completada'.
/// </summary>
public sealed class ConsultasAnaliticaDapper : IConsultasAnalitica
{
    private const string ConsultaResumen = """
        SELECT
            (SELECT COUNT(*) FROM Tareas
              WHERE TarCreadoPor = @UsuarioId AND TarEstado = 'Completada'
                AND TarFechaActualizacion >= @FechaInicio AND TarFechaActualizacion < @FechaFin) AS TareasCompletadas,
            (SELECT COUNT(*) FROM Tareas
              WHERE TarCreadoPor = @UsuarioId AND TarEstado IN ('Pendiente', 'EnProgreso')) AS TareasAbiertas,
            (SELECT COUNT(*) FROM Tareas
              WHERE TarCreadoPor = @UsuarioId AND TarEstado IN ('Pendiente', 'EnProgreso')
                AND TarFechaVencimiento < @Ahora) AS TareasVencidas,
            (SELECT ISNULL(SUM(RgtMinutosTranscurridos), 0) FROM RegistrosTiempo
              WHERE RgtUsuarioId = @UsuarioId AND RgtFechaFin IS NOT NULL
                AND RgtFechaInicio >= @FechaInicio AND RgtFechaInicio < @FechaFin) AS MinutosRegistrados,
            (SELECT COUNT(*) FROM Tickets
              WHERE TckAgenteAsignadoId = @UsuarioId
                AND TckFechaCreacion >= @FechaInicio AND TckFechaCreacion < @FechaFin) AS TicketsAsignados,
            (SELECT COUNT(*) FROM Tickets
              WHERE TckAgenteAsignadoId = @UsuarioId
                AND TckFechaResolucion >= @FechaInicio AND TckFechaResolucion < @FechaFin) AS TicketsResueltos,
            (SELECT CAST(100.0 * SUM(CASE WHEN TckFechaPrimeraRespuesta <= TckFechaLimitePrimeraRespuesta THEN 1 ELSE 0 END)
                         / NULLIF(COUNT(*), 0) AS DECIMAL(5, 2))
               FROM Tickets
              WHERE TckAgenteAsignadoId = @UsuarioId AND TckFechaLimitePrimeraRespuesta IS NOT NULL
                AND TckFechaPrimeraRespuesta >= @FechaInicio AND TckFechaPrimeraRespuesta < @FechaFin) AS PorcentajeSlaPrimeraRespuesta,
            (SELECT CAST(100.0 * SUM(CASE WHEN TckFechaResolucion <= TckFechaLimiteResolucion THEN 1 ELSE 0 END)
                         / NULLIF(COUNT(*), 0) AS DECIMAL(5, 2))
               FROM Tickets
              WHERE TckAgenteAsignadoId = @UsuarioId AND TckFechaLimiteResolucion IS NOT NULL
                AND TckFechaResolucion >= @FechaInicio AND TckFechaResolucion < @FechaFin) AS PorcentajeSlaResolucion;

        -- Semana que inicia en lunes (independiente de @@DATEFIRST), sobre la fecha LOCAL del usuario:
        -- las fechas están en UTC y se desplazan @Desplazamiento minutos antes de truncarlas al día.
        WITH TareasPorSemana AS (
            SELECT DATEADD(DAY, -((DATEPART(WEEKDAY, l.Dia) + @@DATEFIRST - 2) % 7), l.Dia) AS InicioSemana,
                   COUNT(*) AS TareasCompletadas
              FROM Tareas
             CROSS APPLY (SELECT CAST(DATEADD(MINUTE, @Desplazamiento, TarFechaActualizacion) AS DATE) AS Dia) l
             WHERE TarCreadoPor = @UsuarioId AND TarEstado = 'Completada'
               AND TarFechaActualizacion >= @FechaInicio AND TarFechaActualizacion < @FechaFin
             GROUP BY DATEADD(DAY, -((DATEPART(WEEKDAY, l.Dia) + @@DATEFIRST - 2) % 7), l.Dia)
        ),
        MinutosPorSemana AS (
            SELECT DATEADD(DAY, -((DATEPART(WEEKDAY, l.Dia) + @@DATEFIRST - 2) % 7), l.Dia) AS InicioSemana,
                   SUM(RgtMinutosTranscurridos) AS MinutosRegistrados
              FROM RegistrosTiempo
             CROSS APPLY (SELECT CAST(DATEADD(MINUTE, @Desplazamiento, RgtFechaInicio) AS DATE) AS Dia) l
             WHERE RgtUsuarioId = @UsuarioId AND RgtFechaFin IS NOT NULL
               AND RgtFechaInicio >= @FechaInicio AND RgtFechaInicio < @FechaFin
             GROUP BY DATEADD(DAY, -((DATEPART(WEEKDAY, l.Dia) + @@DATEFIRST - 2) % 7), l.Dia)
        )
        SELECT CAST(COALESCE(t.InicioSemana, m.InicioSemana) AS DATETIME2) AS InicioSemana,
               ISNULL(t.TareasCompletadas, 0) AS TareasCompletadas,
               ISNULL(m.MinutosRegistrados, 0) AS MinutosRegistrados
          FROM TareasPorSemana t
          FULL OUTER JOIN MinutosPorSemana m ON m.InicioSemana = t.InicioSemana
         ORDER BY InicioSemana;
        """;

    private readonly FabricaConexionesSql _fabricaConexiones;

    public ConsultasAnaliticaDapper(FabricaConexionesSql fabricaConexiones) => _fabricaConexiones = fabricaConexiones;

    public async Task<ResumenAnaliticaPersonalDto> ObtenerResumenPersonalAsync(Guid usuarioId, DateTime fechaInicio, DateTime fechaFin, int desplazamientoMinutos, CancellationToken tokenCancelacion = default)
    {
        await using var conexion = await _fabricaConexiones.AbrirConexionAsync(tokenCancelacion);

        var parametros = new { UsuarioId = usuarioId, FechaInicio = fechaInicio, FechaFin = fechaFin, Ahora = DateTime.UtcNow, Desplazamiento = desplazamientoMinutos };
        using var lector = await conexion.QueryMultipleAsync(new CommandDefinition(ConsultaResumen, parametros, cancellationToken: tokenCancelacion));

        var resumen = await lector.ReadSingleAsync<ResumenAnaliticaPersonalDto>();
        var semanasConDatos = (await lector.ReadAsync<PuntoVelocidadSemanalDto>()).ToDictionary(punto => punto.InicioSemana.Date);

        // Las semanas vacías se generan también en hora local, igual que las que vienen de SQL.
        resumen.VelocidadSemanal = CompletarSemanasVacias(semanasConDatos, fechaInicio.AddMinutes(desplazamientoMinutos), fechaFin.AddMinutes(desplazamientoMinutos));
        return resumen;
    }

    /// <summary>Rellena con ceros las semanas sin actividad para que el gráfico sea continuo.</summary>
    private static List<PuntoVelocidadSemanalDto> CompletarSemanasVacias(Dictionary<DateTime, PuntoVelocidadSemanalDto> semanasConDatos, DateTime fechaInicio, DateTime fechaFin)
    {
        var diasDesdeLunes = ((int)fechaInicio.DayOfWeek + 6) % 7;
        var serie = new List<PuntoVelocidadSemanalDto>();

        for (var inicioSemana = fechaInicio.Date.AddDays(-diasDesdeLunes); inicioSemana < fechaFin; inicioSemana = inicioSemana.AddDays(7))
        {
            serie.Add(semanasConDatos.TryGetValue(inicioSemana, out var punto)
                ? punto
                : new PuntoVelocidadSemanalDto { InicioSemana = inicioSemana });
        }

        return serie;
    }
}
