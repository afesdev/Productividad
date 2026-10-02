import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import { CornerDownLeft, ListChecks, ListPlus, Loader2, NotebookPen, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { apiDiario, apiIa, type AccionTextoIA, type DatosEntradaDiario } from '../../servicios/api';
import { obtenerMensajeError } from '../../servicios/clienteApi';
import { notificar } from '../../servicios/notificaciones';
import type { EntradaDiarioDto, TipoEntradaDiario } from '../../servicios/tipos';
import { VistaMarkdown } from '../../componentes/VistaMarkdown';
import { etiquetasAccionIA } from '../../componentes/editor/EditorRico';
import { revisarPropuestaIA } from '../../componentes/editor/RevisionIA';
import { usarConfirmacion } from '../../componentes/ui/DialogoConfirmacion';
import { Modal } from '../../componentes/ui/Modal';
import { AreaTexto, Boton, BotonIcono, Campo, Casilla, Entrada, MensajeError, unirClases } from '../../componentes/ui/primitivos';
import { ModalConvertirEnTarea } from './ModalConvertirEnTarea';
import { guardarUltimoTablero, leerUltimoTablero, SelectorTablero, usarTablerosReporte } from '../reporte/tablerosReporte';
import { accionesIADiario, configuracionTipo, formatearHora, interpretarCaptura, normalizarHora, tiposEntrada } from './presentacionDiario';

export interface ManejadorCaptura {
  enfocar: () => void;
}

/** Barra de captura rápida: chips de tipo + texto con prefijos ("d: …", "e: 10-11 …"). Enter guarda. */
export const BarraCaptura = forwardRef<ManejadorCaptura, { fecha: string; alCrear: () => Promise<void> }>(function BarraCaptura({ fecha, alCrear }, referencia) {
  const [tipo, setTipo] = useState<TipoEntradaDiario>('Nota');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [tableroElegido, setTableroElegido] = useState<string | null>(leerUltimoTablero);
  const campo = useRef<HTMLInputElement>(null);
  const tableros = usarTablerosReporte();
  // El último tablero guardado puede haberse archivado o borrado: entonces no se propone.
  const tablero = tableros?.some((opcion) => opcion.id === tableroElegido && !opcion.estaArchivado) ? tableroElegido : null;

  useImperativeHandle(referencia, () => ({ enfocar: () => campo.current?.focus() }), []);

  const vistaPrevia = texto.trim() ? interpretarCaptura(texto, tipo) : null;

  async function enviar(evento?: FormEvent) {
    evento?.preventDefault();
    const captura = interpretarCaptura(texto, tipo);
    if (!captura || enviando) return;
    setEnviando(true);
    try {
      // Solo las entradas con hora van al reporte de actividades: solo esas llevan tablero.
      await apiDiario.crearEntrada(fecha, { ...captura, completada: false, tableroReporteId: captura.horaInicio ? tablero : null });
      setTexto('');
      await alCrear();
    } catch (errorCreacion) {
      notificar.error('No se pudo registrar', errorCreacion);
    } finally {
      setEnviando(false);
      campo.current?.focus();
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-2 rounded-2xl border border-borde bg-superficie p-3 shadow-tarjeta focus-within:border-violet-200 focus-within:ring-3 focus-within:ring-violet-100">
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Tipo de entrada">
        {tiposEntrada.map((opcion) => {
          const { icono: IconoTipo, etiqueta, chip } = configuracionTipo[opcion];
          const activo = (vistaPrevia?.tipo ?? tipo) === opcion;
          return (
            <button
              key={opcion}
              type="button"
              role="radio"
              aria-checked={tipo === opcion}
              onClick={() => {
                setTipo(opcion);
                campo.current?.focus();
              }}
              className={unirClases(
                'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition',
                activo ? chip : 'border-transparent text-texto-2 hover:bg-superficie-2',
              )}
            >
              <IconoTipo className="size-3.5" />
              {etiqueta}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <input
          ref={campo}
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          maxLength={400}
          aria-label="Registrar en el diario"
          placeholder='¿Qué pasó? "d: usar **Redis** | por latencia" · "e: 10-11 daily" · admite Markdown'
          className="h-10 min-w-0 flex-1 bg-transparent px-1 text-[15px] placeholder:text-texto-3 focus:outline-none"
        />
        <Boton type="submit" tamano="sm" icono={CornerDownLeft} cargando={enviando} disabled={!vistaPrevia}>
          Registrar
        </Boton>
      </div>
      {vistaPrevia && (vistaPrevia.horaInicio || vistaPrevia.detalleMarkdown) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-xs text-texto-3">
            {configuracionTipo[vistaPrevia.tipo].etiqueta}
            {vistaPrevia.horaInicio && ` · ${formatearHora(vistaPrevia.horaInicio)}${vistaPrevia.horaFin ? `–${formatearHora(vistaPrevia.horaFin)}` : ''}`}
            {vistaPrevia.detalleMarkdown && ' · con detalle'}
          </p>
          {vistaPrevia.horaInicio && (
            <SelectorTablero
              compacto
              valor={tablero}
              alCambiar={(id) => {
                setTableroElegido(id);
                guardarUltimoTablero(id);
                campo.current?.focus();
              }}
            />
          )}
        </div>
      )}
    </form>
  );
});

/** Línea de tiempo del día. */
export function ListaEntradas({ entradas, alCambiar }: { entradas: EntradaDiarioDto[]; alCambiar: () => Promise<void> }) {
  const confirmar = usarConfirmacion();
  const [edicion, setEdicion] = useState<EntradaDiarioDto | null>(null);
  const [aConvertir, setAConvertir] = useState<EntradaDiarioDto | null>(null);

  async function alternarCompletada(entrada: EntradaDiarioDto) {
    try {
      await apiDiario.actualizarEntrada(entrada.id, { ...aDatos(entrada), completada: !entrada.completada });
      await alCambiar();
    } catch (errorActualizacion) {
      notificar.error('No se pudo actualizar', errorActualizacion);
    }
  }

  async function eliminar(entrada: EntradaDiarioDto) {
    const confirmado = await confirmar({ titulo: 'Eliminar entrada', descripcion: `Se eliminará "${entrada.titulo}".`, textoConfirmar: 'Eliminar', peligrosa: true });
    if (!confirmado) return;
    try {
      await apiDiario.eliminarEntrada(entrada.id);
      await alCambiar();
    } catch (errorEliminacion) {
      notificar.error('No se pudo eliminar', errorEliminacion);
    }
  }

  if (entradas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-borde bg-zinc-50 py-8 px-4">
        <div className="grid size-12 place-items-center rounded-full bg-zinc-100">
          <NotebookPen className="size-5 text-zinc-400" />
        </div>
        <p className="text-center text-sm text-texto-3">Aún no hay entradas.<br />Registra eventos, decisiones o aprendizajes.</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        {/* Línea vertical que une los iconos de tipo (centrada en su recuadro de 24px). */}
        <div className="absolute bottom-3 left-[11px] top-3 w-0.5 rounded-full bg-gradient-to-b from-violet-200 via-zinc-200 to-transparent" aria-hidden />
        <AnimatePresence initial={false}>
          {entradas.map((entrada) => (
            <motion.div
              key={entrada.id}
              layout
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4, height: 0 }}
              className="group relative flex flex-col gap-1 py-2.5"
            >
              <TarjetaEntrada entrada={entrada} alAlternar={() => void alternarCompletada(entrada)} />
              <span className="flex h-0 items-center gap-1 overflow-hidden pl-9 opacity-0 transition-all group-hover:h-7 group-hover:opacity-100 focus-within:h-7 focus-within:opacity-100">
                  <BotonIcono icono={Pencil} etiqueta="Editar entrada" tamano="sm" onClick={() => setEdicion(entrada)} />
                  {!entrada.tareaId && <BotonIcono icono={ListPlus} etiqueta="Convertir en tarea" tamano="sm" onClick={() => setAConvertir(entrada)} />}
                  <BotonIcono icono={Trash2} etiqueta="Eliminar entrada" tamano="sm" className="hover:text-peligro" onClick={() => void eliminar(entrada)} />
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <ModalConvertirEnTarea
        entrada={aConvertir}
        alCerrar={() => setAConvertir(null)}
        alConvertir={async () => {
          setAConvertir(null);
          await alCambiar();
        }}
      />
      <ModalEntrada
        entrada={edicion}
        alCerrar={() => setEdicion(null)}
        alGuardar={async () => {
          setEdicion(null);
          await alCambiar();
        }}
      />
    </>
  );
}

/** Una entrada: hora, icono del tipo, título y detalle. Se reutiliza en la vista Explorar. */
export function TarjetaEntrada({ entrada, alAlternar }: { entrada: EntradaDiarioDto; alAlternar?: () => void }) {
  const { icono: IconoTipo, recuadro, etiqueta } = configuracionTipo[entrada.tipo];
  const tachada = entrada.tipo === 'Tarea' && entrada.completada;
  return (
    <div className="relative flex min-w-0 flex-1 gap-3">
      {entrada.tipo === 'Tarea' && alAlternar ? (
        <button
          type="button"
          onClick={alAlternar}
          aria-label={entrada.completada ? `Marcar pendiente: ${entrada.titulo}` : `Completar: ${entrada.titulo}`}
          className={unirClases('grid size-6 shrink-0 place-items-center rounded-lg ring-4 ring-superficie transition', recuadro, 'hover:ring-violet-100')}
        >
          <input type="checkbox" readOnly tabIndex={-1} checked={entrada.completada} className="pointer-events-none size-3 accent-violet-600" />
        </button>
      ) : (
        <span className={unirClases('grid size-6 shrink-0 place-items-center rounded-lg ring-4 ring-superficie', recuadro)} title={etiqueta}>
          <IconoTipo className="size-3.5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        {entrada.horaInicio && (
          <span className="block font-mono text-[11px] font-medium leading-4 text-texto-3">
            {formatearHora(entrada.horaInicio)}
            {entrada.horaFin && `–${formatearHora(entrada.horaFin)}`}
          </span>
        )}
        {/* overflow-wrap:anywhere parte URLs y palabras largas en vez de desbordar la columna. */}
        <p className={unirClases('text-[14px] leading-snug [overflow-wrap:anywhere]', tachada && 'text-texto-3 line-through')}>
          <MarkdownEnLinea texto={entrada.titulo} />
          {entrada.tareaId && entrada.claveTarea && (
            <Link
              to={`/tareas/${entrada.tareaId}`}
              title="Tarea creada desde esta entrada"
              className="ml-1.5 inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 align-middle font-mono text-[11px] text-violet-700 no-underline hover:bg-violet-100"
            >
              <ListChecks className="size-3" />
              {entrada.claveTarea}
            </Link>
          )}
        </p>
        {entrada.detalleMarkdown && (
          <div className="mt-1 text-texto-2 [overflow-wrap:anywhere] [&_.contenido-markdown]:text-[13px] [&_pre]:max-w-full">
            <VistaMarkdown contenido={entrada.detalleMarkdown} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Markdown de una sola línea para los títulos: **negrita**, *cursiva*, `código`, ~~tachado~~ y enlaces.
 * Sin bloques (títulos, listas…) para que la línea de tiempo se mantenga compacta; no ejecuta HTML.
 */
export function MarkdownEnLinea({ texto }: { texto: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      allowedElements={['p', 'strong', 'em', 'del', 'code', 'a']}
      unwrapDisallowed
      components={{
        p: ({ children }) => <>{children}</>,
        code: ({ children }) => <code className="rounded bg-superficie-2 px-1 py-0.5 font-mono text-[0.85em] text-orange-700">{children}</code>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-acento underline underline-offset-2">
            {children}
          </a>
        ),
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
      }}
    >
      {texto}
    </ReactMarkdown>
  );
}

const aDatos = (entrada: EntradaDiarioDto): DatosEntradaDiario => ({
  tipo: entrada.tipo,
  titulo: entrada.titulo,
  detalleMarkdown: entrada.detalleMarkdown,
  horaInicio: entrada.horaInicio,
  horaFin: entrada.horaFin,
  completada: entrada.completada,
  tableroReporteId: entrada.tableroReporteId,
});

function ModalEntrada({ entrada, alCerrar, alGuardar }: { entrada: EntradaDiarioDto | null; alCerrar: () => void; alGuardar: () => Promise<void> }) {
  const [datos, setDatos] = useState<DatosEntradaDiario | null>(null);
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const areaDetalle = useRef<HTMLTextAreaElement>(null);
  const [conSeleccion, setConSeleccion] = useState(false);
  const [procesandoIA, setProcesandoIA] = useState<AccionTextoIA | null>(null);

  useEffect(() => {
    if (!entrada) return;
    setDatos(aDatos(entrada));
    setInicio(formatearHora(entrada.horaInicio));
    setFin(formatearHora(entrada.horaFin));
    setError(null);
  }, [entrada]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!entrada || !datos) return;
    const horaInicio = inicio ? normalizarHora(inicio) : null;
    const horaFin = fin ? normalizarHora(fin) : null;
    if ((inicio && !horaInicio) || (fin && !horaFin)) {
      setError('Hora no válida (usa HH:mm).');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await apiDiario.actualizarEntrada(entrada.id, { ...datos, titulo: datos.titulo.trim(), detalleMarkdown: datos.detalleMarkdown?.trim() || null, horaInicio, horaFin });
      await alGuardar();
    } catch (errorGuardado) {
      setError(obtenerMensajeError(errorGuardado));
    } finally {
      setEnviando(false);
    }
  }

  /** Sin selección reescribe todo el detalle; con selección, solo ese fragmento (conserva los espacios de los bordes). */
  async function usarIA(accion: AccionTextoIA) {
    if (!datos || procesandoIA) return;
    const texto = datos.detalleMarkdown ?? '';
    const area = areaDetalle.current;
    const [inicioSel, finSel] = area && area.selectionStart !== area.selectionEnd ? [area.selectionStart, area.selectionEnd] : [0, texto.length];
    const fragmento = texto.slice(inicioSel, finSel);
    const original = fragmento.trim();
    if (!original) {
      notificar.aviso('No hay texto', 'Escribe el detalle para usar la IA.');
      return;
    }
    const antes = texto.slice(0, inicioSel) + fragmento.slice(0, fragmento.length - fragmento.trimStart().length);
    const despues = fragmento.slice(fragmento.trimEnd().length) + texto.slice(finSel);

    setProcesandoIA(accion);
    const peticion = apiIa.transformarTexto(accion, original);
    notificar.promesa(peticion, { cargando: etiquetasAccionIA[accion].cargando, exito: 'Propuesta lista para revisar', error: 'La IA no pudo procesar el texto' });
    try {
      const resultado = (await peticion).trim();
      if (await revisarPropuestaIA({ accion, titulo: etiquetasAccionIA[accion].etiqueta, original, resultado })) {
        setDatos((actual) => actual && { ...actual, detalleMarkdown: antes + resultado + despues });
        setConSeleccion(false);
        notificar.exito('Cambios aplicados', 'Pulsa Guardar para conservarlos');
      }
    } catch {
      // notificar.promesa ya mostró el error.
    } finally {
      setProcesandoIA(null);
    }
  }

  // Ctrl/⌘ + Enter guarda desde el detalle.
  const alPresionar = (evento: KeyboardEvent) => {
    if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) void enviar(evento as unknown as FormEvent);
  };

  return (
    <Modal
      abierto={entrada !== null}
      alCerrar={alCerrar}
      titulo="Editar entrada"
      pie={
        <>
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="formulario-entrada" cargando={enviando}>
            Guardar
          </Boton>
        </>
      }
    >
      {datos && (
        <form id="formulario-entrada" onSubmit={enviar} onKeyDown={alPresionar} className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Tipo">
            {tiposEntrada.map((opcion) => {
              const { icono: IconoTipo, etiqueta, chip } = configuracionTipo[opcion];
              return (
                <button
                  key={opcion}
                  type="button"
                  role="radio"
                  aria-checked={datos.tipo === opcion}
                  onClick={() => setDatos({ ...datos, tipo: opcion })}
                  className={unirClases(
                    'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium',
                    datos.tipo === opcion ? chip : 'border-borde text-texto-2 hover:bg-superficie-2',
                  )}
                >
                  <IconoTipo className="size-3.5" />
                  {etiqueta}
                </button>
              );
            })}
          </div>
          <Campo etiqueta="Título">
            <Entrada required autoFocus maxLength={500} value={datos.titulo} onChange={(evento) => setDatos({ ...datos, titulo: evento.target.value })} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Desde">
              <Entrada type="time" value={inicio} onChange={(evento) => setInicio(evento.target.value)} />
            </Campo>
            <Campo etiqueta="Hasta">
              <Entrada type="time" value={fin} onChange={(evento) => setFin(evento.target.value)} />
            </Campo>
          </div>
          {inicio && (
            <Campo etiqueta="Tablero de Trello" ayuda="Para el reporte de actividades de la empresa.">
              <SelectorTablero
                valor={datos.tableroReporteId ?? null}
                alCambiar={(id) => {
                  setDatos({ ...datos, tableroReporteId: id });
                  guardarUltimoTablero(id);
                }}
              />
            </Campo>
          )}
          <Campo etiqueta="Detalle (Markdown)" ayuda={datos.tipo === 'Decision' ? 'Contexto, alternativas y por qué.' : datos.tipo === 'Aprendizaje' ? 'Qué aprendiste y la fuente.' : undefined}>
            <AreaTexto
              ref={areaDetalle}
              rows={5}
              maxLength={20000}
              readOnly={procesandoIA !== null}
              value={datos.detalleMarkdown ?? ''}
              onChange={(evento) => setDatos({ ...datos, detalleMarkdown: evento.target.value })}
              onSelect={(evento) => setConSeleccion(evento.currentTarget.selectionStart !== evento.currentTarget.selectionEnd)}
              className="font-mono text-[13px]"
            />
          </Campo>
          <div className="-mt-2 flex flex-wrap items-center gap-2">
            <Sparkles className="size-3.5 text-violet-600" aria-hidden />
            {accionesIADiario.map(({ accion, etiqueta, icono: IconoAccion }) => (
              <button
                key={accion}
                type="button"
                disabled={procesandoIA !== null || !datos.detalleMarkdown?.trim()}
                onMouseDown={(evento) => evento.preventDefault()}
                onClick={() => void usarIA(accion)}
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-50"
              >
                {procesandoIA === accion ? <Loader2 className="size-3.5 animate-spin" /> : <IconoAccion className="size-3.5" />}
                {etiqueta}
              </button>
            ))}
            <span className="text-xs text-texto-3">{conSeleccion ? 'Solo el texto seleccionado' : 'Todo el detalle'}</span>
          </div>
          {datos.tipo === 'Tarea' && <Casilla etiqueta="Completada" checked={datos.completada} onChange={(evento) => setDatos({ ...datos, completada: evento.target.checked })} />}
          <MensajeError mensaje={error} />
        </form>
      )}
    </Modal>
  );
}
