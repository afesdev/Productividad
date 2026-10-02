import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Plus, Tag, X } from 'lucide-react';
import { apiDocumentos } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import type { EtiquetaConConteoDto, EtiquetaDto } from '../../servicios/tipos';
import { unirClases } from '../../componentes/ui/primitivos';
import { coloresPaleta, paleta } from './paleta';

export function ChipEtiqueta({ etiqueta, alQuitar, className }: { etiqueta: EtiquetaDto; alQuitar?: () => void; className?: string }) {
  return (
    <span className={unirClases('inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium', paleta[etiqueta.color].suave, className)}>
      #{etiqueta.nombre}
      {alQuitar && (
        <button type="button" aria-label={`Quitar #${etiqueta.nombre}`} onClick={alQuitar} className="-mr-1 grid size-4 place-items-center rounded opacity-60 hover:opacity-100">
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

/**
 * Etiquetas del documento: chips + popover para marcar/desmarcar o crear una nueva escribiendo su nombre.
 */
export function SelectorEtiquetas({
  documentoId,
  asignadas,
  disponibles,
  soloLectura,
  alCambiar,
}: {
  documentoId: string;
  asignadas: EtiquetaDto[];
  disponibles: EtiquetaConConteoDto[];
  soloLectura?: boolean;
  /** Etiquetas finales del documento; `nuevaCreada` indica que hay que recargar la estructura. */
  alCambiar: (etiquetas: EtiquetaDto[], nuevaCreada: boolean) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [indiceActivo, setIndiceActivo] = useState(0);
  const referencia = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alPulsarFuera = (evento: MouseEvent) => {
      if (!referencia.current?.contains(evento.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', alPulsarFuera);
    return () => document.removeEventListener('mousedown', alPulsarFuera);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) setBusqueda('');
  }, [abierto]);

  const idsAsignadas = useMemo(() => new Set(asignadas.map((etiqueta) => etiqueta.id)), [asignadas]);
  const termino = busqueda.trim().replace(/^#/, '').toLowerCase();
  const filtradas = disponibles.filter((etiqueta) => etiqueta.nombre.toLowerCase().includes(termino));
  const puedeCrear = termino.length > 0 && !disponibles.some((etiqueta) => etiqueta.nombre.toLowerCase() === termino);
  const totalOpciones = filtradas.length + (puedeCrear ? 1 : 0);

  useEffect(() => setIndiceActivo(0), [busqueda]);

  async function guardar(ids: string[], nuevaCreada = false) {
    try {
      const resultado = await apiDocumentos.asignarEtiquetas(documentoId, ids);
      alCambiar(resultado, nuevaCreada);
    } catch (errorAsignacion) {
      notificar.error('No se pudieron actualizar las etiquetas', errorAsignacion);
    }
  }

  const alternar = (id: string) => void guardar(idsAsignadas.has(id) ? [...idsAsignadas].filter((actual) => actual !== id) : [...idsAsignadas, id]);

  async function crear() {
    const nombre = busqueda.trim().replace(/^#/, '');
    // Colores rotando por la paleta para que etiquetas nuevas se distingan sin configurarlas.
    const color = coloresPaleta[(disponibles.length + 1) % coloresPaleta.length];
    try {
      const id = await apiDocumentos.guardarEtiqueta(null, { nombre, color });
      setBusqueda('');
      await guardar([...idsAsignadas, id], true);
    } catch (errorCreacion) {
      notificar.error('No se pudo crear la etiqueta', errorCreacion);
    }
  }

  function elegir(indice: number) {
    if (indice < filtradas.length) alternar(filtradas[indice].id);
    else if (puedeCrear) void crear();
  }

  return (
    <div ref={referencia} className="relative flex flex-wrap items-center gap-1.5">
      {asignadas.map((etiqueta) => (
        <ChipEtiqueta key={etiqueta.id} etiqueta={etiqueta} alQuitar={soloLectura ? undefined : () => alternar(etiqueta.id)} />
      ))}
      {!soloLectura && (
        <button
          type="button"
          onClick={() => setAbierto((actual) => !actual)}
          aria-expanded={abierto}
          className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs text-texto-3 transition-colors hover:bg-superficie-2 hover:text-texto-2"
        >
          <Tag className="size-3.5" />
          {asignadas.length === 0 ? 'Añadir etiqueta' : 'Editar'}
        </button>
      )}
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-40 mt-1.5 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-borde bg-superficie p-1.5 shadow-flotante"
          >
            <input
              autoFocus
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === 'Escape') setAbierto(false);
                else if (evento.key === 'ArrowDown') {
                  evento.preventDefault();
                  setIndiceActivo((actual) => Math.min(actual + 1, totalOpciones - 1));
                } else if (evento.key === 'ArrowUp') {
                  evento.preventDefault();
                  setIndiceActivo((actual) => Math.max(actual - 1, 0));
                } else if (evento.key === 'Enter' && totalOpciones > 0) {
                  evento.preventDefault();
                  elegir(indiceActivo);
                }
              }}
              placeholder="Buscar o crear etiqueta…"
              aria-label="Buscar o crear etiqueta"
              className="mb-1 h-8 w-full rounded-lg bg-superficie-2 px-2.5 text-sm placeholder:text-texto-3 focus:outline-none"
            />
            <div className="max-h-60 overflow-y-auto">
              {filtradas.map((etiqueta, indice) => (
                <button
                  key={etiqueta.id}
                  type="button"
                  onMouseEnter={() => setIndiceActivo(indice)}
                  onClick={() => alternar(etiqueta.id)}
                  className={unirClases('flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-sm', indice === indiceActivo && 'bg-superficie-2')}
                >
                  <span className={unirClases('size-2.5 shrink-0 rounded-full', paleta[etiqueta.color].punto)} />
                  <span className="min-w-0 flex-1 truncate">{etiqueta.nombre}</span>
                  {idsAsignadas.has(etiqueta.id) && <Check className="size-4 text-acento" />}
                </button>
              ))}
              {puedeCrear && (
                <button
                  type="button"
                  onMouseEnter={() => setIndiceActivo(filtradas.length)}
                  onClick={() => void crear()}
                  className={unirClases('flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-sm', indiceActivo === filtradas.length && 'bg-superficie-2')}
                >
                  <Plus className="size-4 text-texto-3" />
                  Crear <span className="font-medium">#{busqueda.trim().replace(/^#/, '')}</span>
                </button>
              )}
              {totalOpciones === 0 && <p className="px-2 py-2 text-sm text-texto-3">Escribe para crear la primera etiqueta.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
