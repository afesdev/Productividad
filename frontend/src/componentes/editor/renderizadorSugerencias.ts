import { ReactRenderer } from '@tiptap/react';
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import { computePosition, offset, shift } from '@floating-ui/dom';
import { ListaSugerencias, type ElementoSugerencia, type ManejadorTecladoSugerencias, type PropiedadesListaSugerencias } from './ListaSugerencias';

const AltoMaximoLista = 320;
const AltoMinimoLista = 120;
const MargenPantalla = 8;
const Separacion = 6;

/**
 * Posiciona el menú junto al cursor: abajo si cabe completo; si no, del lado con más espacio (arriba al escribir
 * al final de la página). Se decide con la altura del contenido (scrollHeight), no con la ya recortada, y se mide
 * en el siguiente cuadro porque al crearse React aún no pintó la lista. La altura se ajusta al espacio del lado elegido.
 */
function posicionar(elemento: HTMLElement, obtenerRectangulo: (() => DOMRect | null) | null | undefined) {
  requestAnimationFrame(() => {
    const rectangulo = obtenerRectangulo?.();
    if (!rectangulo || !elemento.isConnected) return;
    const lista = elemento.firstElementChild as HTMLElement | null;
    const altoContenido = Math.min(AltoMaximoLista, lista?.scrollHeight || AltoMaximoLista);
    const espacioAbajo = window.innerHeight - rectangulo.bottom - Separacion - MargenPantalla;
    const espacioArriba = rectangulo.top - Separacion - MargenPantalla;
    const haciaArriba = espacioAbajo < altoContenido && espacioArriba > espacioAbajo;
    if (lista) lista.style.maxHeight = `${Math.max(AltoMinimoLista, Math.min(altoContenido, haciaArriba ? espacioArriba : espacioAbajo))}px`;

    void computePosition({ getBoundingClientRect: () => rectangulo }, elemento, {
      placement: haciaArriba ? 'top-start' : 'bottom-start',
      strategy: 'fixed',
      middleware: [offset(Separacion), shift({ padding: MargenPantalla })],
    }).then(({ x, y }) => {
      elemento.style.left = `${x}px`;
      elemento.style.top = `${y}px`;
    });
  });
}

/**
 * Crea el "render" de una sugerencia de Tiptap que muestra ListaSugerencias en un portal flotante.
 * Lo usan el menú de comandos ("/") y el autocompletado de WikiLinks ("[[").
 */
export function crearRenderizadorSugerencias<T extends ElementoSugerencia>(vacio: string): SuggestionOptions<T>['render'] {
  return () => {
    let componente: ReactRenderer<ManejadorTecladoSugerencias, PropiedadesListaSugerencias> | null = null;

    const propiedades = (props: SuggestionProps<T>): PropiedadesListaSugerencias => ({
      elementos: props.items,
      alSeleccionar: (elemento) => props.command(elemento as T),
      vacio,
    });

    return {
      onStart: (props) => {
        componente = new ReactRenderer(ListaSugerencias, { props: propiedades(props), editor: props.editor });
        const elemento = componente.element as HTMLElement;
        elemento.style.position = 'fixed';
        elemento.style.zIndex = '60';
        document.body.appendChild(elemento);
        posicionar(elemento, props.clientRect);
      },
      onUpdate: (props) => {
        componente?.updateProps(propiedades(props));
        if (componente) posicionar(componente.element as HTMLElement, props.clientRect);
      },
      onKeyDown: ({ event }) => {
        if (event.key === 'Escape') {
          (componente?.element as HTMLElement | undefined)?.remove();
          return true;
        }
        return componente?.ref?.alPresionarTecla(event) ?? false;
      },
      onExit: () => {
        (componente?.element as HTMLElement | undefined)?.remove();
        componente?.destroy();
        componente = null;
      },
    };
  };
}
