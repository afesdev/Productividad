import { useEffect, useRef, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { configuracionCallout, type TipoCallout } from './editor/BloquesDocumentacion';
import { dibujarMermaid, olvidarDiagrama } from './editor/mermaid';
import { repararMarkdown } from './editor/repararMarkdown';
import { rehypeTablasHtml } from './editor/tablaHtml';

/** Nodo HAST mínimo (el árbol HTML que react-markdown genera antes de renderizar). */
interface NodoHast {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: NodoHast[];
}

const tipoPorMarca: Record<string, TipoCallout> = { NOTE: 'nota', IMPORTANT: 'nota', TIP: 'tip', WARNING: 'advertencia', CAUTION: 'peligro' };

/**
 * Convierte "> [!NOTE] …" en callouts y "> [!DETALLES]- Título" en <details>, igual que el editor.
 * Solo reorganiza nodos existentes (texto, no HTML), así que sigue sin haber riesgo de XSS.
 */
function rehypeBloquesDocumentacion() {
  const recorrer = (nodo: NodoHast) => {
    nodo.children?.forEach(recorrer);
    if (nodo.type !== 'element' || nodo.tagName !== 'blockquote') return;
    const parrafo = nodo.children?.find((hijo) => hijo.type === 'element');
    const texto = parrafo?.tagName === 'p' ? parrafo.children?.[0] : undefined;
    if (!parrafo || texto?.type !== 'text') return;
    const coincidencia = /^\s*\[!([A-Za-z]+)\]-?[ \t]*([^\n]*)\n?/.exec(texto.value ?? '');
    if (!coincidencia) return;
    const marca = coincidencia[1].toUpperCase();
    const tipo = tipoPorMarca[marca];
    if (!tipo && marca !== 'DETALLES') return;

    texto.value = (texto.value ?? '').slice(coincidencia[0].length);
    if (!texto.value && parrafo.children?.[1]?.tagName === 'br') parrafo.children.splice(1, 1);
    const hijos = (nodo.children ?? []).filter((hijo) => hijo !== parrafo || (parrafo.children ?? []).some((h) => h.type !== 'text' || h.value?.trim()));

    if (tipo) {
      const { icono, etiqueta } = configuracionCallout[tipo];
      nodo.tagName = 'div';
      nodo.properties = { className: ['callout'], dataCallout: tipo };
      nodo.children = [{ type: 'element', tagName: 'div', properties: { className: ['callout-cabecera'] }, children: [{ type: 'text', value: `${icono} ${etiqueta}` }] }, ...hijos];
    } else {
      nodo.tagName = 'details';
      nodo.properties = { className: ['desplegable'] };
      nodo.children = [{ type: 'element', tagName: 'summary', properties: {}, children: [{ type: 'text', value: coincidencia[2].trim() || 'Detalles' }] }, ...hijos];
    }
  };
  return (arbol: NodoHast) => recorrer(arbol);
}

const textoDe = (nodo?: NodoHast): string => (nodo?.type === 'text' ? (nodo.value ?? '') : (nodo?.children ?? []).map(textoDe).join(''));

function DiagramaMermaid({ codigo }: { codigo: string }) {
  const destino = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const elemento = destino.current;
    if (!elemento) return;
    void dibujarMermaid(elemento, codigo);
    return () => olvidarDiagrama(elemento);
  }, [codigo]);
  return <div ref={destino} className="diagrama-mermaid" role="img" aria-label="Diagrama" />;
}

/**
 * Renderiza Markdown (GFM). react-markdown ignora el HTML embebido; la única excepción son las tablas con celdas
 * combinadas, que rehypeTablasHtml reconstruye con lista blanca de etiquetas y atributos (sin riesgo de XSS).
 */
export function VistaMarkdown({ contenido }: { contenido: string }) {
  return (
    <div className="contenido-markdown text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeTablasHtml, rehypeBloquesDocumentacion]}
        components={{
          pre: ({ node, children }) => {
            const codigo = (node as NodoHast | undefined)?.children?.find((hijo) => hijo.tagName === 'code');
            const clases = codigo?.properties?.className;
            return Array.isArray(clases) && clases.includes('language-mermaid') ? (
              <DiagramaMermaid codigo={textoDe(codigo).trimEnd()} />
            ) : (
              <pre>{children as ReactNode}</pre>
            );
          },
        }}
      >
        {repararMarkdown(contenido)}
      </ReactMarkdown>
    </div>
  );
}
