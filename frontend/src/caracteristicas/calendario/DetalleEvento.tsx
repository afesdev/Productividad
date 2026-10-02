import type { ReactNode } from 'react';
import { Clock, Lock, MapPin, User, Video } from 'lucide-react';
import type { EventoCalendarioDto } from '../../servicios/tipos';
import { Modal } from '../../componentes/ui/Modal';
import { Boton, Insignia, type Icono } from '../../componentes/ui/primitivos';
import { describirHorario, etiquetasDisponibilidad, ubicacionUtil } from './utilidadesCalendario';

/** Botón "Unirse" de Teams. Es un enlace: abre la reunión en la app de Teams o en el navegador. */
export function EnlaceUnirse({ url, tamano = 'md', className }: { url: string; tamano?: 'sm' | 'md'; className?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className={[
        'evento-unirse inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 font-medium text-white shadow-tarjeta transition-colors hover:bg-violet-700',
        tamano === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Video className={tamano === 'sm' ? 'size-3.5' : 'size-4'} />
      Unirse
    </a>
  );
}

export function DetalleEvento({ evento, alCerrar }: { evento: EventoCalendarioDto | null; alCerrar: () => void }) {
  const ubicacion = evento ? ubicacionUtil(evento) : null;
  return (
    <Modal
      abierto={evento !== null}
      alCerrar={alCerrar}
      titulo={evento?.titulo ?? ''}
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={alCerrar}>
            Cerrar
          </Boton>
          {evento?.enlaceReunion && <EnlaceUnirse url={evento.enlaceReunion} />}
        </>
      }
    >
      {evento && (
        <div className="flex flex-col gap-4 pb-2">
          <div className="flex flex-wrap gap-1.5">
            <Insignia tono={etiquetasDisponibilidad[evento.disponibilidad].tono}>{etiquetasDisponibilidad[evento.disponibilidad].etiqueta}</Insignia>
            {evento.enlaceReunion && (
              <Insignia icono={Video} tono="acento">
                Reunión de Teams
              </Insignia>
            )}
            {evento.cancelado && <Insignia tono="peligro">Cancelada</Insignia>}
            {evento.privado && (
              <Insignia icono={Lock} tono="neutro">
                Privada
              </Insignia>
            )}
          </div>
          <div className="flex flex-col gap-2.5 text-sm">
            <Dato icono={Clock}>
              <span className="first-letter:uppercase">{describirHorario(evento)}</span>
            </Dato>
            {ubicacion && <Dato icono={MapPin}>{ubicacion}</Dato>}
            {evento.organizador && <Dato icono={User}>Organiza {evento.organizador}</Dato>}
          </div>
          {evento.descripcion && (
            <p className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-borde bg-fondo p-3 text-sm text-texto-2">{evento.descripcion}</p>
          )}
        </div>
      )}
    </Modal>
  );
}

function Dato({ icono: IconoDato, children }: { icono: Icono; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <IconoDato className="mt-0.5 size-4 shrink-0 text-texto-3" />
      <span className="min-w-0 text-texto">{children}</span>
    </div>
  );
}
