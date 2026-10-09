using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Tareas.Consultas;

public sealed record TareaAgendaDto(
    Guid Id,
    string Clave,
    string Titulo,
    string NombreProyecto,
    EstadoTarea Estado,
    Prioridad Prioridad,
    DateTime FechaVencimiento);

/// <summary>
/// Tareas abiertas (pendientes o en progreso) de todos los proyectos del usuario que vencen antes de dentro de
/// <paramref name="Dias"/> días, incluidas las ya vencidas. Ordenadas por vencimiento (para la página de Inicio).
/// </summary>
public sealed record ObtenerAgendaTareasConsulta(int Dias = 7, int Limite = 30) : IRequest<IReadOnlyList<TareaAgendaDto>>;

public sealed class ValidadorObtenerAgendaTareasConsulta : AbstractValidator<ObtenerAgendaTareasConsulta>
{
    public ValidadorObtenerAgendaTareasConsulta()
    {
        RuleFor(consulta => consulta.Dias).InclusiveBetween(0, 60);
        RuleFor(consulta => consulta.Limite).InclusiveBetween(1, 100);
    }
}

public sealed class ManejadorObtenerAgendaTareasConsulta : IRequestHandler<ObtenerAgendaTareasConsulta, IReadOnlyList<TareaAgendaDto>>
{
    private readonly IContextoAplicacion _contexto;

    public ManejadorObtenerAgendaTareasConsulta(IContextoAplicacion contexto) => _contexto = contexto;

    public async Task<IReadOnlyList<TareaAgendaDto>> Handle(ObtenerAgendaTareasConsulta consulta, CancellationToken tokenCancelacion)
    {
        // El filtro global limita a los proyectos del usuario; el frontend separa vencidas, hoy y próximas en su zona.
        var hasta = DateTime.UtcNow.AddDays(consulta.Dias + 1);
        return await _contexto.Tareas.AsNoTracking()
            .Where(tarea => (tarea.Estado == EstadoTarea.Pendiente || tarea.Estado == EstadoTarea.EnProgreso)
                            && tarea.FechaVencimiento != null && tarea.FechaVencimiento < hasta)
            .OrderBy(tarea => tarea.FechaVencimiento)
            .ThenByDescending(tarea => tarea.Prioridad)
            .Take(consulta.Limite)
            .Select(tarea => new TareaAgendaDto(
                tarea.Id,
                tarea.ListaTareas!.Proyecto!.ClavePrefijo + "-" + tarea.NumeroTarea,
                tarea.Titulo,
                tarea.ListaTareas.Proyecto.Nombre,
                tarea.Estado,
                tarea.Prioridad,
                tarea.FechaVencimiento!.Value))
            .ToListAsync(tokenCancelacion);
    }
}
