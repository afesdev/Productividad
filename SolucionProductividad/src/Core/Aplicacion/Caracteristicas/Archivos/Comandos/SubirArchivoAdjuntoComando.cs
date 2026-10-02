using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SolucionProductividad.Aplicacion.Caracteristicas.Archivos.Dtos;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Archivos.Comandos;

/// <summary>
/// Sube un archivo a Firebase Storage y guarda sus metadatos en SQL Server.
/// El usuario que sube se toma del token (no del cliente) para evitar suplantación.
/// Todas las entidades dueñas son opcionales: una imagen pegada en un documento aún no guardado queda huérfana hasta vincularse.
/// </summary>
public sealed record SubirArchivoAdjuntoComando(
    IFormFile Archivo,
    Guid? TareaId,
    Guid? MensajeTicketId,
    Guid? DocumentoId = null,
    Guid? RegistroDiarioId = null,
    Guid? TicketId = null) : IRequest<ArchivoAdjuntoDto>;

public sealed class ValidadorSubirArchivoAdjuntoComando : AbstractValidator<SubirArchivoAdjuntoComando>
{
    public const long TamanoMaximoEnBytes = 15 * 1024 * 1024;

    // SVG y HTML se excluyen a propósito: pueden ejecutar scripts al abrirse.
    private static readonly HashSet<string> TiposPermitidos = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/png", "image/jpeg", "image/gif", "image/webp",
        "application/pdf", "text/plain", "text/markdown", "text/csv",
        "application/json", "application/zip", "application/x-zip-compressed"
    };

    public ValidadorSubirArchivoAdjuntoComando()
    {
        RuleFor(comando => comando.Archivo).NotNull().WithMessage("Debe adjuntar un archivo.");
        RuleFor(comando => comando.Archivo.Length)
            .GreaterThan(0).WithMessage("El archivo está vacío.")
            .LessThanOrEqualTo(TamanoMaximoEnBytes).WithMessage("El archivo supera el máximo de 15 MB.")
            .When(comando => comando.Archivo is not null);
        RuleFor(comando => comando.Archivo.ContentType)
            .Must(TiposPermitidos.Contains).WithMessage("Tipo de archivo no permitido.")
            .When(comando => comando.Archivo is not null);
        RuleFor(comando => comando.Archivo.FileName).MaximumLength(255).When(comando => comando.Archivo is not null);
        RuleFor(comando => new[] { comando.TareaId, comando.MensajeTicketId, comando.DocumentoId, comando.RegistroDiarioId, comando.TicketId }.Count(id => id.HasValue))
            .LessThanOrEqualTo(1).WithName("Destino").WithMessage("El archivo solo puede asociarse a una entidad.");
    }
}

public sealed class ManejadorSubirArchivoAdjuntoComando : IRequestHandler<SubirArchivoAdjuntoComando, ArchivoAdjuntoDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioAlmacenamientoFirebase _almacenamiento;
    private readonly IServicioUsuarioActual _usuarioActual;
    private readonly ILogger<ManejadorSubirArchivoAdjuntoComando> _registrador;

    public ManejadorSubirArchivoAdjuntoComando(
        IContextoAplicacion contexto,
        IServicioAlmacenamientoFirebase almacenamiento,
        IServicioUsuarioActual usuarioActual,
        ILogger<ManejadorSubirArchivoAdjuntoComando> registrador)
    {
        _contexto = contexto;
        _almacenamiento = almacenamiento;
        _usuarioActual = usuarioActual;
        _registrador = registrador;
    }

    public async Task<ArchivoAdjuntoDto> Handle(SubirArchivoAdjuntoComando comando, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        await ValidarEntidadDestinoAsync(comando, usuarioId, tokenCancelacion);

        var rutaDestino = ConstruirRutaDestino(comando.Archivo.FileName);
        string urlDescarga;
        await using (var flujoArchivo = comando.Archivo.OpenReadStream())
        {
            urlDescarga = await _almacenamiento.SubirArchivoAsync(flujoArchivo, rutaDestino, comando.Archivo.ContentType, tokenCancelacion);
        }

        var adjunto = new ArchivoAdjunto
        {
            NombreArchivo = Path.GetFileName(comando.Archivo.FileName),
            TipoContenido = comando.Archivo.ContentType,
            TamanoEnBytes = comando.Archivo.Length,
            RutaFirebaseStorage = rutaDestino,
            UrlDescarga = urlDescarga,
            TareaId = comando.TareaId,
            MensajeTicketId = comando.MensajeTicketId,
            DocumentoId = comando.DocumentoId,
            RegistroDiarioId = comando.RegistroDiarioId,
            TicketId = comando.TicketId,
            SubidoPor = usuarioId
        };

        try
        {
            _contexto.ArchivosAdjuntos.Add(adjunto);
            await _contexto.GuardarCambiosAsync(tokenCancelacion);
        }
        catch
        {
            // Compensación: si falla SQL Server, no dejamos el binario huérfano en Firebase.
            try
            {
                await _almacenamiento.EliminarArchivoAsync(rutaDestino, CancellationToken.None);
            }
            catch (Exception excepcionCompensacion)
            {
                _registrador.LogError(excepcionCompensacion, "No se pudo eliminar el archivo huérfano {RutaFirebase}", rutaDestino);
            }
            throw;
        }

        return new ArchivoAdjuntoDto(adjunto.Id, adjunto.NombreArchivo, adjunto.TipoContenido, adjunto.TamanoEnBytes, adjunto.UrlDescarga, adjunto.FechaCreacion);
    }

    private async Task ValidarEntidadDestinoAsync(SubirArchivoAdjuntoComando comando, Guid usuarioId, CancellationToken tokenCancelacion)
    {
        if (comando.TareaId is { } tareaId && !await _contexto.Tareas.AnyAsync(tarea => tarea.Id == tareaId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("la tarea", tareaId);

        if (comando.MensajeTicketId is { } mensajeId && !await _contexto.MensajesTicket.AnyAsync(mensaje => mensaje.Id == mensajeId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("el mensaje de ticket", mensajeId);

        if (comando.DocumentoId is { } documentoId && !await _contexto.DocumentosMarkdown.AnyAsync(documento => documento.Id == documentoId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("el documento", documentoId);

        if (comando.TicketId is { } ticketId && !await _contexto.Tickets.AnyAsync(ticket => ticket.Id == ticketId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("el ticket", ticketId);

        if (comando.RegistroDiarioId is { } registroId &&
            !await _contexto.RegistrosDiarios.AnyAsync(registro => registro.Id == registroId && registro.UsuarioId == usuarioId, tokenCancelacion))
            throw new ExcepcionEntidadNoEncontrada("el registro diario", registroId);
    }

    /// <summary>Ruta con GUID para evitar colisiones y no exponer el nombre original en la URL.</summary>
    private static string ConstruirRutaDestino(string nombreOriginal)
    {
        var extension = Path.GetExtension(nombreOriginal).ToLowerInvariant();
        var extensionSegura = extension.Length is > 1 and <= 10 && extension.Skip(1).All(char.IsLetterOrDigit) ? extension : string.Empty;
        return $"adjuntos/{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid():N}{extensionSegura}";
    }
}
