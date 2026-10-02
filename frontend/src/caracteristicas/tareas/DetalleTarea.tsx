import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  CalendarDays,
  CircleDot,
  Clock,
  FileText,
  Flag,
  Grid2x2,
  Link2,
  ListChecks,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { apiArchivos, apiTareas, type CambiosTarea } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import type { ArchivoAdjuntoDto, BacklinkDto, EstadoTarea, Prioridad, TareaDetalleDto, TareaResumenDto } from '../../servicios/tipos';
import { EditorRico, type ManejadorEditorRico } from '../../componentes/editor/EditorRico';
import { usarWikiLinks } from '../../componentes/editor/usarWikiLinks';
import { usarConfirmacion } from '../../componentes/ui/DialogoConfirmacion';
import { BotonCronometro } from '../tiempo/ControlesCronometro';
import { BotonMarcador } from '../marcadores/ContextoMarcadores';
import { Boton, BotonIcono, Casilla, Esqueleto, unirClases, type Icono } from '../../componentes/ui/primitivos';

const estados: { valor: EstadoTarea; etiqueta: string }[] = [
  { valor: 'Pendiente', etiqueta: 'Pendiente' },
  { valor: 'EnProgreso', etiqueta: 'En progreso' },
  { valor: 'Completada', etiqueta: 'Completada' },
  { valor: 'Cancelada', etiqueta: 'Cancelada' },
];
const prioridades: Prioridad[] = ['Baja', 'Media', 'Alta', 'Urgente'];

interface PropiedadesDetalle {
  tareaId: string;
  modoPagina?: boolean;
  alCerrar: () => void;
  alAbrirTarea: (id: string) => void;
  alCambiar: (tareaId: string, resumen: TareaResumenDto | null) => void;
}

const clasesSelectorEnLinea = 'h-8 rounded-md border border-transparent bg-transparent px-2 text-sm hover:border-borde hover:bg-superficie focus:border-acento focus:outline-none';

export function DetalleTarea({ tareaId, modoPagina = false, alCerrar, alAbrirTarea, alCambiar }: PropiedadesDetalle) {
  const confirmar = usarConfirmacion();
  const [detalle, setDetalle] = useState<TareaDetalleDto | null>(null);
  const [backlinks, setBacklinks] = useState<BacklinkDto[]>([]);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async (): Promise<TareaDetalleDto | null> => {
    try {
      const [tarea, enlacesEntrantes] = await Promise.all([apiTareas.obtener(tareaId), apiTareas.backlinks(tareaId)]);
      setDetalle(tarea);
      setBacklinks(enlacesEntrantes);
      return tarea;
    } catch (errorCarga) {
      notificar.error('No se pudo cargar la tarea', errorCarga);
      return null;
    }
  }, [tareaId]);

  useEffect(() => {
    setDetalle(null);
    void cargar();
  }, [cargar]);

  useEffect(() => {
    const alPresionarTecla = (evento: KeyboardEvent) => {
      const escribiendo =
        evento.target instanceof HTMLTextAreaElement ||
        evento.target instanceof HTMLInputElement ||
        (evento.target instanceof HTMLElement && evento.target.isContentEditable);
      if (evento.key === 'Escape' && !escribiendo) alCerrar();
    };
    window.addEventListener('keydown', alPresionarTecla);
    return () => window.removeEventListener('keydown', alPresionarTecla);
  }, [alCerrar]);

  /** Devuelve si se guardó, para que la edición en curso no se cierre con cambios perdidos. */
  async function guardar(parcial: Partial<CambiosTarea>): Promise<boolean> {
    if (!detalle) return false;
    const cambios: CambiosTarea = {
      titulo: detalle.resumen.titulo,
      descripcionMarkdown: detalle.descripcionMarkdown,
      prioridad: detalle.resumen.prioridad,
      esUrgente: detalle.resumen.esUrgente,
      esImportante: detalle.resumen.esImportante,
      fechaVencimiento: detalle.resumen.fechaVencimiento,
      horasEstimadas: detalle.horasEstimadas,
      ...parcial,
    };
    setGuardando(true);
    try {
      const resumen = await apiTareas.actualizar(tareaId, cambios);
      setDetalle({ ...detalle, resumen, descripcionMarkdown: cambios.descripcionMarkdown, horasEstimadas: cambios.horasEstimadas });
      alCambiar(tareaId, resumen);
      if (parcial.descripcionMarkdown !== undefined) setBacklinks(await apiTareas.backlinks(tareaId));
      return true;
    } catch (errorGuardado) {
      notificar.error('No se guardaron los cambios', errorGuardado);
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(estado: EstadoTarea) {
    if (!detalle) return;
    try {
      const resumen = await apiTareas.cambiarEstado(tareaId, estado);
      setDetalle({ ...detalle, resumen });
      alCambiar(tareaId, resumen);
      if (estado === 'Completada') notificar.exito('Tarea completada', detalle.resumen.titulo);
    } catch (errorEstado) {
      notificar.error('No se pudo cambiar el estado', errorEstado);
    }
  }

  async function eliminar() {
    if (!detalle) return;
    const aviso = detalle.subtareas.length > 0 ? ` y sus ${detalle.subtareas.length} subtareas` : '';
    const confirmado = await confirmar({
      titulo: `Eliminar ${detalle.resumen.clave}`,
      descripcion: `Se eliminará "${detalle.resumen.titulo}"${aviso}, con sus adjuntos y registros de tiempo. No se puede deshacer.`,
      textoConfirmar: 'Eliminar tarea',
      peligrosa: true,
    });
    if (!confirmado) return;
    try {
      await apiTareas.eliminar(tareaId);
      alCambiar(tareaId, null);
      notificar.exito('Tarea eliminada', detalle.resumen.clave);
      alCerrar();
    } catch (errorEliminacion) {
      notificar.error('No se pudo eliminar la tarea', errorEliminacion);
    }
  }

  function renderContenido() {
    if (!detalle) return null;
    return (
      <>
        <TituloEditable key={detalle.resumen.id} valor={detalle.resumen.titulo} alGuardar={async (titulo) => { await guardar({ titulo }); }} />

        <dl className="grid grid-cols-[130px_1fr] items-center gap-x-3 gap-y-1 text-sm">
          <Propiedad icono={CircleDot} etiqueta="Estado">
            <select value={detalle.resumen.estado} onChange={(evento) => void cambiarEstado(evento.target.value as EstadoTarea)} className={clasesSelectorEnLinea}>
              {estados.map((estado) => (
                <option key={estado.valor} value={estado.valor}>{estado.etiqueta}</option>
              ))}
            </select>
          </Propiedad>

          <Propiedad icono={Flag} etiqueta="Prioridad">
            <select value={detalle.resumen.prioridad} onChange={(evento) => void guardar({ prioridad: evento.target.value as Prioridad })} className={clasesSelectorEnLinea}>
              {prioridades.map((prioridad) => (
                <option key={prioridad}>{prioridad}</option>
              ))}
            </select>
          </Propiedad>

          <Propiedad icono={Grid2x2} etiqueta="Eisenhower">
            <div className="flex flex-wrap items-center gap-4 px-2 py-1.5">
              <Casilla etiqueta="Urgente" checked={detalle.resumen.esUrgente} onChange={(evento) => void guardar({ esUrgente: evento.target.checked })} />
              <Casilla etiqueta="Importante" checked={detalle.resumen.esImportante} onChange={(evento) => void guardar({ esImportante: evento.target.checked })} />
              <span className="text-xs text-texto-3">{detalle.resumen.cuadrante}</span>
            </div>
          </Propiedad>

          <Propiedad icono={CalendarDays} etiqueta="Vence">
            <input type="date" value={aFechaInput(detalle.resumen.fechaVencimiento)} onChange={(evento) => void guardar({ fechaVencimiento: deFechaInput(evento.target.value) })} className={clasesSelectorEnLinea} />
          </Propiedad>

          <Propiedad icono={Clock} etiqueta="Estimación">
            <CampoHoras valor={detalle.horasEstimadas} alGuardar={async (horasEstimadas) => { await guardar({ horasEstimadas }); }} />
          </Propiedad>
        </dl>

        <SeccionDescripcion key={`${detalle.resumen.id}-descripcion`} tareaId={tareaId} valor={detalle.descripcionMarkdown ?? ''} alGuardar={(descripcionMarkdown) => guardar({ descripcionMarkdown: descripcionMarkdown || null })} />

        {!detalle.resumen.tareaPadreId && (
          <SeccionSubtareas detalle={detalle} alAbrirTarea={alAbrirTarea} alCambiar={async () => { const recargada = await cargar(); if (recargada) alCambiar(tareaId, recargada.resumen); }} />
        )}

        <SeccionAdjuntos tareaId={tareaId} adjuntos={detalle.adjuntos} alCambiar={(adjuntos) => setDetalle({ ...detalle, adjuntos })} />

        <Seccion icono={Link2} titulo="Referenciada en">
          {backlinks.length === 0 ? (
            <p className="text-sm text-texto-3">Nada enlaza esta tarea. Escribe <code className="rounded bg-superficie-2 px-1 font-mono text-xs">[[{detalle.resumen.clave}]]</code> en un documento.</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {backlinks.map((backlink) => (
                <li key={backlink.origenId}>
                  {backlink.tipoOrigen === 'Documento' ? (
                    <Link to={`/documentos/${backlink.origenId}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-superficie-2"><FileText className="size-4 text-texto-3" />{backlink.titulo}</Link>
                  ) : (
                    <button onClick={() => backlink.tipoOrigen === 'Tarea' && alAbrirTarea(backlink.origenId)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-superficie-2"><ListChecks className="size-4 text-texto-3" />{backlink.titulo}</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Seccion>

        <p className="border-t border-borde pt-4 text-xs text-texto-3">Creada {new Date(detalle.fechaCreacion).toLocaleString('es')} · Actualizada {new Date(detalle.fechaActualizacion).toLocaleString('es')}</p>
      </>
    );
  }

  if (modoPagina) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between gap-2 border-b border-borde bg-superficie/95 px-5 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2 text-sm text-texto-3">
            {detalle?.resumen.tareaPadreId && <Boton variante="fantasma" tamano="sm" icono={ArrowLeft} onClick={() => alAbrirTarea(detalle.resumen.tareaPadreId!)}>Tarea padre</Boton>}
            <span className="font-mono text-xs">{detalle?.resumen.clave}</span>
            {guardando && <Loader2 className="size-3.5 animate-spin" aria-label="Guardando" />}
          </div>
          <div className="flex items-center gap-1">
            {detalle && <BotonMarcador tipo="Tarea" id={tareaId} />}
            {detalle && <BotonCronometro tareaId={tareaId} className="mr-1" />}
            {detalle && <BotonIcono icono={Trash2} etiqueta="Eliminar tarea" onClick={() => void eliminar()} className="hover:text-peligro" />}
            <BotonIcono icono={X} etiqueta="Cerrar" onClick={alCerrar} />
          </div>
        </div>
        <div className="flex flex-col gap-6 px-6 py-5">{detalle ? renderContenido() : <div className="flex flex-col gap-3"><Esqueleto className="h-7 w-3/4" /><Esqueleto className="h-4 w-1/2" /><Esqueleto className="h-24 w-full" /></div>}</div>
      </div>
    );
  }

  return (
    <>
      <motion.div className="fixed inset-0 z-30 bg-zinc-950/10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={alCerrar} />
      <motion.aside aria-label="Detalle de la tarea" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }} className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col overflow-y-auto border-l border-borde bg-superficie shadow-flotante">
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between gap-2 border-b border-borde bg-superficie/90 px-5 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2 text-sm text-texto-3">
            {detalle?.resumen.tareaPadreId && <Boton variante="fantasma" tamano="sm" icono={ArrowLeft} onClick={() => alAbrirTarea(detalle.resumen.tareaPadreId!)}>Tarea padre</Boton>}
            <span className="font-mono text-xs">{detalle?.resumen.clave}</span>
            {guardando && <Loader2 className="size-3.5 animate-spin" aria-label="Guardando" />}
          </div>
          <div className="flex items-center gap-1">
            {detalle && <BotonMarcador tipo="Tarea" id={tareaId} />}
            {detalle && <BotonCronometro tareaId={tareaId} className="mr-1" />}
            {detalle && <BotonIcono icono={Trash2} etiqueta="Eliminar tarea" onClick={() => void eliminar()} className="hover:text-peligro" />}
            <BotonIcono icono={X} etiqueta="Cerrar" onClick={alCerrar} />
          </div>
        </div>
        <div className="flex flex-col gap-6 px-6 py-5">{detalle ? renderContenido() : <div className="flex flex-col gap-3"><Esqueleto className="h-7 w-3/4" /><Esqueleto className="h-4 w-1/2" /><Esqueleto className="h-24 w-full" /></div>}</div>
      </motion.aside>
    </>
  );
}

function Propiedad({ icono: IconoPropiedad, etiqueta, children }: { icono: Icono; etiqueta: string; children: ReactNode }) {
  return (
    <>
      <dt className="flex items-center gap-2 text-texto-2">
        <IconoPropiedad className="size-4 text-texto-3" />
        {etiqueta}
      </dt>
      <dd>{children}</dd>
    </>
  );
}

function Seccion({ icono: IconoSeccion, titulo, accion, children }: { icono: Icono; titulo: string; accion?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <IconoSeccion className="size-4 text-texto-3" />
        {titulo}
        {accion && <span className="ml-auto">{accion}</span>}
      </h3>
      {children}
    </section>
  );
}

function TituloEditable({ valor, alGuardar }: { valor: string; alGuardar: (titulo: string) => Promise<void> }) {
  const [titulo, setTitulo] = useState(valor);

  function confirmarTitulo() {
    const limpio = titulo.trim();
    if (!limpio) setTitulo(valor);
    else if (limpio !== valor) void alGuardar(limpio);
  }

  return (
    <textarea
      aria-label="Título"
      value={titulo}
      rows={1}
      maxLength={200}
      onChange={(evento) => setTitulo(evento.target.value.replace(/\n/g, ''))}
      onBlur={confirmarTitulo}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter') {
          evento.preventDefault();
          evento.currentTarget.blur();
        }
      }}
      className="field-sizing-content -mx-2 w-full resize-none rounded-lg border border-transparent bg-transparent px-2 py-1 text-xl font-semibold leading-snug tracking-tight hover:bg-superficie-2 focus:border-acento focus:bg-superficie focus:outline-none"
    />
  );
}

function CampoHoras({ valor, alGuardar }: { valor: number | null; alGuardar: (horas: number | null) => Promise<void> }) {
  const [texto, setTexto] = useState(valor?.toString() ?? '');

  function confirmarHoras() {
    const numero = texto.trim() === '' ? null : Number(texto.replace(',', '.'));
    if (numero !== null && (Number.isNaN(numero) || numero < 0 || numero > 999.99)) {
      setTexto(valor?.toString() ?? '');
      notificar.aviso('Estimación no válida', 'Usa un número de horas entre 0 y 999,99.');
      return;
    }
    if (numero !== valor) void alGuardar(numero);
  }

  return (
    <span className="flex items-center gap-1.5">
      <input inputMode="decimal" value={texto} onChange={(evento) => setTexto(evento.target.value)} onBlur={confirmarHoras} placeholder="—" className={unirClases(clasesSelectorEnLinea, 'w-20 tabular-nums')} />
      <span className="text-texto-3">horas</span>
    </span>
  );
}

/**
 * Mismo editor visual que en Documentos: en lectura muestra la descripción (con sus imágenes) y
 * al editar se vuelve editable en el sitio, sin cambiar de vista.
 */
function SeccionDescripcion({ tareaId, valor, alGuardar }: { tareaId: string; valor: string; alGuardar: (descripcion: string) => Promise<boolean> }) {
  const editor = useRef<ManejadorEditorRico>(null);
  const opcionesWikiLinks = usarWikiLinks(tareaId);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  function empezarEdicion() {
    setEditando(true);
    requestAnimationFrame(() => editor.current?.enfocar());
  }

  function cancelar() {
    editor.current?.establecerMarkdown(valor);
    setEditando(false);
  }

  async function guardar() {
    const descripcion = editor.current?.obtenerMarkdown().trim() ?? '';
    if (descripcion === valor.trim()) {
      setEditando(false);
      return;
    }
    setGuardando(true);
    try {
      if (await alGuardar(descripcion)) setEditando(false);
    } finally {
      setGuardando(false);
    }
  }

  const vacia = !valor && !editando;

  return (
    <Seccion icono={FileText} titulo="Descripción" accion={!editando && valor ? <BotonIcono icono={Pencil} etiqueta="Editar descripción" tamano="sm" onClick={empezarEdicion} /> : undefined}>
      {vacia && (
        <button onClick={empezarEdicion} className="rounded-lg border border-dashed border-borde-fuerte px-3 py-4 text-left text-sm text-texto-3 transition hover:bg-superficie-2">Añade detalles; puedes pegar capturas de pantalla.</button>
      )}
      <div
        hidden={vacia}
        onDoubleClick={editando ? undefined : empezarEdicion}
        title={editando ? undefined : 'Doble clic para editar'}
        className={unirClases(
          'rounded-lg [&_.editor-rico]:text-sm',
          editando
            ? 'border border-acento px-4 py-3 ring-3 ring-acento/15 [&_.editor-rico]:min-h-[30vh] [&_.editor-rico]:pb-4'
            : '[&_.editor-rico]:min-h-0 [&_.editor-rico]:pb-0',
        )}
      >
        <EditorRico
          ref={editor}
          contenidoInicial={valor}
          alCambiar={() => undefined}
          editable={editando}
          destinoAdjuntos={{ tareaId }}
          wikiLinks={opcionesWikiLinks}
          placeholder='Describe la tarea… pega capturas con Ctrl+V, "/" para comandos'
        />
      </div>
      {editando && (
        <div className="flex justify-end gap-2">
          <Boton variante="secundario" tamano="sm" onClick={cancelar}>Cancelar</Boton>
          <Boton tamano="sm" cargando={guardando} onClick={() => void guardar()}>Guardar</Boton>
        </div>
      )}
    </Seccion>
  );
}

function SeccionSubtareas({ detalle, alAbrirTarea, alCambiar }: { detalle: TareaDetalleDto; alAbrirTarea: (id: string) => void; alCambiar: () => Promise<void> }) {
  const [titulo, setTitulo] = useState('');
  const { subtareas } = detalle;
  const completadas = subtareas.filter((subtarea) => subtarea.estado === 'Completada').length;

  async function ejecutar(accion: () => Promise<unknown>, mensajeError: string) {
    try {
      await accion();
      await alCambiar();
    } catch (errorAccion) {
      notificar.error(mensajeError, errorAccion);
    }
  }

  function crear(evento: FormEvent) {
    evento.preventDefault();
    if (!titulo.trim()) return;
    const nuevo = titulo.trim();
    setTitulo('');
    void ejecutar(() => apiTareas.crear({ listaTareaId: detalle.resumen.listaTareaId, tareaPadreId: detalle.resumen.id, titulo: nuevo, esUrgente: false, esImportante: false }), 'No se pudo crear la subtarea');
  }

  return (
    <Seccion icono={ListChecks} titulo="Subtareas" accion={subtareas.length > 0 ? <span className="text-xs tabular-nums text-texto-3">{completadas}/{subtareas.length}</span> : undefined}>
      {subtareas.length > 0 && <div className="h-1.5 overflow-hidden rounded-full bg-superficie-2" aria-hidden><motion.div className="h-full rounded-full bg-exito" initial={false} animate={{ width: `${(completadas / subtareas.length) * 100}%` }} /></div>}
      <ul className="flex flex-col">
        {subtareas.map((subtarea) => (
          <li key={subtarea.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-superficie-2">
            <input type="checkbox" aria-label={`Completar ${subtarea.titulo}`} className="size-4 accent-exito" checked={subtarea.estado === 'Completada'} onChange={(evento) => void ejecutar(() => apiTareas.cambiarEstado(subtarea.id, evento.target.checked ? 'Completada' : 'Pendiente'), 'No se pudo actualizar la subtarea')} />
            <button onClick={() => alAbrirTarea(subtarea.id)} className={unirClases('flex-1 truncate text-left text-sm', subtarea.estado === 'Completada' && 'text-texto-3 line-through')}>{subtarea.titulo}</button>
            <span className="font-mono text-xs text-texto-3">{subtarea.clave}</span>
          </li>
        ))}
      </ul>
      <form onSubmit={crear} className="flex items-center gap-2.5 rounded-md px-2 py-1 focus-within:bg-superficie-2">
        <Plus className="size-4 text-texto-3" />
        <input value={titulo} maxLength={200} onChange={(evento) => setTitulo(evento.target.value)} placeholder="Añadir subtarea y Enter" className="h-7 flex-1 bg-transparent text-sm placeholder:text-texto-3 focus:outline-none" />
      </form>
    </Seccion>
  );
}

function SeccionAdjuntos({ tareaId, adjuntos, alCambiar }: { tareaId: string; adjuntos: ArchivoAdjuntoDto[]; alCambiar: (adjuntos: ArchivoAdjuntoDto[]) => void }) {
  const confirmar = usarConfirmacion();
  const referenciaArchivo = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);

  async function subir(archivos: FileList | null) {
    if (!archivos?.length) return;
    setSubiendo(true);
    try {
      const subida = Promise.all(Array.from(archivos).map((archivo) => apiArchivos.subir(archivo, { tareaId })));
      const nuevos = await notificar.promesa(subida, { cargando: 'Subiendo archivos…', exito: (resultado) => (resultado.length === 1 ? 'Archivo adjuntado' : `${resultado.length} archivos adjuntados`), error: 'No se pudo subir el archivo' });
      alCambiar([...nuevos, ...adjuntos]);
    } catch {
    } finally {
      setSubiendo(false);
      if (referenciaArchivo.current) referenciaArchivo.current.value = '';
    }
  }

  async function eliminar(adjunto: ArchivoAdjuntoDto) {
    const confirmado = await confirmar({ titulo: 'Eliminar adjunto', descripcion: `Se eliminará "${adjunto.nombreArchivo}".`, textoConfirmar: 'Eliminar', peligrosa: true });
    if (!confirmado) return;
    try {
      await apiArchivos.eliminar(adjunto.id);
      alCambiar(adjuntos.filter((existente) => existente.id !== adjunto.id));
      notificar.exito('Adjunto eliminado', adjunto.nombreArchivo);
    } catch (errorEliminacion) {
      notificar.error('No se pudo eliminar el adjunto', errorEliminacion);
    }
  }

  return (
    <Seccion icono={Paperclip} titulo="Adjuntos" accion={<Boton variante="fantasma" tamano="sm" icono={Plus} cargando={subiendo} onClick={() => referenciaArchivo.current?.click()}>Adjuntar</Boton>}>
      <input ref={referenciaArchivo} type="file" multiple hidden onChange={(evento) => void subir(evento.target.files)} />
      {adjuntos.length === 0 ? (
        <p className="text-sm text-texto-3">Sin adjuntos.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {adjuntos.map((adjunto) => (
            <li key={adjunto.id} className="group flex items-center gap-2.5 rounded-lg border border-borde p-2 text-sm">
              {adjunto.tipoContenido.startsWith('image/') ? (
                <img src={adjunto.urlDescarga} alt="" className="size-9 rounded-md border border-borde object-cover" />
              ) : (
                <span className="grid size-9 place-items-center rounded-md bg-superficie-2 text-texto-3"><FileText className="size-4" /></span>
              )}
              <span className="min-w-0 flex-1">
                <a href={adjunto.urlDescarga} target="_blank" rel="noreferrer" className="block truncate font-medium hover:underline">{adjunto.nombreArchivo}</a>
                <span className="text-xs tabular-nums text-texto-3">{formatearTamano(adjunto.tamanoEnBytes)}</span>
              </span>
              <BotonIcono icono={Trash2} etiqueta={`Eliminar ${adjunto.nombreArchivo}`} tamano="sm" onClick={() => void eliminar(adjunto)} className="opacity-0 hover:text-peligro group-hover:opacity-100 focus:opacity-100" />
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}

function formatearTamano(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Fecha UTC → "AAAA-MM-DD" en la zona LOCAL. */
const aFechaInput = (fechaIso: string | null) => {
  if (!fechaIso) return '';
  const fecha = new Date(fechaIso);
  const dosDigitos = (numero: number) => String(numero).padStart(2, '0');
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
};

/** El vencimiento es el final del día local elegido, guardado como instante UTC. */
const deFechaInput = (valor: string) => (valor ? new Date(`${valor}T23:59:00`).toISOString() : null);
