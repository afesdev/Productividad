import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownAZ, Clock, FileText, Folder, ListFilter, RotateCcw, Rows3, Star, Trash2 } from 'lucide-react';
import { formatearRelativo } from '../../servicios/formato';
import type { DocumentoResumenDto, EstructuraDocumentosDto } from '../../servicios/tipos';
import { BotonIcono, Boton, unirClases } from '../../componentes/ui/primitivos';
import { InsigniaVigencia } from './vigencia';
import { ChipEtiqueta } from './SelectorEtiquetas';
import { paleta } from './paleta';

type Orden = 'editado' | 'titulo';
type Agrupacion = 'carpeta' | 'ninguna';

export interface AccionesDocumento {
  alternarFavorito: (documento: DocumentoResumenDto) => void;
  moverAPapelera: (documento: DocumentoResumenDto) => void;
  restaurar: (documento: DocumentoResumenDto) => void;
  eliminarDefinitivo: (documento: DocumentoResumenDto) => void;
}

/** Columnas de la lista: título · etiquetas · estado · fecha · acciones (en móvil solo título y fecha). */
const columnas = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 md:grid-cols-[minmax(0,1fr)_11rem_7rem_7.5rem_4.5rem]';

/**
 * Lista densa de documentos (tipo Notion/Linear): una fila por documento, filtro rápido en la página,
 * agrupación por carpeta y orden por fecha o título (ambos se recuerdan).
 */
export function TablaDocumentos({
  documentos,
  estructura,
  enPapelera,
  acciones,
}: {
  documentos: DocumentoResumenDto[];
  estructura: EstructuraDocumentosDto | null;
  enPapelera: boolean;
  acciones: AccionesDocumento;
}) {
  const [filtro, setFiltro] = useState('');
  const [orden, setOrden] = useState<Orden>(() => (leerPreferencia(ClaveOrden) === 'titulo' ? 'titulo' : 'editado'));
  const [agrupacion, setAgrupacion] = useState<Agrupacion>(() => (leerPreferencia(ClaveAgrupacion) === 'ninguna' ? 'ninguna' : 'carpeta'));

  const carpetas = useMemo(() => new Map((estructura?.carpetas ?? []).map((carpeta) => [carpeta.id, carpeta])), [estructura]);

  const grupos = useMemo(() => {
    const texto = normalizar(filtro.trim());
    const visibles = documentos
      .filter((documento) => !texto || normalizar(`${documento.titulo} ${documento.rutaEsquema} ${documento.etiquetas.map((etiqueta) => etiqueta.nombre).join(' ')}`).includes(texto))
      .sort((a, b) => (orden === 'titulo' ? a.titulo.localeCompare(b.titulo, 'es') : b.fechaActualizacion.localeCompare(a.fechaActualizacion)));
    if (agrupacion === 'ninguna') return [{ clave: 'todos', carpetaId: null as string | null, documentos: visibles }];
    const porCarpeta = new Map<string, DocumentoResumenDto[]>();
    for (const documento of visibles) {
      const clave = documento.carpetaDocumentoId ?? '';
      porCarpeta.set(clave, [...(porCarpeta.get(clave) ?? []), documento]);
    }
    // Carpetas en su orden del panel lateral; "Sin carpeta" al final.
    return [...porCarpeta.entries()]
      .map(([clave, lista]) => ({ clave: clave || 'sin-carpeta', carpetaId: clave || null, documentos: lista }))
      .sort((a, b) => {
        const carpetaA = a.carpetaId ? carpetas.get(a.carpetaId) : undefined;
        const carpetaB = b.carpetaId ? carpetas.get(b.carpetaId) : undefined;
        if (!carpetaA || !carpetaB) return carpetaA ? -1 : carpetaB ? 1 : 0;
        return carpetaA.indiceOrden - carpetaB.indiceOrden || carpetaA.nombre.localeCompare(carpetaB.nombre, 'es');
      });
  }, [documentos, filtro, orden, agrupacion, carpetas]);

  const totalVisibles = grupos.reduce((total, grupo) => total + grupo.documentos.length, 0);
  // Una sola carpeta (p. ej. dentro de una carpeta) no necesita cabecera de grupo.
  const mostrarGrupos = agrupacion === 'carpeta' && grupos.length > 1;

  function cambiarOrden() {
    const nuevo: Orden = orden === 'editado' ? 'titulo' : 'editado';
    setOrden(nuevo);
    guardarPreferencia(ClaveOrden, nuevo);
  }

  function cambiarAgrupacion() {
    const nueva: Agrupacion = agrupacion === 'carpeta' ? 'ninguna' : 'carpeta';
    setAgrupacion(nueva);
    guardarPreferencia(ClaveAgrupacion, nueva);
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <label className="relative min-w-48 flex-1">
          <ListFilter className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-texto-3" />
          <input
            value={filtro}
            onChange={(evento) => setFiltro(evento.target.value)}
            placeholder="Filtrar esta lista…"
            aria-label="Filtrar documentos de la lista"
            className="h-8 w-full rounded-lg border border-borde bg-superficie pl-8 pr-3 text-sm placeholder:text-texto-3 focus:border-acento focus:outline-none"
          />
        </label>
        <Boton variante="secundario" tamano="sm" icono={Rows3} onClick={cambiarAgrupacion}>
          {agrupacion === 'carpeta' ? 'Agrupado por carpeta' : 'Sin agrupar'}
        </Boton>
        <Boton variante="secundario" tamano="sm" icono={orden === 'editado' ? Clock : ArrowDownAZ} onClick={cambiarOrden}>
          {orden === 'editado' ? 'Recientes primero' : 'Por título'}
        </Boton>
      </div>

      <div className={unirClases(columnas, 'border-b border-borde px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-texto-3')}>
        <span>Título</span>
        <span className="max-md:hidden">Etiquetas</span>
        <span className="max-md:hidden">Estado</span>
        <span className="text-right md:text-left">{enPapelera ? 'En papelera' : 'Editado'}</span>
        <span className="max-md:hidden" />
      </div>

      {totalVisibles === 0 ? (
        <p className="px-2 py-8 text-center text-sm text-texto-3">Ningún documento coincide con "{filtro}".</p>
      ) : (
        grupos.map((grupo) => {
          const carpeta = grupo.carpetaId ? carpetas.get(grupo.carpetaId) : undefined;
          return (
            <section key={grupo.clave}>
              {mostrarGrupos && (
                <h3 className="flex items-center gap-1.5 px-2 pb-1 pt-4 text-xs font-medium text-texto-2">
                  <Folder className={unirClases('size-3.5', carpeta?.color ? paleta[carpeta.color].icono : 'text-texto-3')} fill="currentColor" fillOpacity={0.18} />
                  {carpeta?.nombre ?? 'Sin carpeta'}
                  <span className="font-normal text-texto-3">· {grupo.documentos.length}</span>
                </h3>
              )}
              <ul>
                {grupo.documentos.map((documento) => (
                  <FilaDocumento key={documento.id} documento={documento} enPapelera={enPapelera} acciones={acciones} />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

function FilaDocumento({ documento, enPapelera, acciones }: { documento: DocumentoResumenDto; enPapelera: boolean; acciones: AccionesDocumento }) {
  // Subpáginas: la ruta sin el propio título ("Padre / Hijo" → "Padre /").
  const ruta = documento.rutaEsquema.includes('/') ? documento.rutaEsquema.slice(0, documento.rutaEsquema.lastIndexOf('/')).trim() : null;
  const fecha = enPapelera && documento.fechaArchivado ? documento.fechaArchivado : documento.fechaActualizacion;
  return (
    <li className={unirClases(columnas, 'group relative rounded-lg border-b border-borde/60 px-2 py-2 text-sm transition-colors hover:bg-superficie-2')}>
      <Link to={`/documentos/${documento.id}`} className="flex min-w-0 items-center gap-2.5 after:absolute after:inset-0">
        <span className="grid size-6 shrink-0 place-items-center text-base leading-none">{documento.icono ?? <FileText className="size-4 text-texto-3" />}</span>
        <span className="min-w-0 truncate">
          {ruta && <span className="text-texto-3">{ruta} / </span>}
          <span className="font-medium">{documento.titulo}</span>
        </span>
        {documento.esFavorito && <Star className="size-3.5 shrink-0 fill-amber-300 text-amber-400" aria-label="Favorito" />}
      </Link>
      <span className="flex min-w-0 gap-1 overflow-hidden max-md:hidden">
        {documento.etiquetas.slice(0, 2).map((etiqueta) => (
          <ChipEtiqueta key={etiqueta.id} etiqueta={etiqueta} className="h-5 shrink-0 px-1.5 text-[11px]" />
        ))}
        {documento.etiquetas.length > 2 && <span className="self-center text-xs text-texto-3">+{documento.etiquetas.length - 2}</span>}
      </span>
      <span className="max-md:hidden">{!enPapelera && <InsigniaVigencia documento={documento} />}</span>
      <span className="text-right text-xs text-texto-3 md:text-left" title={new Date(fecha).toLocaleString('es')}>
        {formatearRelativo(fecha)}
      </span>
      {/* Las acciones quedan por encima del enlace de la fila (z-10). */}
      <span className="relative z-10 flex justify-end opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-md:hidden">
        {enPapelera ? (
          <>
            <BotonIcono icono={RotateCcw} etiqueta="Restaurar" tamano="sm" onClick={() => acciones.restaurar(documento)} />
            <BotonIcono icono={Trash2} etiqueta="Eliminar para siempre" tamano="sm" className="hover:text-peligro" onClick={() => acciones.eliminarDefinitivo(documento)} />
          </>
        ) : (
          <>
            <BotonIcono
              icono={Star}
              etiqueta={documento.esFavorito ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              tamano="sm"
              onClick={() => acciones.alternarFavorito(documento)}
            />
            <BotonIcono icono={Trash2} etiqueta="Mover a la papelera" tamano="sm" onClick={() => acciones.moverAPapelera(documento)} />
          </>
        )}
      </span>
    </li>
  );
}

const ClaveOrden = 'documentos.lista.orden';
const ClaveAgrupacion = 'documentos.lista.agrupacion';

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function leerPreferencia(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function guardarPreferencia(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // Preferencia visual: sin almacenamiento solo dura la sesión.
  }
}
