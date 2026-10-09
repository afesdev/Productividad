import { FileText, LifeBuoy, ListChecks, PenTool, Rows3, Workflow } from 'lucide-react';
import type { Icono } from '../ui/primitivos';

/**
 * Bloques "vivos": contenido de otros módulos incrustado en un documento que se muestra actualizado.
 * Se guardan como bloque de código con lenguaje propio y líneas "clave: valor" (Markdown puro y legible):
 *
 *   ```tickets
 *   vista: Abiertos
 *   sistema: Sygnus
 *   limite: 10
 *   ```
 */
export type TipoBloqueVivo = 'flujo' | 'lienzo' | 'tickets' | 'tareas' | 'documentos' | 'flujos';

export const configuracionBloque: Record<TipoBloqueVivo, { etiqueta: string; descripcion: string; icono: Icono }> = {
  flujo: { etiqueta: 'Flujo', descripcion: 'Un diagrama de proceso con su recorrido', icono: Workflow },
  lienzo: { etiqueta: 'Lienzo', descripcion: 'Vista previa de una pizarra', icono: PenTool },
  tickets: { etiqueta: 'Tickets', descripcion: 'Tabla viva filtrada por sistema, vista o tipo', icono: LifeBuoy },
  tareas: { etiqueta: 'Tareas', descripcion: 'Lista viva de un proyecto', icono: ListChecks },
  documentos: { etiqueta: 'Documentos', descripcion: 'Lista viva por etiqueta o carpeta', icono: FileText },
  flujos: { etiqueta: 'Flujos de un sistema', descripcion: 'Todos los flujos de un sistema y sus tickets', icono: Rows3 },
};

export const tiposBloqueVivo = Object.keys(configuracionBloque) as TipoBloqueVivo[];

export const esBloqueVivo = (lenguaje: string | null | undefined): lenguaje is TipoBloqueVivo =>
  !!lenguaje && (tiposBloqueVivo as string[]).includes(lenguaje);

export type ConfiguracionBloque = Record<string, string>;

/** "clave: valor" por línea; las claves se normalizan a minúsculas y las líneas sin ":" se ignoran. */
export function leerConfiguracion(texto: string): ConfiguracionBloque {
  const configuracion: ConfiguracionBloque = {};
  for (const linea of texto.split(/\r?\n/)) {
    const separador = linea.indexOf(':');
    if (separador <= 0) continue;
    const clave = linea.slice(0, separador).trim().toLowerCase();
    const valor = linea.slice(separador + 1).trim();
    if (clave && valor) configuracion[clave] = valor;
  }
  return configuracion;
}

export function escribirConfiguracion(configuracion: ConfiguracionBloque): string {
  return Object.entries(configuracion)
    .filter(([, valor]) => valor !== undefined && valor !== null && String(valor).trim() !== '')
    .map(([clave, valor]) => `${clave}: ${String(valor).replace(/[\r\n]+/g, ' ').trim()}`)
    .join('\n');
}

/** Límite de filas de las listas vivas (por defecto 10, máximo 50). */
export const leerLimite = (configuracion: ConfiguracionBloque, porDefecto = 10) =>
  Math.min(50, Math.max(1, Number.parseInt(configuracion.limite ?? '', 10) || porDefecto));

export const normalizarNombre = (texto: string) =>
  texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
