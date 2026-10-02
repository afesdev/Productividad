using SolucionProductividad.Dominio.Comun;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Dominio.ObjetosValor;

namespace SolucionProductividad.Dominio.Entidades;

[PrefijoTabla("Tickets", "Tck")]
public class Ticket : EntidadBase
{
    /// <summary>Consecutivo IDENTITY(1000,1) generado por SQL Server.</summary>
    public int NumeroTicket { get; set; }
    public Guid ColaSoporteId { get; set; }
    public Guid? PoliticaSlaId { get; set; }
    public Guid? TareaRelacionadaId { get; set; }
    public string CorreoSolicitante { get; set; } = string.Empty;
    public string NombreSolicitante { get; set; } = string.Empty;
    public string Asunto { get; set; } = string.Empty;
    public TipoTicket Tipo { get; set; } = TipoTicket.Ajuste;
    /// <summary>Lo que pide el solicitante.</summary>
    public string? DescripcionMarkdown { get; set; }
    /// <summary>Análisis y solución aplicada: la documentación técnica del ticket.</summary>
    public string? DocumentacionMarkdown { get; set; }
    public EstadoTicket Estado { get; set; } = EstadoTicket.Nuevo;
    public Prioridad Prioridad { get; set; } = Prioridad.Media;
    public Guid? AgenteAsignadoId { get; set; }
    public Guid CreadoPor { get; set; }
    /// <summary>Número del ticket en el sistema de la empresa o del cliente (ej. INC-55821). El TCK interno se mantiene.</summary>
    public string? NumeroExterno { get; set; }
    /// <summary>ID de seguimiento externo (caso, requerimiento, orden de trabajo…).</summary>
    public string? IdSeguimiento { get; set; }
    /// <summary>Tiempo dedicado en horas, registrado a mano.</summary>
    public decimal? HorasDedicadas { get; set; }
    /// <summary>Fecha comprometida: es el único límite de resolución. Sin ella el ticket no vence.</summary>
    public DateTime? FechaVencimiento { get; set; }
    public DateTime? FechaLimitePrimeraRespuesta { get; set; }
    /// <summary>Siempre igual a <see cref="FechaVencimiento"/>; el semáforo de resolución se mide contra ella.</summary>
    public DateTime? FechaLimiteResolucion { get; set; }
    public DateTime? FechaPrimeraRespuesta { get; set; }
    public DateTime? FechaResolucion { get; set; }
    public DateTime? FechaCierre { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;

    public ICollection<MensajeTicket> Mensajes { get; set; } = new List<MensajeTicket>();

    /// <summary>La política solo fija el límite de primera respuesta; la resolución depende de la fecha de vencimiento.</summary>
    public void AplicarPoliticaSla(PoliticaSla politica)
    {
        PoliticaSlaId = politica.Id;
        FechaLimitePrimeraRespuesta = FechaCreacion.AddMinutes(politica.MinutosPrimeraRespuesta);
        FechaLimiteResolucion = FechaVencimiento;
    }

    /// <summary>Fija o quita la fecha de vencimiento: con fecha, el semáforo se mide contra ella; sin fecha, el ticket no vence.</summary>
    public void EstablecerFechaVencimiento(DateTime? fechaVencimiento)
    {
        FechaVencimiento = fechaVencimiento;
        FechaLimiteResolucion = fechaVencimiento;
    }

    /// <summary>Marca la primera respuesta al solicitante (solo la primera vez).</summary>
    public void RegistrarPrimeraRespuesta(DateTime ahoraUtc) => FechaPrimeraRespuesta ??= ahoraUtc;

    /// <summary>Aplica una transición validada por la máquina de estados y actualiza las fechas de SLA.</summary>
    public EstadoTicket CambiarEstado(EstadoTicket nuevoEstado, DateTime ahoraUtc)
    {
        if (!MaquinaEstadosTicket.EsTransicionValida(Estado, nuevoEstado, Tipo))
            throw new ExcepcionDominio($"No se puede pasar de {Estado} a {nuevoEstado}.");

        var estadoAnterior = Estado;
        Estado = nuevoEstado;
        FechaActualizacion = ahoraUtc;

        // Empezar a analizar cuenta como primera respuesta.
        if (nuevoEstado == EstadoTicket.EnAnalisis)
            RegistrarPrimeraRespuesta(ahoraUtc);
        if (MaquinaEstadosTicket.EsResolucion(nuevoEstado))
            FechaResolucion ??= ahoraUtc;
        if (nuevoEstado is EstadoTicket.Cerrado or EstadoTicket.Cancelado)
            FechaCierre = ahoraUtc;

        // Reabrir un ticket cerrado limpia su cierre y su resolución.
        if (estadoAnterior == EstadoTicket.Cerrado && nuevoEstado == EstadoTicket.EnAnalisis)
        {
            FechaCierre = null;
            FechaResolucion = null;
        }

        return estadoAnterior;
    }
}
