import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, CalendarClock, ChevronRight, FilePlus2, FileText, FileUp, Files, Folder, FolderOpen, FolderPlus, Pencil, PencilLine, Plus, Search, Star, Trash2 } from 'lucide-react';
import { apiDocumentos } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import type { CarpetaDocumentoDto, DocumentoResumenDto, EstructuraDocumentosDto, EtiquetaConConteoDto, VistaDocumentos } from '../../servicios/tipos';
import { BotonIcono, Esqueleto, unirClases, type Icono } from '../../componentes/ui/primitivos';
import { MenuAcciones } from './MenuAcciones';
import { ModalCarpeta, ModalEtiqueta, type EstadoModalCarpeta } from './ModalesOrganizacion';
import { ModalImportarMarkdown } from './ModalImportarMarkdown';
import { paleta } from './paleta';

export interface FiltrosDocumentos {
  vista: VistaDocumentos;
  carpetaId: string | null;
  etiquetaId: string | null;
  texto: string;
}

export interface OpcionesNuevoDocumento {
  carpetaDocumentoId?: string | null;
  documentoPadreId?: string | null;
}

const ClaveExpandidos = 'documentos.expandidos';
const TipoArrastre = 'application/x-documento-id';

function leerExpandidos(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(ClaveExpandidos) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function BarraLateralDocumentos({
  estructura,
  documentos,
  documentoActivoId,
  filtros,
  alCrearDocumento,
  alRecargar,
}: {
  estructura: EstructuraDocumentosDto | null;
  /** Documentos activos (no papelera) para el árbol. */
  documentos: DocumentoResumenDto[] | null;
  documentoActivoId: string | null;
  filtros: FiltrosDocumentos | null;
  alCrearDocumento: (opciones: OpcionesNuevoDocumento) => void;
  alRecargar: () => void;
}) {
  const navegar = useNavigate();
  const [importando, setImportando] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(leerExpandidos);
  const [modalCarpeta, setModalCarpeta] = useState<EstadoModalCarpeta | null>(null);
  const [modalEtiqueta, setModalEtiqueta] = useState<{ etiqueta: EtiquetaConConteoDto | null } | null>(null);
  const [destinoArrastre, setDestinoArrastre] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState(filtros?.texto ?? '');

  const carpetas = useMemo(() => estructura?.carpetas ?? [], [estructura]);

  const arbol = useMemo(() => {
    const carpetasHijas = new Map<string, CarpetaDocumentoDto[]>();
    for (const carpeta of carpetas) {
      const clave = carpeta.carpetaPadreId ?? '';
      carpetasHijas.set(clave, [...(carpetasHijas.get(clave) ?? []), carpeta]);
    }
    carpetasHijas.forEach((lista) => lista.sort((a, b) => a.indiceOrden - b.indiceOrden || a.nombre.localeCompare(b.nombre, 'es')));

    const ids = new Set((documentos ?? []).map((documento) => documento.id));
    const documentosPorCarpeta = new Map<string, DocumentoResumenDto[]>();
    const subpaginas = new Map<string, DocumentoResumenDto[]>();
    for (const documento of documentos ?? []) {
      if (documento.documentoPadreId && ids.has(documento.documentoPadreId)) {
        subpaginas.set(documento.documentoPadreId, [...(subpaginas.get(documento.documentoPadreId) ?? []), documento]);
      } else {
        const clave = documento.carpetaDocumentoId ?? '';
        documentosPorCarpeta.set(clave, [...(documentosPorCarpeta.get(clave) ?? []), documento]);
      }
    }
    const porTitulo = (a: DocumentoResumenDto, b: DocumentoResumenDto) => a.titulo.localeCompare(b.titulo, 'es');
    documentosPorCarpeta.forEach((lista) => lista.sort(porTitulo));
    subpaginas.forEach((lista) => lista.sort(porTitulo));
    return { carpetasHijas, documentosPorCarpeta, subpaginas };
  }, [carpetas, documentos]);

  // Al abrir un documento se despliegan su carpeta y sus páginas padre.
  useEffect(() => {
    if (!documentoActivoId || !documentos) return;
    const porId = new Map(documentos.map((documento) => [documento.id, documento]));
    const carpetasPorId = new Map(carpetas.map((carpeta) => [carpeta.id, carpeta]));
    const abrir: string[] = [];
    let documento = porId.get(documentoActivoId);
    while (documento?.documentoPadreId && porId.has(documento.documentoPadreId)) {
      abrir.push(documento.documentoPadreId);
      documento = porId.get(documento.documentoPadreId);
    }
    let carpetaId = documento?.carpetaDocumentoId ?? null;
    while (carpetaId && abrir.length < 50) {
      abrir.push(carpetaId);
      carpetaId = carpetasPorId.get(carpetaId)?.carpetaPadreId ?? null;
    }
    if (abrir.length > 0) setExpandidos((actual) => (abrir.every((id) => actual.has(id)) ? actual : new Set([...actual, ...abrir])));
  }, [documentoActivoId, documentos, carpetas]);

  useEffect(() => {
    try {
      localStorage.setItem(ClaveExpandidos, JSON.stringify([...expandidos]));
    } catch {
      /* almacenamiento no disponible: solo se pierde la preferencia */
    }
  }, [expandidos]);

  useEffect(() => setBusqueda(filtros?.texto ?? ''), [filtros?.texto]);

  const alternar = (id: string) =>
    setExpandidos((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  async function soltarEn(evento: DragEvent, carpetaId: string | null) {
    evento.preventDefault();
    setDestinoArrastre(null);
    const documentoId = evento.dataTransfer.getData(TipoArrastre);
    const documento = documentos?.find((actual) => actual.id === documentoId);
    if (!documento || (documento.carpetaDocumentoId === carpetaId && !documento.documentoPadreId)) return;
    try {
      await apiDocumentos.mover(documento.id, carpetaId);
      if (carpetaId) setExpandidos((actual) => new Set([...actual, carpetaId]));
      const nombreCarpeta = carpetaId ? carpetas.find((carpeta) => carpeta.id === carpetaId)?.nombre : 'la raíz';
      notificar.exito('Documento movido', `${documento.titulo} → ${nombreCarpeta}`);
      alRecargar();
    } catch (errorMovimiento) {
      notificar.error('No se pudo mover el documento', errorMovimiento);
    }
  }

  const propiedadesDestino = (clave: string, carpetaId: string | null) => ({
    onDragOver: (evento: DragEvent) => {
      if (!evento.dataTransfer.types.includes(TipoArrastre)) return;
      evento.preventDefault();
      evento.dataTransfer.dropEffect = 'move';
      if (destinoArrastre !== clave) setDestinoArrastre(clave);
    },
    onDragLeave: (evento: DragEvent) => {
      if (!(evento.currentTarget as HTMLElement).contains(evento.relatedTarget as Node)) setDestinoArrastre(null);
    },
    onDrop: (evento: DragEvent) => void soltarEn(evento, carpetaId),
  });

  function renderizarDocumento(documento: DocumentoResumenDto, profundidad: number): ReactNode {
    const hijos = arbol.subpaginas.get(documento.id) ?? [];
    const expandido = expandidos.has(documento.id);
    const activo = documento.id === documentoActivoId;
    return (
      <li key={documento.id}>
        <div
          draggable
          onDragStart={(evento) => {
            evento.dataTransfer.setData(TipoArrastre, documento.id);
            evento.dataTransfer.effectAllowed = 'move';
          }}
          style={{ paddingLeft: `${0.25 + profundidad * 0.85}rem` }}
          className={unirClases(
            'group flex h-8 items-center gap-1 rounded-lg pr-1 text-sm transition-colors',
            activo ? 'bg-superficie font-medium text-texto shadow-tarjeta' : 'text-texto-2 hover:bg-superficie/70 hover:text-texto',
          )}
        >
          <BotonExpandir visible={hijos.length > 0} expandido={expandido} alPulsar={() => alternar(documento.id)} />
          <Link to={`/documentos/${documento.id}`} className="flex min-w-0 flex-1 items-center gap-2 self-stretch">
            {documento.icono ? (
              <span className="w-4 shrink-0 text-center text-[13px] leading-none">{documento.icono}</span>
            ) : (
              <FileText className={unirClases('size-4 shrink-0', activo ? 'text-texto' : 'text-texto-3')} />
            )}
            <span className="truncate">{documento.titulo}</span>
          </Link>
          <BotonIcono
            icono={Plus}
            etiqueta="Nueva subpágina"
            tamano="sm"
            className="size-6 opacity-0 group-hover:opacity-100 focus:opacity-100"
            onClick={() => alCrearDocumento({ documentoPadreId: documento.id })}
          />
        </div>
        {expandido && hijos.length > 0 && <ul>{hijos.map((hijo) => renderizarDocumento(hijo, profundidad + 1))}</ul>}
      </li>
    );
  }

  function renderizarCarpeta(carpeta: CarpetaDocumentoDto, profundidad: number): ReactNode {
    const subcarpetas = arbol.carpetasHijas.get(carpeta.id) ?? [];
    const documentosCarpeta = arbol.documentosPorCarpeta.get(carpeta.id) ?? [];
    const expandido = expandidos.has(carpeta.id);
    const seleccionada = filtros?.carpetaId === carpeta.id;
    const IconoCarpeta = expandido ? FolderOpen : Folder;
    return (
      <li key={carpeta.id}>
        <div
          {...propiedadesDestino(carpeta.id, carpeta.id)}
          style={{ paddingLeft: `${0.25 + profundidad * 0.85}rem` }}
          className={unirClases(
            'group flex h-8 items-center gap-1 rounded-lg pr-1 text-sm transition-colors',
            destinoArrastre === carpeta.id ? 'bg-acento-suave ring-1 ring-acento/40' : seleccionada ? 'bg-superficie text-texto shadow-tarjeta' : 'text-texto-2 hover:bg-superficie/70 hover:text-texto',
          )}
        >
          <BotonExpandir visible expandido={expandido} alPulsar={() => alternar(carpeta.id)} />
          <button
            type="button"
            onClick={() => {
              if (!expandido) alternar(carpeta.id);
              navegar(`/documentos?carpeta=${carpeta.id}`);
            }}
            className="flex min-w-0 flex-1 items-center gap-2 self-stretch text-left"
          >
            <IconoCarpeta className={unirClases('size-4 shrink-0', carpeta.color ? paleta[carpeta.color].icono : 'text-violet-300')} fill="currentColor" fillOpacity={0.18} />
            <span className="truncate">{carpeta.nombre}</span>
          </button>
          <span className="px-1 text-xs tabular-nums text-texto-3 group-hover:hidden">{carpeta.totalDocumentos || ''}</span>
          <span className="hidden items-center group-hover:flex group-focus-within:flex">
            <BotonIcono icono={Plus} etiqueta="Nuevo documento aquí" tamano="sm" className="size-6" onClick={() => alCrearDocumento({ carpetaDocumentoId: carpeta.id })} />
            <MenuAcciones
              etiqueta={`Acciones de ${carpeta.nombre}`}
              acciones={[
                { etiqueta: 'Nuevo documento', icono: FilePlus2, alPulsar: () => alCrearDocumento({ carpetaDocumentoId: carpeta.id }) },
                { etiqueta: 'Nueva subcarpeta', icono: FolderPlus, alPulsar: () => setModalCarpeta({ carpeta: null, carpetaPadreId: carpeta.id }) },
                { etiqueta: 'Editar carpeta', icono: Pencil, alPulsar: () => setModalCarpeta({ carpeta, carpetaPadreId: carpeta.carpetaPadreId }), separadorAntes: true },
              ]}
            />
          </span>
        </div>
        {expandido && (
          <ul>
            {subcarpetas.map((subcarpeta) => renderizarCarpeta(subcarpeta, profundidad + 1))}
            {documentosCarpeta.map((documento) => renderizarDocumento(documento, profundidad + 1))}
            {subcarpetas.length === 0 && documentosCarpeta.length === 0 && (
              <li style={{ paddingLeft: `${1.75 + profundidad * 0.85}rem` }} className="py-1 text-xs text-texto-3">
                Vacía · arrastra documentos aquí
              </li>
            )}
          </ul>
        )}
      </li>
    );
  }

  const favoritos = (documentos ?? []).filter((documento) => documento.esFavorito);
  const carpetasRaiz = arbol.carpetasHijas.get('') ?? [];
  const documentosRaiz = arbol.documentosPorCarpeta.get('') ?? [];
  const vistaGeneral = filtros && !filtros.carpetaId && !filtros.etiquetaId && !filtros.texto;
  const conteosVigencia = useMemo(
    () => ({
      borradores: documentos?.filter((documento) => documento.estado === 'Borrador').length,
      porRevisar: documentos?.filter((documento) => documento.porRevisar).length,
      obsoletos: documentos?.filter((documento) => documento.estado === 'Obsoleto').length,
    }),
    [documentos],
  );

  return (
    <nav aria-label="Documentos" className="flex flex-col gap-5 text-sm">
      <form
        role="search"
        onSubmit={(evento) => {
          evento.preventDefault();
          navegar(busqueda.trim() ? `/documentos?q=${encodeURIComponent(busqueda.trim())}` : '/documentos');
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-texto-3" />
        <input
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar en documentos…"
          aria-label="Buscar en documentos"
          className="h-9 w-full rounded-lg border border-borde bg-superficie pl-8 pr-3 text-sm placeholder:text-texto-3 focus:border-acento focus:outline-none focus:ring-3 focus:ring-acento/15"
        />
      </form>

      <div className="-mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
        <button
          type="button"
          onClick={() => alCrearDocumento({})}
          className="flex h-9 items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-100/70 text-sm font-medium text-violet-800 transition hover:bg-violet-100"
        >
          <FilePlus2 className="size-4" />
          Nueva página
        </button>
        <button
          type="button"
          onClick={() => setImportando(true)}
          title="Importar archivos .md"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
        >
          <FileUp className="size-4" />
          .md
        </button>
      </div>

      <ul className="flex flex-col gap-0.5">
        <ElementoVista to="/documentos" icono={Files} tono="bg-violet-100 text-violet-500" texto="Todos" conteo={estructura?.totalDocumentos} activo={!!vistaGeneral && filtros?.vista === 'Activos'} />
        <ElementoVista to="/documentos?vista=Favoritos" icono={Star} tono="bg-amber-100 text-amber-500" texto="Favoritos" conteo={estructura?.totalFavoritos} activo={!!vistaGeneral && filtros?.vista === 'Favoritos'} />
        <ElementoVista to="/documentos?vista=Borradores" icono={PencilLine} tono="bg-zinc-100 text-zinc-500" texto="Borradores" conteo={conteosVigencia.borradores} activo={!!vistaGeneral && filtros?.vista === 'Borradores'} />
        <ElementoVista to="/documentos?vista=PorRevisar" icono={CalendarClock} tono="bg-amber-100 text-amber-600" texto="Por revisar" conteo={conteosVigencia.porRevisar} activo={!!vistaGeneral && filtros?.vista === 'PorRevisar'} />
        <ElementoVista to="/documentos?vista=Obsoletos" icono={Archive} tono="bg-red-100 text-red-500" texto="Obsoletos" conteo={conteosVigencia.obsoletos} activo={!!vistaGeneral && filtros?.vista === 'Obsoletos'} />
        <ElementoVista to="/documentos?vista=Papelera" icono={Trash2} tono="bg-rose-100 text-rose-400" texto="Papelera" conteo={estructura?.totalPapelera} activo={!!vistaGeneral && filtros?.vista === 'Papelera'} />
      </ul>

      {favoritos.length > 0 && (
        <Seccion titulo="Favoritos">
          <ul className="flex flex-col gap-0.5">
            {favoritos.map((documento) => (
              <li key={documento.id}>
                <Link
                  to={`/documentos/${documento.id}`}
                  className={unirClases(
                    'flex h-8 items-center gap-2 rounded-lg px-2 transition-colors',
                    documento.id === documentoActivoId ? 'bg-superficie font-medium text-texto shadow-tarjeta' : 'text-texto-2 hover:bg-superficie/70 hover:text-texto',
                  )}
                >
                  <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                  <span className="truncate">{documento.titulo}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      <Seccion
        titulo="Carpetas"
        acciones={
          <>
            <BotonIcono icono={FolderPlus} etiqueta="Nueva carpeta" tamano="sm" className="size-6" onClick={() => setModalCarpeta({ carpeta: null, carpetaPadreId: null })} />
            <BotonIcono icono={FilePlus2} etiqueta="Nuevo documento" tamano="sm" className="size-6" onClick={() => alCrearDocumento({})} />
          </>
        }
      >
        {documentos === null ? (
          <div className="flex flex-col gap-1.5">
            <Esqueleto className="h-7" />
            <Esqueleto className="h-7 w-3/4" />
            <Esqueleto className="h-7 w-5/6" />
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {carpetasRaiz.map((carpeta) => renderizarCarpeta(carpeta, 0))}
            {carpetasRaiz.length === 0 && (
              <li>
                <button
                  type="button"
                  onClick={() => setModalCarpeta({ carpeta: null, carpetaPadreId: null })}
                  className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-texto-3 hover:bg-superficie/70 hover:text-texto-2"
                >
                  <FolderPlus className="size-4" />
                  Crear primera carpeta
                </button>
              </li>
            )}
          </ul>
        )}
      </Seccion>

      <div
        {...propiedadesDestino('raiz', null)}
        className={unirClases('-m-1 rounded-xl p-1 transition-colors', destinoArrastre === 'raiz' && 'bg-acento-suave ring-1 ring-acento/40')}
      >
        <Seccion titulo="Páginas sin carpeta">
          {documentos !== null && documentosRaiz.length === 0 ? (
            <p className="px-2 text-xs text-texto-3">{documentos.length === 0 ? 'Aún no hay documentos.' : 'Todo está organizado en carpetas.'}</p>
          ) : (
            <ul className="flex flex-col gap-0.5">{documentosRaiz.map((documento) => renderizarDocumento(documento, 0))}</ul>
          )}
        </Seccion>
      </div>

      <Seccion
        titulo="Etiquetas"
        acciones={<BotonIcono icono={Plus} etiqueta="Nueva etiqueta" tamano="sm" className="size-6" onClick={() => setModalEtiqueta({ etiqueta: null })} />}
      >
        {estructura && estructura.etiquetas.length === 0 && <p className="px-2 text-xs text-texto-3">Crea etiquetas desde un documento o con el botón +.</p>}
        <ul className="flex flex-col gap-0.5">
          {estructura?.etiquetas.map((etiqueta) => (
            <li key={etiqueta.id}>
              <div
                className={unirClases(
                  'group flex h-8 items-center gap-2 rounded-lg pl-2 pr-1 transition-colors',
                  filtros?.etiquetaId === etiqueta.id ? 'bg-superficie text-texto shadow-tarjeta' : 'text-texto-2 hover:bg-superficie/70 hover:text-texto',
                )}
              >
                <Link to={`/documentos?etiqueta=${etiqueta.id}`} className="flex min-w-0 flex-1 items-center gap-2 self-stretch">
                  <span className={unirClases('size-2.5 shrink-0 rounded-full', paleta[etiqueta.color].punto)} />
                  <span className="truncate">{etiqueta.nombre}</span>
                </Link>
                <span className="px-1 text-xs tabular-nums text-texto-3 group-hover:hidden">{etiqueta.totalDocumentos || ''}</span>
                <BotonIcono
                  icono={Pencil}
                  etiqueta={`Editar #${etiqueta.nombre}`}
                  tamano="sm"
                  className="hidden size-6 group-hover:inline-grid focus:inline-grid"
                  onClick={() => setModalEtiqueta({ etiqueta })}
                />
              </div>
            </li>
          ))}
        </ul>
      </Seccion>

      <ModalCarpeta estado={modalCarpeta} carpetas={carpetas} alCerrar={() => setModalCarpeta(null)} alGuardar={alRecargar} />
      <ModalImportarMarkdown
        abierto={importando}
        carpetas={carpetas}
        carpetaInicialId={filtros?.carpetaId ?? null}
        alCerrar={() => setImportando(false)}
        alImportar={alRecargar}
      />
      <ModalEtiqueta
        abierto={modalEtiqueta !== null}
        etiqueta={modalEtiqueta?.etiqueta ?? null}
        alCerrar={() => setModalEtiqueta(null)}
        alGuardar={alRecargar}
      />
    </nav>
  );
}

function Seccion({ titulo, acciones, children }: { titulo: string; acciones?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <div className="flex h-6 items-center justify-between px-2">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-texto-3">{titulo}</h2>
        {acciones && <div className="flex items-center gap-0.5">{acciones}</div>}
      </div>
      {children}
    </section>
  );
}

function ElementoVista({ to, icono: IconoVista, tono, texto, conteo, activo }: { to: string; icono: Icono; tono: string; texto: string; conteo?: number; activo: boolean }) {
  return (
    <li>
      <Link
        to={to}
        className={unirClases(
          'flex h-9 items-center gap-2.5 rounded-lg px-1.5 transition-colors',
          activo ? 'bg-superficie font-medium text-texto shadow-tarjeta' : 'text-texto-2 hover:bg-superficie/70 hover:text-texto',
        )}
      >
        <span className={unirClases('grid size-6 place-items-center rounded-md', tono)}>
          <IconoVista className="size-3.5" />
        </span>
        <span className="flex-1">{texto}</span>
        {conteo !== undefined && conteo > 0 && <span className="text-xs tabular-nums text-texto-3">{conteo}</span>}
      </Link>
    </li>
  );
}

function BotonExpandir({ visible, expandido, alPulsar }: { visible: boolean; expandido: boolean; alPulsar: () => void }) {
  if (!visible) return <span className="w-5 shrink-0" />;
  return (
    <button
      type="button"
      aria-label={expandido ? 'Contraer' : 'Expandir'}
      aria-expanded={expandido}
      onClick={alPulsar}
      className="grid size-5 shrink-0 place-items-center rounded text-texto-3 hover:bg-superficie-3 hover:text-texto-2"
    >
      <ChevronRight className={unirClases('size-3.5 transition-transform', expandido && 'rotate-90')} />
    </button>
  );
}
