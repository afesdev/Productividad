namespace SolucionProductividad.Aplicacion.Contratos.Infraestructura;

/// <summary>Una fila del Excel de actividades de la empresa, con las columnas en su orden.</summary>
public sealed record FilaExcelReporte(
    DateOnly FechaSolicitud,
    DateOnly FechaInicio,
    DateOnly FechaFin,
    TimeOnly? HoraInicio,
    TimeOnly? HoraFin,
    string Descripcion,
    string? Tablero,
    string Ejecutor,
    string Estado,
    decimal Horas);

/// <summary>Genera el .xlsx del reporte de actividades (encabezados, formatos de fecha/hora y anchos).</summary>
public interface IGeneradorExcelReporte
{
    byte[] Generar(IReadOnlyList<FilaExcelReporte> filas);
}
