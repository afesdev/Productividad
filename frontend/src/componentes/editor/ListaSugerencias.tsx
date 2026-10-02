import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { unirClases, type Icono } from '../ui/primitivos';

export interface ElementoSugerencia {
  id: string;
  titulo: string;
  descripcion?: string;
  icono: Icono;
  grupo?: string;
}

export interface PropiedadesListaSugerencias {
  elementos: ElementoSugerencia[];
  alSeleccionar: (elemento: ElementoSugerencia) => void;
  vacio: string;
  cargando?: boolean;
}

export interface ManejadorTecladoSugerencias {
  alPresionarTecla: (evento: KeyboardEvent) => boolean;
}

/** Menú flotante del editor (comandos "/" y enlaces "[["): se navega con ↑ ↓ y se elige con Enter o Tab. */
export const ListaSugerencias = forwardRef<ManejadorTecladoSugerencias, PropiedadesListaSugerencias>(function ListaSugerencias(
  { elementos, alSeleccionar, vacio, cargando },
  referencia,
) {
  const [indice, setIndice] = useState(0);
  const referenciaLista = useRef<HTMLDivElement>(null);

  useEffect(() => setIndice(0), [elementos]);

  useEffect(() => {
    referenciaLista.current?.querySelector('[data-activo="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [indice]);

  useImperativeHandle(referencia, () => ({
    alPresionarTecla: (evento) => {
      if (elementos.length === 0) return false;
      if (evento.key === 'ArrowDown') {
        setIndice((actual) => (actual + 1) % elementos.length);
        return true;
      }
      if (evento.key === 'ArrowUp') {
        setIndice((actual) => (actual - 1 + elementos.length) % elementos.length);
        return true;
      }
      if (evento.key === 'Enter' || evento.key === 'Tab') {
        alSeleccionar(elementos[indice]);
        return true;
      }
      return false;
    },
  }));

  let grupoAnterior: string | undefined;

  return (
    <div ref={referenciaLista} className="max-h-80 w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-borde bg-superficie p-1.5 shadow-flotante">
      {elementos.length === 0 ? (
        <p className="px-3 py-2 text-sm text-texto-3">{cargando ? 'Buscando…' : vacio}</p>
      ) : (
        elementos.map((elemento, posicion) => {
          const mostrarGrupo = elemento.grupo && elemento.grupo !== grupoAnterior;
          grupoAnterior = elemento.grupo;
          const IconoElemento = elemento.icono;
          const activo = posicion === indice;
          return (
            <div key={elemento.id}>
              {mostrarGrupo && <p className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-texto-3">{elemento.grupo}</p>}
              <button
                type="button"
                data-activo={activo}
                onMouseEnter={() => setIndice(posicion)}
                onMouseDown={(evento) => {
                  // mousedown y no click: así el editor no pierde el foco antes de insertar.
                  evento.preventDefault();
                  alSeleccionar(elemento);
                }}
                className={unirClases('flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left', activo && 'bg-superficie-2')}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-md border border-borde bg-superficie text-texto-2">
                  <IconoElemento className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{elemento.titulo}</span>
                  {elemento.descripcion && <span className="block truncate text-xs text-texto-3">{elemento.descripcion}</span>}
                </span>
              </button>
            </div>
          );
        })
      )}
    </div>
  );
});
