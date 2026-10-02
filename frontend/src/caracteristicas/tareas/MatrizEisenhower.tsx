import { useCallback, useEffect, useState, type DragEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarClock, CalendarDays, Flame, Forward, Trash2 } from 'lucide-react';
import { apiTareas } from '../../servicios/api';
import { escucharTareasProyecto } from '../../servicios/conexionSignalR';
import { notificar } from '../../servicios/notificaciones';
import type { CuadranteEisenhower, MatrizEisenhowerDto, TareaResumenDto } from '../../servicios/tipos';
import { unirClases, type Icono } from '../../componentes/ui/primitivos';

type ClaveMatriz = keyof MatrizEisenhowerDto;

interface DefinicionCuadrante {
  cuadrante: CuadranteEisenhower;
  clave: ClaveMatriz;
  titulo: string;
  descripcion: string;
  icono: Icono;
  /** Color del icono del encabezado (solo acento; el texto siempre usa tokens neutros). */
  claseIcono: string;
}

// Orden de la grilla 2×2: filas = importante / no importante, columnas = urgente / no urgente.
const cuadrantes: DefinicionCuadrante[] = [
  { cuadrante: 'Hacer', clave: 'hacer', titulo: 'Hacer', descripcion: 'Urgente e importante', icono: Flame, claseIcono: 'bg-peligro-suave text-peligro' },
  { cuadrante: 'Programar', clave: 'programar', titulo: 'Programar', descripcion: 'Importante, no urgente', icono: CalendarClock, claseIcono: 'bg-acento-suave text-acento' },
  { cuadrante: 'Delegar', clave: 'delegar', titulo: 'Delegar', descripcion: 'Urgente, no importante', icono: Forward, claseIcono: 'bg-aviso-suave text-aviso' },
  { cuadrante: 'Eliminar', clave: 'eliminar', titulo: 'Eliminar', descripcion: 'Ni urgente ni importante', icono: Trash2, claseIcono: 'bg-superficie-2 text-texto-2' },
];

const claveDeCuadrante = (cuadrante: CuadranteEisenhower) => cuadrantes.find((definicion) => definicion.cuadrante === cuadrante)!.clave;

const matrizVacia: MatrizEisenhowerDto = { hacer: [], programar: [], delegar: [], eliminar: [] };

/** Quita la tarea de donde esté y, si sigue abierta, la ubica en su cuadrante. */
function reubicarTarea(matriz: MatrizEisenhowerDto, tarea: TareaResumenDto): MatrizEisenhowerDto {
  const siguiente: MatrizEisenhowerDto = {
    hacer: matriz.hacer.filter((existente) => existente.id !== tarea.id),
    programar: matriz.programar.filter((existente) => existente.id !== tarea.id),
    delegar: matriz.delegar.filter((existente) => existente.id !== tarea.id),
    eliminar: matriz.eliminar.filter((existente) => existente.id !== tarea.id),
  };
  const estaAbierta = tarea.estado === 'Pendiente' || tarea.estado === 'EnProgreso';
  if (estaAbierta) siguiente[claveDeCuadrante(tarea.cuadrante)] = [tarea, ...siguiente[claveDeCuadrante(tarea.cuadrante)]];
  return siguiente;
}

function banderasDe(cuadrante: CuadranteEisenhower) {
  return { esUrgente: cuadrante === 'Hacer' || cuadrante === 'Delegar', esImportante: cuadrante === 'Hacer' || cuadrante === 'Programar' };
}

/**
 * Matriz de Eisenhower con drag & drop entre cuadrantes.
 * Soltar una tarea actualiza TAR_EsUrgente / TAR_EsImportante (actualización optimista con reversión si falla).
 * Para teclado y lectores de pantalla cada tarjeta tiene además un selector "Mover a…".
 */
export function MatrizEisenhower({ proyectoId }: { proyectoId: string }) {
  const [matriz, setMatriz] = useState<MatrizEisenhowerDto>(matrizVacia);
  const [cargando, setCargando] = useState(true);
  const [cuadranteResaltado, setCuadranteResaltado] = useState<CuadranteEisenhower | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setMatriz(await apiTareas.matrizEisenhower(proyectoId));
    } catch (errorCarga) {
      notificar.error('No se pudo cargar la matriz', errorCarga);
    } finally {
      setCargando(false);
    }
  }, [proyectoId]);

  useEffect(() => {
    void cargar();
    return escucharTareasProyecto(proyectoId, {
      alActualizar: (tarea) => setMatriz((actual) => reubicarTarea(actual, tarea)),
      alEliminar: (tareaId) =>
        setMatriz((actual) => ({
          hacer: actual.hacer.filter((tarea) => tarea.id !== tareaId),
          programar: actual.programar.filter((tarea) => tarea.id !== tareaId),
          delegar: actual.delegar.filter((tarea) => tarea.id !== tareaId),
          eliminar: actual.eliminar.filter((tarea) => tarea.id !== tareaId),
        })),
    });
  }, [cargar, proyectoId]);

  async function moverTarea(tarea: TareaResumenDto, destino: CuadranteEisenhower) {
    if (tarea.cuadrante === destino) return;
    const anterior = matriz;
    setMatriz(reubicarTarea(matriz, { ...tarea, ...banderasDe(destino), cuadrante: destino }));
    try {
      const actualizada = await apiTareas.moverCuadrante(tarea.id, destino);
      setMatriz((actual) => reubicarTarea(actual, actualizada));
    } catch (errorMovimiento) {
      setMatriz(anterior);
      notificar.error('No se pudo mover la tarea', errorMovimiento);
    }
  }

  function alSoltar(evento: DragEvent<HTMLElement>, destino: CuadranteEisenhower) {
    evento.preventDefault();
    setCuadranteResaltado(null);
    const idTarea = evento.dataTransfer.getData('text/plain');
    const tarea = Object.values(matriz).flat().find((candidata) => candidata.id === idTarea);
    if (tarea) void moverTarea(tarea, destino);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="hidden grid-cols-[1fr_1fr] gap-4 pl-9 text-center text-[11px] font-medium uppercase tracking-wider text-texto-3 md:grid">
        <span>Urgente</span>
        <span>No urgente</span>
      </div>
      <div className="grid gap-4 md:grid-cols-[auto_1fr_1fr]">
        {[0, 1].map((fila) => (
          <div key={fila} className="contents">
            <div className="hidden items-center justify-center md:flex">
              <span className="-rotate-180 text-[11px] font-medium uppercase tracking-wider text-texto-3 [writing-mode:vertical-rl]">
                {fila === 0 ? 'Importante' : 'No importante'}
              </span>
            </div>
            {cuadrantes.slice(fila * 2, fila * 2 + 2).map((definicion) => (
              <section
                key={definicion.cuadrante}
                aria-label={`${definicion.titulo}: ${definicion.descripcion}`}
                onDragOver={(evento) => {
                  evento.preventDefault();
                  evento.dataTransfer.dropEffect = 'move';
                  setCuadranteResaltado(definicion.cuadrante);
                }}
                onDragLeave={() => setCuadranteResaltado((actual) => (actual === definicion.cuadrante ? null : actual))}
                onDrop={(evento) => alSoltar(evento, definicion.cuadrante)}
                className={unirClases(
                  'flex min-h-64 flex-col gap-3 rounded-xl border bg-superficie p-4 shadow-tarjeta transition-colors',
                  cuadranteResaltado === definicion.cuadrante ? 'border-acento/50 bg-acento-suave/50' : 'border-borde',
                )}
              >
                <header className="flex items-center gap-3">
                  <span aria-hidden className={unirClases('grid size-8 place-items-center rounded-lg', definicion.claseIcono)}>
                    <definicion.icono className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold leading-tight">{definicion.titulo}</h2>
                    <p className="text-xs text-texto-3">{definicion.descripcion}</p>
                  </div>
                  <span className="rounded-md bg-superficie-2 px-2 py-0.5 text-xs font-medium tabular-nums text-texto-2">{matriz[definicion.clave].length}</span>
                </header>
                {cargando && matriz[definicion.clave].length === 0 ? (
                  <p className="text-sm text-texto-3">Cargando…</p>
                ) : matriz[definicion.clave].length === 0 ? (
                  <p className="grid flex-1 place-items-center rounded-lg border border-dashed border-borde-fuerte text-sm text-texto-3">Suelta tareas aquí</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    <AnimatePresence initial={false}>
                      {matriz[definicion.clave].map((tarea) => (
                        <TarjetaTareaMatriz key={tarea.id} tarea={tarea} alMover={(destino) => void moverTarea(tarea, destino)} />
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </section>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TarjetaTareaMatriz({ tarea, alMover }: { tarea: TareaResumenDto; alMover: (destino: CuadranteEisenhower) => void }) {
  const vencida = tarea.fechaVencimiento !== null && new Date(tarea.fechaVencimiento) < new Date();
  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
    >
      <div
        draggable
        onDragStart={(evento) => {
          evento.dataTransfer.setData('text/plain', tarea.id);
          evento.dataTransfer.effectAllowed = 'move';
        }}
        className="group cursor-grab rounded-lg border border-borde bg-superficie p-3 text-sm shadow-tarjeta transition hover:border-borde-fuerte active:cursor-grabbing"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium leading-snug">{tarea.titulo}</span>
          <select
            aria-label={`Mover ${tarea.clave} a otro cuadrante`}
            value={tarea.cuadrante}
            onChange={(evento) => alMover(evento.target.value as CuadranteEisenhower)}
            className="shrink-0 rounded-md border border-transparent bg-transparent px-1 text-xs text-texto-3 opacity-0 hover:border-borde group-hover:opacity-100 focus:opacity-100"
          >
            {cuadrantes.map((definicion) => (
              <option key={definicion.cuadrante} value={definicion.cuadrante}>
                {definicion.titulo}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-texto-3">
          <span className="font-mono">{tarea.clave}</span>
          {tarea.estado === 'EnProgreso' && <span className="text-acento">En progreso</span>}
          {tarea.fechaVencimiento && (
            <span className={unirClases('inline-flex items-center gap-1', vencida && 'font-medium text-peligro')}>
              <CalendarDays className="size-3.5" />
              {new Date(tarea.fechaVencimiento).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
    </motion.li>
  );
}
