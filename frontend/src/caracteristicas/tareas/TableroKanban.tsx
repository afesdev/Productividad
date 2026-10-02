import { useState, type DragEvent, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, Circle, CircleCheck, CircleDashed, Flag, ListChecks, Plus } from 'lucide-react';
import type { EstadoTarea, TareaResumenDto } from '../../servicios/tipos';
import { unirClases, type Icono } from '../../componentes/ui/primitivos';

const columnas: { estado: EstadoTarea; titulo: string; icono: Icono; claseIcono: string }[] = [
  { estado: 'Pendiente', titulo: 'Pendiente', icono: Circle, claseIcono: 'text-texto-3' },
  { estado: 'EnProgreso', titulo: 'En progreso', icono: CircleDashed, claseIcono: 'text-acento' },
  { estado: 'Completada', titulo: 'Completada', icono: CircleCheck, claseIcono: 'text-exito' },
];

/** Dónde caería la tarjeta arrastrada: antes de una tarea concreta o al final de la columna. */
interface PuntoInsercion {
  estado: EstadoTarea;
  antesDeTareaId: string | null;
}

interface PropiedadesKanban {
  tareas: TareaResumenDto[];
  nombresListas: Record<string, string>;
  mostrarLista: boolean;
  alMover: (tarea: TareaResumenDto, estado: EstadoTarea, antesDeTareaId: string | null) => void;
  alAbrir: (tarea: TareaResumenDto) => void;
  alCrearRapido: (titulo: string, estado: EstadoTarea) => Promise<void>;
}

/**
 * Kanban por estado. Arrastrar una tarjeta cambia su estado y su posición (TAR_Estado, TAR_IndiceOrden).
 * La posición se calcula con la mitad de la tarjeta sobre la que se suelta.
 */
export function TableroKanban({ tareas, nombresListas, mostrarLista, alMover, alAbrir, alCrearRapido }: PropiedadesKanban) {
  const [idArrastrada, setIdArrastrada] = useState<string | null>(null);
  const [punto, setPunto] = useState<PuntoInsercion | null>(null);

  const tareasRaiz = tareas.filter((tarea) => tarea.tareaPadreId === null);

  function alPasarSobreTarjeta(evento: DragEvent<HTMLElement>, tarea: TareaResumenDto, siguiente: TareaResumenDto | undefined) {
    evento.preventDefault();
    evento.stopPropagation();
    const caja = evento.currentTarget.getBoundingClientRect();
    const mitadSuperior = evento.clientY < caja.top + caja.height / 2;
    setPunto({ estado: tarea.estado, antesDeTareaId: mitadSuperior ? tarea.id : (siguiente?.id ?? null) });
  }

  function alSoltar(evento: DragEvent<HTMLElement>) {
    evento.preventDefault();
    const tarea = tareasRaiz.find((candidata) => candidata.id === idArrastrada);
    if (tarea && punto && punto.antesDeTareaId !== tarea.id) alMover(tarea, punto.estado, punto.antesDeTareaId);
    setIdArrastrada(null);
    setPunto(null);
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {columnas.map((columna) => {
        const tareasColumna = tareasRaiz.filter((tarea) => tarea.estado === columna.estado);
        const soltarAlFinal = punto?.estado === columna.estado && punto.antesDeTareaId === null;
        const IconoColumna = columna.icono;
        return (
          <section
            key={columna.estado}
            aria-label={columna.titulo}
            onDragOver={(evento) => {
              evento.preventDefault();
              setPunto({ estado: columna.estado, antesDeTareaId: null });
            }}
            onDrop={alSoltar}
            className={unirClases(
              'flex min-h-80 flex-col gap-2 rounded-xl border bg-superficie-2/50 p-2 transition-colors',
              punto?.estado === columna.estado ? 'border-acento/40 bg-acento-suave/60' : 'border-transparent',
            )}
          >
            <h2 className="flex items-center gap-2 px-1.5 py-1 text-sm font-medium">
              <IconoColumna className={unirClases('size-4', columna.claseIcono)} />
              {columna.titulo}
              <span className="rounded-md bg-superficie px-1.5 text-xs tabular-nums text-texto-3 shadow-tarjeta">{tareasColumna.length}</span>
            </h2>

            <AnimatePresence initial={false}>
              {tareasColumna.map((tarea, indice) => (
                <motion.div
                  key={tarea.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                >
                  {punto?.antesDeTareaId === tarea.id && <IndicadorInsercion />}
                  <TarjetaTarea
                    tarea={tarea}
                    nombreLista={mostrarLista ? nombresListas[tarea.listaTareaId] : undefined}
                    arrastrada={tarea.id === idArrastrada}
                    alIniciarArrastre={(evento) => {
                      evento.dataTransfer.setData('text/plain', tarea.id);
                      evento.dataTransfer.effectAllowed = 'move';
                      setIdArrastrada(tarea.id);
                    }}
                    alTerminarArrastre={() => {
                      setIdArrastrada(null);
                      setPunto(null);
                    }}
                    alPasarEncima={(evento) => alPasarSobreTarjeta(evento, tarea, tareasColumna[indice + 1])}
                    alAbrir={() => alAbrir(tarea)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {soltarAlFinal && idArrastrada && <IndicadorInsercion />}

            <CreacionRapida alCrear={(titulo) => alCrearRapido(titulo, columna.estado)} />
          </section>
        );
      })}
    </div>
  );
}

function IndicadorInsercion() {
  return <div aria-hidden className="mb-2 h-0.5 rounded-full bg-acento" />;
}

function TarjetaTarea({
  tarea,
  nombreLista,
  arrastrada,
  alIniciarArrastre,
  alTerminarArrastre,
  alPasarEncima,
  alAbrir,
}: {
  tarea: TareaResumenDto;
  nombreLista?: string;
  arrastrada: boolean;
  alIniciarArrastre: (evento: DragEvent<HTMLElement>) => void;
  alTerminarArrastre: () => void;
  alPasarEncima: (evento: DragEvent<HTMLElement>) => void;
  alAbrir: () => void;
}) {
  const completada = tarea.estado === 'Completada';
  const vencida = tarea.fechaVencimiento !== null && !completada && new Date(tarea.fechaVencimiento) < new Date();
  const prioridadVisible = tarea.prioridad === 'Urgente' || tarea.prioridad === 'Alta';

  return (
    <button
      draggable
      onDragStart={alIniciarArrastre}
      onDragEnd={alTerminarArrastre}
      onDragOver={alPasarEncima}
      onClick={alAbrir}
      className={unirClases(
        'flex w-full cursor-grab flex-col gap-2 rounded-lg border border-borde bg-superficie p-3 text-left text-sm shadow-tarjeta transition hover:border-borde-fuerte hover:shadow-md active:cursor-grabbing',
        arrastrada && 'opacity-40',
      )}
    >
      <span className={unirClases('font-medium leading-snug', completada && 'text-texto-3 line-through decoration-texto-3')}>{tarea.titulo}</span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-texto-3">
        <span className="font-mono">{tarea.clave}</span>
        {prioridadVisible && (
          <span className={unirClases('inline-flex items-center gap-1 font-medium', tarea.prioridad === 'Urgente' ? 'text-peligro' : 'text-aviso')}>
            <Flag className="size-3" fill="currentColor" />
            {tarea.prioridad}
          </span>
        )}
        {tarea.totalSubtareas > 0 && (
          <span className="inline-flex items-center gap-1" title="Subtareas completadas">
            <ListChecks className="size-3.5" />
            {tarea.subtareasCompletadas}/{tarea.totalSubtareas}
          </span>
        )}
        {tarea.fechaVencimiento && (
          <span className={unirClases('inline-flex items-center gap-1', vencida && 'font-medium text-peligro')}>
            <CalendarDays className="size-3.5" />
            {new Date(tarea.fechaVencimiento).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
          </span>
        )}
        {nombreLista && <span className="truncate">{nombreLista}</span>}
      </span>
    </button>
  );
}

function CreacionRapida({ alCrear }: { alCrear: (titulo: string) => Promise<void> }) {
  const [activa, setActiva] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!titulo.trim()) return;
    setEnviando(true);
    try {
      await alCrear(titulo.trim());
      setTitulo('');
    } finally {
      setEnviando(false);
    }
  }

  if (!activa) {
    return (
      <button
        onClick={() => setActiva(true)}
        className="mt-auto flex h-9 items-center gap-2 rounded-lg px-2 text-left text-sm text-texto-3 transition hover:bg-superficie hover:text-texto-2"
      >
        <Plus className="size-4" />
        Añadir tarea
      </button>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-auto">
      <input
        autoFocus
        value={titulo}
        disabled={enviando}
        maxLength={200}
        onChange={(evento) => setTitulo(evento.target.value)}
        onKeyDown={(evento) => {
          if (evento.key === 'Escape') setActiva(false);
        }}
        onBlur={() => !titulo && setActiva(false)}
        placeholder="Título y Enter"
        className="w-full rounded-lg border border-acento bg-superficie px-3 py-2 text-sm shadow-tarjeta ring-3 ring-acento/15 focus:outline-none"
      />
    </form>
  );
}
