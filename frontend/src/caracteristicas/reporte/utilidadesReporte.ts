import type { EstadoActividadReporte, FilaReporteDto } from '../../servicios/tipos';
import { aIso } from '../diario/presentacionDiario';

export type Periodo = 'dia' | 'semana' | 'mes' | 'rango';

export const textoEstado: Record<EstadoActividadReporte, string> = { Terminada: 'Terminada', EnProceso: 'En proceso' };

/** "2026-10-05" → "05/10/2026", como en el Excel de la empresa. */
export const fechaExcel = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** 4 → "4,00" (coma decimal, como en el Excel de la empresa). */
export const horasExcel = (horas: number | null) => (horas ?? 0).toFixed(2).replace('.', ',');

export const fechaLocalIso = (iso: string) => new Date(`${iso}T00:00:00`);

export const sumarDiasIso = (iso: string, dias: number) => {
  const fecha = fechaLocalIso(iso);
  fecha.setDate(fecha.getDate() + dias);
  return aIso(fecha);
};

/** Rango [desde, hasta] (incluido) del periodo que contiene la fecha ancla. Semanas de lunes a domingo. */
export function rangoDePeriodo(periodo: Exclude<Periodo, 'rango'>, ancla: string): { desde: string; hasta: string } {
  const fecha = fechaLocalIso(ancla);
  if (periodo === 'dia') return { desde: ancla, hasta: ancla };
  if (periodo === 'semana') {
    const lunes = sumarDiasIso(ancla, -((fecha.getDay() + 6) % 7));
    return { desde: lunes, hasta: sumarDiasIso(lunes, 6) };
  }
  return { desde: aIso(new Date(fecha.getFullYear(), fecha.getMonth(), 1)), hasta: aIso(new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0)) };
}

/** Mueve el ancla un periodo hacia atrás (-1) o adelante (1). */
export function desplazarAncla(periodo: Exclude<Periodo, 'rango'>, ancla: string, sentido: 1 | -1): string {
  if (periodo === 'dia') return sumarDiasIso(ancla, sentido);
  if (periodo === 'semana') return sumarDiasIso(ancla, 7 * sentido);
  const fecha = fechaLocalIso(ancla);
  return aIso(new Date(fecha.getFullYear(), fecha.getMonth() + sentido, 1));
}

const formatoTitulo = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });
const formatoMes = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' });
const formatoCorto = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });

export function tituloPeriodo(periodo: Periodo, desde: string, hasta: string): string {
  if (periodo === 'dia') return formatoTitulo.format(fechaLocalIso(desde));
  if (periodo === 'mes') return formatoMes.format(fechaLocalIso(desde));
  return `${formatoCorto.format(fechaLocalIso(desde))} – ${formatoCorto.format(fechaLocalIso(hasta))}`;
}

export const tituloDia = (iso: string) => formatoTitulo.format(fechaLocalIso(iso));

/** Texto de una celda del portapapeles: sin tabuladores ni saltos (romperían las columnas al pegar en Excel). */
const celda = (valor: string) => valor.replace(/[\t\r\n]+/g, ' ').trim();

/**
 * Filas separadas por tabulador en el orden del Excel de la empresa:
 * solicitud, inicio, fin, hora inicio, hora fin, descripción, tablero, ejecutor, estado, "1+c vb" (vacía), horas.
 */
export function filasParaExcel(filas: FilaReporteDto[], ejecutor: string): string {
  return filas
    .map((fila) =>
      [
        fechaExcel(fila.fechaSolicitud),
        fechaExcel(fila.fecha),
        fechaExcel(fila.fecha),
        fila.horaInicio.slice(0, 5),
        fila.horaFin?.slice(0, 5) ?? '',
        celda(fila.descripcionTexto),
        celda(fila.nombreTablero ?? ''),
        celda(ejecutor),
        textoEstado[fila.estado],
        '',
        horasExcel(fila.horas),
      ].join('\t'),
    )
    .join('\r\n');
}

export function descargarArchivo(contenido: Blob, nombre: string) {
  const url = URL.createObjectURL(contenido);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Problemas que conviene resolver antes de entregar la fila. */
export function avisosFila(fila: FilaReporteDto): string[] {
  const avisos: string[] = [];
  if (!fila.tableroReporteId) avisos.push('Sin tablero');
  if (!fila.horaFin) avisos.push('Sin hora de fin');
  return avisos;
}
