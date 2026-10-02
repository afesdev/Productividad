namespace SolucionProductividad.Aplicacion.Contratos.Infraestructura;

/// <summary>
/// Extrae WikiLinks del Markdown y sincroniza la tabla ReferenciasEntidades.
/// Sintaxis soportada:
///   [[TCK-1001]]            → Ticket por número
///   [[WEB-105]] / [[#105]]  → Tarea por número (cualquier prefijo distinto de TCK)
///   [[Título o ruta/doc]]   → Documento por título o RutaEsquema (admite alias: [[destino|texto]])
/// No guarda cambios: el llamador debe invocar GuardarCambiosAsync dentro de su unidad de trabajo.
/// </summary>
public interface IServicioProcesadorBacklinks
{
    Task<int> ProcesarWikiLinksAsync(string contenidoMarkdown, Guid entidadOrigenId, string tipoOrigen, CancellationToken tokenCancelacion = default);
}
