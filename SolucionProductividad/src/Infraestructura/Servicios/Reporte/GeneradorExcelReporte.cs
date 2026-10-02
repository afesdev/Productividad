using ClosedXML.Excel;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;

namespace SolucionProductividad.Servicios.Reporte;

/// <summary>
/// .xlsx con las mismas columnas y en el mismo orden que el Excel de actividades de la empresa, para copiar o entregar
/// tal cual. Fechas y horas van como valores de Excel (no texto) con formato dd/mm/yyyy y hh:mm.
/// </summary>
public sealed class GeneradorExcelReporte : IGeneradorExcelReporte
{
    public static readonly string[] Encabezados =
    [
        "FECHA DE SOLICITUD",
        "FECHA INICIO ACTIVIDAD",
        "FECHA FIN ACTIVIDAD",
        "HORA INICIO ACTIVIDAD",
        "HORA FIN ACTIVIDAD",
        "DESCRIPCION DE LA TAREA",
        "TABLERO DE TRELLO",
        "EJECUTOR DE LA TAREA",
        "ESTADO",
        "1+c vb",
        "HORAS DE TRABAJO EJECUTADAS",
    ];

    public byte[] Generar(IReadOnlyList<FilaExcelReporte> filas)
    {
        using var libro = new XLWorkbook();
        var hoja = libro.Worksheets.Add("Actividades");

        for (var columna = 0; columna < Encabezados.Length; columna++)
            hoja.Cell(1, columna + 1).Value = Encabezados[columna];
        var encabezado = hoja.Range(1, 1, 1, Encabezados.Length);
        encabezado.Style.Font.Bold = true;
        encabezado.Style.Fill.BackgroundColor = XLColor.FromHtml("#EDE9FE");
        encabezado.Style.Alignment.WrapText = true;
        encabezado.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

        var numeroFila = 2;
        foreach (var fila in filas)
        {
            hoja.Cell(numeroFila, 1).Value = fila.FechaSolicitud.ToDateTime(TimeOnly.MinValue);
            hoja.Cell(numeroFila, 2).Value = fila.FechaInicio.ToDateTime(TimeOnly.MinValue);
            hoja.Cell(numeroFila, 3).Value = fila.FechaFin.ToDateTime(TimeOnly.MinValue);
            if (fila.HoraInicio is { } inicio) hoja.Cell(numeroFila, 4).Value = inicio.ToTimeSpan();
            if (fila.HoraFin is { } fin) hoja.Cell(numeroFila, 5).Value = fin.ToTimeSpan();
            hoja.Cell(numeroFila, 6).Value = fila.Descripcion;
            hoja.Cell(numeroFila, 7).Value = fila.Tablero ?? string.Empty;
            hoja.Cell(numeroFila, 8).Value = fila.Ejecutor;
            hoja.Cell(numeroFila, 9).Value = fila.Estado;
            // Columna "1+c vb": se deja vacía.
            hoja.Cell(numeroFila, 11).Value = fila.Horas;
            numeroFila++;
        }

        var ultima = Math.Max(numeroFila - 1, 1);
        hoja.Range(2, 1, ultima, 3).Style.DateFormat.Format = "dd/mm/yyyy";
        hoja.Range(2, 4, ultima, 5).Style.DateFormat.Format = "hh:mm";
        hoja.Range(2, 11, ultima, 11).Style.NumberFormat.Format = "0.00";
        hoja.Range(1, 1, ultima, Encabezados.Length).Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        hoja.Range(1, 1, ultima, Encabezados.Length).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        hoja.Range(2, 6, ultima, 6).Style.Alignment.WrapText = true;

        hoja.Column(1).Width = 14;
        hoja.Column(2).Width = 14;
        hoja.Column(3).Width = 14;
        hoja.Column(4).Width = 11;
        hoja.Column(5).Width = 11;
        hoja.Column(6).Width = 60;
        hoja.Column(7).Width = 24;
        hoja.Column(8).Width = 26;
        hoja.Column(9).Width = 13;
        hoja.Column(10).Width = 8;
        hoja.Column(11).Width = 14;
        hoja.Row(1).Height = 32;
        hoja.SheetView.FreezeRows(1);
        if (filas.Count > 0)
        {
            hoja.Range(1, 1, ultima, Encabezados.Length).SetAutoFilter();
            // Total de horas debajo de la tabla.
            hoja.Cell(ultima + 1, 10).Value = "Total";
            hoja.Cell(ultima + 1, 10).Style.Font.Bold = true;
            hoja.Cell(ultima + 1, 11).FormulaA1 = $"SUM(K2:K{ultima})";
            hoja.Cell(ultima + 1, 11).Style.NumberFormat.Format = "0.00";
            hoja.Cell(ultima + 1, 11).Style.Font.Bold = true;
        }

        using var memoria = new MemoryStream();
        libro.SaveAs(memoria);
        return memoria.ToArray();
    }
}
