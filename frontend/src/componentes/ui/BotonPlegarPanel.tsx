import { ChevronLeft, ChevronRight } from 'lucide-react';
import { unirClases } from './primitivos';

/**
 * Botón redondo que flota sobre el borde derecho de un panel lateral para plegarlo o desplegarlo.
 * El contenedor debe ser `relative` y no recortar el desbordamiento (sin overflow-hidden).
 */
export function BotonPlegarPanel({ plegado, alAlternar, etiqueta, className }: { plegado: boolean; alAlternar: () => void; etiqueta: string; className?: string }) {
  const texto = `${plegado ? 'Expandir' : 'Recoger'} ${etiqueta}`;
  return (
    <button
      type="button"
      onClick={alAlternar}
      aria-label={texto}
      aria-expanded={!plegado}
      title={texto}
      className={unirClases(
        'absolute -right-3 z-10 grid size-6 place-items-center rounded-full border border-borde bg-superficie text-texto-3 shadow-tarjeta transition hover:border-borde-fuerte hover:text-texto',
        className,
      )}
    >
      {plegado ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
    </button>
  );
}
