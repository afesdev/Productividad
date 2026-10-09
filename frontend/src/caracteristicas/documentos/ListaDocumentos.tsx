import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilePlus2, FileText, FolderOpen, Search, Star, Trash2, X } from 'lucide-react';
import { apiDocumentos } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import type { DocumentoResumenDto, EstructuraDocumentosDto, VistaDocumentos } from '../../servicios/tipos';
import { usarConfirmacion } from '../../componentes/ui/DialogoConfirmacion';
import { Boton, EncabezadoPagina, EstadoVacio, Esqueleto, unirClases } from '../../componentes/ui/primitivos';
import type { FiltrosDocumentos, OpcionesNuevoDocumento } from './BarraLateralDocumentos';
import { rutaCarpeta } from './ModalesOrganizacion';
import { paleta } from './paleta';
import { PortadaDocumentos } from './PortadaDocumentos';
import { TablaDocumentos } from './TablaDocumentos';
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
  const subcarpetas = navegando && filtros.carpetaId
    ? (estructura?.carpetas ?? [])
        .filter((otra) => otra.carpetaPadreId === (filtros.carpetaId ?? null))
        .sort((a, b) => a.indiceOrden - b.indiceOrden || a.nombre.localeCompare(b.nombre, 'es'))
    : [];
  // Raíz de la wiki sin filtros: portada con recientes, carpetas y avisos encima de la lista.
  const esPortada = navegando && !filtros.carpetaId;
  const etiqueta = filtros.etiquetaId ? estructura?.etiquetas.find((actual) => actual.id === filtros.etiquetaId) : undefined;

  const titulo = filtros.texto
    ? `Resultados para "${filtros.texto}"`
    : carpeta
      ? carpeta.nombre
      : etiqueta
        ? `#${etiqueta.nombre}`
        : filtros.vista !== 'Activos'
          ? titulosVista[filtros.vista]
          : 'Documentación';

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

      {esPortada && documentos && documentos.length > 0 && <PortadaDocumentos documentos={documentos} estructura={estructura} />}

      {subcarpetas.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-texto-3">Subcarpetas</h2>
          <ul className="flex flex-wrap gap-2">
            {subcarpetas.map((subcarpeta) => {
              const tono = subcarpeta.color ? paleta[subcarpeta.color] : null;
              return (
                <li key={subcarpeta.id}>
                  <Link
                    to={`/documentos?carpeta=${subcarpeta.id}`}
                    className={unirClases(
                      'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition hover:-translate-y-px',
                      tono ? tono.azulejo : 'border-violet-100 bg-violet-50/60 hover:border-violet-200',
                    )}
                  >
                    <FolderOpen className={unirClases('size-4', tono ? tono.icono : 'text-violet-300')} fill="currentColor" fillOpacity={0.18} />
                    <span className="font-medium">{subcarpeta.nombre}</span>
                    <span className="text-xs text-texto-2">{subcarpeta.totalDocumentos}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {documentos === null ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((indice) => (
            <Esqueleto key={indice} className="h-9 rounded-lg" />
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
        <section>
          {(esPortada || subcarpetas.length > 0) && (
            <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-texto-3">{esPortada ? `Todos los documentos · ${documentos.length}` : 'Páginas'}</h2>
          )}
          <TablaDocumentos
            documentos={documentos}
            estructura={estructura}
            enPapelera={enPapelera}
            acciones={{
              alternarFavorito: (documento) => void alternarFavorito(documento),
              moverAPapelera: (documento) => void moverAPapelera(documento),
              restaurar: (documento) => void restaurar(documento),
              eliminarDefinitivo: (documento) => void eliminarDefinitivo(documento),
            }}
          />
        </section>
      )}
    </div>
  );
}
