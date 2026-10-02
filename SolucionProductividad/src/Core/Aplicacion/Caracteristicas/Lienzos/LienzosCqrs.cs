using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Lienzos;

// ---------- DTOs ----------

/// <summary>Escena vacía por defecto (evita null en el editor la primera vez que se abre).</summary>
internal static class EscenaLienzo
{
    public const string Vacia = "{\"type\":\"excalidraw\",\"version\":2,\"elements\":[],\"appState\":{},\"files\":{}}";
}

public sealed record LienzoResumenDto(Guid Id, string Titulo, DateTime FechaCreacion, DateTime FechaActualizacion);

public sealed record LienzoDetalleDto(Guid Id, string Titulo, string ContenidoJson, DateTime FechaCreacion, DateTime FechaActualizacion);

/// <summary>Resultado del autoguardado: sirve para mostrar "Guardado hh:mm".</summary>
public sealed record LienzoGuardadoDto(DateTime FechaActualizacion);

// ---------- Listar ----------

public sealed record ListarLienzosConsulta : IRequest<IReadOnlyList<LienzoResumenDto>>;

public sealed class ManejadorListarLienzosConsulta : IRequestHandler<ListarLienzosConsulta, IReadOnlyList<LienzoResumenDto>>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorListarLienzosConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<IReadOnlyList<LienzoResumenDto>> Handle(ListarLienzosConsulta consulta, CancellationToken tokenCancelacion) =>
        await _contexto.Lienzos.AsNoTracking()
            .OrderByDescending(lienzo => lienzo.FechaActualizacion)
            .Select(lienzo => new LienzoResumenDto(lienzo.Id, lienzo.Titulo, lienzo.FechaCreacion, lienzo.FechaActualizacion))
            .ToListAsync(tokenCancelacion);
}

// ---------- Obtener ----------

public sealed record ObtenerLienzoPorIdConsulta(Guid Id) : IRequest<LienzoDetalleDto>;

public sealed class ManejadorObtenerLienzoPorIdConsulta : IRequestHandler<ObtenerLienzoPorIdConsulta, LienzoDetalleDto>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorObtenerLienzoPorIdConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<LienzoDetalleDto> Handle(ObtenerLienzoPorIdConsulta consulta, CancellationToken tokenCancelacion) =>
        await _contexto.Lienzos.AsNoTracking()
            .Where(lienzo => lienzo.Id == consulta.Id)
            .Select(lienzo => new LienzoDetalleDto(lienzo.Id, lienzo.Titulo, lienzo.ContenidoJson, lienzo.FechaCreacion, lienzo.FechaActualizacion))
            .FirstOrDefaultAsync(tokenCancelacion)
        ?? throw new ExcepcionEntidadNoEncontrada("el lienzo", consulta.Id);
}

// ---------- Crear ----------

public sealed record CrearLienzoComando(string Titulo) : IRequest<Guid>;

public sealed class ValidadorCrearLienzoComando : AbstractValidator<CrearLienzoComando>
{
    public ValidadorCrearLienzoComando() => RuleFor(comando => comando.Titulo).NotEmpty().MaximumLength(200);
}

public sealed class ManejadorCrearLienzoComando : IRequestHandler<CrearLienzoComando, Guid>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorCrearLienzoComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<Guid> Handle(CrearLienzoComando comando, CancellationToken tokenCancelacion)
    {
        var lienzo = new Lienzo
        {
            UsuarioId = _usuarioActual.ObtenerUsuarioIdRequerido(),
            Titulo = comando.Titulo.Trim(),
            ContenidoJson = EscenaLienzo.Vacia
        };
        _contexto.Lienzos.Add(lienzo);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return lienzo.Id;
    }
}

// ---------- Renombrar ----------

public sealed record RenombrarLienzoComando(Guid Id, string Titulo) : IRequest;

public sealed class ValidadorRenombrarLienzoComando : AbstractValidator<RenombrarLienzoComando>
{
    public ValidadorRenombrarLienzoComando() => RuleFor(comando => comando.Titulo).NotEmpty().MaximumLength(200);
}

public sealed class ManejadorRenombrarLienzoComando : IRequestHandler<RenombrarLienzoComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorRenombrarLienzoComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(RenombrarLienzoComando comando, CancellationToken tokenCancelacion)
    {
        var lienzo = await _contexto.Lienzos.FirstOrDefaultAsync(lienzo => lienzo.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el lienzo", comando.Id);
        lienzo.Titulo = comando.Titulo.Trim();
        lienzo.FechaActualizacion = DateTime.UtcNow;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}

// ---------- Guardar contenido (autoguardado) ----------

public sealed record GuardarLienzoComando(Guid Id, string ContenidoJson) : IRequest<LienzoGuardadoDto>;

public sealed class ValidadorGuardarLienzoComando : AbstractValidator<GuardarLienzoComando>
{
    public ValidadorGuardarLienzoComando() => RuleFor(comando => comando.ContenidoJson).NotNull();
}

public sealed class ManejadorGuardarLienzoComando : IRequestHandler<GuardarLienzoComando, LienzoGuardadoDto>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorGuardarLienzoComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<LienzoGuardadoDto> Handle(GuardarLienzoComando comando, CancellationToken tokenCancelacion)
    {
        var lienzo = await _contexto.Lienzos.FirstOrDefaultAsync(lienzo => lienzo.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el lienzo", comando.Id);
        lienzo.ContenidoJson = comando.ContenidoJson;
        lienzo.FechaActualizacion = DateTime.UtcNow;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return new LienzoGuardadoDto(lienzo.FechaActualizacion);
    }
}

// ---------- Eliminar ----------

public sealed record EliminarLienzoComando(Guid Id) : IRequest;

public sealed class ManejadorEliminarLienzoComando : IRequestHandler<EliminarLienzoComando>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorEliminarLienzoComando(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task Handle(EliminarLienzoComando comando, CancellationToken tokenCancelacion)
    {
        var lienzo = await _contexto.Lienzos.FirstOrDefaultAsync(lienzo => lienzo.Id == comando.Id, tokenCancelacion)
            ?? throw new ExcepcionEntidadNoEncontrada("el lienzo", comando.Id);
        _contexto.Lienzos.Remove(lienzo);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
    }
}
