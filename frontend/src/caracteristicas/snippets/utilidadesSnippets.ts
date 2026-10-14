/** Lenguajes ofrecidos al crear un snippet; el valor es el nombre de highlight.js ("texto" = sin resaltado). */
export const lenguajesSnippet: { valor: string; etiqueta: string }[] = [
  { valor: 'sql', etiqueta: 'SQL' },
  { valor: 'powershell', etiqueta: 'PowerShell' },
  { valor: 'bash', etiqueta: 'Bash' },
  { valor: 'csharp', etiqueta: 'C#' },
  { valor: 'typescript', etiqueta: 'TypeScript' },
  { valor: 'javascript', etiqueta: 'JavaScript' },
  { valor: 'json', etiqueta: 'JSON' },
  { valor: 'xml', etiqueta: 'XML / HTML' },
  { valor: 'yaml', etiqueta: 'YAML' },
  { valor: 'python', etiqueta: 'Python' },
  { valor: 'texto', etiqueta: 'Texto' },
];

export const etiquetaLenguaje = (valor: string) => lenguajesSnippet.find((lenguaje) => lenguaje.valor === valor)?.etiqueta ?? valor;

/** Lenguaje para resaltar (o para el bloque de código del editor); "texto" no se resalta. */
export const lenguajeResaltado = (valor: string) => (valor === 'texto' ? null : valor);

/** {{nombre}} con letras, números, punto, guion o guion bajo; se permiten espacios dentro de las llaves. */
const patronVariable = /\{\{\s*([\w.-]+)\s*\}\}/g;

/** Nombres de las variables en orden de aparición, sin repetir. */
export function variablesDe(contenido: string): string[] {
  return [...new Set([...contenido.matchAll(patronVariable)].map((coincidencia) => coincidencia[1]))];
}

/** Sustituye las variables con valor; las vacías se dejan como {{nombre}} para que se note que faltan. */
export function aplicarVariables(contenido: string, valores: Record<string, string>): string {
  return contenido.replace(patronVariable, (original, nombre: string) => (valores[nombre] ? valores[nombre] : original));
}

/** Los últimos valores usados en cada snippet se recuerdan en el navegador (suelen repetirse: el mismo cliente, el mismo servidor…). */
const claveValores = (id: string) => `snippets.valores.${id}`;

export function leerValores(id: string): Record<string, string> {
  try {
    const guardado = JSON.parse(localStorage.getItem(claveValores(id)) ?? '{}') as unknown;
    return guardado && typeof guardado === 'object' ? (guardado as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function guardarValores(id: string, valores: Record<string, string>) {
  try {
    localStorage.setItem(claveValores(id), JSON.stringify(valores));
  } catch {
    // Solo se pierde la comodidad de no reescribirlos.
  }
}
