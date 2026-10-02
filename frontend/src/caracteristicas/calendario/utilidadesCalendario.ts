import type { DisponibilidadEvento, EventoCalendarioDto } from '../../servicios/tipos';

export const etiquetasDisponibilidad: Record<DisponibilidadEvento, { etiqueta: string; tono: 'neutro' | 'acento' | 'aviso' | 'peligro' }> = {
  Ocupado: { etiqueta: 'Ocupado', tono: 'acento' },
  Provisional: { etiqueta: 'Provisional', tono: 'aviso' },
  Libre: { etiqueta: 'Libre', tono: 'neutro' },
  FueraDeOficina: { etiqueta: 'Fuera de la oficina', tono: 'peligro' },
  TrabajandoEnOtroLugar: { etiqueta: 'Trabajando en otro lugar', tono: 'neutro' },
};

/** Color (Tailwind) del punto que marca un evento según su disponibilidad. */
export const clasePunto: Record<DisponibilidadEvento, string> = {
  Ocupado: 'bg-violet-500',
  Provisional: 'bg-violet-300',
  Libre: 'bg-zinc-300',
  FueraDeOficina: 'bg-rose-400',
  TrabajandoEnOtroLugar: 'bg-sky-500',
};

/** Las fechas "AAAA-MM-DD" se leen como día local (new Date("2026-10-12") sería medianoche UTC y en Colombia caería el día anterior). */
export const fechaLocal = (valor: string) => (/^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T00:00:00`) : new Date(valor));

export const inicioDelDia = (fecha: Date) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

export const sumarDias = (fecha: Date, dias: number) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);

export const mismoDia = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const claveDia = (fecha: Date) => `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;

/** Lunes de la semana de la fecha. */
export const inicioSemana = (fecha: Date) => sumarDias(inicioDelDia(fecha), -((fecha.getDay() + 6) % 7));

export const formatoDia = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });
export const formatoHora = new Intl.DateTimeFormat('es', { hour: 'numeric', minute: '2-digit', hour12: true });

/** Días que ocupa un evento (los de todo el día tienen fin exclusivo). */
export function diasDelEvento(evento: EventoCalendarioDto): Date[] {
  const inicio = inicioDelDia(fechaLocal(evento.inicio));
  const finReal = fechaLocal(evento.fin);
  const ultimo = evento.todoElDia ? sumarDias(inicioDelDia(finReal), -1) : inicioDelDia(new Date(finReal.getTime() - 1));
  const dias: Date[] = [];
  for (let dia = inicio; dia <= ultimo && dias.length < 62; dia = sumarDias(dia, 1)) dias.push(dia);
  return dias.length > 0 ? dias : [inicio];
}

export function describirHorario(evento: EventoCalendarioDto): string {
  const inicio = fechaLocal(evento.inicio);
  const fin = fechaLocal(evento.fin);
  if (evento.todoElDia) {
    const ultimoDia = sumarDias(fin, -1);
    return mismoDia(ultimoDia, inicio)
      ? `${formatoDia.format(inicio)} · todo el día`
      : `${formatoDia.format(inicio)} – ${formatoDia.format(ultimoDia)} · todo el día`;
  }
  return mismoDia(inicio, fin)
    ? `${formatoDia.format(inicio)} · ${formatoHora.format(inicio)} – ${formatoHora.format(fin)}`
    : `${formatoDia.format(inicio)} ${formatoHora.format(inicio)} – ${formatoDia.format(fin)} ${formatoHora.format(fin)}`;
}

/** "Reunión de Microsoft Teams" como ubicación no aporta nada: ya se ve el icono de Teams. */
export const ubicacionUtil = (evento: EventoCalendarioDto) =>
  evento.ubicacion && !/^reuni[oó]n de microsoft teams$|^microsoft teams meeting$/i.test(evento.ubicacion.trim()) ? evento.ubicacion : null;

/** "en 5 min", "en 2 h 10 min", "ahora", "hace 10 min". */
export function tiempoRelativo(inicio: Date, fin: Date, ahora: Date): string {
  if (ahora >= inicio && ahora < fin) return 'Ahora';
  const minutos = Math.round((inicio.getTime() - ahora.getTime()) / 60_000);
  if (minutos <= 0) return 'Terminada';
  if (minutos < 60) return `En ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `En ${horas} h ${resto} min` : `En ${horas} h`;
}

/** Se puede unir desde 10 minutos antes hasta que termina. */
export const sePuedeUnir = (evento: EventoCalendarioDto, ahora: Date) =>
  !!evento.enlaceReunion &&
  !evento.todoElDia &&
  !evento.cancelado &&
  ahora.getTime() >= fechaLocal(evento.inicio).getTime() - 10 * 60_000 &&
  ahora < fechaLocal(evento.fin);
