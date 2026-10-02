import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { FolderKanban, GitBranch, LifeBuoy, Plus, Search, X } from 'lucide-react';
import { apiTickets } from '../servicios/api';
import { formatearFecha, formatearRelativo } from '../servicios/formato';
import { notificar } from '../servicios/notificaciones';
import type { ConteoTicketsDto, TicketResumenDto, VistaTickets } from '../servicios/tipos';
import { ChipProyecto } from '../caracteristicas/tickets/ProyectosTicket';
import { etiquetaTipo, InsigniaEstado, InsigniaPrioridad } from '../caracteristicas/tickets/presentacionTickets';
import { Boton, EncabezadoPagina, EstadoVacio, Entrada, Esqueleto, unirClases } from '../componentes/ui/primitivos';

const vistas: { valor: VistaTickets; etiqueta: string; conteo?: keyof ConteoTicketsDto }[] = [
  { valor: 'MisAbiertos', etiqueta: 'Mis tickets', conteo: 'misAbiertos' },
  { valor: 'SinAsignar', etiqueta: 'Sin asignar', conteo: 'sinAsignar' },
  { valor: 'Abiertos', etiqueta: 'Abiertos', conteo: 'abiertos' },
  { valor: 'EnPruebas', etiqueta: 'En pruebas', conteo: 'enPruebas' },
  { valor: 'Cerrados', etiqueta: 'Cerrados' },
  { valor: 'Todos', etiqueta: 'Todos' },
];

const claseResaltado = 'rounded-[3px] bg-aviso-suave px-0.5 font-medium text-aviso';

function Resaltar({ texto, consulta }: { texto: string; consulta: string }) {
  const termino = consulta.trim();
  if (!termino) return <>{texto}</>;
  const patron = termino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const partes = texto.split(new RegExp(`(${patron})`, 'ig'));
  return (
    <>
      {partes.map((parte, indice) =>
        parte.toLowerCase() === termino.toLowerCase() ? (
          <mark key={indice} className={claseResaltado}>
            {parte}
          </mark>
        ) : (
          <span key={indice}>{parte}</span>
        ),
      )}
    </>
  );
}

export function PaginaTickets() {
  const navegar = useNavigate();
  const entradaRef = useRef<HTMLInputElement>(null);
  const [parametros, setParametros] = useSearchParams();
  const vista = (parametros.get('vista') as VistaTickets | null) ?? 'MisAbiertos';
  const proyectoId = parametros.get('proyecto') ?? '';
  const [texto, setTexto] = useState('');
  const [tickets, setTickets] = useState<TicketResumenDto[] | null>(null);
  const [conteos, setConteos] = useState<ConteoTicketsDto | null>(null);

  useEffect(() => {
    apiTickets.conteos().then(setConteos).catch(() => undefined);
  }, []);

  useEffect(() => {
    function alPulsar(evento: KeyboardEvent) {
      if (evento.key !== '/' || evento.metaKey || evento.ctrlKey || evento.altKey) return;
      const activo = document.activeElement;
      const editando = activo instanceof HTMLElement && (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA' || activo.tagName === 'SELECT' || activo.isContentEditable);
      if (editando) return;
      evento.preventDefault();
      entradaRef.current?.focus();
    }
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, []);

  useEffect(() => {
    setTickets(null);
    const temporizador = window.setTimeout(() => {
      apiTickets
        .listar(vista, texto.trim(), undefined, proyectoId || undefined)
        .then(setTickets)
        .catch((errorCarga) => notificar.error('No se pudieron cargar los tickets', errorCarga));
    }, 200);
    return () => window.clearTimeout(temporizador);
  }, [vista, texto, proyectoId]);

  return (
    <>
      <EncabezadoPagina
        titulo="Tickets"
        descripcion="Solicitudes desde que llegan hasta que están en producción."
        acciones={
          <>
            <Boton variante="secundario" icono={FolderKanban} onClick={() => navegar('/tickets/proyectos')}>
              Proyectos
            </Boton>
            <Boton variante="secundario" icono={GitBranch} onClick={() => navegar('/tickets/repositorios')}>
              Repositorios
            </Boton>
            <Boton icono={Plus} onClick={() => navegar('/tickets/nuevo')}>
              Nuevo ticket
            </Boton>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex gap-0.5 self-start overflow-x-auto rounded-lg border border-borde bg-superficie p-0.5 shadow-tarjeta" role="tablist">
          {vistas.map((opcion) => {
            const activa = vista === opcion.valor;
            const conteo = opcion.conteo && conteos ? conteos[opcion.conteo] : null;
            return (
              <button
                key={opcion.valor}
                role="tab"
                aria-selected={activa}
                onClick={() => setParametros(proyectoId ? { vista: opcion.valor, proyecto: proyectoId } : { vista: opcion.valor }, { replace: true })}
                className={unirClases('relative flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm', activa ? 'font-medium text-texto' : 'text-texto-2 hover:text-texto')}
              >
                {activa && <motion.span layoutId="vista-tickets" className="absolute inset-0 rounded-md bg-superficie-2" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                <span className="relative">{opcion.etiqueta}</span>
                {conteo !== null && conteo > 0 && <span className="relative rounded bg-superficie px-1 text-xs tabular-nums text-texto-3 shadow-tarjeta">{conteo}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[16rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-3" />
            <Entrada
              ref={entradaRef}
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              onKeyDown={(evento) => evento.key === 'Escape' && texto && setTexto('')}
              placeholder="Buscar TCK-1042, nº externo, asunto…"
              className="w-full pl-9 pr-16"
            />
            {texto ? (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={() => {
                  setTexto('');
                  entradaRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-texto-3 transition-colors hover:bg-superficie-2 hover:text-texto"
              >
                <X className="size-4" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-borde bg-fondo px-1.5 font-mono text-[11px] text-texto-3 sm:block">
                /
              </kbd>
            )}
          </div>
        </div>
      </div>

      {conteos && conteos.vencidos > 0 && (
        <p className="mb-4 rounded-lg bg-peligro-suave px-3 py-2 text-sm text-peligro">
          {conteos.vencidos === 1 ? 'Hay 1 ticket abierto con la fecha de vencimiento cumplida.' : `Hay ${conteos.vencidos} tickets abiertos con la fecha de vencimiento cumplida.`}
        </p>
      )}

      {tickets !== null && tickets.length > 0 && (
        <p className="mb-2 text-xs text-texto-3">
          {tickets.length === 1 ? '1 resultado' : `${tickets.length} resultados`}
          {texto.trim() && <> para «{texto.trim()}»</>}
        </p>
      )}

      {tickets === null ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((indice) => (
            <Esqueleto key={indice} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <EstadoVacio
          icono={LifeBuoy}
          titulo="No hay tickets en esta vista"
          descripcion="Registra una solicitud para empezar a darle seguimiento."
          accion={
            <Boton icono={Plus} onClick={() => navegar('/tickets/nuevo')}>
              Nuevo ticket
            </Boton>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-borde bg-superficie shadow-tarjeta">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-borde bg-fondo text-left text-xs text-texto-2">
              <tr>
                <th className="px-4 py-3 font-medium">Nº ticket</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Prioridad</th>
                <th className="px-4 py-3 font-medium">Creado</th>
                <th className="px-4 py-3 font-medium">Vence</th>
                <th className="px-4 py-3 text-right font-medium">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} onClick={() => navegar(`/tickets/${ticket.id}`)} className="cursor-pointer border-b border-borde transition-colors last:border-0 hover:bg-fondo">
                  <td className="whitespace-nowrap px-4 py-3 align-top">
                    <span className="block font-mono text-[13px] font-medium">
                      <Resaltar texto={ticket.numeroExterno ?? ticket.clave} consulta={texto} />
                    </span>
                    {ticket.numeroExterno && (
                      <span className="block font-mono text-xs text-texto-3">
                        <Resaltar texto={ticket.clave} consulta={texto} />
                      </span>
                    )}
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <Link to={`/tickets/${ticket.id}`} onClick={(evento) => evento.stopPropagation()} className="block truncate font-medium hover:underline">
                      <Resaltar texto={ticket.asunto} consulta={texto} />
                    </Link>
                    <span className="flex gap-1 text-xs text-texto-3">
                      <span>{etiquetaTipo[ticket.tipo]}</span>
                      <span className="truncate">· {ticket.nombreSolicitante}</span>
                    </span>
                    {ticket.proyectos.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {ticket.proyectos.map((proyecto) => (
                          <ChipProyecto key={proyecto.id} proyecto={proyecto} />
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <InsigniaEstado estado={ticket.estado} />
                  </td>
                  <td className="px-4 py-3">
                    <InsigniaPrioridad prioridad={ticket.prioridad} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-texto-2">{formatearFecha(ticket.fechaCreacion)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    {ticket.fechaLimiteResolucion ? (
                      <span
                        title={formatearRelativo(ticket.fechaLimiteResolucion)}
                        className={unirClases(
                          ticket.estadoSla === 'Vencido' || ticket.estadoSla === 'Incumplido' ? 'font-medium text-peligro' : ticket.estadoSla === 'PorVencer' ? 'font-medium text-aviso' : 'text-texto-2',
                        )}
                      >
                        {formatearFecha(ticket.fechaLimiteResolucion)}
                      </span>
                    ) : (
                      <span className="text-texto-3">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-texto-3">{formatearRelativo(ticket.fechaActualizacion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
