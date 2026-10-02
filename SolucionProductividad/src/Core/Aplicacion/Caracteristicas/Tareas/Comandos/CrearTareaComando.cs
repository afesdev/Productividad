using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Comandos;

public sealed record CrearTareaComando(
    Guid ListaTareaId,
    string Titulo,
    string? DescripcionMarkdown,
    bool EsUrgente,
    bool EsImportante,
    DateTime? FechaVencimiento,
    Prioridad? Prioridad = null,
    Guid? TareaPadreId = null,
    decimal? HorasEstimadas = null,
    EstadoTarea? Estado = null) : IRequest<Guid>;

public sealed class ValidadorCrearTareaComando : AbstractValidator<CrearTareaComando>
{
    public ValidadorCrearTareaComando()
    {
        RuleFor(comando => comando.ListaTareaId).NotEmpty();
        RuleFor(comando => comando.Titulo).NotEmpty().MaximumLength(200);
        RuleFor(comando => comando.Prioridad).IsInEnum().When(comando => comando.Prioridad.HasValue);
        RuleFor(comando => comando.HorasEstimadas).InclusiveBetween(0, 999.99m).When(comando => comando.HorasEstimadas.HasValue);
        RuleFor(comando => comando.Estado).IsInEnum().When(comando => comando.Estado.HasValue);
    }
}

public sealed class ManejadorCrearTareaComando : IRequestHandler<CrearTareaComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;
    private readonly IServicioProcesadorBacklinks _procesadorBacklinks;
    private readonly INotificadorTiempoReal _notificador;

    public ManejadorCrearTareaComando(
        IContextoAplicacion contexto,
        IServicioUsuarioActual usuarioActual,
        IServicioProcesadorBacklinks procesadorBacklinks,
        INotificadorTiempoReal notificador)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
        _procesadorBacklinks = procesadorBacklinks;
        _notificador = notificador;
    }

    public async Task<Guid> Handle(CrearTareaComando comando, CancellationToken tokenCancelacion)
    {
        var listaTareaId = comando.ListaTareaId;

        if (comando.TareaPadreId is { } tareaPadreId)
        {
            // Una subtarea vive siempre en la misma lista que su tarea padre.
            listaTareaId = await _contexto.Tareas
                .Where(tarea => tarea.Id == tareaPadreId)
                .Select(tarea => (Guid?)tarea.ListaTareaId)
                .FirstOrDefaultAsync(tokenCancelacion)
                ?? throw new ExcepcionEntidadNoEncontrada("la tarea padre", tareaPadreId);
        }
        else if (!await _contexto.ListasTareas.AnyAsync(lista => lista.Id == listaTareaId, tokenCancelacion))
        {
            throw new ExcepcionEntidadNoEncontrada("la lista de tareas", listaTareaId);
        }

        var siguienteIndice = await _contexto.Tareas
            .Where(tarea => tarea.ListaTareaId == listaTareaId)
            .Select(tarea => (int?)tarea.IndiceOrden)
            .MaxAsync(tokenCancelacion) ?? -1;

        var nuevaTarea = new Tarea
        {
            ListaTareaId = listaTareaId,
            Estado = comando.Estado ?? EstadoTarea.Pendiente,
            TareaPadreId = comando.TareaPadreId,
            Titulo = comando.Titulo.Trim(),
            DescripcionMarkdown = comando.DescripcionMarkdown,
            EsUrgente = comando.EsUrgente,
            EsImportante = comando.EsImportante,
            // Si no se indica prioridad se deriva de la matriz: urgente+importante => Urgente.
            Prioridad = comando.Prioridad ?? (comando.EsUrgente && comando.EsImportante ? Prioridad.Urgente : Prioridad.Media),
            FechaVencimiento = comando.FechaVencimiento,
            HorasEstimadas = comando.HorasEstimadas,
            IndiceOrden = siguienteIndice + 1,
            CreadoPor = _usuarioActual.ObtenerUsuarioIdRequerido()
        };

        _contexto.Tareas.Add(nuevaTarea);

        if (!string.IsNullOrWhiteSpace(nuevaTarea.DescripcionMarkdown))
            await _procesadorBacklinks.ProcesarWikiLinksAsync(nuevaTarea.DescripcionMarkdown, nuevaTarea.Id, nameof(TipoEntidad.Tarea), tokenCancelacion);

        await _contexto.GuardarCambiosAsync(tokenCancelacion);

        var resumen = await AccesoTareas.ObtenerResumenAsync(_contexto, nuevaTarea.Id, tokenCancelacion);
        await _notificador.NotificarTareaActualizadaAsync(resumen, tokenCancelacion);
        return nuevaTarea.Id;
    }
}
