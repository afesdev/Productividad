import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import type { EstadoTicket, EventoTicketDto } from '../../servicios/tipos';
import { formatearFechaHora } from '../../servicios/formato';
import { unirClases } from '../../componentes/ui/primitivos';
import { configuracionEstado } from './presentacionTickets';

const caminoPrincipal: EstadoTicket[] = ['Nuevo', 'Asignado', 'EnAnalisis', 'EnDesarrollo', 'EnRevision', 'EnPruebas', 'Aprobado', 'EnProduccion', 'Cerrado'];

/** Estados fuera del camino principal: se ubican sobre el paso en el que el ticket quedó detenido. */
const pasoEquivalente: Partial<Record<EstadoTicket, EstadoTicket>> = {
  PendienteCliente: 'EnAnalisis',
  Devuelto: 'EnDesarrollo',
};

/**
 * Línea de progreso del flujo: cada paso muestra cuándo se alcanzó por última vez (según el historial).
 * Hace visible dónde está el ticket y cuánto le falta.
 */
export function LineaFlujo({ estado, eventos }: { estado: EstadoTicket; eventos: EventoTicketDto[] }) {
  const estadoEnCamino = pasoEquivalente[estado] ?? estado;
  const indiceActual = caminoPrincipal.indexOf(estadoEnCamino);
  const cancelado = estado === 'Cancelado';

  // Última vez que se entró a cada estado (los eventos vienen del más reciente al más antiguo).
  const fechaPorEstado = new Map<EstadoTicket, string>();
  for (const evento of eventos) {
    if (evento.estadoNuevo && !fechaPorEstado.has(evento.estadoNuevo)) fechaPorEstado.set(evento.estadoNuevo, evento.fechaEvento);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-borde bg-superficie px-5 py-4 shadow-tarjeta">
      <ol className="flex min-w-[760px] items-start">
        {caminoPrincipal.map((paso, indice) => {
          const completado = !cancelado && indice < indiceActual;
          const actual = !cancelado && indice === indiceActual;
          const fecha = fechaPorEstado.get(paso);
          const IconoPaso = configuracionEstado[paso].icono;
          return (
            <li key={paso} className="flex flex-1 flex-col items-center gap-2 text-center">
              <div className="flex w-full items-center">
                <span className={unirClases('h-0.5 flex-1', indice === 0 ? 'bg-transparent' : completado || actual ? 'bg-primario' : 'bg-borde')} />
                <motion.span
                  initial={false}
                  animate={{ scale: actual ? 1.08 : 1 }}
                  className={unirClases(
                    'grid size-8 shrink-0 place-items-center rounded-full border-2 transition-colors',
                    completado && 'border-primario bg-primario text-sobre-primario',
                    actual && 'border-primario bg-superficie text-texto shadow-[0_0_0_4px_rgb(24_24_27/0.08)]',
                    !completado && !actual && 'border-borde bg-superficie text-texto-3',
                  )}
                  title={fecha ? formatearFechaHora(fecha) : undefined}
                >
                  {completado ? <Check className="size-4" strokeWidth={3} /> : <IconoPaso className="size-3.5" />}
                </motion.span>
                <span className={unirClases('h-0.5 flex-1', indice === caminoPrincipal.length - 1 ? 'bg-transparent' : completado ? 'bg-primario' : 'bg-borde')} />
              </div>
              <div className="px-1">
                <p className={unirClases('text-xs leading-tight', actual ? 'font-semibold text-texto' : completado ? 'text-texto-2' : 'text-texto-3')}>
                  {configuracionEstado[paso].etiqueta}
                </p>
                {fecha && (completado || actual) && (
                  <p className="mt-0.5 text-[11px] text-texto-3">{new Date(fecha).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {(estado === 'PendienteCliente' || estado === 'Devuelto' || cancelado) && (
        <p
          className={unirClases(
            'mt-3 rounded-lg px-3 py-2 text-sm',
            estado === 'Devuelto' ? 'bg-peligro-suave text-peligro' : cancelado ? 'bg-superficie-2 text-texto-2' : 'bg-aviso-suave text-aviso',
          )}
        >
          {estado === 'PendienteCliente' && 'Detenido: esperando información del solicitante.'}
          {estado === 'Devuelto' && 'Devuelto desde pruebas: requiere correcciones antes de volver a desarrollo.'}
          {cancelado && 'Ticket cancelado.'}
        </p>
      )}
    </div>
  );
}
