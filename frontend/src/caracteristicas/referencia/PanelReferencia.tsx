import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  ArrowUp,
  Braces,
  ChevronDown,
  Columns3,
  ExternalLink,
  FileText,
  LifeBuoy,
  ListChecks,
  Loader2,
  NotebookPen,
  Pin,
  PinOff,
  RefreshCw,
  Workflow,
  X,
} from 'lucide-react';
import { apiDocumentos, apiFlujos, apiTareas, apiTickets, apiTrello } from '../../servicios/api';
import { formatearRelativo } from '../../servicios/formato';
import { rutaDeEntidad } from '../../servicios/rutas';
import { BotonIcono, unirClases, type Icono } from '../../componentes/ui/primitivos';
import { VistaMarkdown } from '../../componentes/VistaMarkdown';
import { ModalTarjetaTrello } from '../trello/ModalTarjetaTrello';
import { ListaSnippetsCompacta } from '../snippets/SelectorSnippets';
import { InsigniaVencimiento } from '../trello/presentacionTrello';
import { MaximoFijados, MaximoNotas, usarPanelReferencia, type ElementoFijado, type TipoFijado } from './ContextoPanelReferencia';

const iconos: Record<TipoFijado, { icono: Icono; tono: string; nombre: string }> = {
  Documento: { icono: FileText, tono: 'text-emerald-500', nombre: 'Documento' },
  Tarea: { icono: ListChecks, tono: 'text-violet-500', nombre: 'Tarea' },
  Ticket: { icono: LifeBuoy, tono: 'text-rose-500', nombre: 'Ticket' },
  Flujo: { icono: Workflow, tono: 'text-indigo-500', nombre: 'Flujo' },
  TarjetaTrello: { icono: Columns3, tono: 'text-sky-500', nombre: 'Tarjeta de Trello' },
};

/** Ancho del cajón; DisposicionPrincipal deja ese hueco a la derecha en pantallas anchas. */
export const AnchoPanelReferencia = 'w-[22rem]';

// ---------- Botón para fijar ----------

/** Chincheta para las cabeceras de documentos, tareas, tickets, flujos y tarjetas de Trello. */
export function BotonFijar({ tipo, id, titulo, className }: { tipo: TipoFijado; id: string; titulo: string; className?: string }) {
  const { estaFijado, alternarFijado } = usarPanelReferencia();
  const fijado = estaFijado(tipo, id);
  return (
    <button
      type="button"
      onClick={() => alternarFijado({ tipo, id, titulo })}
      aria-pressed={fijado}
      aria-label={fijado ? 'Quitar del panel de referencia' : 'Fijar en el panel de referencia'}
      title={fijado ? 'Quitar del panel de referencia' : 'Fijar en el panel de referencia (Ctrl+.)'}
      className={unirClases('grid size-8 place-items-center rounded-lg transition hover:bg-superficie-2', fijado ? 'text-sky-500' : 'text-texto-3 hover:text-texto-2', className)}
    >
      <Pin className="size-4" fill={fijado ? 'currentColor' : 'none'} />
    </button>
  );
}

// ---------- Botón flotante + cajón ----------

/**
 * Cajón de referencia a la derecha: fijados (con vista previa de solo lectura) y notas rápidas. Sigue abierto al
 * cambiar de página. Ctrl/⌘ + . lo abre o cierra; el botón flotante se oculta en los editores a pantalla completa.
 */
export function PanelReferencia() {
  const { abierto, alternar, cerrar, pestana, cambiarPestana, fijados } = usarPanelReferencia();
  const { pathname } = useLocation();
  const editorCompleto = pathname.startsWith('/flujos/') || pathname.startsWith('/lienzos/');

  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key === '.') {
        evento.preventDefault();
        alternar();
      }
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [alternar]);

  return (
    <>
      <AnimatePresence>
        {!abierto && !editorCompleto && (
          <motion.button
            type="button"
            onClick={alternar}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            title="Panel de referencia (Ctrl+.)"
            aria-label="Abrir panel de referencia"
            className="fixed bottom-5 right-5 z-30 grid size-11 place-items-center rounded-full bg-primario text-sobre-primario shadow-flotante transition hover:scale-105"
          >
            <Pin className="size-[18px]" />
            {fijados.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-sky-500 text-[10px] font-semibold text-white ring-2 ring-fondo">
                {fijados.length}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {abierto && (
          <motion.aside
            aria-label="Panel de referencia"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className={unirClases(
              'fixed bottom-0 right-0 top-14 z-30 flex max-w-[100vw] flex-col border-l border-borde bg-superficie shadow-flotante xl:shadow-none',
              AnchoPanelReferencia,
            )}
          >
            <header className="flex items-center gap-1 border-b border-borde px-3 py-2">
              <div className="flex flex-1 gap-1" role="tablist">
                <Pestana activa={pestana === 'fijados'} icono={Pin} alPulsar={() => cambiarPestana('fijados')}>
                  Fijados
                  <span className="text-texto-3">{fijados.length}</span>
                </Pestana>
                <Pestana activa={pestana === 'notas'} icono={NotebookPen} alPulsar={() => cambiarPestana('notas')}>
                  Notas
                </Pestana>
                <Pestana activa={pestana === 'snippets'} icono={Braces} alPulsar={() => cambiarPestana('snippets')}>
                  Snippets
                </Pestana>
              </div>
              <BotonIcono icono={X} etiqueta="Cerrar panel (Ctrl+.)" tamano="sm" onClick={cerrar} />
            </header>
            {pestana === 'fijados' ? <ListaFijados /> : pestana === 'notas' ? <NotasRapidas /> : <ListaSnippetsCompacta />}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

function Pestana({ activa, icono: IconoPestana, alPulsar, children }: { activa: boolean; icono: Icono; alPulsar: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activa}
      onClick={alPulsar}
      className={unirClases(
        'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors',
        activa ? 'bg-superficie-2 text-texto' : 'text-texto-2 hover:text-texto',
      )}
    >
      <IconoPestana className="size-4" />
      {children}
    </button>
  );
}

// ---------- Fijados ----------

function ListaFijados() {
  const { fijados } = usarPanelReferencia();
  // Por defecto se despliega el primero (el último fijado).
  const [desplegado, setDesplegado] = useState<string | null>(() => (fijados[0] ? clave(fijados[0]) : null));

  if (fijados.length === 0)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <span className="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-500">
          <Pin className="size-5" />
        </span>
        <p className="text-sm font-medium">Nada fijado todavía</p>
        <p className="text-xs text-texto-2">
          Pulsa la chincheta <Pin className="inline size-3.5 align-text-bottom" /> en un documento, tarea, ticket, flujo o tarjeta de Trello para tenerlo aquí a
          mano mientras trabajas en otra cosa.
        </p>
      </div>
    );

  return (
    <ul className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
      {fijados.map((elemento, indice) => (
        <li key={clave(elemento)}>
          <TarjetaFijado
            elemento={elemento}
            esPrimero={indice === 0}
            esUltimo={indice === fijados.length - 1}
            desplegado={desplegado === clave(elemento)}
            alAlternar={() => setDesplegado((actual) => (actual === clave(elemento) ? null : clave(elemento)))}
          />
        </li>
      ))}
      <li className="pt-1 text-center text-[11px] text-texto-3">
        {fijados.length}/{MaximoFijados} fijados
      </li>
    </ul>
  );
}

const clave = (elemento: ElementoFijado) => `${elemento.tipo}:${elemento.id}`;

function TarjetaFijado({
  elemento,
  esPrimero,
  esUltimo,
  desplegado,
  alAlternar,
}: {
  elemento: ElementoFijado;
  esPrimero: boolean;
  esUltimo: boolean;
  desplegado: boolean;
  alAlternar: () => void;
}) {
  const navegar = useNavigate();
  const { quitarFijado, moverFijado } = usarPanelReferencia();
  const [tarjetaAbierta, setTarjetaAbierta] = useState<string | null>(null);
  const { icono: IconoTipo, tono, nombre } = iconos[elemento.tipo];

  function abrir() {
    if (elemento.tipo === 'TarjetaTrello') setTarjetaAbierta(elemento.id);
    else navegar(rutaDeEntidad(elemento.tipo, elemento.id));
  }

  return (
    <article className="group overflow-hidden rounded-xl border border-borde bg-superficie">
      <div className="flex items-center gap-1 pr-1">
        <button type="button" onClick={alAlternar} aria-expanded={desplegado} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left">
          <IconoTipo className={unirClases('size-4 shrink-0', tono)} aria-label={nombre} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{elemento.titulo || nombre}</span>
          <ChevronDown className={unirClases('size-4 shrink-0 text-texto-3 transition-transform', desplegado && 'rotate-180')} />
        </button>
        <span className="flex opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {!esPrimero && <BotonIcono icono={ArrowUp} etiqueta="Subir" tamano="sm" className="size-7" onClick={() => moverFijado(elemento.tipo, elemento.id, -1)} />}
          {!esUltimo && <BotonIcono icono={ArrowDown} etiqueta="Bajar" tamano="sm" className="size-7" onClick={() => moverFijado(elemento.tipo, elemento.id, 1)} />}
          <BotonIcono icono={ExternalLink} etiqueta="Abrir" tamano="sm" className="size-7" onClick={abrir} />
          <BotonIcono icono={PinOff} etiqueta="Quitar del panel" tamano="sm" className="size-7 hover:text-peligro" onClick={() => quitarFijado(elemento.tipo, elemento.id)} />
        </span>
      </div>
      {desplegado && (
        <div className="max-h-[22rem] overflow-y-auto border-t border-borde px-3 py-2.5">
          <VistaPrevia elemento={elemento} alAbrir={abrir} />
        </div>
      )}
      {elemento.tipo === 'TarjetaTrello' && <ModalTarjetaTrello idTarjeta={tarjetaAbierta} alCerrar={() => setTarjetaAbierta(null)} />}
    </article>
  );
}

// ---------- Vistas previas (solo lectura) ----------

interface Previa {
  /** Línea de datos bajo el título (clave, estado, vencimiento…). */
  meta: ReactNode;
  contenido: string | null;
  vacio: string;
}

/** Pide el elemento al desplegarlo; "Actualizar" vuelve a pedirlo. */
function VistaPrevia({ elemento, alAbrir }: { elemento: ElementoFijado; alAbrir: () => void }) {
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [error, setError] = useState(false);
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    let vigente = true;
    setError(false);
    cargarPrevia(elemento)
      .then((datos) => vigente && setPrevia(datos))
      .catch(() => vigente && setError(true));
    return () => {
      vigente = false;
    };
  }, [elemento, vuelta]);

  if (error)
    return (
      <p className="text-xs text-texto-2">
        No se pudo cargar: puede que se haya borrado o que ya no tengas acceso.{' '}
        <button type="button" onClick={() => setVuelta((actual) => actual + 1)} className="font-medium text-acento hover:underline">
          Reintentar
        </button>
      </p>
    );
  if (!previa)
    return (
      <p className="flex items-center gap-2 text-xs text-texto-3">
        <Loader2 className="size-3.5 animate-spin" /> Cargando…
      </p>
    );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-texto-2">
        {previa.meta}
        <button type="button" onClick={() => setVuelta((actual) => actual + 1)} aria-label="Actualizar" title="Actualizar" className="ml-auto text-texto-3 hover:text-texto">
          <RefreshCw className="size-3.5" />
        </button>
      </div>
      {previa.contenido?.trim() ? (
        <div className="text-[13px] [&_.contenido-markdown]:text-[13px]">
          <VistaMarkdown contenido={previa.contenido} />
        </div>
      ) : (
        <p className="text-xs text-texto-3">{previa.vacio}</p>
      )}
      <button type="button" onClick={alAbrir} className="self-start text-xs font-medium text-acento hover:underline">
        Abrir completo →
      </button>
    </div>
  );
}

async function cargarPrevia(elemento: ElementoFijado): Promise<Previa> {
  switch (elemento.tipo) {
    case 'Documento': {
      const documento = await apiDocumentos.obtener(elemento.id);
      return { meta: <span>Editado {formatearRelativo(documento.fechaActualizacion)}</span>, contenido: documento.contenidoMarkdown, vacio: 'Documento vacío.' };
    }
    case 'Tarea': {
      const tarea = await apiTareas.obtener(elemento.id);
      return {
        meta: (
          <>
            <span className="font-mono">{tarea.resumen.clave}</span>
            <span>· {tarea.resumen.estado}</span>
            {tarea.resumen.fechaVencimiento && <span>· vence {new Date(tarea.resumen.fechaVencimiento).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>}
          </>
        ),
        contenido: tarea.descripcionMarkdown,
        vacio: 'Sin descripción.',
      };
    }
    case 'Ticket': {
      const ticket = await apiTickets.obtener(elemento.id);
      return {
        meta: (
          <>
            <span className="font-mono">{ticket.resumen.clave}</span>
            <span>· {ticket.resumen.estado}</span>
          </>
        ),
        contenido: [ticket.descripcionMarkdown, ticket.documentacionMarkdown && `---\n\n**Documentación**\n\n${ticket.documentacionMarkdown}`].filter(Boolean).join('\n\n'),
        vacio: 'Sin descripción.',
      };
    }
    case 'Flujo': {
      const flujo = await apiFlujos.obtener(elemento.id);
      return { meta: <span>{flujo.sistema ?? 'Sin sistema'}</span>, contenido: flujo.descripcion, vacio: 'Sin descripción. Ábrelo para ver el diagrama.' };
    }
    case 'TarjetaTrello': {
      const tarjeta = await apiTrello.tarjeta(elemento.id);
      return {
        meta: (
          <>
            <span className="truncate">
              {tarjeta.nombreTablero} · {tarjeta.nombreLista}
            </span>
            {tarjeta.vencimiento && <InsigniaVencimiento vencimiento={tarjeta.vencimiento} completado={tarjeta.vencimientoCompletado} />}
          </>
        ),
        contenido: tarjeta.descripcion,
        vacio: 'Sin descripción.',
      };
    }
  }
}

// ---------- Notas ----------

const textoGuardado: Record<string, string> = { guardado: 'Guardado', pendiente: 'Sin guardar…', guardando: 'Guardando…', error: 'No se pudo guardar' };

/** Bloc de notas rápido: texto plano que se guarda solo en el servidor (sirve en cualquier dispositivo). */
function NotasRapidas() {
  const { notas, cambiarNotas, guardandoNotas } = usarPanelReferencia();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <textarea
        value={notas}
        onChange={(evento) => cambiarNotas(evento.target.value)}
        maxLength={MaximoNotas}
        spellCheck={false}
        autoFocus
        placeholder={'Apunta aquí lo que necesitas tener a mano: un ID, una consulta SQL, un número de ticket…\n\nSe guarda solo.'}
        aria-label="Notas rápidas"
        className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed placeholder:font-sans placeholder:text-texto-3 focus:outline-none"
      />
      <p className={unirClases('flex items-center justify-between border-t border-borde px-4 py-1.5 text-[11px]', guardandoNotas === 'error' ? 'text-peligro' : 'text-texto-3')}>
        <span>{textoGuardado[guardandoNotas]}</span>
        <span className="tabular-nums">{notas.length.toLocaleString('es')} caracteres</span>
      </p>
    </div>
  );
}
