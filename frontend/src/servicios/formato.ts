const formatoRelativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

const unidades: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
];

/** "hace 3 horas", "en 2 días", "ahora". */
export function formatearRelativo(fechaIso: string | Date): string {
  const segundos = Math.round((new Date(fechaIso).getTime() - Date.now()) / 1000);
  for (const [unidad, segundosUnidad] of unidades) {
    if (Math.abs(segundos) >= segundosUnidad) return formatoRelativo.format(Math.round(segundos / segundosUnidad), unidad);
  }
  return 'ahora';
}

export const formatearFechaHora = (fechaIso: string) =>
  new Date(fechaIso).toLocaleString('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const formatearFecha = (fechaIso: string) => new Date(fechaIso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
