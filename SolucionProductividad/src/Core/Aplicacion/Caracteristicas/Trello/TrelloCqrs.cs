using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Trello;

// ---------- DTOs ----------

/// <summary>
/// <paramref name="ApiKey"/> es la clave pública del Power-Up (null si el servidor no tiene Trello configurado): el navegador
/// la necesita para abrir la pantalla de autorización de Trello.
/// </summary>
public sealed record EstadoConexionTrelloDto(string? ApiKey, bool Conectado, string? NombreMiembro, string? UsuarioMiembro, DateTime? FechaConexion);

// ---------- Token de la conexión actual ----------

internal static class ConexionTrelloActual
{
    public static async Task<(string Token, string IdMiembro)> ObtenerAsync(IContextoAplicacion contexto, IServicioCifradoBoveda cifrado, CancellationToken tokenCancelacion)
    {
        var conexion = await contexto.ConexionesTrello.AsNoTracking()
            .Select(conexion => new { conexion.TokenCifrado, conexion.IdMiembro })
            .FirstOrDefaultAsync(tokenCancelacion)
            ?? throw new ExcepcionConflicto("No has conectado tu cuenta de Trello.");
        return (cifrado.DescifrarTexto(conexion.TokenCifrado), conexion.IdMiembro);
    }
}

// ---------- Estado de la conexión ----------

public sealed record ObtenerEstadoConexionTrelloConsulta : IRequest<EstadoConexionTrelloDto>;

public sealed class ManejadorObtenerEstadoConexionTrelloConsulta : IRequestHandler<ObtenerEstadoConexionTrelloConsulta, EstadoConexionTrelloDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioTrello _trello;

    public ManejadorObtenerEstadoConexionTrelloConsulta(IContextoAplicacion contexto, IServicioTrello trello)
    {
        _contexto = contexto;
        _trello = trello;
    }

    public async Task<EstadoConexionTrelloDto> Handle(ObtenerEstadoConexionTrelloConsulta consulta, CancellationToken tokenCancelacion)
    {
        var conexion = await _contexto.ConexionesTrello.AsNoTracking()
            .Select(conexion => new { conexion.NombreMiembro, conexion.UsuarioMiembro, conexion.FechaConexion })
            .FirstOrDefaultAsync(tokenCancelacion);
        return new EstadoConexionTrelloDto(_trello.ApiKey, conexion is not null, conexion?.NombreMiembro, conexion?.UsuarioMiembro, conexion?.FechaConexion);
    }
}

// ---------- Conectar (o reemplazar el token) ----------

public sealed record ConectarTrelloComando(string Token) : IRequest<EstadoConexionTrelloDto>;

public sealed class ValidadorConectarTrelloComando : AbstractValidator<ConectarTrelloComando>
{
    public ValidadorConectarTrelloComando() =>
        RuleFor(comando => comando.Token)
            .NotEmpty()
            .Must(ReglasTrello.EsTokenValido).WithMessage("El token de Trello no tiene un formato válido. Vuelve a conectar desde el botón.")
            .WithName("Token");
}

public sealed class ManejadorConectarTrelloComando : IRequestHandler<ConectarTrelloComando, EstadoConexionTrelloDto>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;
    private readonly IServicioTrello _trello;
    private readonly IServicioCifradoBoveda _cifrado;

    public ManejadorConectarTrelloComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual, IServicioTrello trello, IServicioCifradoBoveda cifrado)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
        _trello = trello;
        _cifrado = cifrado;
    }

    public async Task<EstadoConexionTrelloDto> Handle(ConectarTrelloComando comando, CancellationToken tokenCancelacion)
    {
        // Se prueba antes de guardar: si Trello no lo acepta, el usuario lo sabe ya.
        var miembro = await _trello.ObtenerMiembroActualAsync(comando.Token, tokenCancelacion);

        var conexion = await _contexto.ConexionesTrello.FirstOrDefaultAsync(tokenCancelacion);
        if (conexion is null)
        {
            conexion = new ConexionTrello { UsuarioId = _usuarioActual.ObtenerUsuarioIdRequerido() };
            _contexto.ConexionesTrello.Add(conexion);
        }
        conexion.TokenCifrado = _cifrado.CifrarTexto(comando.Token);
        conexion.IdMiembro = miembro.Id;
        conexion.NombreMiembro = Recortar(miembro.NombreCompleto, 200);
        conexion.UsuarioMiembro = Recortar(miembro.Usuario, 100);
        conexion.FechaConexion = DateTime.UtcNow;
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return new EstadoConexionTrelloDto(_trello.ApiKey, true, conexion.NombreMiembro, conexion.UsuarioMiembro, conexion.FechaConexion);
    }

    private static string Recortar(string texto, int maximo) => texto.Length <= maximo ? texto : texto[..maximo];
}

// ---------- Desconectar ----------

public sealed record DesconectarTrelloComando : IRequest;

public sealed class ManejadorDesconectarTrelloComando : IRequestHandler<DesconectarTrelloComando>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioTrello _trello;
    private readonly IServicioCifradoBoveda _cifrado;

    public ManejadorDesconectarTrelloComando(IContextoAplicacion contexto, IServicioTrello trello, IServicioCifradoBoveda cifrado)
    {
        _contexto = contexto;
        _trello = trello;
        _cifrado = cifrado;
    }

    public async Task Handle(DesconectarTrelloComando comando, CancellationToken tokenCancelacion)
    {
        var conexion = await _contexto.ConexionesTrello.FirstOrDefaultAsync(tokenCancelacion);
        if (conexion is null) return;
        var token = _cifrado.DescifrarTexto(conexion.TokenCifrado);
        _contexto.ConexionesTrello.Remove(conexion);
        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        // Después de borrar: aunque Trello no responda, la app ya no guarda el token.
        await _trello.RevocarTokenAsync(token, tokenCancelacion);
    }
}

// ---------- Lecturas ----------

public sealed record ListarTablerosTrelloConsulta(bool Actualizar = false) : IRequest<IReadOnlyList<TableroTrelloResumen>>;

public sealed class ManejadorListarTablerosTrelloConsulta : IRequestHandler<ListarTablerosTrelloConsulta, IReadOnlyList<TableroTrelloResumen>>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioTrello _trello;
    private readonly IServicioCifradoBoveda _cifrado;

    public ManejadorListarTablerosTrelloConsulta(IContextoAplicacion contexto, IServicioTrello trello, IServicioCifradoBoveda cifrado)
    {
        _contexto = contexto;
        _trello = trello;
        _cifrado = cifrado;
    }

    public async Task<IReadOnlyList<TableroTrelloResumen>> Handle(ListarTablerosTrelloConsulta consulta, CancellationToken tokenCancelacion)
    {
        var (token, idMiembro) = await ConexionTrelloActual.ObtenerAsync(_contexto, _cifrado, tokenCancelacion);
        return await _trello.ListarTablerosAsync(token, idMiembro, consulta.Actualizar, tokenCancelacion);
    }
}

public sealed record ObtenerTableroTrelloConsulta(string IdTablero, bool Actualizar = false) : IRequest<TableroTrello>;

public sealed class ManejadorObtenerTableroTrelloConsulta : IRequestHandler<ObtenerTableroTrelloConsulta, TableroTrello>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioTrello _trello;
    private readonly IServicioCifradoBoveda _cifrado;

    public ManejadorObtenerTableroTrelloConsulta(IContextoAplicacion contexto, IServicioTrello trello, IServicioCifradoBoveda cifrado)
    {
        _contexto = contexto;
        _trello = trello;
        _cifrado = cifrado;
    }

    public async Task<TableroTrello> Handle(ObtenerTableroTrelloConsulta consulta, CancellationToken tokenCancelacion)
    {
        var (token, _) = await ConexionTrelloActual.ObtenerAsync(_contexto, _cifrado, tokenCancelacion);
        return await _trello.ObtenerTableroAsync(token, consulta.IdTablero, consulta.Actualizar, tokenCancelacion);
    }
}

public sealed record ObtenerTarjetaTrelloConsulta(string IdTarjeta) : IRequest<TarjetaTrelloDetalle>;

public sealed class ManejadorObtenerTarjetaTrelloConsulta : IRequestHandler<ObtenerTarjetaTrelloConsulta, TarjetaTrelloDetalle>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioTrello _trello;
    private readonly IServicioCifradoBoveda _cifrado;

    public ManejadorObtenerTarjetaTrelloConsulta(IContextoAplicacion contexto, IServicioTrello trello, IServicioCifradoBoveda cifrado)
    {
        _contexto = contexto;
        _trello = trello;
        _cifrado = cifrado;
    }

    public async Task<TarjetaTrelloDetalle> Handle(ObtenerTarjetaTrelloConsulta consulta, CancellationToken tokenCancelacion)
    {
        var (token, _) = await ConexionTrelloActual.ObtenerAsync(_contexto, _cifrado, tokenCancelacion);
        return await _trello.ObtenerTarjetaAsync(token, consulta.IdTarjeta, tokenCancelacion);
    }
}

public sealed record ListarMisTarjetasTrelloConsulta(bool Actualizar = false) : IRequest<IReadOnlyList<TarjetaAsignadaTrello>>;

public sealed class ManejadorListarMisTarjetasTrelloConsulta : IRequestHandler<ListarMisTarjetasTrelloConsulta, IReadOnlyList<TarjetaAsignadaTrello>>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioTrello _trello;
    private readonly IServicioCifradoBoveda _cifrado;

    public ManejadorListarMisTarjetasTrelloConsulta(IContextoAplicacion contexto, IServicioTrello trello, IServicioCifradoBoveda cifrado)
    {
        _contexto = contexto;
        _trello = trello;
        _cifrado = cifrado;
    }

    public async Task<IReadOnlyList<TarjetaAsignadaTrello>> Handle(ListarMisTarjetasTrelloConsulta consulta, CancellationToken tokenCancelacion)
    {
        var (token, idMiembro) = await ConexionTrelloActual.ObtenerAsync(_contexto, _cifrado, tokenCancelacion);
        return await _trello.ListarMisTarjetasAsync(token, idMiembro, consulta.Actualizar, tokenCancelacion);
    }
}

// ---------- Imagen de un adjunto ----------

public sealed record ObtenerImagenAdjuntoTrelloConsulta(string IdTarjeta, string IdAdjunto) : IRequest<ImagenAdjuntoTrello>;

public sealed class ManejadorObtenerImagenAdjuntoTrelloConsulta : IRequestHandler<ObtenerImagenAdjuntoTrelloConsulta, ImagenAdjuntoTrello>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioTrello _trello;
    private readonly IServicioCifradoBoveda _cifrado;

    public ManejadorObtenerImagenAdjuntoTrelloConsulta(IContextoAplicacion contexto, IServicioTrello trello, IServicioCifradoBoveda cifrado)
    {
        _contexto = contexto;
        _trello = trello;
        _cifrado = cifrado;
    }

    public async Task<ImagenAdjuntoTrello> Handle(ObtenerImagenAdjuntoTrelloConsulta consulta, CancellationToken tokenCancelacion)
    {
        var (token, _) = await ConexionTrelloActual.ObtenerAsync(_contexto, _cifrado, tokenCancelacion);
        return await _trello.DescargarImagenAdjuntoAsync(token, consulta.IdTarjeta, consulta.IdAdjunto, tokenCancelacion);
    }
}
