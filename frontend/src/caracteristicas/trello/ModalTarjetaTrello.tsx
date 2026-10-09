import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlignLeft,
  CalendarClock,
  CheckSquare,
  Columns3,
  Copy,
  ExternalLink,
  FileText,
  Image as IconoImagen,
  LifeBuoy,
  ListChecks,
  ListPlus,
  MessageSquare,
  Paperclip,
  Square,
  Users,
} from 'lucide-react';
import { apiTrello } from '../../servicios/api';
import { formatearRelativo } from '../../servicios/formato';
import { notificar } from '../../servicios/notificaciones';
import type { TarjetaTrelloDetalleDto, VinculoTrelloDto } from '../../servicios/tipos';
import { Modal } from '../../componentes/ui/Modal';
import { Boton, Esqueleto, unirClases, type Icono } from '../../componentes/ui/primitivos';
import { VistaMarkdown } from '../../componentes/VistaMarkdown';
import { ModalImportarTarjetaTrello } from './ImportarTarjetaTrello';
import { ImagenTrello, VisorImagen, referenciaAdjunto } from './ImagenTrello';
import { AvatarTrello, ChipEtiquetaTrello, InsigniaVencimiento, estadoVencimiento, formatearVencimiento } from './presentacionTrello';

/**
 * Detalle de solo lectura de una tarjeta de Trello (se pide al abrir, sin caché): contenido a la izquierda y panel con
 * datos, vínculos y acciones a la derecha. Las imágenes subidas a Trello se muestran a través de la API.
 */
export function ModalTarjetaTrello({ idTarjeta, alCerrar }: { idTarjeta: string | null; alCerrar: () => void }) {
  const [tarjeta, setTarjeta] = useState<TarjetaTrelloDetalleDto | null>(null);
  const [vinculos, setVinculos] = useState<VinculoTrelloDto[]>([]);
  const [importando, setImportando] = useState(false);
  const [ampliada, setAmpliada] = useState<string | null>(null);

  useEffect(() => {
    if (!idTarjeta) return;
    let vigente = true;
    setTarjeta(null);
    setVinculos([]);
    apiTrello
      .tarjeta(idTarjeta)
      .then((detalle) => {
        if (!vigente) return;
        setTarjeta(detalle);
        // Con el id largo (si se abrió por enlace corto) se buscan sus tareas y tickets vinculados.
        apiTrello
          .vinculos({ idTarjeta: detalle.id })
          .then((lista) => vigente && setVinculos(lista))
          .catch(() => undefined);
      })
      .catch((error) => {
        notificar.error('No se pudo abrir la tarjeta', error);
        if (vigente) alCerrar();
      });
    return () => {
      vigente = false;
    };
    // alCerrar cambia en cada render del padre; solo importa la tarjeta pedida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idTarjeta]);

  /** Imágenes de Trello dentro del Markdown (descripción y comentarios). */
  const imagenMarkdown = (src: string, alt: string) => {
    const referencia = referenciaAdjunto(src);
    return referencia ? (
      <span className="my-2 block max-w-md overflow-hidden rounded-lg border border-borde">
        <ImagenTrello {...referencia} alt={alt} className="max-h-80 w-full" alAmpliar={setAmpliada} />
      </span>
    ) : null;
  };

  async function copiarEnlace() {
    if (!tarjeta) return;
    try {
      await navigator.clipboard.writeText(tarjeta.url);
      notificar.exito('Enlace copiado');
    } catch {
      notificar.info('Copia el enlace', tarjeta.url);
    }
  }

  const imagenes = tarjeta?.adjuntos.filter((adjunto) => adjunto.esImagen) ?? [];
  const archivos = tarjeta?.adjuntos.filter((adjunto) => !adjunto.esImagen) ?? [];

  return (
    <Modal abierto={idTarjeta !== null} alCerrar={alCerrar} titulo={tarjeta?.nombre ?? 'Tarjeta de Trello'} ancho="xl">
      {!tarjeta ? (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="flex flex-col gap-3">
            <Esqueleto className="h-5 w-1/2" />
            <Esqueleto className="h-28 w-full" />
            <Esqueleto className="h-16 w-full" />
          </div>
          <Esqueleto className="h-56 w-full rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_15rem]">
          {/* ---------- Contenido ---------- */}
          <div className="flex min-w-0 flex-col gap-6">
            {tarjeta.etiquetas.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tarjeta.etiquetas.map((etiqueta) => (
                  <ChipEtiquetaTrello key={etiqueta.id} etiqueta={etiqueta} className="h-6 px-2 text-xs" />
                ))}
              </div>
            )}

            <Seccion icono={AlignLeft} titulo="Descripción">
              {tarjeta.descripcion.trim() ? (
                <VistaMarkdown contenido={tarjeta.descripcion} imagen={imagenMarkdown} />
              ) : (
                <p className="text-sm text-texto-3">Sin descripción.</p>
              )}
            </Seccion>

            {tarjeta.checklists.map((checklist) => {
              const hechos = checklist.elementos.filter((elemento) => elemento.hecho).length;
              const porcentaje = checklist.elementos.length ? Math.round((hechos / checklist.elementos.length) * 100) : 0;
              return (
                <Seccion key={checklist.id} icono={CheckSquare} titulo={checklist.nombre} detalle={`${hechos}/${checklist.elementos.length}`}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="w-9 text-right text-xs tabular-nums text-texto-3">{porcentaje}%</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-superficie-2">
                      <div className={unirClases('h-full rounded-full transition-all', porcentaje === 100 ? 'bg-emerald-400' : 'bg-sky-400')} style={{ width: `${porcentaje}%` }} />
                    </div>
                  </div>
                  <ul className="flex flex-col">
                    {checklist.elementos.map((elemento) => (
                      <li key={elemento.id} className="flex items-start gap-2.5 rounded-md px-1 py-1 text-sm">
                        {elemento.hecho ? <CheckSquare className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <Square className="mt-0.5 size-4 shrink-0 text-texto-3" />}
                        <span className={unirClases(elemento.hecho && 'text-texto-3 line-through')}>{elemento.nombre}</span>
                      </li>
                    ))}
                  </ul>
                </Seccion>
              );
            })}

            {imagenes.length > 0 && (
              <Seccion icono={IconoImagen} titulo="Imágenes" detalle={String(imagenes.length)}>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {imagenes.map((adjunto) => (
                    <li key={adjunto.id} className="overflow-hidden rounded-lg border border-borde bg-superficie-2">
                      <ImagenTrello idTarjeta={tarjeta.id} idAdjunto={adjunto.id} alt={adjunto.nombre} className="aspect-video w-full" alAmpliar={setAmpliada} />
                      <p className="truncate px-2 py-1 text-xs text-texto-2" title={adjunto.nombre}>
                        {adjunto.nombre}
                      </p>
                    </li>
                  ))}
                </ul>
              </Seccion>
            )}

            {archivos.length > 0 && (
              <Seccion icono={Paperclip} titulo="Adjuntos" detalle={String(archivos.length)}>
                <ul className="flex flex-col gap-1">
                  {archivos.map((adjunto) => (
                    <li key={adjunto.id}>
                      <a
                        href={adjunto.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2.5 rounded-lg border border-borde px-3 py-2 text-sm transition-colors hover:bg-superficie-2"
                      >
                        <FileText className="size-4 shrink-0 text-texto-3" />
                        <span className="min-w-0 flex-1 truncate">{adjunto.nombre}</span>
                        {adjunto.fecha && <span className="shrink-0 text-xs text-texto-3">{formatearRelativo(adjunto.fecha)}</span>}
                        <ExternalLink className="size-3.5 shrink-0 text-texto-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </Seccion>
            )}

            <Seccion icono={MessageSquare} titulo="Comentarios" detalle={tarjeta.comentarios.length ? String(tarjeta.comentarios.length) : undefined}>
              {tarjeta.comentarios.length === 0 ? (
                <p className="text-sm text-texto-3">Sin comentarios.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {tarjeta.comentarios.map((comentario) => (
                    <li key={comentario.id} className="flex gap-3">
                      <AvatarTrello miembro={{ nombreCompleto: comentario.autor, iniciales: '', urlAvatar: comentario.urlAvatarAutor }} className="size-8 ring-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs">
                          <span className="font-medium">{comentario.autor}</span>{' '}
                          <span className="text-texto-3" title={new Date(comentario.fecha).toLocaleString('es')}>
                            · {formatearRelativo(comentario.fecha)}
                          </span>
                        </p>
                        <div className="mt-1 rounded-lg border border-borde bg-superficie px-3 py-2">
                          <VistaMarkdown contenido={comentario.texto} imagen={imagenMarkdown} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Seccion>
          </div>

          {/* ---------- Panel lateral ---------- */}
          <aside className="flex flex-col gap-5 self-start rounded-xl bg-superficie-2 p-4 text-sm md:sticky md:top-0">
            <Dato icono={Columns3} etiqueta="Ubicación">
              <p className="font-medium">{tarjeta.nombreTablero}</p>
              <p className="text-texto-2">{tarjeta.nombreLista}</p>
            </Dato>

            {(tarjeta.inicio || tarjeta.vencimiento) && (
              <Dato icono={CalendarClock} etiqueta="Fechas">
                {tarjeta.inicio && <p className="text-texto-2">Inicio: {formatearVencimiento(tarjeta.inicio)}</p>}
                {tarjeta.vencimiento && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <InsigniaVencimiento vencimiento={tarjeta.vencimiento} completado={tarjeta.vencimientoCompletado} />
                    <span className="text-xs text-texto-2">{textoVencimiento(tarjeta.vencimiento, tarjeta.vencimientoCompletado)}</span>
                  </div>
                )}
              </Dato>
            )}

            {tarjeta.miembros.length > 0 && (
              <Dato icono={Users} etiqueta="Miembros">
                <ul className="flex flex-col gap-1.5">
                  {tarjeta.miembros.map((miembro) => (
                    <li key={miembro.id} className="flex items-center gap-2">
                      <AvatarTrello miembro={miembro} className="ring-0" />
                      <span className="truncate">{miembro.nombreCompleto}</span>
                    </li>
                  ))}
                </ul>
              </Dato>
            )}

            {vinculos.length > 0 && (
              <Dato icono={ListChecks} etiqueta="Vinculada a">
                <ul className="flex flex-col gap-1">
                  {vinculos.map((vinculo) => (
                    <li key={vinculo.id}>
                      <Link
                        to={vinculo.tareaId ? `/tareas?tarea=${vinculo.tareaId}` : `/tickets/${vinculo.ticketId}`}
                        onClick={alCerrar}
                        className="-mx-1.5 flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-superficie"
                      >
                        {vinculo.tareaId ? <ListChecks className="size-3.5 shrink-0 text-violet-500" /> : <LifeBuoy className="size-3.5 shrink-0 text-rose-500" />}
                        <span className="shrink-0 font-mono text-xs text-texto-3">{vinculo.claveDestino}</span>
                        <span className="truncate">{vinculo.tituloDestino}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Dato>
            )}

            <div className="flex flex-col gap-1.5 border-t border-borde pt-4">
              <Boton variante="secundario" tamano="sm" icono={ListPlus} className="justify-start" onClick={() => setImportando(true)}>
                Importar como tarea
              </Boton>
              <a href={tarjeta.url} target="_blank" rel="noreferrer" className="contents">
                <Boton variante="secundario" tamano="sm" icono={ExternalLink} className="w-full justify-start">
                  Abrir en Trello
                </Boton>
              </a>
              <Boton variante="fantasma" tamano="sm" icono={Copy} className="justify-start" onClick={() => void copiarEnlace()}>
                Copiar enlace
              </Boton>
            </div>
          </aside>
        </div>
      )}
      <ModalImportarTarjetaTrello idTarjeta={importando && tarjeta ? tarjeta.id : null} nombreTarjeta={tarjeta?.nombre ?? ''} alCerrar={() => setImportando(false)} alImportar={alCerrar} />
      <VisorImagen url={ampliada} alCerrar={() => setAmpliada(null)} />
    </Modal>
  );
}

function textoVencimiento(vencimiento: string, completado: boolean): string {
  const estado = estadoVencimiento(vencimiento, completado);
  if (estado === 'completado') return 'Completada';
  if (estado === 'vencido') return `Venció ${formatearRelativo(vencimiento)}`;
  return `Vence ${formatearRelativo(vencimiento)}`;
}

function Seccion({ icono: IconoSeccion, titulo, detalle, children }: { icono: Icono; titulo: string; detalle?: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <IconoSeccion className="size-4 text-texto-3" />
        {titulo}
        {detalle && <span className="font-normal text-texto-3">{detalle}</span>}
      </h3>
      {children}
    </section>
  );
}

function Dato({ icono: IconoDato, etiqueta, children }: { icono: Icono; etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-texto-3">
        <IconoDato className="size-3.5" />
        {etiqueta}
      </p>
      {children}
    </div>
  );
}
