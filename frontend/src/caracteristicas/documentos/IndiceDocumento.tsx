import { useEffect, useState } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import { unirClases } from '../../componentes/ui/primitivos';

interface Encabezado {
  nivel: number;
  texto: string;
  posicion: number;
}

/** Índice lateral con los títulos del documento; resalta la sección visible y salta a ella al pulsar. */
export function IndiceDocumento({ editor }: { editor: Editor }) {
  const encabezados = useEditorState({
    editor,
    selector: ({ editor: actual }) => {
      const lista: Encabezado[] = [];
      actual.state.doc.descendants((nodo, posicion) => {
        if (nodo.type.name === 'heading' && nodo.textContent.trim()) {
          lista.push({ nivel: nodo.attrs.level as number, texto: nodo.textContent.trim(), posicion });
        }
        return nodo.type.name !== 'heading'; // no hace falta entrar en los títulos
      });
      return lista;
    },
  });

  const [activo, setActivo] = useState<number | null>(null);

  useEffect(() => {
    if (encabezados.length === 0) return;
    const alDesplazar = () => {
      let actual: number | null = null;
      for (const encabezado of encabezados) {
        const elemento = editor.view.nodeDOM(encabezado.posicion) as HTMLElement | null;
        if (elemento && elemento.getBoundingClientRect().top < 140) actual = encabezado.posicion;
      }
      setActivo(actual ?? encabezados[0].posicion);
    };
    alDesplazar();
    window.addEventListener('scroll', alDesplazar, { passive: true });
    return () => window.removeEventListener('scroll', alDesplazar);
  }, [editor, encabezados]);

  if (encabezados.length === 0) {
    return <p className="px-2 text-xs leading-relaxed text-texto-3">Usa títulos (/ Título 1, 2, 3) y aparecerán aquí.</p>;
  }

  const nivelMinimo = Math.min(...encabezados.map((encabezado) => encabezado.nivel));

  return (
    <ul className="flex flex-col border-l border-borde">
      {encabezados.map((encabezado) => (
        <li key={`${encabezado.posicion}-${encabezado.texto}`}>
          <button
            type="button"
            onClick={() => {
              const elemento = editor.view.nodeDOM(encabezado.posicion) as HTMLElement | null;
              elemento?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              editor.commands.setTextSelection(encabezado.posicion + 1);
            }}
            style={{ paddingLeft: `${0.75 + (encabezado.nivel - nivelMinimo) * 0.75}rem` }}
            className={unirClases(
              '-ml-px block w-full truncate border-l py-1 pr-2 text-left text-[13px] transition-colors',
              activo === encabezado.posicion ? 'border-texto font-medium text-texto' : 'border-transparent text-texto-3 hover:text-texto-2',
            )}
          >
            {encabezado.texto}
          </button>
        </li>
      ))}
    </ul>
  );
}
