import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FolderTree, Loader2, X } from 'lucide-react';
import { apiDocumentos } from '../servicios/api';
import { notificar } from '../servicios/notificaciones';
import type { DocumentoResumenDto, EstructuraDocumentosDto, VistaDocumentos } from '../servicios/tipos';
import { BarraLateralDocumentos, type FiltrosDocumentos, type OpcionesNuevoDocumento } from '../caracteristicas/documentos/BarraLateralDocumentos';
import { EditorDocumento } from '../caracteristicas/documentos/EditorDocumento';
import { ListaDocumentos } from '../caracteristicas/documentos/ListaDocumentos';
import { BotonPlegarPanel } from '../componentes/ui/BotonPlegarPanel';
import { BotonIcono, unirClases } from '../componentes/ui/primitivos';

/**
 * Wiki de documentos a pantalla completa: panel lateral pastel pegado al menú (carpetas, favoritos, etiquetas, papelera)
 * y área de lectura blanca con el editor o el listado.
 * Rutas: /documentos?vista=&carpeta=&etiqueta=&q=  ·  /documentos/:id  ·  /documentos/nuevo?carpeta=&padre=
 */
const vistasValidas: VistaDocumentos[] = ['Activos', 'Favoritos', 'Papelera', 'Borradores', 'PorRevisar', 'Obsoletos'];

export function PaginaDocumentos() {
  const { id } = useParams();
  const [parametros] = useSearchParams();
  const navegar = useNavigate();
  const [estructura, setEstructura] = useState<EstructuraDocumentosDto | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoResumenDto[] | null>(null);
  const [recarga, setRecarga] = useState(0);
  // Pantallas < xl: el panel de carpetas es un cajón que se abre con un botón.
  const [panelAbierto, setPanelAbierto] = useState(false);
  // Pantallas grandes: el panel se recoge a un riel para leer y escribir con más espacio (se recuerda).
  const [recogido, setRecogido] = useState(leerRecogido);

  function alternarRecogido() {
    setRecogido((actual) => {
      try {
        localStorage.setItem(ClavePanelRecogido, actual ? '0' : '1');
      } catch {
        // Preferencia visual: sin almacenamiento solo dura la sesión.
      }
      return !actual;
    });
  }

  const recargar = useCallback(() => {
    Promise.all([apiDocumentos.estructura(), apiDocumentos.listar({ vista: 'Activos' })])
      .then(([nuevaEstructura, activos]) => {
        setEstructura(nuevaEstructura);
        setDocumentos(activos);
      })
      .catch((errorCarga) => notificar.error('No se pudieron cargar los documentos', errorCarga));
    setRecarga((actual) => actual + 1);
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const crearDocumento = useCallback(
    async (opciones: OpcionesNuevoDocumento) => {
      try {
        const idCreado = await apiDocumentos.crear({
          titulo: 'Sin título',
          contenidoMarkdown: '',
          carpetaDocumentoId: opciones.documentoPadreId ? null : (opciones.carpetaDocumentoId ?? null),
          documentoPadreId: opciones.documentoPadreId ?? null,
        });
        recargar();
        navegar(`/documentos/${idCreado}`, { replace: id === 'nuevo' });
        return idCreado;
      } catch (errorCreacion) {
        notificar.error('No se pudo crear el documento', errorCreacion);
        if (id === 'nuevo') navegar('/documentos', { replace: true });
        return null;
      }
    },
    [id, navegar, recargar],
  );

  // /documentos/nuevo (paleta de comandos o enlaces): crea al instante y abre el editor.
  const creandoNuevo = useRef(false);
  useEffect(() => {
    if (id !== 'nuevo' || creandoNuevo.current) return;
    creandoNuevo.current = true;
    void crearDocumento({ carpetaDocumentoId: parametros.get('carpeta'), documentoPadreId: parametros.get('padre') }).finally(() => {
      creandoNuevo.current = false;
    });
  }, [id, parametros, crearDocumento]);

  const filtros = useMemo<FiltrosDocumentos>(() => {
    const vista = parametros.get('vista');
    return {
      vista: vistasValidas.includes(vista as VistaDocumentos) ? (vista as VistaDocumentos) : 'Activos',
      carpetaId: parametros.get('carpeta'),
      etiquetaId: parametros.get('etiqueta'),
      texto: parametros.get('q') ?? '',
    };
  }, [parametros]);

  const documentoId = id && id !== 'nuevo' ? id : null;

  // Al navegar (abrir documento, carpeta o filtro) se cierra el cajón.
  useEffect(() => setPanelAbierto(false), [id, parametros]);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-1 flex-col xl:flex-row">
      {panelAbierto && <div className="fixed inset-0 z-40 bg-zinc-950/20 xl:hidden" onClick={() => setPanelAbierto(false)} />}

      {/* Escritorio: panel fijo a toda la altura, plegable a un riel. Pantallas pequeñas: cajón lateral. Scroll sin barra visible. */}
      <div className="relative xl:sticky xl:top-14 xl:z-20 xl:h-[calc(100vh-3.5rem)] xl:shrink-0">
        <aside
          aria-label="Carpetas y páginas"
          className={unirClases(
            'sin-barra-scroll overflow-y-auto bg-lateral px-3 py-5 transition-[width]',
            'xl:block xl:h-full xl:border-r xl:border-borde',
            recogido ? 'xl:w-16 xl:px-2' : 'xl:w-72',
            panelAbierto ? 'max-xl:fixed max-xl:inset-y-0 max-xl:left-0 max-xl:z-50 max-xl:w-80 max-xl:max-w-[85vw] max-xl:shadow-flotante' : 'max-xl:hidden',
          )}
        >
          {recogido && (
            <button
              type="button"
              onClick={alternarRecogido}
              title="Carpetas y páginas"
              aria-label="Expandir carpetas y páginas"
              className="mx-auto hidden size-9 place-items-center rounded-xl bg-violet-100 text-violet-500 transition hover:bg-violet-200 xl:grid"
            >
              <FolderTree className="size-4" />
            </button>
          )}
          <div className="mb-3 flex items-center justify-between xl:hidden">
            <span className="px-2 text-sm font-semibold">Carpetas y páginas</span>
            <BotonIcono icono={X} etiqueta="Cerrar panel" onClick={() => setPanelAbierto(false)} />
          </div>
          <div className={unirClases(recogido && 'xl:hidden')}>
            <BarraLateralDocumentos
              estructura={estructura}
              documentos={documentos}
              documentoActivoId={documentoId}
              filtros={documentoId ? null : filtros}
              alCrearDocumento={(opciones) => void crearDocumento(opciones)}
              alRecargar={recargar}
            />
          </div>
        </aside>
        <div className="hidden xl:block">
          <BotonPlegarPanel plegado={recogido} alAlternar={alternarRecogido} etiqueta="carpetas y páginas" className="top-5" />
        </div>
      </div>

      <section className="min-w-0 flex-1 bg-superficie px-4 pb-10 pt-4 md:px-8 xl:px-12">
        <button
          type="button"
          onClick={() => setPanelAbierto(true)}
          className="mb-2 inline-flex h-9 items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 text-sm font-medium text-violet-800 transition hover:bg-violet-100 xl:hidden"
        >
          <FolderTree className="size-4" />
          Carpetas y páginas
        </button>
        {id === 'nuevo' ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-texto-3">
            <Loader2 className="size-4 animate-spin" />
            Creando documento…
          </div>
        ) : documentoId ? (
          <EditorDocumento
            key={documentoId}
            documentoId={documentoId}
            estructura={estructura}
            documentos={documentos}
            alRecargar={recargar}
            alCrearDocumento={(opciones) => void crearDocumento(opciones)}
          />
        ) : (
          <ListaDocumentos
            filtros={filtros}
            estructura={estructura}
            recarga={recarga}
            alCrearDocumento={(opciones) => void crearDocumento(opciones)}
            alRecargar={recargar}
          />
        )}
      </section>
    </div>
  );
}

const ClavePanelRecogido = 'documentos.panelRecogido';

function leerRecogido(): boolean {
  try {
    return localStorage.getItem(ClavePanelRecogido) === '1';
  } catch {
    return false;
  }
}
