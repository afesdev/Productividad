import type { ReactNode } from 'react';
import { common, createLowlight } from 'lowlight';

/** Instancia única de highlight.js (vía lowlight) con los lenguajes comunes: la usan el editor y el visor de diferencias. */
export const lowlight = createLowlight(common);

/** Extensión (o nombre) de archivo → lenguaje de highlight.js. */
const lenguajesPorExtension: Record<string, string> = {
  cs: 'csharp',
  csx: 'csharp',
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'xml',
  htm: 'xml',
  xml: 'xml',
  svg: 'xml',
  cshtml: 'xml',
  razor: 'xml',
  csproj: 'xml',
  props: 'xml',
  targets: 'xml',
  config: 'xml',
  sql: 'sql',
  py: 'python',
  java: 'java',
  kt: 'kotlin',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  vb: 'vbnet',
  md: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  sh: 'bash',
  bash: 'bash',
  ini: 'ini',
  toml: 'ini',
  graphql: 'graphql',
  gql: 'graphql',
  lua: 'lua',
  r: 'r',
};

export function lenguajeDeArchivo(rutaArchivo: string): string | null {
  const nombre = rutaArchivo.split('/').pop()?.toLowerCase() ?? '';
  if (nombre === 'makefile') return 'makefile';
  const extension = nombre.includes('.') ? nombre.split('.').pop()! : '';
  const lenguaje = lenguajesPorExtension[extension];
  return lenguaje && lowlight.registered(lenguaje) ? lenguaje : null;
}

// Árbol HAST mínimo que devuelve lowlight (solo elementos <span class="hljs-…"> y texto).
interface NodoTexto {
  type: 'text';
  value: string;
}
interface NodoElemento {
  type: 'element';
  properties?: { className?: string[] | string };
  children: NodoHast[];
}
type NodoHast = NodoTexto | NodoElemento | { type: string };

function aReact(nodos: NodoHast[], prefijo: string): ReactNode[] {
  return nodos.map((nodo, indice) => {
    const clave = `${prefijo}-${indice}`;
    if (nodo.type === 'text') return (nodo as NodoTexto).value;
    if (nodo.type !== 'element') return null;
    const elemento = nodo as NodoElemento;
    const clase = elemento.properties?.className;
    return (
      <span key={clave} className={Array.isArray(clase) ? clase.join(' ') : clase}>
        {aReact(elemento.children, clave)}
      </span>
    );
  });
}

/**
 * Colorea una línea de código. Se resalta línea a línea (los diffs llegan por fragmentos), así que
 * comentarios o cadenas de varias líneas pueden verse sin color en sus líneas intermedias.
 */
export function resaltarLinea(texto: string, lenguaje: string | null): ReactNode {
  if (!lenguaje || !texto) return texto;
  try {
    return aReact(lowlight.highlight(lenguaje, texto).children as NodoHast[], 'h');
  } catch {
    return texto;
  }
}
