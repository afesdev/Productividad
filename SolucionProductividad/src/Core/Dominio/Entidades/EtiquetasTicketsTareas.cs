using SolucionProductividad.Dominio.Comun;

namespace SolucionProductividad.Dominio.Entidades;

// Las etiquetas son un único catálogo por usuario (EtiquetaDocumento) que comparten documentos, tickets y tareas:
// "runbook" o "cliente-urgente" significan lo mismo en los tres módulos.

/// <summary>Relación muchos a muchos entre tickets y etiquetas.</summary>
[PrefijoTabla("TicketsEtiquetas", "Tke")]
public class TicketEtiqueta : EntidadBase
{
    public Guid TicketId { get; set; }
    public Guid EtiquetaId { get; set; }

    public EtiquetaDocumento? Etiqueta { get; set; }
}

/// <summary>Relación muchos a muchos entre tareas y etiquetas.</summary>
[PrefijoTabla("TareasEtiquetas", "Tae")]
public class TareaEtiqueta : EntidadBase
{
    public Guid TareaId { get; set; }
    public Guid EtiquetaId { get; set; }

    public EtiquetaDocumento? Etiqueta { get; set; }
}
