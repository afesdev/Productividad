/**
 * Festivos de Colombia (Ley 51 de 1983, "Ley Emiliani"), calculados para cualquier año:
 * - Fijos: se celebran el día que caen.
 * - Trasladables: se pasan al lunes siguiente si no caen en lunes.
 * - Dependientes de la Pascua: Jueves y Viernes Santo (fijos) y Ascensión, Corpus Christi y Sagrado Corazón
 *   (ya trasladados a lunes: Pascua + 43, + 64 y + 71 días).
 */

const fijos: [mes: number, dia: number, nombre: string][] = [
  [1, 1, 'Año Nuevo'],
  [5, 1, 'Día del Trabajo'],
  [7, 20, 'Día de la Independencia'],
  [8, 7, 'Batalla de Boyacá'],
  [12, 8, 'Inmaculada Concepción'],
  [12, 25, 'Navidad'],
];

const trasladables: [mes: number, dia: number, nombre: string][] = [
  [1, 6, 'Reyes Magos'],
  [3, 19, 'San José'],
  [6, 29, 'San Pedro y San Pablo'],
  [8, 15, 'Asunción de la Virgen'],
  [10, 12, 'Día de la Raza'],
  [11, 1, 'Todos los Santos'],
  [11, 11, 'Independencia de Cartagena'],
];

const deDomingoDePascua: [desplazamiento: number, nombre: string][] = [
  [-3, 'Jueves Santo'],
  [-2, 'Viernes Santo'],
  [43, 'Ascensión del Señor'],
  [64, 'Corpus Christi'],
  [71, 'Sagrado Corazón'],
];

const iso = (fecha: Date) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher, calendario gregoriano). */
function domingoDePascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

function siguienteLunes(fecha: Date): Date {
  const resultado = new Date(fecha);
  const diasHastaLunes = (8 - resultado.getDay()) % 7; // 0 si ya es lunes
  resultado.setDate(resultado.getDate() + diasHastaLunes);
  return resultado;
}

const cache = new Map<number, Map<string, string>>();

/** Festivos del año: "AAAA-MM-DD" → nombre. */
export function festivosColombia(anio: number): Map<string, string> {
  const guardados = cache.get(anio);
  if (guardados) return guardados;
  const festivos = new Map<string, string>();
  for (const [mes, dia, nombre] of fijos) festivos.set(iso(new Date(anio, mes - 1, dia)), nombre);
  for (const [mes, dia, nombre] of trasladables) festivos.set(iso(siguienteLunes(new Date(anio, mes - 1, dia))), nombre);
  const pascua = domingoDePascua(anio);
  for (const [desplazamiento, nombre] of deDomingoDePascua) {
    const fecha = new Date(pascua);
    fecha.setDate(fecha.getDate() + desplazamiento);
    festivos.set(iso(fecha), nombre);
  }
  cache.set(anio, festivos);
  return festivos;
}

/** Nombre del festivo en Colombia para "AAAA-MM-DD", o null si no lo es. */
export function festivoColombia(fechaIso: string): string | null {
  return festivosColombia(Number(fechaIso.slice(0, 4))).get(fechaIso) ?? null;
}

/** Por qué no se trabaja ese día ("Sábado", "Domingo" o el nombre del festivo), o null si es laborable (lunes a viernes no festivo). */
export function motivoNoLaborable(fechaIso: string): string | null {
  const diaSemana = new Date(`${fechaIso}T00:00:00`).getDay();
  if (diaSemana === 6) return 'Sábado';
  if (diaSemana === 0) return 'Domingo';
  return festivoColombia(fechaIso);
}
