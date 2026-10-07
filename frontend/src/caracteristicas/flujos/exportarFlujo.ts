import { toPng, toSvg } from 'html-to-image';
import { getNodesBounds, type Node } from '@xyflow/react';
import type { ContenidoFlujo, TipoPaso } from './modelo';

const Margen = 48;

/** Nombre de archivo seguro a partir del título del flujo. */
export const nombreArchivo = (titulo: string, extension: string) =>
  `${(titulo.trim() || 'flujo').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120)}.${extension}`;

function descargar(url: string, nombre: string) {
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
}

/**
 * Imagen del diagrama completo (no solo lo visible): se renderiza el viewport de React Flow con zoom 1 y desplazado
 * para que quepan todos los pasos. PNG a doble resolución para que se lea nítido en documentos.
 */
export async function exportarImagen(contenedor: HTMLElement, nodos: Node[], formato: 'png' | 'svg', titulo: string) {
  const viewport = contenedor.querySelector<HTMLElement>('.react-flow__viewport');
  if (!viewport || nodos.length === 0) return;
  const limites = getNodesBounds(nodos);
  const ancho = Math.ceil(limites.width + Margen * 2);
  const alto = Math.ceil(limites.height + Margen * 2);
  const opciones = {
    backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff',
    width: ancho,
    height: alto,
    style: {
      width: `${ancho}px`,
      height: `${alto}px`,
      transform: `translate(${Margen - limites.x}px, ${Margen - limites.y}px) scale(1)`,
    },
  };
  const url = formato === 'png' ? await toPng(viewport, { ...opciones, pixelRatio: 2 }) : await toSvg(viewport, opciones);
  descargar(url, nombreArchivo(titulo, formato));
}

/** Forma de Mermaid por tipo de paso (`id` + apertura/cierre). */
const formaMermaid: Record<TipoPaso, [string, string]> = {
  inicio: ['(["', '"])'],
  fin: ['(["', '"])'],
  usuario: ['["', '"]'],
  vista: ['[/"', '"/]'],
  validacion: ['{"', '"}'],
  sp: ['[("', '")]'],
  api: ['[["', '"]]'],
  externo: ['>"', '"]'],
  proceso: ['["', '"]'],
  salida: ['[\\"', '"\\]'],
  error: ['(["', '"])'],
};

const coloresMermaid: Record<TipoPaso, string> = {
  inicio: 'fill:#f4f4f5,stroke:#a1a1aa',
  usuario: 'fill:#f5f3ff,stroke:#a78bfa',
  vista: 'fill:#f0f9ff,stroke:#38bdf8',
  validacion: 'fill:#fffbeb,stroke:#f59e0b',
  sp: 'fill:#eef2ff,stroke:#818cf8',
  api: 'fill:#f0fdfa,stroke:#2dd4bf',
  externo: 'fill:#fafafa,stroke:#a1a1aa',
  proceso: 'fill:#ffffff,stroke:#d4d4d8',
  salida: 'fill:#fdf2f8,stroke:#f472b6',
  error: 'fill:#fff1f2,stroke:#fb7185',
  fin: 'fill:#ecfdf5,stroke:#34d399',
};

const textoMermaid = (texto: string) => texto.replace(/"/g, '#quot;').replace(/[\r\n]+/g, ' ').trim();

/** Diagrama Mermaid (flowchart) para pegar en un documento dentro de un bloque ```mermaid. */
export function aMermaid(contenido: ContenidoFlujo, modoTecnico: boolean): string {
  const ids = new Map(contenido.nodos.map((nodo, indice) => [nodo.id, `p${indice + 1}`]));
  const lineas = [`flowchart ${contenido.direccion === 'RIGHT' ? 'LR' : 'TD'}`];
  for (const nodo of contenido.nodos) {
    const [abre, cierra] = formaMermaid[nodo.tipo];
    const etiqueta = modoTecnico && nodo.tecnico ? `${textoMermaid(nodo.titulo)}<br/><i>${textoMermaid(nodo.tecnico)}</i>` : textoMermaid(nodo.titulo);
    lineas.push(`  ${ids.get(nodo.id)}${abre}${etiqueta}${cierra}`);
  }
  for (const conexion of contenido.conexiones) {
    const etiqueta = conexion.etiqueta?.replace(/\|/g, '/').trim();
    lineas.push(`  ${ids.get(conexion.origen)} -->${etiqueta ? `|${textoMermaid(etiqueta)}|` : ''} ${ids.get(conexion.destino)}`);
  }
  const usados = new Set(contenido.nodos.map((nodo) => nodo.tipo));
  for (const tipo of usados) {
    lineas.push(`  classDef ${tipo} ${coloresMermaid[tipo]},color:#18181b`);
    lineas.push(`  class ${contenido.nodos.filter((nodo) => nodo.tipo === tipo).map((nodo) => ids.get(nodo.id)).join(',')} ${tipo}`);
  }
  return lineas.join('\n');
}
