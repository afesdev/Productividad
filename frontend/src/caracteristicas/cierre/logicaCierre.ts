import type { ActividadDiaDto, EventoCalendarioDto, FilaReporteDto, RegistroTiempoDto } from '../../servicios/tipos';
import { fechaLocal } from '../calendario/utilidadesCalendario';
import { aIso } from '../diario/presentacionDiario';

/** Tramo del horario laboral, "HH:mm". */
export interface Tramo {
  inicio: string;
  fin: string;
}

export const ClaveHorario = 'cierre.horario';
export const HorarioPorDefecto: Tramo[] = [
  { inicio: '08:00', fin: '12:00' },
  { inicio: '14:00', fin: '17:30' },
];
/** Huecos más cortos no se señalan (pausas, cambios de tarea). */
export const MinutosHuecoMinimo = 15;

export interface Intervalo {
  inicio: number;
  fin: number;
}

/** "HH:mm" o "HH:mm:ss" → minutos desde medianoche. */
export const minutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
/** Minutos → "HH:mm". */
export const aHora = (total: number) => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
export const minutosDeFecha = (fecha: Date) => fecha.getHours() * 60 + fecha.getMinutes();

export function duracion(minutosTotales: number): string {
  const horas = Math.floor(minutosTotales / 60);
  const resto = minutosTotales % 60;
  return horas ? (resto ? `${horas} h ${resto} min` : `${horas} h`) : `${resto} min`;
}

export function normalizarHorario(valor: unknown): Tramo[] {
  if (!Array.isArray(valor)) return HorarioPorDefecto;
  const valido = /^\d{2}:\d{2}$/;
  const tramos = valor
    .filter((tramo): tramo is Tramo => !!tramo && valido.test((tramo as Tramo).inicio) && valido.test((tramo as Tramo).fin))
    .filter((tramo) => minutos(tramo.fin) > minutos(tramo.inicio))
    .sort((a, b) => minutos(a.inicio) - minutos(b.inicio));
  return tramos.length ? tramos : HorarioPorDefecto;
}

export const minutosLaborales = (horario: Tramo[]) => horario.reduce((total, tramo) => total + minutos(tramo.fin) - minutos(tramo.inicio), 0);

/**
 * Tiempo cubierto por las actividades registradas. Una actividad sin hora de fin cuenta hasta la siguiente (o hasta
 * `ahora` si es la última de hoy): sigue en curso, y su aviso "sin hora de fin" ya se muestra aparte.
 */
export function intervalosOcupados(filas: FilaReporteDto[], ahora: number | null): Intervalo[] {
  const ordenadas = [...filas].sort((a, b) => minutos(a.horaInicio) - minutos(b.horaInicio));
  return ordenadas.map((fila, indice) => {
    const inicio = minutos(fila.horaInicio);
    if (fila.horaFin) return { inicio, fin: Math.max(inicio, minutos(fila.horaFin)) };
    const siguiente = ordenadas[indice + 1];
    return { inicio, fin: siguiente ? minutos(siguiente.horaInicio) : (ahora ?? inicio) };
  });
}

/** Partes del horario laboral sin nada registrado (hasta `limite` si es hoy). */
export function calcularHuecos(horario: Tramo[], ocupados: Intervalo[], limite: number | null): Intervalo[] {
  const huecos: Intervalo[] = [];
  const ordenados = [...ocupados].sort((a, b) => a.inicio - b.inicio);
  for (const tramo of horario) {
    let cursor = minutos(tramo.inicio);
    const finTramo = Math.min(minutos(tramo.fin), limite ?? Number.POSITIVE_INFINITY);
    for (const ocupado of ordenados) {
      if (ocupado.fin <= cursor || ocupado.inicio >= finTramo) continue;
      if (ocupado.inicio > cursor) huecos.push({ inicio: cursor, fin: ocupado.inicio });
      cursor = Math.max(cursor, ocupado.fin);
      if (cursor >= finTramo) break;
    }
    if (cursor < finTramo) huecos.push({ inicio: cursor, fin: finTramo });
  }
  return huecos.filter((hueco) => hueco.fin - hueco.inicio >= MinutosHuecoMinimo);
}

const solape = (a: Intervalo, b: Intervalo) => Math.max(0, Math.min(a.fin, b.fin) - Math.max(a.inicio, b.inicio));

// ---------- Sugerencias ----------

export interface Sugerencia {
  clave: string;
  origen: 'reunion' | 'cronometro';
  titulo: string;
  inicio: number;
  fin: number;
  detalle: string;
  /** Id del evento del calendario (para descartarlo) o del registro de tiempo. */
  idOrigen: string;
}

/** Reuniones del calendario (con hora, no canceladas ni "libre") que no tienen actividad parecida en el diario. */
export function reunionesSinRegistrar(eventos: EventoCalendarioDto[], filas: FilaReporteDto[], fecha: string, descartadas: Set<string>): Sugerencia[] {
  return eventos
    .filter((evento) => !evento.todoElDia && !evento.cancelado && evento.disponibilidad !== 'Libre' && !descartadas.has(evento.id))
    .flatMap((evento): Sugerencia[] => {
      const inicio = fechaLocal(evento.inicio);
      if (aIso(inicio) !== fecha) return [];
      const fin = fechaLocal(evento.fin);
      const minutoInicio = minutosDeFecha(inicio);
      // Misma regla que el reporte: ya está si una actividad empieza a menos de 10 min o tiene el mismo título.
      const yaEsta = filas.some(
        (fila) => Math.abs(minutos(fila.horaInicio) - minutoInicio) <= 10 || fila.descripcionTexto.trim().toLowerCase() === evento.titulo.trim().toLowerCase(),
      );
      if (yaEsta) return [];
      return [
        {
          clave: `reunion:${evento.id}`,
          origen: 'reunion',
          titulo: evento.titulo,
          inicio: minutoInicio,
          fin: aIso(fin) === fecha ? minutosDeFecha(fin) : 23 * 60 + 59,
          detalle: 'Reunión de Outlook sin registrar',
          idOrigen: evento.id,
        },
      ];
    });
}

/** Tiempos del cronómetro (terminados, de al menos 5 min) que no se solapan en su mayoría con actividades registradas. */
export function tiemposSinRegistrar(registros: RegistroTiempoDto[], ocupados: Intervalo[], fecha: string): Sugerencia[] {
  return registros.flatMap((registro): Sugerencia[] => {
    if (!registro.fechaFin) return [];
    const inicio = new Date(registro.fechaInicio);
    const fin = new Date(registro.fechaFin);
    if (aIso(inicio) !== fecha) return [];
    const intervalo = { inicio: minutosDeFecha(inicio), fin: aIso(fin) === fecha ? minutosDeFecha(fin) : 23 * 60 + 59 };
    const largo = intervalo.fin - intervalo.inicio;
    if (largo < 5) return [];
    const cubierto = ocupados.reduce((total, ocupado) => total + solape(intervalo, ocupado), 0);
    if (cubierto >= largo / 2) return [];
    return [
      {
        clave: `tiempo:${registro.id}`,
        origen: 'cronometro',
        titulo: registro.clave ? `${registro.clave} ${registro.titulo}` : registro.descripcion || registro.titulo,
        ...intervalo,
        detalle: `Cronómetro · ${duracion(largo)}`,
        idOrigen: registro.id,
      },
    ];
  });
}

/** En qué se trabajó durante un hueco, según la actividad de la app (tickets, tareas, cronómetro): sirve de descripción sugerida. */
export function pistasDeHueco(hueco: Intervalo, actividad: ActividadDiaDto | null, registros: RegistroTiempoDto[]): string[] {
  const pistas = new Set<string>();
  const dentro = (iso: string) => {
    const minuto = minutosDeFecha(new Date(iso));
    return minuto >= hueco.inicio - 10 && minuto <= hueco.fin + 10;
  };
  for (const registro of registros) {
    const intervalo = { inicio: minutosDeFecha(new Date(registro.fechaInicio)), fin: registro.fechaFin ? minutosDeFecha(new Date(registro.fechaFin)) : hueco.fin };
    if (solape(intervalo, hueco) > 0) pistas.add(registro.clave ? `${registro.clave} ${registro.titulo}` : registro.titulo);
  }
  for (const ticket of actividad?.tickets ?? []) if (ticket.eventos.some((evento) => dentro(evento.hora))) pistas.add(`${ticket.clave} ${ticket.asunto}`);
  for (const tarea of [...(actividad?.tareasCompletadas ?? []), ...(actividad?.tareasCreadas ?? [])]) if (dentro(tarea.hora)) pistas.add(`${tarea.clave} ${tarea.titulo}`);
  return [...pistas].slice(0, 4);
}
