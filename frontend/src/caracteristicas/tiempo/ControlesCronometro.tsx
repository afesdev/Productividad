import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, Play, Square, Timer } from 'lucide-react';
import { Boton, unirClases } from '../../componentes/ui/primitivos';
import { usarCronometro, usarSegundosDesde } from './ContextoCronometro';
import { formatearReloj, rutaDestino } from './presentacionTiempo';

/**
 * Barra superior: con el cronómetro en marcha muestra qué se cronometra, el tiempo y un botón para detener;
 * sin él, un botón para arrancar tiempo libre (reunión, soporte…) con una descripción.
 */
export function ChipCronometro() {
  const { activo, ocupado, iniciar, detener } = usarCronometro();
  const segundos = usarSegundosDesde(activo?.fechaInicio ?? null);
  const [formulario, setFormulario] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!formulario) return;
    const alHacerClic = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setFormulario(false);
    };
    document.addEventListener('mousedown', alHacerClic);
    return () => document.removeEventListener('mousedown', alHacerClic);
  }, [formulario]);

  async function iniciarLibre(evento: FormEvent) {
    evento.preventDefault();
    if (!descripcion.trim()) return;
    await iniciar({ descripcion: descripcion.trim() });
    setDescripcion('');
    setFormulario(false);
  }

  if (activo) {
    const ruta = rutaDestino(activo);
    const etiqueta = activo.clave ? `${activo.clave} · ${activo.titulo}` : activo.titulo;
    return (
      <div className="flex h-9 items-center gap-2 rounded-full border border-rose-200 bg-rose-50 pl-3 pr-1 text-sm text-rose-950">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
        </span>
        {ruta ? (
          <Link to={ruta} className="hidden max-w-48 truncate hover:underline sm:block" title={etiqueta}>
            {etiqueta}
          </Link>
        ) : (
          <span className="hidden max-w-48 truncate sm:block" title={etiqueta}>
            {etiqueta}
          </span>
        )}
        <span className="font-mono text-[13px] font-medium tabular-nums">{formatearReloj(segundos)}</span>
        <button
          type="button"
          onClick={() => void detener()}
          disabled={ocupado}
          aria-label="Detener cronómetro"
          title="Detener y registrar"
          className="grid size-7 place-items-center rounded-full bg-rose-500 text-white transition hover:bg-rose-600 disabled:opacity-60"
        >
          {ocupado ? <Loader2 className="size-3.5 animate-spin" /> : <Square className="size-3" fill="currentColor" />}
        </button>
      </div>
    );
  }

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => setFormulario((actual) => !actual)}
        aria-expanded={formulario}
        className="flex h-9 items-center gap-1.5 rounded-full border border-borde px-3 text-sm text-texto-2 transition hover:border-borde-fuerte hover:text-texto"
      >
        <Timer className="size-4" />
        <span className="hidden sm:inline">Cronómetro</span>
      </button>
      <AnimatePresence>
        {formulario && (
          <motion.form
            onSubmit={iniciarLibre}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-full z-40 mt-2 flex w-72 flex-col gap-2 rounded-xl border border-borde bg-superficie p-3 shadow-flotante"
          >
            <p className="text-xs text-texto-2">Tiempo libre (reunión, soporte…). Para una tarea o ticket, usa su botón ▶.</p>
            <input
              autoFocus
              value={descripcion}
              maxLength={250}
              onChange={(evento) => setDescripcion(evento.target.value)}
              placeholder="¿En qué vas a trabajar?"
              className="h-9 rounded-lg border border-borde bg-superficie px-3 text-sm focus:border-acento focus:outline-none"
            />
            <Boton type="submit" tamano="sm" icono={Play} cargando={ocupado} disabled={!descripcion.trim()}>
              Iniciar
            </Boton>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

/** ▶ / ■ para cronometrar una tarea o un ticket concreto. */
export function BotonCronometro({ tareaId, ticketId, className }: { tareaId?: string; ticketId?: string; className?: string }) {
  const { activo, ocupado, iniciar, detener } = usarCronometro();
  const esEste = !!activo && ((tareaId && activo.tareaId === tareaId) || (ticketId && activo.ticketId === ticketId));
  const segundos = usarSegundosDesde(esEste ? activo.fechaInicio : null);

  if (esEste) {
    return (
      <button
        type="button"
        onClick={() => void detener()}
        disabled={ocupado}
        title="Detener y registrar el tiempo"
        className={unirClases(
          'inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-sm font-medium text-rose-900 transition hover:bg-rose-100 disabled:opacity-60',
          className,
        )}
      >
        <Square className="size-3" fill="currentColor" />
        <span className="font-mono tabular-nums">{formatearReloj(segundos)}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void iniciar({ tareaId: tareaId ?? null, ticketId: ticketId ?? null })}
      disabled={ocupado}
      title={activo ? `Cambiar el cronómetro aquí (se detiene "${activo.titulo}")` : 'Iniciar cronómetro'}
      className={unirClases(
        'inline-flex h-8 items-center gap-1.5 rounded-lg border border-borde px-2.5 text-sm text-texto-2 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-900 disabled:opacity-60',
        className,
      )}
    >
      <Play className="size-3.5" />
      Cronometrar
    </button>
  );
}
