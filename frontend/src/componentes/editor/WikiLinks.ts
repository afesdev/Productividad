import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as NodoProseMirror } from '@tiptap/pm/model';
import type { ElementoSugerencia } from './ListaSugerencias';
import { crearRenderizadorSugerencias } from './renderizadorSugerencias';

export interface DestinoWikiLink extends ElementoSugerencia {
  /** Texto que queda dentro de [[ ]]: WEB-105, TCK-1001 o el título del documento. */
  destino: string;
}

export interface OpcionesWikiLinks {
  buscar: (termino: string) => Promise<DestinoWikiLink[]>;
  /** Ctrl/⌘ + clic sobre un enlace [[...]]. */
  alAbrir: (destino: string) => void;
}

const expresionWikiLink = /\[\[([^[\]\n]+?)\]\]/g;
const clavePluginDecoraciones = new PluginKey<DecorationSet>('decoracionesWikiLinks');

/** Marca visualmente cada [[...]] del documento (fuera de bloques de código). El texto sigue siendo Markdown plano. */
function construirDecoraciones(documento: NodoProseMirror): DecorationSet {
  const decoraciones: Decoration[] = [];
  documento.descendants((nodo, posicion, padre) => {
    if (!nodo.isText || !nodo.text || padre?.type.spec.code) return;
    for (const coincidencia of nodo.text.matchAll(expresionWikiLink)) {
      const inicio = posicion + (coincidencia.index ?? 0);
      decoraciones.push(Decoration.inline(inicio, inicio + coincidencia[0].length, { class: 'wikilink', title: 'Ctrl + clic para abrir' }));
    }
  });
  return DecorationSet.create(documento, decoraciones);
}

export const WikiLinks = Extension.create<OpcionesWikiLinks>({
  name: 'wikiLinks',

  addOptions() {
    return { buscar: async () => [], alAbrir: () => undefined };
  },

  addProseMirrorPlugins() {
    const opciones = this.options;
    return [
      // Autocompletado al escribir "[[".
      Suggestion<DestinoWikiLink>({
        editor: this.editor,
        pluginKey: new PluginKey('sugerenciaWikiLinks'),
        char: '[[',
        allowSpaces: true,
        startOfLine: false,
        allow: ({ state, range }) =>
          !state.doc.resolve(range.from).parent.type.spec.code && !state.doc.textBetween(range.from, range.to).includes(']]'),
        items: ({ query }) => (query.trim().length === 0 ? [] : opciones.buscar(query.trim())),
        command: ({ editor, range, props }) => editor.chain().focus().insertContentAt(range, `[[${props.destino}]] `).run(),
        render: crearRenderizadorSugerencias<DestinoWikiLink>('Escribe para buscar tareas, tickets o páginas'),
      }),
      // Resaltado + Ctrl/⌘ clic para navegar.
      new Plugin<DecorationSet>({
        key: clavePluginDecoraciones,
        state: {
          init: (_, estado) => construirDecoraciones(estado.doc),
          apply: (transaccion, anterior) => (transaccion.docChanged ? construirDecoraciones(transaccion.doc) : anterior),
        },
        props: {
          decorations: (estado) => clavePluginDecoraciones.getState(estado),
          handleClick: (vista, posicion, evento) => {
            if (!evento.ctrlKey && !evento.metaKey) return false;
            const resuelta = vista.state.doc.resolve(posicion);
            const texto = resuelta.parent.textContent;
            const desplazamiento = resuelta.parentOffset;
            for (const coincidencia of texto.matchAll(expresionWikiLink)) {
              const inicio = coincidencia.index ?? 0;
              if (desplazamiento >= inicio && desplazamiento <= inicio + coincidencia[0].length) {
                opciones.alAbrir(coincidencia[1].split('|')[0].trim());
                return true;
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});
