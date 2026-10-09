import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, ChevronRight, FileText, FolderOpen, History, PencilLine, Search, Star, TriangleAlert } from 'lucide-react';
import { formatearRelativo } from '../../servicios/formato';
import type { DocumentoResumenDto, EstructuraDocumentosDto } from '../../servicios/tipos';
import { unirClases, type Icono } from '../../componentes/ui/primitivos';
import { paleta } from './paleta';

/**
 * Portada de la wiki (tipo Confluence): búsqueda, documentos recientes, carpetas raíz, favoritos y lo que necesita atención.
 * Debajo, `ListaDocumentos` muestra la lista completa.
 */
export function PortadaDocumentos({ documentos, estructura }: { documentos: DocumentoResumenDto[]; estructura: EstructuraDocumentosDto | null }) {
  const navegar = useNavigate();
  const [busqueda, setBusqueda] = useState('');

  const carpetas = estructura?.carpetas ?? [];
  const carpetaDe = (documento: DocumentoResumenDto) => (documento.carpetaDocumentoId ? carpetas.find((carpeta) => carpeta.id === documento.carpetaDocumentoId) : undefined);
  const recientes = [...documentos].sort((a, b) => b.fechaActualizacion.localeCompare(a.fechaActualizacion)).slice(0, 6);
  const raices = carpetas
    .filter((carpeta) => carpeta.carpetaPadreId === null)
    .sort((a, b) => a.indiceOrden - b.indiceOrden || a.nombre.localeCompare(b.nombre, 'es'));
  const favoritos = documentos.filter((documento) => documento.esFavorito).sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
  const porRevisar = documentos.filter((documento) => documento.porRevisar);
  const borradores = documentos.filter((documento) => documento.estado === 'Borrador');

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    const texto = busqueda.trim();
    if (texto) navegar(`/documentos?q=${encodeURIComponent(texto)}`);
  }

  return (
    <div className="mb-10 flex flex-col gap-8">
      <form onSubmit={buscar} role="search" className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-texto-3" />
        <input
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar en títulos y contenido…"
          aria-label="Buscar en la wiki"
          className="h-12 w-full rounded-xl border border-borde bg-superficie pl-11 pr-4 text-[15px] shadow-tarjeta placeholder:text-texto-3 focus:border-acento focus:outline-none"
        />
      </form>

      {recientes.length > 0 && (
        <section>
          <TituloSeccion icono={History}>Seguir donde lo dejaste</TituloSeccion>
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {recientes.map((documento) => {
              const carpeta = carpetaDe(documento);
              return (
                <li key={documento.id}>
                  <Link
                    to={`/documentos/${documento.id}`}
                    className="flex items-center gap-3 rounded-xl border border-borde bg-superficie px-3.5 py-3 transition hover:-translate-y-px hover:border-borde-fuerte hover:shadow-tarjeta"
                  >
                    <span className={unirClases('grid size-9 shrink-0 place-items-center rounded-lg text-lg leading-none', carpeta?.color ? paleta[carpeta.color].suave : 'bg-violet-50')}>
                      {documento.icono ?? <FileText className="size-4 opacity-70" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{documento.titulo}</span>
                      <span className="block truncate text-xs text-texto-3">
                        {carpeta ? `${carpeta.nombre} · ` : ''}
                        {formatearRelativo(documento.fechaActualizacion)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <section>
          <TituloSeccion icono={FolderOpen}>Carpetas</TituloSeccion>
          {raices.length === 0 ? (
            <p className="text-sm text-texto-3">Crea carpetas desde el panel lateral para organizar la wiki.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {raices.map((carpeta) => (
                <li key={carpeta.id}>
                  <EnlaceFila to={`/documentos?carpeta=${carpeta.id}`} detalle={carpeta.totalDocumentos === 1 ? '1 página' : `${carpeta.totalDocumentos} páginas`}>
                    <FolderOpen className={unirClases('size-4 shrink-0', carpeta.color ? paleta[carpeta.color].icono : 'text-violet-300')} fill="currentColor" fillOpacity={0.18} />
                    <span className="truncate">{carpeta.nombre}</span>
                  </EnlaceFila>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <TituloSeccion icono={Star}>Favoritos</TituloSeccion>
          {favoritos.length === 0 ? (
            <p className="text-sm text-texto-3">Marca un documento con la estrella para tenerlo aquí.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {favoritos.slice(0, 6).map((documento) => (
                <li key={documento.id}>
                  <EnlaceFila to={`/documentos/${documento.id}`}>
                    <span className="grid size-4 shrink-0 place-items-center text-sm leading-none">{documento.icono ?? <FileText className="size-4 text-texto-3" />}</span>
                    <span className="truncate">{documento.titulo}</span>
                  </EnlaceFila>
                </li>
              ))}
              {favoritos.length > 6 && (
                <li>
                  <Link to="/documentos?vista=Favoritos" className="px-2.5 text-xs font-medium text-acento hover:underline">
                    Ver los {favoritos.length} favoritos
                  </Link>
                </li>
              )}
            </ul>
          )}
        </section>

        <section className="md:col-span-2 xl:col-span-1">
          <TituloSeccion icono={TriangleAlert}>Necesitan atención</TituloSeccion>
          {porRevisar.length === 0 && borradores.length === 0 ? (
            <p className="text-sm text-texto-3">Todo al día: no hay documentos por revisar ni borradores.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {porRevisar.length > 0 && (
                <Aviso
                  to="/documentos?vista=PorRevisar"
                  icono={CalendarClock}
                  clase="border-amber-200 bg-amber-50 text-amber-900"
                  titulo={porRevisar.length === 1 ? '1 documento por revisar' : `${porRevisar.length} documentos por revisar`}
                  detalle={porRevisar
                    .slice(0, 3)
                    .map((documento) => documento.titulo)
                    .join(' · ')}
                />
              )}
              {borradores.length > 0 && (
                <Aviso
                  to="/documentos?vista=Borradores"
                  icono={PencilLine}
                  clase="border-zinc-200 bg-zinc-50 text-zinc-800"
                  titulo={borradores.length === 1 ? '1 borrador' : `${borradores.length} borradores`}
                  detalle="Márcalos como vigentes cuando estén listos."
                />
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TituloSeccion({ icono: IconoSeccion, children }: { icono: Icono; children: ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-texto-3">
      <IconoSeccion className="size-3.5" />
      {children}
    </h2>
  );
}

function EnlaceFila({ to, detalle, children }: { to: string; detalle?: string; children: ReactNode }) {
  return (
    <Link to={to} className="group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-superficie-2">
      {children}
      {detalle && <span className="ml-auto shrink-0 text-xs text-texto-3">{detalle}</span>}
    </Link>
  );
}

function Aviso({ to, icono: IconoAviso, clase, titulo, detalle }: { to: string; icono: Icono; clase: string; titulo: string; detalle: string }) {
  return (
    <Link to={to} className={unirClases('flex items-start gap-2.5 rounded-xl border px-3.5 py-3 transition hover:-translate-y-px', clase)}>
      <IconoAviso className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{titulo}</span>
        <span className="block truncate text-xs opacity-75">{detalle}</span>
      </span>
      <ChevronRight className="mt-0.5 size-4 shrink-0 opacity-60" />
    </Link>
  );
}
