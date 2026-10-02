/** 95 → "1 h 35 min" · 40 → "40 min" · 0 → "0 min" */
export function formatearDuracion(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

/** Horas con un decimal para totales: 95 → "1,6 h" */
export const formatearHorasDecimales = (minutos: number) => `${(minutos / 60).toLocaleString('es', { maximumFractionDigits: 1 })} h`;

/** 3725 → "1:02:05" */
export function formatearReloj(segundos: number): string {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const resto = segundos % 60;
  const dos = (numero: number) => String(numero).padStart(2, '0');
  return `${horas}:${dos(minutos)}:${dos(resto)}`;
}

/** "14:05" en hora local */
export const formatearHoraLocal = (fechaIso: string) => new Date(fechaIso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

/** Lunes 00:00 local de la semana que contiene la fecha. */
export function inicioSemana(fecha: Date): Date {
  const lunes = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  return lunes;
}

export function sumarDiasFecha(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

/** Clave de día local "AAAA-MM-DD" de un instante. */
export function claveDia(fecha: Date): string {
  const dos = (numero: number) => String(numero).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

/** Ruta de la tarea o ticket del registro, o null si es tiempo libre. */
export const rutaDestino = (registro: { tareaId: string | null; ticketId: string | null }) =>
  registro.tareaId ? `/tareas/${registro.tareaId}` : registro.ticketId ? `/tickets/${registro.ticketId}` : null;
