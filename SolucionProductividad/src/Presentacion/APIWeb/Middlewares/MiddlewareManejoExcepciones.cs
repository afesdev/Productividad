using Microsoft.AspNetCore.Mvc;
using SolucionProductividad.Aplicacion.Comun.Excepciones;
using SolucionProductividad.Dominio.Excepciones;

namespace SolucionProductividad.APIWeb.Middlewares;

/// <summary>
/// Traduce las excepciones de dominio/aplicación a respuestas ProblemDetails (RFC 7807).
/// Los errores no controlados se registran y se responden sin detalles internos.
/// </summary>
public sealed class MiddlewareManejoExcepciones
{
    private readonly RequestDelegate _siguiente;
    private readonly ILogger<MiddlewareManejoExcepciones> _registrador;

    public MiddlewareManejoExcepciones(RequestDelegate siguiente, ILogger<MiddlewareManejoExcepciones> registrador)
    {
        _siguiente = siguiente;
        _registrador = registrador;
    }

    public async Task InvokeAsync(HttpContext contexto)
    {
        try
        {
            await _siguiente(contexto);
        }
        catch (OperationCanceledException) when (contexto.RequestAborted.IsCancellationRequested)
        {
            // El cliente canceló la petición; no hay a quién responder.
        }
        catch (Exception excepcion)
        {
            await EscribirProblemaAsync(contexto, excepcion);
        }
    }

    private async Task EscribirProblemaAsync(HttpContext contexto, Exception excepcion)
    {
        var problema = excepcion switch
        {
            ExcepcionValidacion validacion => new ValidationProblemDetails(validacion.Errores)
            {
                Status = StatusCodes.Status400BadRequest,
                Title = validacion.Message
            },
            ExcepcionEntidadNoEncontrada => Crear(StatusCodes.Status404NotFound, "Recurso no encontrado", excepcion.Message),
            ExcepcionNoAutorizado => Crear(StatusCodes.Status401Unauthorized, "No autorizado", excepcion.Message),
            ExcepcionAccesoDenegado => Crear(StatusCodes.Status403Forbidden, "Acceso denegado", excepcion.Message),
            ExcepcionConflicto => Crear(StatusCodes.Status409Conflict, "Conflicto", excepcion.Message),
            ExcepcionDominio => Crear(StatusCodes.Status400BadRequest, "Regla de negocio incumplida", excepcion.Message),
            _ => null
        };

        if (problema is null)
        {
            _registrador.LogError(excepcion, "Error no controlado en {Metodo} {Ruta}", contexto.Request.Method, contexto.Request.Path);
            problema = Crear(StatusCodes.Status500InternalServerError, "Error interno", "Ocurrió un error inesperado. Intente nuevamente.");
        }

        problema.Instance = contexto.Request.Path;
        problema.Extensions["traceId"] = contexto.TraceIdentifier;

        contexto.Response.StatusCode = problema.Status ?? StatusCodes.Status500InternalServerError;
        await contexto.Response.WriteAsJsonAsync(problema, problema.GetType(), options: null, contentType: "application/problem+json");
    }

    private static ProblemDetails Crear(int estado, string titulo, string detalle) => new()
    {
        Status = estado,
        Title = titulo,
        Detail = detalle
    };
}
