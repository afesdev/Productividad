import { DOMSerializer, type Node as NodoProseMirror } from '@tiptap/pm/model';

/**
 * Tablas con celdas combinadas. GFM no tiene colspan/rowspan, así que esas tablas se guardan como un bloque
 * <table> en una sola línea dentro del Markdown; las demás siguen siendo tablas GFM.
 */

/** true si alguna celda abarca más de una columna o fila. */
export function tieneCeldasCombinadas(tabla: NodoProseMirror): boolean {
  let combinada = false;
  tabla.descendants((nodo) => {
    if (combinada) return false;
    if (((nodo.attrs.colspan as number | undefined) ?? 1) > 1 || ((nodo.attrs.rowspan as number | undefined) ?? 1) > 1) combinada = true;
    return !combinada;
  });
  return combinada;
}

/**
 * HTML de la tabla en una sola línea: un bloque HTML de Markdown termina en la primera línea en blanco,
 * así que los saltos (p. ej. de un bloque de código en una celda) se escriben como &#10;.
 */
export function serializarTablaHtml(tabla: NodoProseMirror): string {
  const elemento = DOMSerializer.fromSchema(tabla.type.schema).serializeNode(tabla) as HTMLElement;
  const raiz = elemento.tagName === 'TABLE' ? elemento : (elemento.querySelector('table') ?? elemento);
  raiz.querySelectorAll('colgroup').forEach((grupo) => grupo.remove());
  [raiz, ...Array.from(raiz.querySelectorAll('*'))].forEach((nodo) => {
    nodo.removeAttribute('style');
    nodo.removeAttribute('class');
    if (nodo.getAttribute('colspan') === '1') nodo.removeAttribute('colspan');
    if (nodo.getAttribute('rowspan') === '1') nodo.removeAttribute('rowspan');
  });
  return raiz.outerHTML.replace(/\r?\n/g, '&#10;');
}

type EstadoBloque = {
  src: string;
  bMarks: number[];
  eMarks: number[];
  tShift: number[];
  sCount: number[];
  blkIndent: number;
  line: number;
  push: (tipo: string, etiqueta: string, anidamiento: number) => { content: string; map: [number, number] | null };
  getLines: (inicio: number, fin: number, sangria: number, conSalto: boolean) => string;
};
type MarkdownIt = { block: { ruler: { before: (antes: string, nombre: string, regla: (estado: EstadoBloque, inicio: number, fin: number, silencioso: boolean) => boolean) => void } } };

const instanciasConRegla = new WeakSet<object>();

/**
 * El editor usa markdown-it con html desactivado (el HTML suelto se ve como texto). Esta regla solo deja pasar
 * bloques que empiezan por <table> y los entrega como HTML; Tiptap los reconstruye con su esquema, que descarta
 * cualquier etiqueta o atributo que no conozca.
 */
export function registrarReglaTablaHtml(md: MarkdownIt) {
  if (instanciasConRegla.has(md)) return;
  instanciasConRegla.add(md);
  md.block.ruler.before('html_block', 'tabla_html', (estado, inicio, fin, silencioso) => {
    if (estado.sCount[inicio] - estado.blkIndent >= 4) return false;
    const linea = (numero: number) => estado.src.slice(estado.bMarks[numero] + estado.tShift[numero], estado.eMarks[numero]);
    if (!/^<table[\s>]/i.test(linea(inicio))) return false;
    let ultima = inicio;
    while (ultima < fin && !/<\/table>\s*$/i.test(linea(ultima))) ultima++;
    if (ultima >= fin) return false;
    if (silencioso) return true;
    estado.line = ultima + 1;
    const token = estado.push('html_block', '', 0);
    token.map = [inicio, estado.line];
    token.content = estado.getLines(inicio, estado.line, estado.blkIndent, true);
    return true;
  });
}

// ---------- Vista de solo lectura (react-markdown) ----------

interface NodoHast {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: NodoHast[];
}

const etiquetasPermitidas = new Set([
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'p', 'br', 'strong', 'b', 'em', 'i', 's', 'del', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'img', 'blockquote', 'h1', 'h2', 'h3',
]);

const urlSegura = (url: string | null) => (url && /^(https?:|mailto:|\/)/i.test(url.trim()) ? url.trim() : null);

/** Convierte el DOM (inerte, de DOMParser) a HAST con lista blanca de etiquetas y atributos: nada de scripts ni eventos. */
function aHast(nodo: ChildNode): NodoHast[] {
  if (nodo.nodeType === Node.TEXT_NODE) return [{ type: 'text', value: nodo.textContent ?? '' }];
  if (nodo.nodeType !== Node.ELEMENT_NODE) return [];
  const elemento = nodo as Element;
  const hijos = Array.from(elemento.childNodes).flatMap(aHast);
  const etiqueta = elemento.tagName.toLowerCase();
  if (!etiquetasPermitidas.has(etiqueta)) return hijos;

  const propiedades: Record<string, unknown> = {};
  for (const atributo of ['colspan', 'rowspan'] as const) {
    const valor = Number(elemento.getAttribute(atributo));
    if (Number.isInteger(valor) && valor > 1 && valor <= 100) propiedades[atributo === 'colspan' ? 'colSpan' : 'rowSpan'] = valor;
  }
  if (etiqueta === 'a') {
    const href = urlSegura(elemento.getAttribute('href'));
    if (href) Object.assign(propiedades, { href, target: '_blank', rel: 'noreferrer noopener' });
  }
  if (etiqueta === 'img') {
    const src = urlSegura(elemento.getAttribute('src'));
    if (!src) return [];
    Object.assign(propiedades, { src, alt: elemento.getAttribute('alt') ?? '' });
  }
  return [{ type: 'element', tagName: etiqueta, properties: propiedades, children: hijos }];
}

/** Plugin rehype: los bloques HTML que son una <table> se muestran (saneados); el resto del HTML sigue ignorándose. */
export function rehypeTablasHtml() {
  const recorrer = (nodo: NodoHast) => {
    if (!nodo.children) return;
    nodo.children = nodo.children.flatMap((hijo) => {
      if (hijo.type === 'raw' && /^\s*<table[\s>]/i.test(hijo.value ?? '')) {
        const cuerpo = new DOMParser().parseFromString(hijo.value ?? '', 'text/html').body;
        return Array.from(cuerpo.childNodes).flatMap(aHast);
      }
      recorrer(hijo);
      return [hijo];
    });
  };
  return (arbol: NodoHast) => recorrer(arbol);
}
