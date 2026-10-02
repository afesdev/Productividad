import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MoreHorizontal } from 'lucide-react';
import { BotonIcono, unirClases, type Icono } from '../../componentes/ui/primitivos';

export interface AccionMenu {
  etiqueta: string;
  icono: Icono;
  alPulsar: () => void;
  peligrosa?: boolean;
  separadorAntes?: boolean;
}

/** Menú "⋯" con acciones. Cierra con Esc, clic fuera o al elegir. */
export function MenuAcciones({
  acciones,
  etiqueta = 'Más acciones',
  disparador,
  alineacion = 'derecha',
  className,
}: {
  acciones: AccionMenu[];
  etiqueta?: string;
  /** Contenido propio del botón; por defecto un icono "⋯". */
  disparador?: (abrir: () => void, abierto: boolean) => ReactNode;
  alineacion?: 'izquierda' | 'derecha';
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const referencia = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alPulsarFuera = (evento: MouseEvent) => {
      if (!referencia.current?.contains(evento.target as Node)) setAbierto(false);
    };
    const alPresionarTecla = (evento: KeyboardEvent) => evento.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', alPulsarFuera);
    document.addEventListener('keydown', alPresionarTecla);
    return () => {
      document.removeEventListener('mousedown', alPulsarFuera);
      document.removeEventListener('keydown', alPresionarTecla);
    };
  }, [abierto]);

  const alternar = () => setAbierto((actual) => !actual);

  return (
    <div ref={referencia} className={unirClases('relative', className)}>
      {disparador ? (
        disparador(alternar, abierto)
      ) : (
        <BotonIcono
          icono={MoreHorizontal}
          etiqueta={etiqueta}
          tamano="sm"
          aria-expanded={abierto}
          onClick={(evento) => {
            evento.preventDefault();
            evento.stopPropagation();
            alternar();
          }}
        />
      )}
      <AnimatePresence>
        {abierto && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={unirClases(
              'absolute top-full z-40 mt-1 min-w-48 rounded-xl border border-borde bg-superficie p-1 shadow-flotante',
              alineacion === 'derecha' ? 'right-0' : 'left-0',
            )}
          >
            {acciones.map((accion) => {
              const IconoAccion = accion.icono;
              return (
                <div key={accion.etiqueta}>
                  {accion.separadorAntes && <div className="my-1 h-px bg-borde" />}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(evento) => {
                      evento.preventDefault();
                      evento.stopPropagation();
                      setAbierto(false);
                      accion.alPulsar();
                    }}
                    className={unirClases(
                      'flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors',
                      accion.peligrosa ? 'text-peligro hover:bg-peligro-suave' : 'text-texto hover:bg-superficie-2',
                    )}
                  >
                    <IconoAccion className={unirClases('size-4', accion.peligrosa ? 'text-peligro' : 'text-texto-3')} />
                    {accion.etiqueta}
                  </button>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
