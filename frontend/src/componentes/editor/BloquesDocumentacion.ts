import { Node, mergeAttributes } from '@tiptap/core';
import type { Node as NodoPM } from '@tiptap/pm/model';

/**
 * Bloques para documentación técnica. Se guardan como Markdown estándar:
 * - Callout: alerta de GitHub ("> [!NOTE]", "> [!TIP]", "> [!WARNING]", "> [!CAUTION]").
 * - Desplegable: "> [!DETALLES]- Título" (sintaxis de callout plegable de Obsidian).
 * Al cargar, los blockquote con esa marca se convierten en el bloque correspondiente.
 */

export type TipoCallout = 'nota' | 'tip' | 'advertencia' | 'peligro';

export const configuracionCallout: Record<TipoCallout, { marca: string; etiqueta: string; icono: string }> = {
  nota: { marca: 'NOTE', etiqueta: 'Nota', icono: 'ℹ️' },
  tip: { marca: 'TIP', etiqueta: 'Consejo', icono: '💡' },
  advertencia: { marca: 'WARNING', etiqueta: 'Advertencia', icono: '⚠️' },
  peligro: { marca: 'CAUTION', etiqueta: 'Peligro', icono: '⛔' },
};

const tiposCallout = Object.keys(configuracionCallout) as TipoCallout[];
const tipoPorMarca: Record<string, TipoCallout> = { NOTE: 'nota', IMPORTANT: 'nota', TIP: 'tip', WARNING: 'advertencia', CAUTION: 'peligro' };
const MarcaDesplegable = 'DETALLES';

interface EstadoSerializador {
  wrapBlock: (delimitador: string, primero: string | null, nodo: NodoPM, contenido: () => void) => void;
  write: (texto: string) => void;
  ensureNewLine: () => void;
  renderContent: (nodo: NodoPM) => void;
}

/** Quita la marca "[!XXX]" (y el título en la misma línea) del primer párrafo de un blockquote ya convertido a HTML. */
function extraerMarca(cita: Element): { marca: string; resto: string } | null {
  const parrafo = cita.firstElementChild;
  if (!parrafo || parrafo.tagName !== 'P') return null;
  const primerTexto = parrafo.firstChild;
  if (!primerTexto || primerTexto.nodeType !== 3) return null;
  const coincidencia = /^\s*\[!([A-Za-z]+)\]-?[ \t]*([^\n]*)\n?/.exec(primerTexto.textContent ?? '');
  if (!coincidencia) return null;
  primerTexto.textContent = (primerTexto.textContent ?? '').slice(coincidencia[0].length);
  // Un salto <br> justo después de la marca también sobra.
  if (!primerTexto.textContent && primerTexto.nextSibling?.nodeName === 'BR') primerTexto.nextSibling.remove();
  if (!parrafo.textContent?.trim() && !parrafo.querySelector('img')) parrafo.remove();
  return { marca: coincidencia[1].toUpperCase(), resto: coincidencia[2].trim() };
}

function convertirCitas(raiz: Element) {
  // De adentro hacia afuera para que los bloques anidados también se conviertan.
  const citas = Array.from(raiz.querySelectorAll('blockquote')).reverse();
  for (const cita of citas) {
    const marca = extraerMarca(cita);
    if (!marca) continue;
    const bloque = cita.ownerDocument.createElement('div');
    if (marca.marca === MarcaDesplegable) {
      bloque.setAttribute('data-desplegable', '');
      bloque.setAttribute('data-titulo', marca.resto);
    } else if (tipoPorMarca[marca.marca]) {
      bloque.setAttribute('data-callout', tipoPorMarca[marca.marca]);
    } else {
      continue;
    }
    while (cita.firstChild) bloque.appendChild(cita.firstChild);
    if (!bloque.firstElementChild) bloque.appendChild(cita.ownerDocument.createElement('p'));
    cita.replaceWith(bloque);
  }
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      tipo: {
        default: 'nota' as TipoCallout,
        parseHTML: (elemento) => (tiposCallout.includes(elemento.getAttribute('data-callout') as TipoCallout) ? elemento.getAttribute('data-callout') : 'nota'),
        renderHTML: (atributos) => ({ 'data-callout': atributos.tipo }),
      },
    };
  },

  parseHTML: () => [{ tag: 'div[data-callout]' }],

  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { class: 'callout' }), 0],

  addStorage() {
    return {
      markdown: {
        serialize(estado: EstadoSerializador, nodo: NodoPM) {
          estado.wrapBlock('> ', null, nodo, () => {
            estado.write(`[!${configuracionCallout[nodo.attrs.tipo as TipoCallout].marca}]`);
            estado.ensureNewLine();
            estado.renderContent(nodo);
          });
        },
        parse: { updateDOM: convertirCitas },
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let actual = node;
      const dom = document.createElement('div');
      dom.className = 'callout';
      const cabecera = document.createElement('button');
      cabecera.type = 'button';
      cabecera.contentEditable = 'false';
      cabecera.className = 'callout-cabecera';
      const cuerpo = document.createElement('div');
      cuerpo.className = 'callout-cuerpo';
      dom.append(cabecera, cuerpo);

      const pintar = () => {
        const tipo = actual.attrs.tipo as TipoCallout;
        dom.setAttribute('data-callout', tipo);
        const { icono, etiqueta } = configuracionCallout[tipo];
        cabecera.textContent = `${icono} ${etiqueta}`;
        cabecera.title = editor.isEditable ? 'Clic para cambiar el tipo' : etiqueta;
      };
      pintar();

      cabecera.addEventListener('mousedown', (evento) => evento.preventDefault());
      cabecera.addEventListener('click', () => {
        const posicion = typeof getPos === 'function' ? getPos() : undefined;
        if (!editor.isEditable || posicion === undefined) return;
        const siguiente = tiposCallout[(tiposCallout.indexOf(actual.attrs.tipo as TipoCallout) + 1) % tiposCallout.length];
        editor.view.dispatch(editor.state.tr.setNodeMarkup(posicion, undefined, { ...actual.attrs, tipo: siguiente }));
      });

      return {
        dom,
        contentDOM: cuerpo,
        update: (nuevo) => {
          if (nuevo.type !== actual.type) return false;
          actual = nuevo;
          pintar();
          return true;
        },
        ignoreMutation: (mutacion) => cabecera.contains(mutacion.target as globalThis.Node),
      };
    };
  },
});

export const Desplegable = Node.create({
  name: 'desplegable',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      titulo: {
        default: '',
        parseHTML: (elemento) => elemento.getAttribute('data-titulo') ?? '',
        renderHTML: (atributos) => ({ 'data-titulo': atributos.titulo }),
      },
    };
  },

  parseHTML: () => [{ tag: 'div[data-desplegable]' }],

  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-desplegable': '', class: 'desplegable' }), 0],

  addStorage() {
    return {
      markdown: {
        serialize(estado: EstadoSerializador, nodo: NodoPM) {
          estado.wrapBlock('> ', null, nodo, () => {
            estado.write(`[!${MarcaDesplegable}]- ${String(nodo.attrs.titulo ?? '').replace(/\n/g, ' ').trim() || 'Detalles'}`);
            estado.ensureNewLine();
            estado.renderContent(nodo);
          });
        },
        // La conversión la hace Callout.parse (comparten la sintaxis de blockquote).
        parse: {},
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let actual = node;
      const dom = document.createElement('div');
      dom.className = 'desplegable abierto';
      const cabecera = document.createElement('div');
      cabecera.className = 'desplegable-cabecera';
      cabecera.contentEditable = 'false';
      const flecha = document.createElement('button');
      flecha.type = 'button';
      flecha.className = 'desplegable-flecha';
      flecha.setAttribute('aria-label', 'Abrir o cerrar');
      flecha.textContent = '▸';
      const titulo = document.createElement('input');
      titulo.className = 'desplegable-titulo';
      titulo.placeholder = 'Título del desplegable';
      titulo.value = actual.attrs.titulo;
      titulo.readOnly = !editor.isEditable;
      cabecera.append(flecha, titulo);
      const cuerpo = document.createElement('div');
      cuerpo.className = 'desplegable-cuerpo';
      dom.append(cabecera, cuerpo);

      flecha.addEventListener('mousedown', (evento) => evento.preventDefault());
      flecha.addEventListener('click', () => dom.classList.toggle('abierto'));
      titulo.addEventListener('input', () => {
        const posicion = typeof getPos === 'function' ? getPos() : undefined;
        if (posicion === undefined) return;
        editor.view.dispatch(editor.state.tr.setNodeMarkup(posicion, undefined, { ...actual.attrs, titulo: titulo.value }));
      });
      titulo.addEventListener('keydown', (evento) => {
        // Enter baja al contenido en lugar de insertar un salto en el título.
        if (evento.key !== 'Enter') return;
        evento.preventDefault();
        const posicion = typeof getPos === 'function' ? getPos() : undefined;
        if (posicion !== undefined) editor.chain().focus(posicion + 2).run();
      });

      return {
        dom,
        contentDOM: cuerpo,
        update: (nuevo) => {
          if (nuevo.type !== actual.type) return false;
          actual = nuevo;
          if (document.activeElement !== titulo) titulo.value = nuevo.attrs.titulo;
          titulo.readOnly = !editor.isEditable;
          return true;
        },
        stopEvent: (evento) => cabecera.contains(evento.target as globalThis.Node),
        // Abrir/cerrar cambia la clase del contenedor: si ProseMirror lo tomara como edición, redibujaría el bloque (abierto).
        ignoreMutation: (mutacion) =>
          cabecera.contains(mutacion.target as globalThis.Node) || (mutacion.type === 'attributes' && mutacion.target === dom),
      };
    };
  },
});
