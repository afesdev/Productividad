import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { BotonIcono, unirClases } from './primitivos';

interface PropiedadesModal {
  abierto: boolean;
  alCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  /** Botones del pie (Cancelar / Guardar). */
  pie?: ReactNode;
  ancho?: 'sm' | 'md' | 'lg' | 'xl';
}

// Modales abiertos, del más antiguo al más reciente: Esc solo cierra el de arriba.
const pilaModales: symbol[] = [];

const clasesAncho = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

/**
 * Modal para formularios cortos. Formularios largos van en una vista completa (ver VistaFormulario).
 * Cierra con Esc o clic en el fondo, bloquea el scroll de la página y devuelve el foco al elemento anterior.
 */
export function Modal({ abierto, alCerrar, titulo, descripcion, children, pie, ancho = 'md' }: PropiedadesModal) {
  const referenciaPanel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const elementoPrevio = document.activeElement as HTMLElement | null;
    const desbordePrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const id = Symbol();
    pilaModales.push(id);

    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && pilaModales[pilaModales.length - 1] === id) {
        evento.stopPropagation();
        alCerrar();
      }
    };
    window.addEventListener('keydown', alPresionarTecla, true);

    // Enfoca el primer campo; si no hay, el panel.
    requestAnimationFrame(() => {
      const primerCampo = referenciaPanel.current?.querySelector<HTMLElement>('input, textarea, select');
      (primerCampo ?? referenciaPanel.current)?.focus();
    });

    return () => {
      window.removeEventListener('keydown', alPresionarTecla, true);
      pilaModales.splice(pilaModales.indexOf(id), 1);
      document.body.style.overflow = desbordePrevio;
      elementoPrevio?.focus?.();
    };
  }, [abierto, alCerrar]);

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onMouseDown={alCerrar}
          />
          <motion.div
            ref={referenciaPanel}
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            tabIndex={-1}
            className={unirClases(
              'relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-superficie shadow-flotante outline-none sm:rounded-2xl',
              clasesAncho[ancho],
            )}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <header className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
              <div>
                <h2 className="text-base font-semibold tracking-tight">{titulo}</h2>
                {descripcion && <p className="mt-1 text-sm text-texto-2">{descripcion}</p>}
              </div>
              <BotonIcono icono={X} etiqueta="Cerrar" tamano="sm" onClick={alCerrar} className="-mr-2 -mt-1" />
            </header>
            <div className="overflow-y-auto px-6 py-3">{children}</div>
            {pie && <footer className="flex justify-end gap-2 border-t border-borde bg-fondo px-6 py-3.5">{pie}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
