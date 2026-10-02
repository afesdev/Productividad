using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Archivos.Comandos;

public sealed record EliminarArchivoAdjuntoComando(Guid Id) : IRequest;

public sealed class ManejadorEliminarArchivoAdjuntoComando : IRequestHandler<EliminarArchivoAdjuntoComando>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioAlmacenamientoFirebase _almacenamiento;
    private readonly IServicioUsuarioActual _usuarioActual;
    private readonly ILogger<ManejadorEliminarArchivoAdjuntoComando> _registrador;

    public ManejadorEliminarArchivoAdjuntoComando(
        IContextoAplicacion contexto,
        IServicioAlmacenamientoFirebase almacenamiento,
        IServicioUsuarioActual usuarioActual,
        ILogger<ManejadorEliminarArchivoAdjuntoComando> registrador)
    {
        _contexto = contexto;
        _almacenamiento = almacenamiento;
        _usuarioActual = usuarioActual;
        _registrador = registrador;
    }

    public async Task Handle(EliminarArchivoAdjuntoComando comando, CancellationToken tokenCancelacion)
    {
        var adjunto = await _contexto.ArchivosAdjuntos.FirstOrDefaultAsync(adjunto => adjunto.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el archivo adjunto", comando.Id);

        // Se responde 404 para no confirmar la existencia de archivos ajenos.
        if (adjunto.SubidoPor != _usuarioActual.ObtenerUsuarioIdRequerido())
            throw new ExcepcionEntidadNoEncontrada("el archivo adjunto", comando.Id);

        _contexto.ArchivosAdjuntos.Remove(adjunto);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);

        try
        {
            await _almacenamiento.EliminarArchivoAsync(adjunto.RutaFirebaseStorage, CancellationToken.None);
        }
        catch (Exception excepcion)
        {
            _registrador.LogWarning(excepcion, "No se pudo eliminar {RutaFirebase} de Firebase Storage", adjunto.RutaFirebaseStorage);
        }
    }
}
