using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Diario;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Persistencia;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Dominio.Entidades;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.ObjetosValor;

namespace SolucionProductividad.Aplicacion.Caracteristicas.Importacion;

/// <summary>Resultado por elemento importado: "creado", "actualizado" u "omitido" (con el motivo).</summary>
public sealed record ResultadoImportacionDto(string Referencia, string Resultado, string? Detalle, Guid? Id);

// ---------- Tickets (notas de Obsidian con frontmatter) ----------

/// <summary>Un ticket histórico ya interpretado en el navegador (estado, tipo y prioridad mapeados).</summary>
public sealed record TicketImportadoDto(
    string NumeroExterno,
    string Asunto,
    string? NombreProyecto,
    EstadoTicket Estado,
    TipoTicket Tipo,
    Prioridad Prioridad,
    DateOnly? FechaCreacion,
    DateOnly? FechaCierre,
    string? DocumentacionMarkdown);

/// <summary>
/// Crea tickets históricos tal como estaban (estado incluido, sin pasar por la máquina de estados), asignados al usuario.
/// Omite los que ya existen con el mismo Nº externo y crea los proyectos que falten.
/// </summary>
public sealed record ImportarTicketsComando(IReadOnlyList<TicketImportadoDto> Tickets) : IRequest<IReadOnlyList<ResultadoImportacionDto>>;

public sealed class ValidadorImportarTicketsComando : AbstractValidator<ImportarTicketsComando>
{
    public ValidadorImportarTicketsComando()
    {
        RuleFor(comando => comando.Tickets).NotEmpty().Must(tickets => tickets.Count <= 500).WithMessage("Máximo 500 tickets por importación.");
        RuleForEach(comando => comando.Tickets).ChildRules(ticket =>
        {
            ticket.RuleFor(dato => dato.NumeroExterno).NotEmpty().MaximumLength(50);
            ticket.RuleFor(dato => dato.Asunto).NotEmpty().MaximumLength(250);
            ticket.RuleFor(dato => dato.NombreProyecto).MaximumLength(100);
            ticket.RuleFor(dato => dato.Estado).IsInEnum();
            ticket.RuleFor(dato => dato.Tipo).IsInEnum();
            ticket.RuleFor(dato => dato.Prioridad).IsInEnum();
        });
    }
}

public sealed class ManejadorImportarTicketsComando : IRequestHandler<ImportarTicketsComando, IReadOnlyList<ResultadoImportacionDto>>
{
    private static readonly string[] ColoresProyecto = ["violeta", "azul", "verde", "rosa", "ambar", "turquesa", "naranja", "rojo", "gris"];

    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;

    public ManejadorImportarTicketsComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
    }

    public async Task<IReadOnlyList<ResultadoImportacionDto>> Handle(ImportarTicketsComando comando, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var usuario = await _contexto.Usuarios.AsNoTracking().FirstAsync(existente => existente.Id == usuarioId, tokenCancelacion);

        // Nº externos que el usuario ya tiene (filtro global de tickets): se omiten para poder reimportar sin duplicar.
        var numeros = comando.Tickets.Select(ticket => ticket.NumeroExterno.Trim()).Distinct().ToList();
        var existentes = (await _contexto.Tickets.AsNoTracking()
                .Where(ticket => ticket.NumeroExterno != null && numeros.Contains(ticket.NumeroExterno))
                .Select(ticket => ticket.NumeroExterno!)
                .ToListAsync(tokenCancelacion))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var proyectos = await _contexto.ProyectosSoporte.Where(proyecto => proyecto.UsuarioId == usuarioId).ToListAsync(tokenCancelacion);
        var politicas = await _contexto.PoliticasSla.AsNoTracking().Where(politica => politica.EstaActiva).ToDictionaryAsync(politica => politica.Id, tokenCancelacion);

        var resultados = new List<ResultadoImportacionDto>();
        foreach (var dato in comando.Tickets)
        {
            var numero = dato.NumeroExterno.Trim();
            if (!existentes.Add(numero))
            {
                resultados.Add(new ResultadoImportacionDto(numero, "omitido", "Ya existe un ticket con ese número", null));
                continue;
            }

            var creacion = (dato.FechaCreacion ?? DateOnly.FromDateTime(DateTime.UtcNow)).ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc);
            var cierre = dato.FechaCierre?.ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc);
            var ticket = new Ticket
            {
                NumeroExterno = numero,
                Asunto = dato.Asunto.Trim(),
                Tipo = dato.Tipo,
                Prioridad = dato.Prioridad,
                Estado = dato.Estado,
                NombreSolicitante = usuario.NombreCompleto,
                CorreoSolicitante = usuario.Correo,
                DocumentacionMarkdown = string.IsNullOrWhiteSpace(dato.DocumentacionMarkdown) ? null : dato.DocumentacionMarkdown,
                ColaSoporteId = ValoresSemillaSoporte.IdColaGeneral,
                AgenteAsignadoId = usuarioId,
                CreadoPor = usuarioId,
                FechaCreacion = creacion,
                FechaActualizacion = cierre ?? creacion
            };
            if (politicas.TryGetValue(ValoresSemillaSoporte.PoliticasPorPrioridad[dato.Prioridad].Id, out var politica))
                ticket.AplicarPoliticaSla(politica);

            // Un ticket histórico ya avanzado: se da por respondido y, si llegó a producción o se cerró, por resuelto.
            if (dato.Estado is not (EstadoTicket.Nuevo or EstadoTicket.Asignado))
                ticket.FechaPrimeraRespuesta = creacion;
            if (MaquinaEstadosTicket.EsResolucion(dato.Estado))
                ticket.FechaResolucion = cierre ?? creacion;
            if (dato.Estado is EstadoTicket.Cerrado or EstadoTicket.Cancelado)
                ticket.FechaCierre = cierre ?? creacion;

            _contexto.Tickets.Add(ticket);
            _contexto.EventosTicket.Add(new EventoTicket
            {
                TicketId = ticket.Id,
                TipoEvento = TipoEventoTicket.Creado,
                Descripcion = $"Importado de Obsidian (estado: {dato.Estado})",
                EstadoNuevo = dato.Estado,
                UsuarioId = usuarioId,
                FechaEvento = creacion
            });

            if (!string.IsNullOrWhiteSpace(dato.NombreProyecto))
            {
                var nombre = dato.NombreProyecto.Trim();
                var proyecto = proyectos.FirstOrDefault(existente => string.Equals(existente.Nombre, nombre, StringComparison.OrdinalIgnoreCase));
                if (proyecto is null)
                {
                    proyecto = new ProyectoSoporte { UsuarioId = usuarioId, Nombre = nombre, Color = ColoresProyecto[proyectos.Count % ColoresProyecto.Length] };
                    _contexto.ProyectosSoporte.Add(proyecto);
                    proyectos.Add(proyecto);
                }
                _contexto.TicketsProyectos.Add(new TicketProyecto { TicketId = ticket.Id, ProyectoSoporteId = proyecto.Id });
            }

            resultados.Add(new ResultadoImportacionDto(numero, "creado", ticket.Asunto, ticket.Id));
        }

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return resultados;
    }
}

// ---------- Notas del diario ----------

public sealed record NotaDiarioImportadaDto(DateOnly Fecha, string ContenidoMarkdown);

/// <summary>
/// Cada nota pasa a la nota de su día. Si el día ya tiene nota, se añade debajo (sin borrar nada);
/// si ese contenido ya estaba (reimportación), se omite.
/// </summary>
public sealed record ImportarNotasDiarioComando(IReadOnlyList<NotaDiarioImportadaDto> Notas) : IRequest<IReadOnlyList<ResultadoImportacionDto>>;

public sealed class ValidadorImportarNotasDiarioComando : AbstractValidator<ImportarNotasDiarioComando>
{
    public ValidadorImportarNotasDiarioComando()
    {
        RuleFor(comando => comando.Notas).NotEmpty().Must(notas => notas.Count <= 1000).WithMessage("Máximo 1000 notas por importación.");
        RuleForEach(comando => comando.Notas).ChildRules(nota => nota.RuleFor(dato => dato.ContenidoMarkdown).NotNull().MaximumLength(1_000_000));
    }
}

public sealed class ManejadorImportarNotasDiarioComando : IRequestHandler<ImportarNotasDiarioComando, IReadOnlyList<ResultadoImportacionDto>>
{
    private readonly IContextoAplicacion _contexto;
    private readonly IServicioUsuarioActual _usuarioActual;
    private readonly IServicioProcesadorBacklinks _procesadorBacklinks;

    public ManejadorImportarNotasDiarioComando(IContextoAplicacion contexto, IServicioUsuarioActual usuarioActual, IServicioProcesadorBacklinks procesadorBacklinks)
    {
        _contexto = contexto;
        _usuarioActual = usuarioActual;
        _procesadorBacklinks = procesadorBacklinks;
    }

    public async Task<IReadOnlyList<ResultadoImportacionDto>> Handle(ImportarNotasDiarioComando comando, CancellationToken tokenCancelacion)
    {
        var usuarioId = _usuarioActual.ObtenerUsuarioIdRequerido();
        var resultados = new List<ResultadoImportacionDto>();

        // Varias notas del mismo día (poco común) se juntan en orden.
        foreach (var grupo in comando.Notas.GroupBy(nota => nota.Fecha).OrderBy(grupo => grupo.Key))
        {
            var contenido = string.Join("\n\n", grupo.Select(nota => nota.ContenidoMarkdown.Trim()).Where(texto => texto.Length > 0));
            var referencia = grupo.Key.ToString("yyyy-MM-dd");
            if (contenido.Length == 0)
            {
                resultados.Add(new ResultadoImportacionDto(referencia, "omitido", "Nota vacía", null));
                continue;
            }

            var registro = await RegistrosDiario.ObtenerOCrearAsync(_contexto, usuarioId, grupo.Key, tokenCancelacion);
            var existente = registro.ContenidoMarkdown.Trim();
            string resultado;
            if (existente.Contains(contenido, StringComparison.Ordinal))
            {
                resultados.Add(new ResultadoImportacionDto(referencia, "omitido", "Ese contenido ya estaba en el día", registro.Id));
                continue;
            }
            if (existente.Length == 0)
            {
                registro.ContenidoMarkdown = contenido;
                resultado = "creado";
            }
            else
            {
                registro.ContenidoMarkdown = $"{existente}\n\n---\n\n{contenido}";
                resultado = "actualizado";
            }
            registro.FechaActualizacion = DateTime.UtcNow;
            await _procesadorBacklinks.ProcesarWikiLinksAsync(registro.ContenidoMarkdown, registro.Id, nameof(TipoEntidad.RegistroDiario), tokenCancelacion);
            resultados.Add(new ResultadoImportacionDto(referencia, resultado, null, registro.Id));
        }

        await _contexto.GuardarCambiosAsync(tokenCancelacion);
        return resultados;
    }
}
