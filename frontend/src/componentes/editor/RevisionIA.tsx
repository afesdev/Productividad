import { useEffect, useMemo, useRef, useState } from 'react';
import { diffWordsWithSpace } from 'diff';
import { Check, TriangleAlert } from 'lucide-react';
import type { AccionTextoIA } from '../../servicios/api';
import { Modal } from '../ui/Modal';
import { Boton, unirClases } from '../ui/primitivos';
import { VistaMarkdown } from '../VistaMarkdown';

export interface PropuestaIA {
  accion: AccionTextoIA;
  titulo: string;
  original: string;
  resultado: string;
}

type Solicitud = (propuesta: PropuestaIA) => Promise<boolean>;

// Lo registra ProveedorRevisionIA; transformarConIA no es un hook y lo llama desde fuera de React.
let solicitarRevision: Solicitud | null = null;

/** Muestra el antes/después y resuelve true si el usuario aplica la propuesta. */
export const revisarPropuestaIA: Solicitud = (propuesta) => (solicitarRevision ? solicitarRevision(propuesta) : Promise.resolve(true));

const contarPalabras = (texto: string) => texto.split(/\s+/).filter(Boolean).length;

export function ProveedorRevisionIA() {
  const [propuesta, setPropuesta] = useState<PropuestaIA | null>(null);
  const [pestana, setPestana] = useState<'cambios' | 'resultado'>('cambios');
  const resolver = useRef<(aplicar: boolean) => void>();

  useEffect(() => {
    solicitarRevision = (nueva) =>
      new Promise<boolean>((resolverPromesa) => {
        resolver.current = resolverPromesa;
        setPestana('cambios');
        setPropuesta(nueva);
      });
    return () => {
      solicitarRevision = null;
    };
  }, []);

  function responder(aplicar: boolean) {
    resolver.current?.(aplicar);
    resolver.current = undefined;
    setPropuesta(null);
  }

  const cambios = useMemo(() => (propuesta ? diffWordsWithSpace(propuesta.original, propuesta.resultado) : []), [propuesta]);
  const agregadas = cambios.filter((parte) => parte.added).reduce((total, parte) => total + contarPalabras(parte.value), 0);
  const quitadas = cambios.filter((parte) => parte.removed).reduce((total, parte) => total + contarPalabras(parte.value), 0);
  const palabrasOriginal = propuesta ? contarPalabras(propuesta.original) : 0;
  // Mejorar y corregir no deberían quitar contenido: se avisa si desaparece una parte apreciable del original.
  const quitoContenido = propuesta !== null && propuesta.accion !== 'Resumir' && quitadas - agregadas > Math.max(5, palabrasOriginal * 0.05);

  return (
    <Modal
      abierto={propuesta !== null}
      alCerrar={() => responder(false)}
      titulo={propuesta ? `${propuesta.titulo} · revisa antes de aplicar` : ''}
      ancho="xl"
      pie={
        <>
          <Boton variante="secundario" onClick={() => responder(false)}>
            Descartar
          </Boton>
          <Boton icono={Check} onClick={() => responder(true)} autoFocus>
            Aplicar cambios
          </Boton>
        </>
      }
    >
      {propuesta && (
        <div className="flex flex-col gap-3 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg bg-superficie-2 p-0.5 text-sm" role="tablist">
              {(['cambios', 'resultado'] as const).map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  role="tab"
                  aria-selected={pestana === opcion}
                  onClick={() => setPestana(opcion)}
                  className={unirClases('h-8 rounded-md px-3 font-medium transition-colors', pestana === opcion ? 'bg-superficie text-texto shadow-tarjeta' : 'text-texto-2 hover:text-texto')}
                >
                  {opcion === 'cambios' ? 'Cambios' : 'Resultado'}
                </button>
              ))}
            </div>
            <p className="flex items-center gap-3 text-xs tabular-nums">
              <span className="font-medium text-emerald-700">+{agregadas} palabras</span>
              <span className="font-medium text-red-700">−{quitadas} palabras</span>
            </p>
          </div>

          {quitoContenido && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              La IA quitó contenido del original. Revisa lo marcado en rojo antes de aplicar, o descarta la propuesta.
            </p>
          )}

          {pestana === 'cambios' ? (
            <div className="whitespace-pre-wrap break-words rounded-xl border border-borde bg-fondo p-4 font-mono text-[13px] leading-relaxed text-texto-2">
              {cambios.map((parte, indice) => (
                <span
                  key={indice}
                  className={unirClases(
                    parte.added && 'rounded-sm bg-emerald-100 text-emerald-900',
                    parte.removed && 'rounded-sm bg-red-100 text-red-800 line-through decoration-red-400',
                  )}
                >
                  {parte.value}
                </span>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-borde p-4">
              <VistaMarkdown contenido={propuesta.resultado} />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
