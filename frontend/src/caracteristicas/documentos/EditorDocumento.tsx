import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useEditorState, type Editor } from '@tiptap/react';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Copy,
  Download,
  FilePlus2,
  FileText,
  Folder,
  History,
  LayoutTemplate,
  Link2,
  ListTree,
  Loader2,
  RotateCcw,
  SmilePlus,
  Sparkles,
  SpellCheck,
  Star,
  TextSelect,
  Trash2,
  Wand2,
} from 'lucide-react';
import type { AccionTextoIA } from '../../servicios/api';
import { apiDocumentos } from '../../servicios/api';
import { formatearFechaHora, formatearRelativo } from '../../servicios/formato';
import { notificar } from '../../servicios/notificaciones';
import { rutaDeEntidad } from '../../servicios/rutas';
import { EventoMarcadoresCambiados } from '../marcadores/ContextoMarcadores';
import type { BacklinkDto, DocumentoDetalleDto, DocumentoResumenDto, EstructuraDocumentosDto, EtiquetaDto } from '../../servicios/tipos';
import { EditorRico, obtenerMarkdown, transformarConIA, type ManejadorEditorRico } from '../../componentes/editor/EditorRico';
import { iconosEntidad, usarWikiLinks } from '../../componentes/editor/usarWikiLinks';
import { usarConfirmacion } from '../../componentes/ui/DialogoConfirmacion';
import { Boton, BotonIcono, Esqueleto, unirClases, type Icono } from '../../componentes/ui/primitivos';
import type { OpcionesNuevoDocumento } from './BarraLateralDocumentos';
import { IndiceDocumento } from './IndiceDocumento';
import { plantillasDocumento, type PlantillaDocumento } from './plantillas';
import { AvisoVigencia, SelectorVigencia, type Vigencia } from './vigencia';
import { MenuAcciones } from './MenuAcciones';
import { ModalMoverDocumento } from './ModalesOrganizacion';
import { PanelVersiones } from './PanelVersiones';
import { SelectorEtiquetas } from './SelectorEtiquetas';
import { paleta, portadaNeutra } from './paleta';

type EstadoGuardado = 'guardado' | 'pendiente' | 'guardando' | 'error';

const EsperaAutoguardadoMs = 1200;
const ClaveIndiceVisible = 'documentos.indiceVisible';

const iconosSugeridos = ['📄', '📝', '📘', '📌', '🧭', '🧩', '🛠️', '⚙️', '🚀', '🐛', '✅', '📊', '🗂️', '💡', '🔒', '🌐', '🧪', '📦', '🗒️', '🎯', '🧠', '📐', '🔧', '⭐'];


function leerIndiceVisible(): boolean {
  try {
    return localStorage.getItem(ClaveIndiceVisible) !== 'false';
  } catch {
    return true;
  }
}

function descargarMarkdown(titulo: string, markdown: string) {
  const nombre = titulo.trim().replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120) || 'documento';
  const archivo = new Blob([`# ${titulo.trim()}\n\n${markdown}`], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${nombre}.md`;
  enlace.click();
  URL.revokeObjectURL(url);
}

export function EditorDocumento({
  documentoId,
  estructura,
  documentos,
  alRecargar,
  alCrearDocumento,
}: {
  documentoId: string;
  estructura: EstructuraDocumentosDto | null;
  documentos: DocumentoResumenDto[] | null;
  alRecargar: () => void;
  alCrearDocumento: (opciones: OpcionesNuevoDocumento) => void;
}) {
  const navegar = useNavigate();
  const confirmar = usarConfirmacion();
  const [documento, setDocumento] = useState<DocumentoDetalleDto | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [icono, setIcono] = useState<string | null>(null);
  const [etiquetas, setEtiquetas] = useState<EtiquetaDto[]>([]);
  const [backlinks, setBacklinks] = useState<BacklinkDto[]>([]);
  const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardado>('guardado');
  const [fechaGuardado, setFechaGuardado] = useState<string | null>(null);
  const [totalVersiones, setTotalVersiones] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  // Al salir del documento React ya limpió la ref imperativa del editor; la instancia sigue viva (se destruye en un setTimeout).
  const instanciaEditor = useRef<Editor | null>(null);
  instanciaEditor.current = editor;
  const [procesandoIA, setProcesandoIA] = useState(false);

  async function usarIA(accion: AccionTextoIA) {
    if (!editor || procesandoIA) return;
    setProcesandoIA(true);
    try {
      await transformarConIA(editor, accion, true);
    } finally {
      setProcesandoIA(false);
    }
  }
  const [indiceVisible, setIndiceVisible] = useState(leerIndiceVisible);
  const [panelVersiones, setPanelVersiones] = useState(false);
  const [modalMover, setModalMover] = useState(false);
  const [selectorIcono, setSelectorIcono] = useState(false);

  const editorRico = useRef<ManejadorEditorRico>(null);
  const areaTitulo = useRef<HTMLTextAreaElement>(null);
  const temporizador = useRef<number>();
  const guardadoEnCurso = useRef<Promise<unknown> | null>(null);
  const hayCambios = useRef(false);
  const ultimoGuardado = useRef({ titulo: '', icono: null as string | null, markdown: '' });
  const tituloActual = useRef(titulo);
  tituloActual.current = titulo;
  const iconoActual = useRef(icono);
  iconoActual.current = icono;

  const enPapelera = documento?.estaArchivado ?? false;

  const aplicarDocumento = useCallback((detalle: DocumentoDetalleDto) => {
    setDocumento(detalle);
    setTitulo(detalle.titulo);
    setIcono(detalle.icono);
    setEtiquetas(detalle.etiquetas);
    setTotalVersiones(detalle.totalVersiones);
    setFechaGuardado(detalle.fechaActualizacion);
    ultimoGuardado.current = { titulo: detalle.titulo, icono: detalle.icono, markdown: detalle.contenidoMarkdown };
  }, []);

  useEffect(() => {
    Promise.all([apiDocumentos.obtener(documentoId), apiDocumentos.backlinks(documentoId)])
      .then(([detalle, enlacesEntrantes]) => {
        aplicarDocumento(detalle);
        setBacklinks(enlacesEntrantes);
      })
      .catch((error) => {
        setErrorCarga(true);
        notificar.error('No se pudo abrir el documento', error);
      });
  }, [documentoId, aplicarDocumento]);

  /** Guarda si hay cambios. `crearVersion` fuerza una versión en el historial (Ctrl+S). */
  const guardar = useCallback(
    async (crearVersion = false) => {
      window.clearTimeout(temporizador.current);
      if (guardadoEnCurso.current) await guardadoEnCurso.current;

      const markdown =
        editorRico.current?.obtenerMarkdown() ??
        (instanciaEditor.current && !instanciaEditor.current.isDestroyed ? obtenerMarkdown(instanciaEditor.current) : ultimoGuardado.current.markdown);
      const tituloGuardar = tituloActual.current.trim() || 'Sin título';
      const iconoGuardar = iconoActual.current;
      const anterior = ultimoGuardado.current;
      const sinCambios = markdown === anterior.markdown && tituloGuardar === anterior.titulo && iconoGuardar === anterior.icono;
      hayCambios.current = false;
      if (sinCambios && !crearVersion) {
        setEstadoGuardado('guardado');
        return null;
      }

      setEstadoGuardado('guardando');
      const promesa = apiDocumentos.actualizar(documentoId, { titulo: tituloGuardar, contenidoMarkdown: markdown, icono: iconoGuardar, crearVersion });
      guardadoEnCurso.current = promesa.catch(() => null);
      try {
        const resultado = await promesa;
        ultimoGuardado.current = { titulo: tituloGuardar, icono: iconoGuardar, markdown };
        setFechaGuardado(resultado.fechaActualizacion);
        if (resultado.numeroVersionCreada) setTotalVersiones(resultado.numeroVersionCreada);
        setEstadoGuardado(hayCambios.current ? 'pendiente' : 'guardado');
        if (tituloGuardar !== anterior.titulo || iconoGuardar !== anterior.icono) {
          setDocumento((actual) => (actual ? { ...actual, titulo: tituloGuardar, icono: iconoGuardar, rutaEsquema: resultado.rutaEsquema } : actual));
          alRecargar();
        }
        return resultado;
      } catch (errorGuardado) {
        hayCambios.current = true;
        setEstadoGuardado('error');
        notificar.error('No se pudo guardar el documento', errorGuardado);
        return null;
      } finally {
        guardadoEnCurso.current = null;
      }
    },
    [documentoId, alRecargar],
  );

  const guardarActual = useRef(guardar);
  guardarActual.current = guardar;

  const marcarCambio = useCallback(() => {
    hayCambios.current = true;
    setEstadoGuardado((actual) => (actual === 'guardando' ? actual : 'pendiente'));
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => void guardarActual.current(), EsperaAutoguardadoMs);
  }, []);

  const guardarVersionManual = useCallback(async () => {
    const resultado = await guardarActual.current(true);
    if (resultado?.numeroVersionCreada) notificar.exito('Versión guardada', `Versión ${resultado.numeroVersionCreada} en el historial`);
    else if (resultado) notificar.info('Guardado', 'Sin cambios desde la última versión');
  }, []);

  // Ctrl/⌘+S: guarda y crea versión. Aviso al salir con cambios sin guardar. Al desmontar, guarda lo pendiente.
  useEffect(() => {
    const alPresionarTecla = (evento: KeyboardEvent) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 's') {
        evento.preventDefault();
        if (!enPapelera) void guardarVersionManual();
      }
    };
    const alSalir = (evento: BeforeUnloadEvent) => {
      if (hayCambios.current || guardadoEnCurso.current) evento.preventDefault();
    };
    window.addEventListener('keydown', alPresionarTecla);
    window.addEventListener('beforeunload', alSalir);
    return () => {
      window.removeEventListener('keydown', alPresionarTecla);
      window.removeEventListener('beforeunload', alSalir);
    };
  }, [enPapelera, guardarVersionManual]);

  useEffect(
    () => () => {
      window.clearTimeout(temporizador.current);
      if (hayCambios.current) void guardarActual.current();
    },
    [],
  );

  // El título crece con el texto (textarea sin scroll).
  useLayoutEffect(() => {
    const area = areaTitulo.current;
    if (!area) return;
    area.style.height = '0px';
    area.style.height = `${area.scrollHeight}px`;
  }, [titulo, documento]);

  const opcionesWikiLinks = usarWikiLinks(documentoId);

  async function alternarFavorito() {
    if (!documento) return;
    const nuevoValor = !documento.esFavorito;
    setDocumento({ ...documento, esFavorito: nuevoValor });
    try {
      await apiDocumentos.marcarFavorito(documento.id, nuevoValor);
      window.dispatchEvent(new Event(EventoMarcadoresCambiados));
      alRecargar();
    } catch (errorFavorito) {
      setDocumento((actual) => (actual ? { ...actual, esFavorito: !nuevoValor } : actual));
      notificar.error('No se pudo actualizar favoritos', errorFavorito);
    }
  }

  async function moverAPapelera() {
    if (!documento) return;
    await guardar();
    try {
      await apiDocumentos.moverAPapelera(documento.id);
      notificar.info('Movido a la papelera', `${titulo || 'Documento'} · puedes restaurarlo desde la papelera`);
      alRecargar();
      navegar('/documentos');
    } catch (errorPapelera) {
      notificar.error('No se pudo mover a la papelera', errorPapelera);
    }
  }

  async function restaurarDePapelera() {
    if (!documento) return;
    try {
      await apiDocumentos.restaurar(documento.id);
      setDocumento({ ...documento, estaArchivado: false, fechaArchivado: null });
      notificar.exito('Documento restaurado', documento.titulo);
      alRecargar();
    } catch (errorRestauracion) {
      notificar.error('No se pudo restaurar', errorRestauracion);
    }
  }

  async function eliminarDefinitivo() {
    if (!documento) return;
    const aceptado = await confirmar({
      titulo: `¿Eliminar "${documento.titulo}" para siempre?`,
      descripcion: 'Se borran el documento, sus subpáginas, sus versiones y sus imágenes. No se puede deshacer.',
      textoConfirmar: 'Eliminar para siempre',
      peligrosa: true,
    });
    if (!aceptado) return;
    try {
      await apiDocumentos.eliminarDefinitivo(documento.id);
      notificar.exito('Documento eliminado', documento.titulo);
      alRecargar();
      navegar('/documentos?vista=Papelera');
    } catch (errorEliminacion) {
      notificar.error('No se pudo eliminar', errorEliminacion);
    }
  }

  async function moverACarpeta(carpetaId: string | null) {
    if (!documento) return;
    try {
      await apiDocumentos.mover(documento.id, carpetaId);
      setDocumento({ ...documento, carpetaDocumentoId: carpetaId, documentoPadreId: null });
      notificar.exito('Documento movido', carpetaId ? (estructura?.carpetas.find((carpeta) => carpeta.id === carpetaId)?.nombre ?? '') : 'Sin carpeta');
      alRecargar();
    } catch (errorMovimiento) {
      notificar.error('No se pudo mover el documento', errorMovimiento);
    }
  }

  async function recargarTrasRestaurarVersion() {
    const detalle = await apiDocumentos.obtener(documentoId);
    aplicarDocumento(detalle);
    editorRico.current?.establecerMarkdown(detalle.contenidoMarkdown);
    hayCambios.current = false;
    setEstadoGuardado('guardado');
    alRecargar();
  }

  async function actualizarVigencia(vigencia: Vigencia) {
    try {
      await apiDocumentos.actualizarVigencia(documentoId, vigencia);
      const reemplazo = vigencia.documentoReemplazoId ? documentos?.find((otro) => otro.id === vigencia.documentoReemplazoId) : undefined;
      setDocumento((actual) =>
        actual
          ? {
              ...actual,
              ...vigencia,
              porRevisar: vigencia.estado !== 'Obsoleto' && !!vigencia.fechaRevision && new Date(vigencia.fechaRevision) <= new Date(),
              tituloReemplazo: reemplazo?.titulo ?? null,
            }
          : actual,
      );
      alRecargar();
    } catch (errorVigencia) {
      notificar.error('No se pudo actualizar el estado', errorVigencia);
    }
  }

  function aplicarPlantilla(plantilla: PlantillaDocumento) {
    if (!editor) return;
    editor.commands.setContent(plantilla.markdown);
    if (!icono) setIcono(plantilla.icono);
    const sinTitulo = !titulo.trim() || titulo.trim() === 'Sin título';
    if (sinTitulo) setTitulo(plantilla.titulo);
    marcarCambio();
    // Con el prefijo de la plantilla ("Runbook: "), el cursor queda listo para completar el título.
    if (sinTitulo)
      requestAnimationFrame(() => {
        const area = areaTitulo.current;
        area?.focus();
        area?.setSelectionRange(area.value.length, area.value.length);
      });
  }

  function cambiarIcono(nuevo: string | null) {
    setIcono(nuevo);
    setSelectorIcono(false);
    marcarCambio();
  }

  function alternarIndice() {
    setIndiceVisible((actual) => {
      try {
        localStorage.setItem(ClaveIndiceVisible, String(!actual));
      } catch {
        /* preferencia no persistida */
      }
      return !actual;
    });
  }

  // Migas: carpeta › páginas padre › documento.
  const { migas, portada } = useMemo(() => {
    if (!documento) return { migas: [] as { texto: string; ruta: string; icono: Icono; clase?: string }[], portada: portadaNeutra };
    const porId = new Map((documentos ?? []).map((otro) => [otro.id, otro]));
    const padres: DocumentoResumenDto[] = [];
    let padreId = documento.documentoPadreId;
    while (padreId && porId.has(padreId) && padres.length < 10) {
      const padre = porId.get(padreId)!;
      padres.unshift(padre);
      padreId = padre.documentoPadreId;
    }
    const carpetaId = padres[0]?.carpetaDocumentoId ?? documento.carpetaDocumentoId;
    const carpeta = carpetaId ? estructura?.carpetas.find((actual) => actual.id === carpetaId) : undefined;
    const migasDocumento = [
      ...(carpeta
        ? [{ texto: carpeta.nombre, ruta: `/documentos?carpeta=${carpeta.id}`, icono: Folder, clase: carpeta.color ? paleta[carpeta.color].icono : undefined }]
        : [{ texto: 'Documentos', ruta: '/documentos', icono: FileText }]),
      ...padres.map((padre) => ({ texto: padre.titulo, ruta: `/documentos/${padre.id}`, icono: FileText })),
    ];
    return { migas: migasDocumento, portada: carpeta?.color ? paleta[carpeta.color].portada : portadaNeutra };
  }, [documento, documentos, estructura]);

  const subpaginas = useMemo(() => (documentos ?? []).filter((otro) => otro.documentoPadreId === documentoId), [documentos, documentoId]);

  if (errorCarga) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <AlertCircle className="size-6 text-texto-3" />
        <p className="font-medium">No se pudo abrir este documento</p>
        <p className="text-sm text-texto-2">Puede que se haya eliminado o que no te pertenezca.</p>
        <Link to="/documentos">
          <Boton variante="secundario">Volver a documentos</Boton>
        </Link>
      </div>
    );
  }

  if (!documento) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pt-10">
        <Esqueleto className="h-4 w-40" />
        <Esqueleto className="h-11 w-2/3" />
        <Esqueleto className="h-5 w-1/3" />
        <Esqueleto className="mt-4 h-4 w-full" />
        <Esqueleto className="h-4 w-11/12" />
        <Esqueleto className="h-4 w-4/5" />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {/* Barra superior del documento */}
      <div className="sticky top-14 z-20 -mx-2 flex items-center gap-1 bg-superficie/85 px-2 py-2 backdrop-blur sm:gap-2">
        <nav aria-label="Ubicación" className="flex min-w-0 flex-1 items-center gap-1 text-sm text-texto-3">
          {migas.map((miga) => {
            const IconoMiga = miga.icono;
            return (
              <span key={miga.ruta} className="hidden min-w-0 items-center gap-1 sm:flex">
                <Link to={miga.ruta} className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-superficie-2 hover:text-texto-2">
                  <IconoMiga className={unirClases('size-3.5 shrink-0', miga.clase)} />
                  <span className="max-w-40 truncate">{miga.texto}</span>
                </Link>
                <ChevronRight className="size-3.5 shrink-0" />
              </span>
            );
          })}
          <span className="truncate px-1 text-texto-2">{titulo || 'Sin título'}</span>
        </nav>

        <IndicadorGuardado estado={estadoGuardado} fecha={fechaGuardado} alReintentar={() => void guardar()} />

        {!enPapelera && (
          <div className="flex items-center gap-0.5">
            <BotonIcono
              icono={Star}
              etiqueta={documento.esFavorito ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              onClick={() => void alternarFavorito()}
              className={documento.esFavorito ? '[&_svg]:fill-amber-400 [&_svg]:text-amber-400' : undefined}
            />
            <MenuAcciones
              etiqueta="Asistente de IA"
              acciones={[
                { etiqueta: 'Mejorar redacción del documento', icono: Wand2, alPulsar: () => void usarIA('Mejorar') },
                { etiqueta: 'Corregir ortografía y tildes', icono: SpellCheck, alPulsar: () => void usarIA('Corregir') },
                {
                  etiqueta: 'Usar en un fragmento…',
                  icono: TextSelect,
                  alPulsar: () => notificar.info('Selecciona el texto', 'Aparecerá la barra flotante con el botón ✨ IA: mejorar, corregir o resumir solo esa parte.'),
                  separadorAntes: true,
                },
              ]}
              disparador={(abrir, abierto) => (
                <button
                  type="button"
                  onClick={abrir}
                  disabled={procesandoIA || !editor}
                  aria-expanded={abierto}
                  title="Asistente de IA"
                  className={unirClases(
                    'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors disabled:opacity-60',
                    abierto ? 'border-violet-300 bg-violet-100 text-violet-800' : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
                  )}
                >
                  {procesandoIA ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  <span className="hidden sm:inline">{procesandoIA ? 'Procesando…' : 'IA'}</span>
                </button>
              )}
            />
            <button
              type="button"
              onClick={() => setPanelVersiones(true)}
              title="Historial de versiones"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-texto-2 transition-colors hover:bg-superficie-2 hover:text-texto"
            >
              <History className="size-4" />
              <span className="hidden tabular-nums sm:inline">{totalVersiones}</span>
            </button>
            <BotonIcono
              icono={ListTree}
              etiqueta={indiceVisible ? 'Ocultar índice' : 'Mostrar índice'}
              onClick={alternarIndice}
              className={unirClases('hidden xl:inline-grid', indiceVisible && 'bg-superficie-2 text-texto')}
            />
            <MenuAcciones
              acciones={[
                { etiqueta: 'Nueva subpágina', icono: FilePlus2, alPulsar: () => alCrearDocumento({ documentoPadreId: documento.id }) },
                { etiqueta: 'Mover a carpeta…', icono: Folder, alPulsar: () => setModalMover(true) },
                { etiqueta: 'Historial de versiones', icono: History, alPulsar: () => setPanelVersiones(true) },
                {
                  etiqueta: 'Copiar enlace [[…]]',
                  icono: Copy,
                  alPulsar: () =>
                    void navigator.clipboard
                      .writeText(`[[${titulo.trim() || 'Sin título'}]]`)
                      .then(() => notificar.info('Enlace copiado', `Pégalo en otro documento, tarea o ticket`)),
                  separadorAntes: true,
                },
                {
                  etiqueta: 'Exportar Markdown (.md)',
                  icono: Download,
                  alPulsar: () => descargarMarkdown(titulo || 'Sin título', editorRico.current?.obtenerMarkdown() ?? ''),
                },
                { etiqueta: 'Mover a la papelera', icono: Trash2, alPulsar: () => void moverAPapelera(), peligrosa: true, separadorAntes: true },
              ]}
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {enPapelera && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mx-auto mb-6 flex max-w-3xl flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-peligro-suave px-4 py-3 text-sm"
          >
            <Trash2 className="size-4 text-peligro" />
            <span className="flex-1 text-red-900">
              Este documento está en la papelera{documento.fechaArchivado ? ` desde ${formatearFechaHora(documento.fechaArchivado)}` : ''}. Restáuralo para editarlo.
            </span>
            <Boton variante="secundario" tamano="sm" icono={RotateCcw} onClick={() => void restaurarDePapelera()}>
              Restaurar
            </Boton>
            <Boton variante="peligro" tamano="sm" icono={Trash2} onClick={() => void eliminarDefinitivo()}>
              Eliminar para siempre
            </Boton>
          </motion.div>
        )}
      </AnimatePresence>

      {!enPapelera && <AvisoVigencia documento={documento} soloLectura={enPapelera} alCambiar={actualizarVigencia} />}

      <div className={unirClases('grid gap-10', indiceVisible && 'xl:grid-cols-[minmax(0,1fr)_200px]')}>
        <motion.article
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mx-auto w-full min-w-0 max-w-3xl pt-2"
        >
          {/* Portada pastel con el color de la carpeta */}
          <div aria-hidden className={unirClases('h-24 rounded-2xl bg-gradient-to-br sm:h-32', portada)} />

          {/* Icono: se superpone a la portada */}
          <div className={unirClases('relative mb-2', icono ? '-mt-9 ml-1' : 'mt-3 h-8')}>
            {icono ? (
              <button
                type="button"
                disabled={enPapelera}
                onClick={() => setSelectorIcono((actual) => !actual)}
                className="grid size-16 place-items-center rounded-2xl border border-borde bg-superficie text-3xl leading-none shadow-tarjeta transition hover:bg-superficie-2 sm:size-[4.5rem] sm:text-4xl"
                aria-label="Cambiar icono"
              >
                {icono}
              </button>
            ) : (
              !enPapelera && (
                <button
                  type="button"
                  onClick={() => setSelectorIcono((actual) => !actual)}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-xs text-texto-3 opacity-70 transition hover:bg-superficie-2 hover:text-texto-2 hover:opacity-100"
                >
                  <SmilePlus className="size-4" />
                  Añadir icono
                </button>
              )
            )}
            <AnimatePresence>
              {selectorIcono && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 top-full z-30 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-borde bg-superficie p-2 shadow-flotante"
                >
                  <div className="grid grid-cols-8 gap-1">
                    {iconosSugeridos.map((emoji) => (
                      <button key={emoji} type="button" onClick={() => cambiarIcono(emoji)} className="grid size-8 place-items-center rounded-md text-lg hover:bg-superficie-2">
                        {emoji}
                      </button>
                    ))}
                  </div>
                  {icono && (
                    <button type="button" onClick={() => cambiarIcono(null)} className="mt-1.5 h-7 w-full rounded-md text-xs text-texto-2 hover:bg-superficie-2">
                      Quitar icono
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <textarea
            ref={areaTitulo}
            aria-label="Título"
            value={titulo}
            rows={1}
            maxLength={200}
            readOnly={enPapelera}
            placeholder="Sin título"
            onChange={(evento) => {
              setTitulo(evento.target.value.replace(/\n/g, ' '));
              marcarCambio();
            }}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter' || evento.key === 'ArrowDown') {
                evento.preventDefault();
                editorRico.current?.enfocar();
              }
            }}
            className="block w-full resize-none overflow-hidden bg-transparent text-[1.7rem] font-bold leading-tight tracking-tight sm:text-[2.1rem] placeholder:text-texto-3/70 focus:outline-none"
          />

          <div className="mb-6 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-texto-3">
            <SelectorVigencia documento={documento} documentos={documentos} soloLectura={enPapelera} alCambiar={actualizarVigencia} />
            <SelectorEtiquetas
              documentoId={documento.id}
              asignadas={etiquetas}
              disponibles={estructura?.etiquetas ?? []}
              soloLectura={enPapelera}
              alCambiar={(nuevas) => {
                setEtiquetas(nuevas);
                alRecargar();
              }}
            />
            {editor && <EstadisticasEditor editor={editor} />}
          </div>

          {editor && !enPapelera && <SugerenciasPlantilla editor={editor} alAplicar={aplicarPlantilla} />}

          <EditorRico
            key={documento.id}
            ref={editorRico}
            contenidoInicial={documento.contenidoMarkdown}
            alCambiar={marcarCambio}
            alListo={setEditor}
            editable={!enPapelera}
            destinoAdjuntos={{ documentoId: documento.id }}
            wikiLinks={opcionesWikiLinks}
          />

          {(subpaginas.length > 0 || backlinks.length > 0) && (
            <footer className="flex flex-col gap-6 border-t border-borde pb-16 pt-6">
              {subpaginas.length > 0 && (
                <section className="flex flex-col gap-2">
                  <h2 className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="size-4 text-texto-3" />
                    Subpáginas
                  </h2>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {subpaginas.map((subpagina) => (
                      <li key={subpagina.id}>
                        <Link
                          to={`/documentos/${subpagina.id}`}
                          className="flex items-center gap-2 rounded-lg border border-borde bg-superficie px-3 py-2 text-sm shadow-tarjeta transition hover:border-borde-fuerte"
                        >
                          <span className="w-4 text-center">{subpagina.icono ?? <FileText className="size-4 text-texto-3" />}</span>
                          <span className="truncate">{subpagina.titulo}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {backlinks.length > 0 && (
                <section className="flex flex-col gap-2">
                  <h2 className="flex items-center gap-2 text-sm font-medium">
                    <Link2 className="size-4 text-texto-3" />
                    Enlazan aquí
                    <span className="text-xs font-normal text-texto-3">{backlinks.length}</span>
                  </h2>
                  <ul className="flex flex-wrap gap-2">
                    {backlinks.map((backlink) => {
                      const IconoOrigen = iconosEntidad[backlink.tipoOrigen];
                      return (
                        <li key={`${backlink.tipoOrigen}-${backlink.origenId}`}>
                          <Link
                            to={rutaDeEntidad(backlink.tipoOrigen, backlink.origenId)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-borde bg-superficie px-2.5 py-1.5 text-sm shadow-tarjeta transition hover:border-borde-fuerte"
                          >
                            <IconoOrigen className="size-4 text-texto-3" />
                            {backlink.titulo}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </footer>
          )}
        </motion.article>

        {indiceVisible && editor && (
          <aside aria-label="Índice" className="hidden xl:block">
            <div className="sticky top-32 max-h-[calc(100vh-10rem)] overflow-y-auto pt-24">
              <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-texto-3">En esta página</p>
              <IndiceDocumento editor={editor} />
            </div>
          </aside>
        )}
      </div>

      <PanelVersiones
        abierto={panelVersiones}
        documentoId={documento.id}
        obtenerContenidoActual={() => editorRico.current?.obtenerMarkdown() ?? documento.contenidoMarkdown}
        alCerrar={() => setPanelVersiones(false)}
        alGuardarVersion={guardarVersionManual}
        alRestaurar={recargarTrasRestaurarVersion}
      />
      <ModalMoverDocumento
        abierto={modalMover}
        carpetas={estructura?.carpetas ?? []}
        carpetaActualId={documento.carpetaDocumentoId}
        alCerrar={() => setModalMover(false)}
        alMover={moverACarpeta}
      />
    </div>
  );
}

function IndicadorGuardado({ estado, fecha, alReintentar }: { estado: EstadoGuardado; fecha: string | null; alReintentar: () => void }) {
  // Re-render cada 30 s para que "hace 1 minuto" avance.
  const [, setPulso] = useState(0);
  useEffect(() => {
    const intervalo = window.setInterval(() => setPulso((actual) => actual + 1), 30_000);
    return () => window.clearInterval(intervalo);
  }, []);

  if (estado === 'error') {
    return (
      <button type="button" onClick={alReintentar} className="inline-flex shrink-0 items-center gap-1.5 text-xs text-peligro hover:underline">
        <AlertCircle className="size-3.5" />
        Error al guardar · Reintentar
      </button>
    );
  }
  return (
    <span className="hidden shrink-0 items-center gap-1.5 text-xs text-texto-3 sm:inline-flex" aria-live="polite">
      {estado === 'guardando' ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          Guardando…
        </>
      ) : estado === 'pendiente' ? (
        <>
          <span className="size-1.5 rounded-full bg-aviso" />
          Cambios sin guardar
        </>
      ) : (
        <>
          <Check className="size-3.5 text-exito" />
          {fecha ? `Guardado ${formatearRelativo(fecha)}` : 'Guardado'}
        </>
      )}
    </span>
  );
}

/** Documento vacío: ofrece empezar desde una plantilla (desaparece en cuanto hay contenido). */
function SugerenciasPlantilla({ editor, alAplicar }: { editor: Editor; alAplicar: (plantilla: PlantillaDocumento) => void }) {
  const vacio = useEditorState({ editor, selector: ({ editor: actual }) => actual.isEmpty });
  if (!vacio) return null;
  return (
    <section aria-label="Plantillas" className="mb-5 rounded-xl border border-dashed border-borde-fuerte p-3">
      <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium text-texto-2">
        <LayoutTemplate className="size-3.5 text-texto-3" />
        Empieza con una plantilla o escribe para comenzar
      </p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {plantillasDocumento.map((plantilla) => (
          <li key={plantilla.id}>
            <button
              type="button"
              onClick={() => alAplicar(plantilla)}
              className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-superficie-2"
            >
              <span className="text-lg leading-none">{plantilla.icono}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{plantilla.nombre}</span>
                <span className="block text-xs text-texto-3">{plantilla.descripcion}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EstadisticasEditor({ editor }: { editor: Editor }) {
  const { palabras, caracteres } = useEditorState({
    editor,
    selector: ({ editor: actual }) => {
      const contador = (actual.storage as unknown as { characterCount?: { words(): number; characters(): number } }).characterCount;
      return { palabras: contador?.words() ?? 0, caracteres: contador?.characters() ?? 0 };
    },
  });
  const minutosLectura = Math.max(1, Math.round(palabras / 220));
  return (
    <span className="tabular-nums" title={`${caracteres.toLocaleString('es')} caracteres`}>
      {palabras.toLocaleString('es')} palabras · {minutosLectura} min de lectura
    </span>
  );
}
