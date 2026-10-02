import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, CircleCheck, FileText, LifeBuoy, ListPlus, Loader2, Plus, Sparkles, Timer } from 'lucide-react';
import { apiDiario, type DatosEntradaDiario } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import type { ActividadDiaDto, EntradaDiarioDto } from '../../servicios/tipos';
import { usarCronometro } from '../tiempo/ContextoCronometro';
import { formatearDuracion, formatearHoraLocal } from '../tiempo/presentacionTiempo';
import { Boton, unirClases, type Icono } from '../../componentes/ui/primitivos';

interface Sugerencia {
  clave: string;
  entrada: DatosEntradaDiario;
}

const nota = (titulo: string, detalleMarkdown: string | null = null): DatosEntradaDiario => ({ tipo: 'Nota', titulo, detalleMarkdown, horaInicio: null, horaFin: null, completada: false });

/** Convierte la actividad en entradas de diario listas para añadir (Markdown en línea en el título). */
function construirSugerencias(actividad: ActividadDiaDto): Sugerencia[] {
  const sugerencias: Sugerencia[] = [];
  for (const tarea of actividad.tareasCompletadas) {
    sugerencias.push({
      clave: `completada:${tarea.id}`,
      entrada: { tipo: 'Tarea', titulo: `**${tarea.clave}** ${tarea.titulo}`, detalleMarkdown: null, horaInicio: null, horaFin: null, completada: true },
    });
  }
  for (const tarea of actividad.tareasCreadas) sugerencias.push({ clave: `creada:${tarea.id}`, entrada: nota(`Tarea creada **${tarea.clave}** ${tarea.titulo}`) });
  for (const ticket of actividad.tickets) {
    const referencia = ticket.numeroExterno ? ` (Ticket ${ticket.numeroExterno})` : '';
    const detalle = ticket.eventos.map((evento) => `- ${formatearHoraLocal(evento.hora)} · ${evento.descripcion}`).join('\n');
    sugerencias.push({ clave: `ticket:${ticket.id}`, entrada: nota(`**${ticket.clave}**${referencia} ${ticket.asunto}`, detalle) });
  }
  for (const documento of actividad.documentos) {
    sugerencias.push({ clave: `documento:${documento.id}`, entrada: nota(`${documento.creado ? 'Documento creado' : 'Documento editado'}: ${documento.titulo}`) });
  }
  if (actividad.minutosRegistrados > 0) {
    const detalle = actividad.tiempo.map((total) => `- ${total.clave ? `**${total.clave}** ` : ''}${total.titulo}: ${formatearDuracion(total.minutos)}`).join('\n');
    sugerencias.push({ clave: 'tiempo', entrada: nota(`Tiempo registrado: ${formatearDuracion(actividad.minutosRegistrados)}`, detalle) });
  }
  return sugerencias;
}

/**
 * "Actividad del día": lo que hiciste en la app (se calcula, no se guarda). Cada elemento se puede
 * añadir como entrada del diario; los ya añadidos (mismo título) aparecen marcados.
 */
export function PanelActividad({ fecha, entradas, alAgregar }: { fecha: string; entradas: EntradaDiarioDto[]; alAgregar: () => Promise<void> }) {
  const { version } = usarCronometro();
  const [actividad, setActividad] = useState<ActividadDiaDto | null>(null);
  const [agregando, setAgregando] = useState<string | null>(null);
  // Plegado por defecto para no recargar la vista; se recuerda la preferencia.
  const [abierto, setAbierto] = useState(() => leerPreferencia(ClaveAbierto));

  const cargar = useCallback(async () => {
    try {
      setActividad(await apiDiario.actividad(fecha));
    } catch (errorCarga) {
      notificar.error('No se pudo cargar la actividad', errorCarga);
    }
  }, [fecha]);

  useEffect(() => {
    void cargar();
  }, [cargar, version]);

  const titulos = new Set(entradas.map((entrada) => entrada.titulo));
  const sugerencias = actividad ? construirSugerencias(actividad) : [];
  const pendientes = sugerencias.filter((sugerencia) => !titulos.has(sugerencia.entrada.titulo));
  const porClave = new Map(sugerencias.map((sugerencia) => [sugerencia.clave, sugerencia]));

  async function agregar(lista: Sugerencia[], claveOperacion: string) {
    if (lista.length === 0) return;
    setAgregando(claveOperacion);
    try {
      for (const sugerencia of lista) await apiDiario.crearEntrada(fecha, sugerencia.entrada);
      await alAgregar();
      if (lista.length > 1) notificar.exito('Añadido al diario', `${lista.length} entradas`);
    } catch (errorAgregado) {
      notificar.error('No se pudo añadir al diario', errorAgregado);
    } finally {
      setAgregando(null);
    }
  }

  const botonAgregar = (clave: string) => {
    const sugerencia = porClave.get(clave);
    if (!sugerencia) return null;
    const yaEsta = titulos.has(sugerencia.entrada.titulo);
    return (
      <button
        type="button"
        disabled={yaEsta || agregando !== null}
        onClick={() => void agregar([sugerencia], clave)}
        aria-label={yaEsta ? 'Ya está en el diario' : 'Añadir al diario'}
        title={yaEsta ? 'Ya está en el diario' : 'Añadir al diario'}
        className={unirClases(
          'grid size-6 shrink-0 place-items-center rounded-md transition',
          yaEsta ? 'text-emerald-500' : 'text-texto-3 hover:bg-orange-100 hover:text-orange-700 disabled:opacity-50',
        )}
      >
        {agregando === clave ? <Loader2 className="size-3.5 animate-spin" /> : yaEsta ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
      </button>
    );
  };

  const vacia = actividad && sugerencias.length === 0;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-orange-100 bg-gradient-to-b from-orange-50/60 to-superficie p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            setAbierto(!abierto);
            guardarPreferencia(ClaveAbierto, !abierto);
          }}
          aria-expanded={abierto}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium"
        >
          <Sparkles className="size-4 shrink-0 text-orange-400" />
          Actividad del día
          {!abierto && pendientes.length > 0 && (
            <span className="rounded-full bg-orange-100 px-1.5 text-[11px] font-medium tabular-nums text-orange-700" title="Elementos por añadir al diario">
              {pendientes.length}
            </span>
          )}
          <ChevronDown className={unirClases('ml-auto size-4 shrink-0 text-texto-3 transition-transform', abierto && 'rotate-180')} />
        </button>
        {abierto && pendientes.length > 1 && (
          <Boton tamano="sm" variante="secundario" icono={ListPlus} cargando={agregando === 'todo'} onClick={() => void agregar(pendientes, 'todo')}>
            Añadir todo
          </Boton>
        )}
      </div>

      {!abierto ? null : actividad === null ? (
        <p className="flex items-center gap-2 text-xs text-texto-3">
          <Loader2 className="size-3.5 animate-spin" />
          Revisando lo que hiciste…
        </p>
      ) : vacia ? (
        <p className="text-xs leading-relaxed text-texto-3">Sin actividad registrada en la app este día. Aquí aparecerán tareas completadas, tickets movidos, documentos editados y tiempo cronometrado.</p>
      ) : (
        <>
          {actividad.minutosRegistrados > 0 && (
            <Grupo icono={Timer} titulo="Tiempo" extra={<span className="font-semibold text-texto">{formatearDuracion(actividad.minutosRegistrados)}</span>} accion={botonAgregar('tiempo')}>
              {actividad.tiempo.slice(0, 5).map((total) => (
                <li key={`${total.clave}-${total.titulo}`} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-texto-2">
                    {total.clave && <span className="font-mono text-texto-3">{total.clave} </span>}
                    {total.titulo}
                  </span>
                  <span className="shrink-0 tabular-nums text-texto-3">{formatearDuracion(total.minutos)}</span>
                </li>
              ))}
            </Grupo>
          )}

          {actividad.tareasCompletadas.length > 0 && (
            <Grupo icono={CircleCheck} titulo="Tareas completadas">
              {actividad.tareasCompletadas.map((tarea) => (
                <Fila key={tarea.id} ruta={`/tareas/${tarea.id}`} clave={tarea.clave} texto={tarea.titulo} accion={botonAgregar(`completada:${tarea.id}`)} />
              ))}
            </Grupo>
          )}

          {actividad.tareasCreadas.length > 0 && (
            <Grupo icono={ListPlus} titulo="Tareas creadas">
              {actividad.tareasCreadas.map((tarea) => (
                <Fila key={tarea.id} ruta={`/tareas/${tarea.id}`} clave={tarea.clave} texto={tarea.titulo} accion={botonAgregar(`creada:${tarea.id}`)} />
              ))}
            </Grupo>
          )}

          {actividad.tickets.length > 0 && (
            <Grupo icono={LifeBuoy} titulo="Tickets">
              {actividad.tickets.map((ticket) => (
                <Fila
                  key={ticket.id}
                  ruta={`/tickets/${ticket.id}`}
                  clave={ticket.clave}
                  texto={ticket.asunto}
                  detalle={ticket.eventos[ticket.eventos.length - 1]?.descripcion}
                  accion={botonAgregar(`ticket:${ticket.id}`)}
                />
              ))}
            </Grupo>
          )}

          {actividad.documentos.length > 0 && (
            <Grupo icono={FileText} titulo="Documentos">
              {actividad.documentos.map((documento) => (
                <Fila
                  key={documento.id}
                  ruta={`/documentos/${documento.id}`}
                  texto={`${documento.icono ? `${documento.icono} ` : ''}${documento.titulo}`}
                  detalle={documento.creado ? 'Creado' : 'Editado'}
                  accion={botonAgregar(`documento:${documento.id}`)}
                />
              ))}
            </Grupo>
          )}
        </>
      )}
    </section>
  );
}

function Grupo({ icono: IconoGrupo, titulo, extra, accion, children }: { icono: Icono; titulo: string; extra?: ReactNode; accion?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="flex items-center gap-1.5 text-xs font-medium text-texto-2">
        <IconoGrupo className="size-3.5 text-texto-3" />
        {titulo}
        {extra && <span className="ml-auto text-xs">{extra}</span>}
        {accion}
      </h3>
      <ul className="flex flex-col gap-1">{children}</ul>
    </div>
  );
}

function Fila({ ruta, clave, texto, detalle, accion }: { ruta: string; clave?: string; texto: string; detalle?: string; accion: ReactNode }) {
  return (
    <li className="flex items-start gap-1.5">
      <Link to={ruta} className="min-w-0 flex-1 rounded-md px-1 py-0.5 text-xs hover:bg-superficie">
        <span className="block truncate">
          {clave && <span className="font-mono text-texto-3">{clave} </span>}
          {texto}
        </span>
        {detalle && <span className="block truncate text-[11px] text-texto-3">{detalle}</span>}
      </Link>
      {accion}
    </li>
  );
}

const ClaveAbierto = 'diario.actividadAbierta';

function leerPreferencia(clave: string): boolean {
  try {
    return localStorage.getItem(clave) === '1';
  } catch {
    return false;
  }
}

function guardarPreferencia(clave: string, valor: boolean) {
  try {
    localStorage.setItem(clave, valor ? '1' : '0');
  } catch {
    // Preferencia visual: sin almacenamiento solo dura la sesión.
  }
}
