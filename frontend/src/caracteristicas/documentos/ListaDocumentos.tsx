import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { FilePlus2, FileText, Folder, FolderOpen, RotateCcw, Search, Star, Trash2, X } from 'lucide-react';
import { apiDocumentos } from '../../servicios/api';
import { formatearRelativo } from '../../servicios/formato';
import { notificar } from '../../servicios/notificaciones';
import type { DocumentoResumenDto, EstructuraDocumentosDto, VistaDocumentos } from '../../servicios/tipos';
import { InsigniaVigencia } from './vigencia';
import { usarConfirmacion } from '../../componentes/ui/DialogoConfirmacion';
import { Boton, BotonIcono, EncabezadoPagina, EstadoVacio, Esqueleto, unirClases } from '../../componentes/ui/primitivos';
import type { FiltrosDocumentos, OpcionesNuevoDocumento } from './BarraLateralDocumentos';
import { rutaCarpeta } from './ModalesOrganizacion';
import { ChipEtiqueta } from './SelectorEtiquetas';
import { paleta, portadaNeutra } from './paleta';
import { EventoMarcadoresCambiados } from '../marcadores/ContextoMarcadores';

const titulosVista: Record<VistaDocumentos, string> = {
  Activos: 'Todos los documentos',
  Favoritos: 'Favoritos',
  Papelera: 'Papelera',
  Borradores: 'Borradores',
  PorRevisar: 'Por revisar',
  Obsoletos: 'Obsoletos',
};

const descripcionesVista: Partial<Record<VistaDocumentos, string>> = {
  Borradores: 'Documentos en construcción. Márcalos como vigentes cuando estén listos para consultarse.',
  PorRevisar: 'Su fecha de revisión ya pasó: confirma que siguen siendo correctos o actualízalos.',
  Obsoletos: 'Ya no aplican. Se conservan como referencia histórica, con enlace al documento que los reemplaza.',
};

/** Listado según el filtro activo (todos, favoritos, papelera, carpeta, etiqueta o búsqueda). La papelera nunca se purga sola. */
export function ListaDocumentos({
  filtros,
  estructura,
  recarga,
  alCrearDocumento,
  alRecargar,
}: {
  filtros: FiltrosDocumentos;
  estructura: EstructuraDocumentosDto | null;
  /** Cambia cuando otra parte de la página modifica documentos. */
  recarga: number;
  alCrearDocumento: (opciones: OpcionesNuevoDocumento) => void;
  alRecargar: () => void;
}) {
  const confirmar = usarConfirmacion();
  const [documentos, setDocumentos] = useState<DocumentoResumenDto[] | null>(null);
  const enPapelera = filtros.vista === 'Papelera';

  useEffect(() => {
    let vigente = true;
    setDocumentos(null);
    apiDocumentos
      .listar({
        vista: filtros.vista,
        carpetaDocumentoId: filtros.carpetaId ?? undefined,
        etiquetaId: filtros.etiquetaId ?? undefined,
        texto: filtros.texto || undefined,
      })
      .then((lista) => vigente && setDocumentos(lista))
      .catch((errorCarga) => notificar.error('No se pudieron cargar los documentos', errorCarga));
    return () => {
      vigente = false;
    };
  }, [filtros.vista, filtros.carpetaId, filtros.etiquetaId, filtros.texto, recarga]);

  const carpeta = filtros.carpetaId ? estructura?.carpetas.find((actual) => actual.id === filtros.carpetaId) : undefined;
  // Carpetas del nivel actual como accesos rápidos (solo al navegar, no al buscar ni filtrar).
  const navegando = filtros.vista === 'Activos' && !filtros.texto && !filtros.etiquetaId;
  const subcarpetas = navegando
    ? (estructura?.carpetas ?? [])
        .filter((otra) => otra.carpetaPadreId === (filtros.carpetaId ?? null))
        .sort((a, b) => a.indiceOrden - b.indiceOrden || a.nombre.localeCompare(b.nombre, 'es'))
    : [];
  const etiqueta = filtros.etiquetaId ? estructura?.etiquetas.find((actual) => actual.id === filtros.etiquetaId) : undefined;

  const titulo = filtros.texto
    ? `Resultados para "${filtros.texto}"`
    : carpeta
      ? carpeta.nombre
      : etiqueta
        ? `#${etiqueta.nombre}`
        : filtros.vista !== 'Activos'
          ? titulosVista[filtros.vista]
          : 'Todos los documentos';

  const descripcion = enPapelera
    ? 'Los documentos de la papelera no aparecen en búsquedas ni enlaces. Restáuralos o elimínalos para siempre.'
    : descripcionesVista[filtros.vista]
      ? descripcionesVista[filtros.vista]!
      : carpeta
      ? rutaCarpeta(estructura?.carpetas ?? [], carpeta.id)
      : filtros.texto
        ? 'Busca en títulos y contenido.'
        : 'Wiki técnica en Markdown: escribe "/" para comandos y "[[" para enlazar tareas, tickets y páginas.';

  async function alternarFavorito(documento: DocumentoResumenDto) {
    try {
      await apiDocumentos.marcarFavorito(documento.id, !documento.esFavorito);
      window.dispatchEvent(new Event(EventoMarcadoresCambiados));
      setDocumentos((actual) => actual?.map((otro) => (otro.id === documento.id ? { ...otro, esFavorito: !otro.esFavorito } : otro)) ?? null);
      alRecargar();
    } catch (errorFavorito) {
      notificar.error('No se pudo actualizar favoritos', errorFavorito);
    }
  }

  async function moverAPapelera(documento: DocumentoResumenDto) {
    try {
      await apiDocumentos.moverAPapelera(documento.id);
      notificar.info('Movido a la papelera', documento.titulo);
      alRecargar();
    } catch (errorPapelera) {
      notificar.error('No se pudo mover a la papelera', errorPapelera);
    }
  }

  async function restaurar(documento: DocumentoResumenDto) {
    try {
      await apiDocumentos.restaurar(documento.id);
      notificar.exito('Documento restaurado', documento.titulo);
      alRecargar();
    } catch (errorRestauracion) {
      notificar.error('No se pudo restaurar', errorRestauracion);
    }
  }

  async function eliminarDefinitivo(documento: DocumentoResumenDto) {
    const aceptado = await confirmar({
      titulo: `¿Eliminar "${documento.titulo}" para siempre?`,
      descripcion: 'Se borran el documento, sus subpáginas en la papelera, sus versiones y sus imágenes. No se puede deshacer.',
      textoConfirmar: 'Eliminar para siempre',
      peligrosa: true,
    });
    if (!aceptado) return;
    try {
      await apiDocumentos.eliminarDefinitivo(documento.id);
      notificar.exito('Documento eliminado', documento.titulo);
      alRecargar();
    } catch (errorEliminacion) {
      notificar.error('No se pudo eliminar', errorEliminacion);
    }
  }

  async function vaciarPapelera() {
    const aceptado = await confirmar({
      titulo: '¿Vaciar la papelera?',
      descripcion: `Se eliminarán para siempre ${documentos?.length ?? 0} documento(s) con sus versiones e imágenes. No se puede deshacer.`,
      textoConfirmar: 'Vaciar papelera',
      peligrosa: true,
    });
    if (!aceptado) return;
    try {
      const eliminados = await apiDocumentos.vaciarPapelera();
      notificar.exito('Papelera vacía', `${eliminados} documento(s) eliminados`);
      alRecargar();
    } catch (errorVaciado) {
      notificar.error('No se pudo vaciar la papelera', errorVaciado);
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-6xl pt-4">
      <EncabezadoPagina
        titulo={titulo}
        descripcion={descripcion}
        acciones={
          enPapelera ? (
            documentos && documentos.length > 0 && (
              <Boton variante="peligro" icono={Trash2} onClick={() => void vaciarPapelera()}>
                Vaciar papelera
              </Boton>
            )
          ) : (
            <>
              {(filtros.texto || filtros.etiquetaId || filtros.carpetaId) && (
                <Link to="/documentos">
                  <Boton variante="secundario" icono={X}>
                    Quitar filtro
                  </Boton>
                </Link>
              )}
              <Boton icono={FilePlus2} onClick={() => alCrearDocumento({ carpetaDocumentoId: filtros.carpetaId })}>
                Nuevo documento
              </Boton>
            </>
          )
        }
      />

      {subcarpetas.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-texto-3">{carpeta ? 'Subcarpetas' : 'Carpetas'}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {subcarpetas.map((subcarpeta) => {
              const tono = subcarpeta.color ? paleta[subcarpeta.color] : null;
              return (
                <li key={subcarpeta.id}>
                  <Link
                    to={`/documentos?carpeta=${subcarpeta.id}`}
                    className={unirClases(
                      'flex items-center gap-3 rounded-xl border px-3.5 py-3 transition hover:-translate-y-px',
                      tono ? tono.azulejo : 'border-violet-100 bg-violet-50/60 hover:border-violet-200',
                    )}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-superficie/80">
                      <FolderOpen className={unirClases('size-[18px]', tono ? tono.icono : 'text-violet-300')} fill="currentColor" fillOpacity={0.18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{subcarpeta.nombre}</span>
                      <span className="block text-xs text-texto-2">{subcarpeta.totalDocumentos === 1 ? '1 página' : `${subcarpeta.totalDocumentos} páginas`}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {documentos === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((indice) => (
            <Esqueleto key={indice} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : documentos.length === 0 ? (
        <EstadoVacio
          icono={enPapelera ? Trash2 : filtros.texto ? Search : filtros.vista === 'Favoritos' ? Star : FileText}
          titulo={
            enPapelera
              ? 'La papelera está vacía'
              : filtros.texto
                ? 'Sin resultados'
                : filtros.vista === 'Favoritos'
                  ? 'Aún no tienes favoritos'
                  : 'No hay documentos aquí'
          }
          descripcion={
            filtros.vista === 'Favoritos'
              ? 'Marca un documento con la estrella para tenerlo siempre a mano en la barra lateral.'
              : enPapelera
                ? undefined
                : 'Crea uno nuevo o arrastra documentos a esta carpeta desde la barra lateral.'
          }
          accion={
            !enPapelera && filtros.vista !== 'Favoritos' && !filtros.texto ? (
              <Boton icono={FilePlus2} onClick={() => alCrearDocumento({ carpetaDocumentoId: filtros.carpetaId })}>
                Nuevo documento
              </Boton>
            ) : undefined
          }
        />
      ) : (
        <>
          {subcarpetas.length > 0 && <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-texto-3">Páginas</h2>}
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence initial={false}>
              {documentos.map((documento) => {
                const carpetaDocumento = documento.carpetaDocumentoId ? estructura?.carpetas.find((actual) => actual.id === documento.carpetaDocumentoId) : undefined;
                const portada = carpetaDocumento?.color ? paleta[carpetaDocumento.color].portada : portadaNeutra;
                return (
                  <motion.li
                    key={documento.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-borde bg-superficie transition hover:-translate-y-0.5 hover:border-borde-fuerte hover:shadow-flotante"
                  >
                    <Link to={`/documentos/${documento.id}`} className="flex flex-1 flex-col">
                      {/* Portada pastel con el color de la carpeta */}
                      <span className={unirClases('relative block h-20 bg-gradient-to-br', portada)}>
                        <span className="absolute -bottom-5 left-4 grid size-11 place-items-center rounded-xl border border-borde bg-superficie text-xl shadow-tarjeta">
                          {documento.icono ?? <FileText className="size-5 text-texto-3" />}
                        </span>
                      </span>
                      <span className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-8">
                        <span className="flex items-start gap-2">
                          <span className="line-clamp-2 font-medium leading-snug">{documento.titulo}</span>
                          {documento.esFavorito && <Star className="mt-0.5 size-3.5 shrink-0 fill-amber-300 text-amber-400" aria-label="Favorito" />}
                        </span>
                        {!enPapelera && <InsigniaVigencia documento={documento} className="self-start" />}
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-texto-3">
                          {carpetaDocumento && (
                            <span className="inline-flex items-center gap-1">
                              <Folder className={unirClases('size-3.5', carpetaDocumento.color ? paleta[carpetaDocumento.color].icono : '')} />
                              {carpetaDocumento.nombre}
                            </span>
                          )}
                          {documento.rutaEsquema.includes('/') && <span className="truncate">{documento.rutaEsquema}</span>}
                          <span>
                            {enPapelera && documento.fechaArchivado
                              ? `En la papelera ${formatearRelativo(documento.fechaArchivado)}`
                              : `Editado ${formatearRelativo(documento.fechaActualizacion)}`}
                          </span>
                        </span>
                        {documento.etiquetas.length > 0 && (
                          <span className="mt-auto flex flex-wrap gap-1 pt-1">
                            {documento.etiquetas.map((etiquetaDocumento) => (
                              <ChipEtiqueta key={etiquetaDocumento.id} etiqueta={etiquetaDocumento} />
                            ))}
                          </span>
                        )}
                      </span>
                    </Link>

                    {enPapelera ? (
                      <div className="flex items-center justify-end gap-1 border-t border-borde px-3 py-2">
                        <Boton variante="secundario" tamano="sm" icono={RotateCcw} onClick={() => void restaurar(documento)}>
                          Restaurar
                        </Boton>
                        <BotonIcono icono={Trash2} etiqueta="Eliminar para siempre" tamano="sm" className="hover:text-peligro" onClick={() => void eliminarDefinitivo(documento)} />
                      </div>
                    ) : (
                      <span className="absolute right-2 top-2 flex rounded-lg bg-superficie/85 opacity-0 shadow-tarjeta backdrop-blur transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <BotonIcono
                          icono={Star}
                          etiqueta={documento.esFavorito ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                          tamano="sm"
                          onClick={() => void alternarFavorito(documento)}
                        />
                        <BotonIcono icono={Trash2} etiqueta="Mover a la papelera" tamano="sm" onClick={() => void moverAPapelera(documento)} />
                      </span>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </>
      )}
    </div>
  );
}
