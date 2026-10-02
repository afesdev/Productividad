using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Busqueda.Dtos;

public sealed class ResultadoBusquedaDto
{
    public TipoEntidad Tipo { get; set; }
    public Guid Id { get; set; }
    public string Titulo { get; set; } = string.Empty;
    /// <summary>Identificador legible: "WEB-105", "TCK-1001", ruta del documento o fecha de la bitácora.</summary>
    public string Referencia { get; set; } = string.Empty;
    public string? Subtitulo { get; set; }
}
