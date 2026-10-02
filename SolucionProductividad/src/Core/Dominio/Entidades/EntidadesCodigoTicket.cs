using SolucionProductividad.Dominio.Comun;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Dominio.Entidades;

/// <summary>Repositorio de GitHub donde se trabajan los tickets.</summary>
[PrefijoTabla("Repositorios", "Rep")]
public class Repositorio : EntidadBase
{
    /// <summary>Usuario de la app que registró el repositorio (cada usuario ve solo los suyos).</summary>
    public Guid UsuarioId { get; set; }
    /// <summary>Nombre visible, ej. "API Facturación".</summary>
    public string Nombre { get; set; } = string.Empty;
    /// <summary>Usuario u organización dueña en GitHub.</summary>
    public string Propietario { get; set; } = string.Empty;
    public string NombreRepositorio { get; set; } = string.Empty;
    /// <summary>Rama desde la que se crean las ramas de trabajo (y que representa producción).</summary>
    public string RamaPrincipal { get; set; } = "main";
    /// <summary>Rama destino de los PR para probar en la app de desarrollo.</summary>
    public string RamaDesarrollo { get; set; } = "Desarrollo";
    /// <summary>Proyecto de soporte al que pertenece (opcional).</summary>
    public Guid? ProyectoSoporteId { get; set; }
    public bool EstaActivo { get; set; } = true;
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public string NombreCompleto => $"{Propietario}/{NombreRepositorio}";
    public string UrlWeb => $"https://github.com/{Propietario}/{NombreRepositorio}";
}

/// <summary>Rama de trabajo de un ticket en un repositorio, con su PR y la última foto de cambios traída de GitHub.</summary>
[PrefijoTabla("RamasTicket", "Rtk")]
public class RamaTicket : EntidadBase
{
    public Guid TicketId { get; set; }
    public Guid RepositorioId { get; set; }
    public string NombreRama { get; set; } = string.Empty;
    public string RamaBase { get; set; } = string.Empty;
    public string RamaDestino { get; set; } = string.Empty;
    public int? PullRequestNumero { get; set; }
    public string? PullRequestUrl { get; set; }
    public EstadoPullRequest? PullRequestEstado { get; set; }
    public DateTime? PullRequestFechaFusion { get; set; }
    public int TotalCommits { get; set; }
    public int TotalArchivos { get; set; }
    public int LineasAgregadas { get; set; }
    public int LineasEliminadas { get; set; }
    public DateTime? FechaUltimaSincronizacion { get; set; }
    public Guid CreadoPor { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public Repositorio? Repositorio { get; set; }
    public ICollection<ArchivoModificado> Archivos { get; set; } = new List<ArchivoModificado>();
    public ICollection<CommitRama> Commits { get; set; } = new List<CommitRama>();
}

[PrefijoTabla("ArchivosModificados", "Amo")]
public class ArchivoModificado : EntidadBase
{
    public Guid RamaTicketId { get; set; }
    public string RutaArchivo { get; set; } = string.Empty;
    /// <summary>Ruta anterior cuando el archivo fue renombrado.</summary>
    public string? RutaAnterior { get; set; }
    public TipoCambioArchivo TipoCambio { get; set; }
    public int LineasAgregadas { get; set; }
    public int LineasEliminadas { get; set; }
    /// <summary>Diferencia en formato unified diff tal como la entrega GitHub (null en binarios o archivos muy grandes).</summary>
    public string? Parche { get; set; }
}

[PrefijoTabla("CommitsRama", "Cmt")]
public class CommitRama : EntidadBase
{
    public Guid RamaTicketId { get; set; }
    public string Sha { get; set; } = string.Empty;
    public string Mensaje { get; set; } = string.Empty;
    public string Autor { get; set; } = string.Empty;
    public DateTime FechaCommit { get; set; }
    public string Url { get; set; } = string.Empty;
}

/// <summary>Registro de un despliegue del ticket y el resultado de sus pruebas.</summary>
[PrefijoTabla("DesplieguesTicket", "Dsp")]
public class DespliegueTicket : EntidadBase
{
    public Guid TicketId { get; set; }
    public AmbienteDespliegue Ambiente { get; set; }
    /// <summary>Versión, tag o commit desplegado (opcional).</summary>
    public string? Referencia { get; set; }
    public string? Notas { get; set; }
    public ResultadoDespliegue Resultado { get; set; } = ResultadoDespliegue.Pendiente;
    public string? NotasResultado { get; set; }
    public Guid DesplegadoPor { get; set; }
    public Guid? EvaluadoPor { get; set; }
    public DateTime FechaDespliegue { get; set; } = DateTime.UtcNow;
    public DateTime? FechaResultado { get; set; }
}

/// <summary>Línea de tiempo del ticket: cada cambio de estado, asignación, rama, PR, despliegue...</summary>
[PrefijoTabla("EventosTicket", "Evt")]
public class EventoTicket : EntidadBase
{
    public Guid TicketId { get; set; }
    public TipoEventoTicket TipoEvento { get; set; }
    public EstadoTicket? EstadoAnterior { get; set; }
    public EstadoTicket? EstadoNuevo { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public string? Comentario { get; set; }
    public Guid UsuarioId { get; set; }
    public DateTime FechaEvento { get; set; } = DateTime.UtcNow;
}
