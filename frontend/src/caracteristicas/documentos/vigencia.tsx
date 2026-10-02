import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Archive, CalendarClock, Check, CircleCheck, PencilLine, RefreshCw } from 'lucide-react';
import { formatearFecha } from '../../servicios/formato';
import type { DocumentoDetalleDto, DocumentoResumenDto, EstadoDocumento } from '../../servicios/tipos';
import { Boton, unirClases, type Icono } from '../../componentes/ui/primitivos';

export interface Vigencia {
  estado: EstadoDocumento;
  fechaRevision: string | null;
  documentoReemplazoId: string | null;
}

export const configuracionVigencia: Record<EstadoDocumento, { etiqueta: string; descripcion: string; clase: string; icono: Icono }> = {
  Borrador: { etiqueta: 'Borrador', descripcion: 'En construcción: puede estar incompleto', clase: 'bg-zinc-100 text-zinc-700', icono: PencilLine },
  Vigente: { etiqueta: 'Vigente', descripcion: 'Confiable y actualizado', clase: 'bg-emerald-100 text-emerald-800', icono: CircleCheck },
  Obsoleto: { etiqueta: 'Obsoleto', descripcion: 'Ya no aplica: no seguir sus pasos', clase: 'bg-red-100 text-red-800', icono: Archive },
};

const estados = Object.keys(configuracionVigencia) as EstadoDocumento[];

/** "Revisar antes de" es el inicio del día elegido (hora local), guardado como instante UTC. */
const deFechaInput = (valor: string) => (valor ? new Date(`${valor}T00:00:00`).toISOString() : null);
const aFechaInput = (iso: string | null) => {
  if (!iso) return '';
  const fecha = new Date(iso);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
};
export const enMeses = (meses: number) => {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  fecha.setMonth(fecha.getMonth() + meses);
  return fecha.toISOString();
};

/** Insignia para tarjetas y listas: solo lo que requiere atención (un documento vigente no la muestra). */
export function InsigniaVigencia({ documento, className }: { documento: Pick<DocumentoResumenDto, 'estado' | 'porRevisar'>; className?: string }) {
  if (documento.porRevisar)
    return (
      <span className={unirClases('inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800', className)}>
        <CalendarClock className="size-3" />
        Por revisar
      </span>
    );
  if (documento.estado === 'Vigente') return null;
  const { etiqueta, clase, icono: IconoEstado } = configuracionVigencia[documento.estado];
  return (
    <span className={unirClases('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium', clase, className)}>
      <IconoEstado className="size-3" />
      {etiqueta}
    </span>
  );
}

/** Chip con el estado del documento; al pulsarlo permite cambiar estado, fecha de revisión y reemplazo. */
export function SelectorVigencia({
  documento,
  documentos,
  soloLectura,
  alCambiar,
}: {
  documento: DocumentoDetalleDto;
  documentos: DocumentoResumenDto[] | null;
  soloLectura: boolean;
  alCambiar: (vigencia: Vigencia) => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const actual: Vigencia = { estado: documento.estado, fechaRevision: documento.fechaRevision, documentoReemplazoId: documento.documentoReemplazoId };
  const { etiqueta, clase, icono: IconoEstado } = configuracionVigencia[documento.estado];

  useEffect(() => {
    if (!abierto) return;
    const alPulsarFuera = (evento: MouseEvent) => !contenedor.current?.contains(evento.target as Node) && setAbierto(false);
    const alPresionar = (evento: KeyboardEvent) => evento.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', alPulsarFuera);
    document.addEventListener('keydown', alPresionar);
    return () => {
      document.removeEventListener('mousedown', alPulsarFuera);
      document.removeEventListener('keydown', alPresionar);
    };
  }, [abierto]);

  const cambiar = (cambios: Partial<Vigencia>) => void alCambiar({ ...actual, ...cambios });
  const candidatos = (documentos ?? []).filter((otro) => otro.id !== documento.id && otro.estado !== 'Obsoleto');

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        disabled={soloLectura}
        onClick={() => setAbierto((valor) => !valor)}
        aria-expanded={abierto}
        title={configuracionVigencia[documento.estado].descripcion}
        className={unirClases('inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-opacity hover:opacity-85 disabled:cursor-default', clase)}
      >
        <IconoEstado className="size-3.5" />
        {etiqueta}
        {documento.porRevisar ? (
          <span className="rounded bg-amber-200/60 px-1 text-amber-900">por revisar</span>
        ) : (
          documento.fechaRevision && documento.estado !== 'Obsoleto' && <span className="font-normal opacity-75">· revisar {formatearFecha(documento.fechaRevision)}</span>
        )}
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-40 mt-1.5 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-borde bg-superficie p-2 text-sm shadow-flotante"
          >
            <p className="px-2 pb-1 pt-0.5 text-[11px] font-medium uppercase tracking-wider text-texto-3">Estado</p>
            {estados.map((estado) => {
              const { etiqueta: nombre, descripcion, icono: IconoOpcion, clase: tono } = configuracionVigencia[estado];
              return (
                <button
                  key={estado}
                  type="button"
                  onClick={() => cambiar({ estado, documentoReemplazoId: estado === 'Obsoleto' ? actual.documentoReemplazoId : null })}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-superficie-2"
                >
                  <span className={unirClases('grid size-6 shrink-0 place-items-center rounded-md', tono)}>
                    <IconoOpcion className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{nombre}</span>
                    <span className="block text-xs text-texto-3">{descripcion}</span>
                  </span>
                  {documento.estado === estado && <Check className="size-4 text-acento" />}
                </button>
              );
            })}

            {documento.estado === 'Obsoleto' ? (
              <div className="mt-2 border-t border-borde px-2 pt-2">
                <label className="text-xs font-medium text-texto-2" htmlFor="selector-reemplazo">
                  Reemplazado por
                </label>
                <select
                  id="selector-reemplazo"
                  value={documento.documentoReemplazoId ?? ''}
                  onChange={(evento) => cambiar({ documentoReemplazoId: evento.target.value || null })}
                  className="mt-1 h-8 w-full rounded-lg border border-borde bg-superficie px-2 text-sm focus:border-acento focus:outline-none"
                >
                  <option value="">Sin reemplazo</option>
                  {candidatos.map((otro) => (
                    <option key={otro.id} value={otro.id}>
                      {otro.icono ? `${otro.icono} ` : ''}
                      {otro.titulo}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mt-2 border-t border-borde px-2 pt-2">
                <label className="text-xs font-medium text-texto-2" htmlFor="fecha-revision">
                  Revisar antes de
                </label>
                <input
                  id="fecha-revision"
                  type="date"
                  value={aFechaInput(documento.fechaRevision)}
                  onChange={(evento) => cambiar({ fechaRevision: deFechaInput(evento.target.value) })}
                  className="mt-1 h-8 w-full rounded-lg border border-borde bg-superficie px-2 text-sm focus:border-acento focus:outline-none"
                />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {[
                    { texto: '3 meses', meses: 3 },
                    { texto: '6 meses', meses: 6 },
                    { texto: '1 año', meses: 12 },
                  ].map(({ texto, meses }) => (
                    <button key={meses} type="button" onClick={() => cambiar({ fechaRevision: enMeses(meses) })} className="h-6 rounded-md bg-superficie-2 px-2 text-xs text-texto-2 hover:text-texto">
                      {texto}
                    </button>
                  ))}
                  {documento.fechaRevision && (
                    <button type="button" onClick={() => cambiar({ fechaRevision: null })} className="h-6 rounded-md px-2 text-xs text-texto-3 hover:text-texto">
                      Sin revisión
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Aviso sobre el documento: obsoleto (con enlace al reemplazo) o con la revisión vencida. */
export function AvisoVigencia({ documento, soloLectura, alCambiar }: { documento: DocumentoDetalleDto; soloLectura: boolean; alCambiar: (vigencia: Vigencia) => Promise<void> }) {
  if (documento.estado === 'Obsoleto')
    return (
      <div className="mx-auto mb-5 flex max-w-3xl flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        <Archive className="size-4 shrink-0 text-peligro" />
        <span className="flex-1">
          Este documento está <strong>obsoleto</strong>: no sigas sus pasos.
          {documento.documentoReemplazoId && documento.tituloReemplazo && (
            <>
              {' '}
              Consulta{' '}
              <Link to={`/documentos/${documento.documentoReemplazoId}`} className="font-medium underline underline-offset-2">
                {documento.tituloReemplazo}
              </Link>
              .
            </>
          )}
        </span>
      </div>
    );
  if (!documento.porRevisar || !documento.fechaRevision) return null;
  return (
    <div className="mx-auto mb-5 flex max-w-3xl flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <CalendarClock className="size-4 shrink-0 text-aviso" />
      <span className="flex-1">
        Revisión pendiente desde el {formatearFecha(documento.fechaRevision)}. ¿Sigue siendo correcto?
      </span>
      {!soloLectura && (
        <Boton
          variante="secundario"
          tamano="sm"
          icono={RefreshCw}
          onClick={() => void alCambiar({ estado: 'Vigente', fechaRevision: enMeses(6), documentoReemplazoId: null })}
        >
          Sigue vigente · revisar en 6 meses
        </Boton>
      )}
    </div>
  );
}
