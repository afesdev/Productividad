import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { History, RotateCcw, Save, X } from 'lucide-react';
import { apiDocumentos } from '../../servicios/api';
import { formatearFechaHora, formatearRelativo } from '../../servicios/formato';
import { notificar } from '../../servicios/notificaciones';
import type { VersionDetalleDto, VersionResumenDto } from '../../servicios/tipos';
import { usarConfirmacion } from '../../componentes/ui/DialogoConfirmacion';
import { VistaMarkdown } from '../../componentes/VistaMarkdown';
import { Boton, BotonIcono, EstadoVacio, Esqueleto, unirClases } from '../../componentes/ui/primitivos';
import { agruparDiferencias, diferenciarLineas } from './diferenciasLineas';

type ModoVista = 'cambios' | 'lectura';

/**
 * Historial de versiones en un panel lateral: lista, comparación con el contenido actual y restauración.
 * Las versiones se crean solas (autoguardado con más de 10 min desde la última) o con Ctrl+S.
 */
export function PanelVersiones({
  abierto,
  documentoId,
  obtenerContenidoActual,
  alCerrar,
  alGuardarVersion,
  alRestaurar,
}: {
  abierto: boolean;
  documentoId: string;
  obtenerContenidoActual: () => string;
  alCerrar: () => void;
  alGuardarVersion: () => Promise<void>;
  alRestaurar: () => Promise<void>;
}) {
  const confirmar = usarConfirmacion();
  const [versiones, setVersiones] = useState<VersionResumenDto[] | null>(null);
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<VersionDetalleDto | null>(null);
  const [modo, setModo] = useState<ModoVista>('cambios');
  const [contenidoActual, setContenidoActual] = useState('');
  const [procesando, setProcesando] = useState(false);

  async function cargarVersiones() {
    try {
      const lista = await apiDocumentos.versiones(documentoId);
      setVersiones(lista);
      setSeleccionadaId((actual) => (actual && lista.some((version) => version.id === actual) ? actual : (lista[0]?.id ?? null)));
    } catch (errorCarga) {
      notificar.error('No se pudo cargar el historial', errorCarga);
    }
  }

  useEffect(() => {
    if (!abierto) return;
    setVersiones(null);
    setContenidoActual(obtenerContenidoActual());
    void cargarVersiones();
    const alPresionarTecla = (evento: KeyboardEvent) => evento.key === 'Escape' && alCerrar();
    window.addEventListener('keydown', alPresionarTecla);
    return () => window.removeEventListener('keydown', alPresionarTecla);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, documentoId]);

  useEffect(() => {
    if (!seleccionadaId) {
      setDetalle(null);
      return;
    }
    let vigente = true;
    apiDocumentos
      .version(seleccionadaId)
      .then((version) => vigente && setDetalle(version))
      .catch((errorCarga) => notificar.error('No se pudo abrir la versión', errorCarga));
    return () => {
      vigente = false;
    };
  }, [seleccionadaId]);

  const bloques = useMemo(
    () => (detalle ? agruparDiferencias(diferenciarLineas(detalle.contenidoMarkdown, contenidoActual)) : []),
    [detalle, contenidoActual],
  );
  const sinCambios = bloques.every((bloque) => bloque.tipo === 'omitidas');

  async function guardarVersion() {
    setProcesando(true);
    try {
      await alGuardarVersion();
      setContenidoActual(obtenerContenidoActual());
      await cargarVersiones();
    } finally {
      setProcesando(false);
    }
  }

  async function restaurar() {
    if (!detalle) return;
    const aceptado = await confirmar({
      titulo: `¿Restaurar la versión ${detalle.numeroVersion}?`,
      descripcion: 'El contenido actual se guarda antes como una versión nueva, así que puedes deshacerlo.',
      textoConfirmar: 'Restaurar',
    });
    if (!aceptado) return;
    setProcesando(true);
    try {
      await apiDocumentos.restaurarVersion(detalle.id);
      await alRestaurar();
      notificar.exito('Versión restaurada', `v${detalle.numeroVersion}`);
      alCerrar();
    } catch (errorRestauracion) {
      notificar.error('No se pudo restaurar la versión', errorRestauracion);
    } finally {
      setProcesando(false);
    }
  }

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            className="absolute inset-0 bg-zinc-950/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={alCerrar}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Historial de versiones"
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 48, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="relative flex h-full w-full max-w-5xl flex-col bg-superficie shadow-flotante"
          >
            <header className="flex items-center justify-between gap-3 border-b border-borde px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <History className="size-5 text-texto-2" />
                <div>
                  <h2 className="text-base font-semibold tracking-tight">Historial de versiones</h2>
                  <p className="text-xs text-texto-3">Automáticas cada 10 min de edición · Ctrl+S guarda una al instante</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Boton variante="secundario" tamano="sm" icono={Save} cargando={procesando} onClick={() => void guardarVersion()}>
                  Guardar versión ahora
                </Boton>
                <BotonIcono icono={X} etiqueta="Cerrar" onClick={alCerrar} />
              </div>
            </header>

            <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[260px_1fr]">
              <nav aria-label="Versiones" className="max-h-48 overflow-y-auto border-b border-borde p-2 md:max-h-none md:border-b-0 md:border-r">
                {versiones === null && (
                  <div className="flex flex-col gap-2 p-1">
                    <Esqueleto className="h-12" />
                    <Esqueleto className="h-12" />
                  </div>
                )}
                {versiones?.length === 0 && <p className="p-3 text-sm text-texto-3">Aún no hay versiones. Pulsa "Guardar versión ahora" o Ctrl+S.</p>}
                {versiones?.map((version) => (
                  <button
                    key={version.id}
                    type="button"
                    onClick={() => setSeleccionadaId(version.id)}
                    className={unirClases(
                      'flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors',
                      version.id === seleccionadaId ? 'bg-superficie-2' : 'hover:bg-fondo',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">Versión {version.numeroVersion}</span>
                      <span className="text-xs text-texto-3">{formatearRelativo(version.fechaCreacion)}</span>
                    </span>
                    <span className="truncate text-xs text-texto-3">
                      {formatearFechaHora(version.fechaCreacion)} · {version.nombreAutor}
                    </span>
                    <span className="text-xs text-texto-3">{version.caracteres.toLocaleString('es')} caracteres</span>
                  </button>
                ))}
              </nav>

              <section className="flex min-h-0 flex-col">
                {detalle ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borde px-5 py-2.5">
                      <div role="tablist" className="inline-flex rounded-lg bg-superficie-2 p-0.5 text-sm">
                        {(['cambios', 'lectura'] as const).map((opcion) => (
                          <button
                            key={opcion}
                            role="tab"
                            aria-selected={modo === opcion}
                            onClick={() => setModo(opcion)}
                            className={unirClases('h-7 rounded-md px-3 transition', modo === opcion ? 'bg-superficie font-medium shadow-tarjeta' : 'text-texto-2')}
                          >
                            {opcion === 'cambios' ? 'Cambios frente a la actual' : 'Contenido'}
                          </button>
                        ))}
                      </div>
                      <Boton tamano="sm" icono={RotateCcw} cargando={procesando} onClick={() => void restaurar()}>
                        Restaurar esta versión
                      </Boton>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                      <h3 className="mb-3 text-lg font-semibold tracking-tight">{detalle.titulo}</h3>
                      {modo === 'lectura' ? (
                        detalle.contenidoMarkdown ? (
                          <VistaMarkdown contenido={detalle.contenidoMarkdown} />
                        ) : (
                          <p className="text-sm text-texto-3">Versión vacía.</p>
                        )
                      ) : sinCambios ? (
                        <p className="text-sm text-texto-3">Esta versión es idéntica al contenido actual.</p>
                      ) : (
                        <>
                          <p className="mb-2 flex gap-3 text-xs text-texto-3">
                            <span><span className="font-mono text-peligro">−</span> solo en la versión {detalle.numeroVersion}</span>
                            <span><span className="font-mono text-exito">+</span> solo en la actual</span>
                          </p>
                          <div className="overflow-x-auto rounded-lg border border-borde font-mono text-[12.5px] leading-relaxed">
                            {bloques.map((bloque, indice) =>
                              bloque.tipo === 'omitidas' ? (
                                <div key={indice} className="bg-fondo px-3 py-1 text-xs text-texto-3">
                                  ⋯ {bloque.cantidad} {bloque.cantidad === 1 ? 'línea' : 'líneas'} sin cambios
                                </div>
                              ) : (
                                bloque.lineas.map((linea, posicion) => (
                                  <div
                                    key={`${indice}-${posicion}`}
                                    className={unirClases(
                                      'flex whitespace-pre-wrap break-words px-3',
                                      linea.tipo === 'agregada' && 'bg-exito-suave text-green-900',
                                      linea.tipo === 'eliminada' && 'bg-peligro-suave text-red-900',
                                    )}
                                  >
                                    <span className="w-4 shrink-0 select-none text-texto-3">{linea.tipo === 'agregada' ? '+' : linea.tipo === 'eliminada' ? '−' : ' '}</span>
                                    <span className="min-w-0">{linea.texto || ' '}</span>
                                  </div>
                                ))
                              ),
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-6">
                    {versiones && versiones.length > 0 ? (
                      <Esqueleto className="h-64" />
                    ) : (
                      <EstadoVacio icono={History} titulo="Sin versiones" descripcion="Cada versión guarda una copia completa del documento que puedes comparar y restaurar." />
                    )}
                  </div>
                )}
              </section>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
