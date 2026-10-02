import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { dibujarMermaid, olvidarDiagrama } from './mermaid';

/**
 * Bloque de código con resaltado (lowlight). Si el lenguaje es "mermaid", dibuja el diagrama debajo del código
 * mientras se escribe. Se guarda como bloque ```mermaid estándar (GitHub también lo dibuja).
 */
export const BloqueCodigo = CodeBlockLowlight.extend({
  addNodeView() {
    return ({ node }) => {
      let actual = node;
      let ultimoDibujado: string | null = null;
      let temporizador: number | undefined;

      const dom = document.createElement('div');
      dom.className = 'bloque-codigo';
      const pre = document.createElement('pre');
      const codigo = document.createElement('code');
      pre.append(codigo);
      const diagrama = document.createElement('div');
      diagrama.className = 'diagrama-mermaid';
      diagrama.contentEditable = 'false';
      dom.append(pre, diagrama);

      const pintar = () => {
        const lenguaje = actual.attrs.language as string | null;
        codigo.className = lenguaje ? `language-${lenguaje}` : '';
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
        ignoreMutation: (mutacion) => diagrama.contains(mutacion.target as Node),
        destroy: () => {
          window.clearTimeout(temporizador);
          olvidarDiagrama(diagrama);
        },
      };
    };
  },
});
