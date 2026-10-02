import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Boton, unirClases } from './primitivos';

interface PropiedadesVista {
  titulo: string;
  descripcion?: string;
  alVolver: () => void;
  alEnviar: (evento: FormEvent) => void;
  textoEnviar: string;
  enviando?: boolean;
  /** Panel de propiedades. Con él, la vista se ensancha: contenido principal a la izquierda y panel fijo a la derecha. */
  lateral?: ReactNode;
  children: ReactNode;
}

/**
 * Vista completa para formularios largos: encabezado con "volver", cuerpo amplio y barra de acciones fija abajo.
 */
export function VistaFormulario({ titulo, descripcion, alVolver, alEnviar, textoEnviar, enviando, lateral, children }: PropiedadesVista) {
  const ancho = lateral ? 'max-w-6xl' : 'max-w-3xl';

  return (
    <form onSubmit={alEnviar} className={unirClases('mx-auto flex w-full flex-col gap-6 pb-24', ancho)}>
      <header className="flex items-start gap-3">
        <button
          type="button"
          onClick={alVolver}
          aria-label="Volver"
          className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-borde bg-superficie text-texto-2 shadow-tarjeta hover:text-texto"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          {descripcion && <p className="mt-1 text-sm text-texto-2">{descripcion}</p>}
        </div>
      </header>

      {lateral ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-5 rounded-xl border border-borde bg-superficie p-6 shadow-tarjeta">{children}</div>
          <aside className="flex flex-col gap-4 rounded-xl border border-borde bg-superficie p-5 shadow-tarjeta lg:sticky lg:top-4">{lateral}</aside>
        </div>
      ) : (
        <div className="flex flex-col gap-5 rounded-xl border border-borde bg-superficie p-6 shadow-tarjeta">{children}</div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-borde bg-superficie/90 backdrop-blur">
        <div className={unirClases('mx-auto flex justify-end gap-2 px-4 py-3', ancho)}>
          <Boton type="button" variante="secundario" onClick={alVolver}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={enviando}>
            {textoEnviar}
          </Boton>
        </div>
      </div>
    </form>
  );
}
