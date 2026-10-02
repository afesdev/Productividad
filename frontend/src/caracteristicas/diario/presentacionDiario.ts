import { CalendarClock, Lightbulb, OctagonAlert, Scale, SpellCheck, SquareCheck, StickyNote, Wand2 } from 'lucide-react';
import type { AccionTextoIA } from '../../servicios/api';
import type { TipoEntradaDiario } from '../../servicios/tipos';
import type { Icono } from '../../componentes/ui/primitivos';

interface ConfiguracionTipo {
  etiqueta: string;
  plural: string;
  icono: Icono;
  /** Prefijos de la captura rápida: "d: usar Redis…". */
  prefijos: string[];
  /** Clases literales (Tailwind) en tono pastel. */
  chip: string;
  recuadro: string;
  punto: string;
}

export const tiposEntrada: TipoEntradaDiario[] = ['Evento', 'Tarea', 'Decision', 'Aprendizaje', 'Bloqueo', 'Nota'];

export const configuracionTipo: Record<TipoEntradaDiario, ConfiguracionTipo> = {
  Evento: { etiqueta: 'Evento', plural: 'Eventos', icono: CalendarClock, prefijos: ['e', 'ev', 'evento'], chip: 'bg-sky-50 text-sky-900 border-sky-200', recuadro: 'bg-sky-100 text-sky-600', punto: 'bg-sky-400' },
  Tarea: { etiqueta: 'Tarea', plural: 'Tareas', icono: SquareCheck, prefijos: ['t', 'tarea'], chip: 'bg-violet-50 text-violet-900 border-violet-200', recuadro: 'bg-violet-100 text-violet-600', punto: 'bg-violet-400' },
  Decision: { etiqueta: 'Decisión', plural: 'Decisiones', icono: Scale, prefijos: ['d', 'decision', 'decisión'], chip: 'bg-amber-50 text-amber-900 border-amber-200', recuadro: 'bg-amber-100 text-amber-600', punto: 'bg-amber-400' },
  Aprendizaje: { etiqueta: 'Aprendizaje', plural: 'Aprendizajes', icono: Lightbulb, prefijos: ['a', 'aprendizaje', 'aprendí', 'aprendi'], chip: 'bg-emerald-50 text-emerald-900 border-emerald-200', recuadro: 'bg-emerald-100 text-emerald-600', punto: 'bg-emerald-400' },
  Bloqueo: { etiqueta: 'Bloqueo', plural: 'Bloqueos', icono: OctagonAlert, prefijos: ['b', 'bloqueo'], chip: 'bg-rose-50 text-rose-900 border-rose-200', recuadro: 'bg-rose-100 text-rose-500', punto: 'bg-rose-400' },
  Nota: { etiqueta: 'Nota', plural: 'Notas', icono: StickyNote, prefijos: ['n', 'nota'], chip: 'bg-zinc-100 text-zinc-800 border-zinc-200', recuadro: 'bg-zinc-100 text-zinc-500', punto: 'bg-zinc-400' },
};

/** Plantilla de la nota de un día nuevo (se guarda solo si la editas). */
/** Botones de IA del diario (nota y detalle de entradas). Resumir no se ofrece: reemplazaría el texto entero. */
export const accionesIADiario: { accion: AccionTextoIA; etiqueta: string; icono: Icono }[] = [
  { accion: 'Mejorar', etiqueta: 'Mejorar redacción', icono: Wand2 },
  { accion: 'Corregir', etiqueta: 'Corregir ortografía', icono: SpellCheck },
];

export const plantillaNotaDiaria = '## Reuniones\n- \n\n## Trabajo realizado\n- \n\n## Tareas creadas\n- [ ] \n\n## Para mañana\n- [ ] \n';

// ---------- Fechas (siempre del día local, formato AAAA-MM-DD) ----------

const dosDigitos = (numero: number) => String(numero).padStart(2, '0');

export const aIso = (fecha: Date) => `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;

export const hoyIso = () => aIso(new Date());

export function deIso(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

export function sumarDias(iso: string, dias: number): string {
  const fecha = deIso(iso);
  fecha.setDate(fecha.getDate() + dias);
  return aIso(fecha);
}

export const esFechaIso = (valor: string | undefined): valor is string => !!valor && /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(deIso(valor).getTime());

/** "Jueves, 24 de septiembre de 2026" (solo la primera letra en mayúscula). */
export function formatearFechaLarga(iso: string): string {
  const texto = deIso(iso).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "24 sep" */
export const formatearFechaCorta = (iso: string) => deIso(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });

/** "09:30:00" → "09:30" */
export const formatearHora = (hora: string | null) => (hora ? hora.slice(0, 5) : '');

/** "9", "9:30", "09:30" → "09:30:00"; null si no es una hora válida. */
export function normalizarHora(texto: string): string | null {
  const coincidencia = texto.trim().match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!coincidencia) return null;
  const horas = Number(coincidencia[1]);
  const minutos = Number(coincidencia[2] ?? 0);
  if (horas > 23 || minutos > 59) return null;
  return `${dosDigitos(horas)}:${dosDigitos(minutos)}:00`;
}

// ---------- Captura rápida ----------

export interface CapturaInterpretada {
  tipo: TipoEntradaDiario;
  titulo: string;
  detalleMarkdown: string | null;
  horaInicio: string | null;
  horaFin: string | null;
}

const tipoPorPrefijo = new Map(tiposEntrada.flatMap((tipo) => configuracionTipo[tipo].prefijos.map((prefijo) => [prefijo, tipo] as const)));

/**
 * Interpreta la barra de captura:
 *   "d: usar Redis | menos latencia"  → Decisión con detalle
 *   "e: 10-11 daily"                  → Evento de 10:00 a 11:00
 *   "9:30 llamada con soporte"        → sin prefijo: el tipo elegido (con hora y tipo Nota, pasa a Evento)
 * Devuelve null si no queda título.
 */
export function interpretarCaptura(texto: string, tipoElegido: TipoEntradaDiario): CapturaInterpretada | null {
  let resto = texto.trim();
  let tipo = tipoElegido;
  let tipoExplicito = false;

  const prefijo = resto.match(/^([a-záéíóú]+)\s*:\s*/i);
  if (prefijo && tipoPorPrefijo.has(prefijo[1].toLowerCase())) {
    tipo = tipoPorPrefijo.get(prefijo[1].toLowerCase())!;
    tipoExplicito = true;
    resto = resto.slice(prefijo[0].length);
  }

  let horaInicio: string | null = null;
  let horaFin: string | null = null;
  const horario = resto.match(/^(\d{1,2}(?::\d{2})?)(?:\s*-\s*(\d{1,2}(?::\d{2})?))?\s+/);
  if (horario) {
    const inicio = normalizarHora(horario[1]);
    const fin = horario[2] ? normalizarHora(horario[2]) : null;
    if (inicio && (!horario[2] || (fin && fin >= inicio))) {
      horaInicio = inicio;
      horaFin = fin;
      resto = resto.slice(horario[0].length);
      if (!tipoExplicito && tipo === 'Nota') tipo = 'Evento';
    }
  }

  const [titulo, ...detalle] = resto.split(' | ');
  if (!titulo.trim()) return null;
  return { tipo, titulo: titulo.trim(), detalleMarkdown: detalle.join(' | ').trim() || null, horaInicio, horaFin };
}
