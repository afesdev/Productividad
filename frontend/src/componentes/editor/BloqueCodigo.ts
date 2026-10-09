import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Fragment } from '@tiptap/pm/model';
import { BloqueVivo } from '../bloquesVivos/BloqueVivo';
import { esBloqueVivo } from '../bloquesVivos/formato';
import { solicitarBloqueVivo } from '../bloquesVivos/ModalBloqueVivo';
import { dibujarMermaid, olvidarDiagrama } from './mermaid';

/**
 * Bloque de código con resaltado (lowlight). Si el lenguaje es "mermaid", dibuja el diagrama debajo del código
 * mientras se escribe. Si es un bloque vivo (```flujo, ```tickets…), muestra la tarjeta con el contenido incrustado y
 * oculta el código (se puede ver con el botón </>). Todo se guarda como bloque de código Markdown estándar.
 */
export const BloqueCodigo = CodeBlockLowlight.extend({
  addNodeView() {
    return ({ node, editor, getPos }) => {
      let actual = node;
      let ultimoDibujado: string | null = null;
      let temporizador: number | undefined;
      let raiz: Root | null = null;

      const dom = document.createElement('div');
      dom.className = 'bloque-codigo';
      const pre = document.createElement('pre');
      const codigo = document.createElement('code');
      pre.append(codigo);
      const diagrama = document.createElement('div');
      diagrama.className = 'diagrama-mermaid';
      diagrama.contentEditable = 'false';
      const vivo = document.createElement('div');
      vivo.className = 'bloque-vivo-contenedor';
      vivo.contentEditable = 'false';
      dom.append(vivo, pre, diagrama);

      /** Reemplaza el texto del bloque (lo que devuelve el selector de "Configurar"). */
      const reemplazarContenido = (texto: string) => {
        const posicion = typeof getPos === 'function' ? getPos() : undefined;
        if (typeof posicion !== 'number') return;
        editor
          .chain()
          .command(({ tr, state }) => {
            const nodo = state.doc.nodeAt(posicion);
            if (!nodo) return false;
            tr.replaceWith(posicion + 1, posicion + nodo.nodeSize - 1, texto ? state.schema.text(texto) : Fragment.empty);
            return true;
          })
          .run();
      };

      const pintarVivo = (lenguaje: string) => {
        if (!esBloqueVivo(lenguaje)) {
          if (raiz) {
            const anterior = raiz;
            raiz = null;
            window.setTimeout(() => anterior.unmount());
          }
          return;
        }
        raiz ??= createRoot(vivo);
        const editable = editor.isEditable;
        const destino = raiz;
        // Tiptap crea las vistas de nodo mientras React renderiza el editor: se pinta en el siguiente microtick.
        queueMicrotask(() => destino.render(
          createElement(BloqueVivo, {
            tipo: lenguaje,
            contenido: actual.textContent,
            alConfigurar: editable
              ? () => void solicitarBloqueVivo(lenguaje, actual.textContent).then((texto) => texto !== null && reemplazarContenido(texto))
              : undefined,
            alVerCodigo: editable ? () => dom.classList.toggle('ver-codigo') : undefined,
          }),
        ));
      };

      const pintar = () => {
        const lenguaje = actual.attrs.language as string | null;
        codigo.className = lenguaje ? `language-${lenguaje}` : '';
        dom.classList.toggle('es-vivo', esBloqueVivo(lenguaje));
        pintarVivo(lenguaje ?? '');

        const esMermaid = lenguaje === 'mermaid';
        dom.classList.toggle('es-mermaid', esMermaid);
        if (!esMermaid) {
          diagrama.replaceChildren();
          olvidarDiagrama(diagrama);
          ultimoDibujado = null;
          return;
        }
        const texto = actual.textContent;
        if (texto === ultimoDibujado) return;
        ultimoDibujado = texto;
        window.clearTimeout(temporizador);
        temporizador = window.setTimeout(() => void dibujarMermaid(diagrama, texto), 400);
      };
      pintar();

      return {
        dom,
        contentDOM: codigo,
        update: (nuevo) => {
          if (nuevo.type !== actual.type) return false;
          actual = nuevo;
          pintar();
          return true;
        },
        // Lo que pasa dentro de la tarjeta viva (clics, enlaces, zoom del flujo) no es edición del documento.
        stopEvent: (evento) => vivo.contains(evento.target as Node),
        ignoreMutation: (mutacion) => diagrama.contains(mutacion.target as Node) || vivo.contains(mutacion.target as Node),
        destroy: () => {
          window.clearTimeout(temporizador);
          olvidarDiagrama(diagrama);
          // Desmontar en el siguiente ciclo: React no permite desmontar una raíz mientras está renderizando.
          const pendiente = raiz;
          raiz = null;
          if (pendiente) window.setTimeout(() => pendiente.unmount());
        },
      };
    };
  },
});
