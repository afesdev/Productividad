import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AlarmClock,
  ArrowRight,
  BarChart3,
  CircleCheckBig,
  Clock,
  FileText,
  FlaskConical,
  FolderKanban,
  LifeBuoy,
  ListChecks,
  PartyPopper,
  SquareCheckBig,
  Table2,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import { apiAnalitica, apiDocumentos, apiProyectos, apiTareas, apiTickets } from '../../servicios/api';
import { formatearRelativo } from '../../servicios/formato';
import { notificar } from '../../servicios/notificaciones';
import type { ConteoTicketsDto, DocumentoResumenDto, Prioridad, PuntoVelocidadSemanalDto, ProyectoDto, ResumenAnaliticaPersonalDto, TareaResumenDto, TicketResumenDto } from '../../servicios/tipos';
import { Boton, Esqueleto, Tarjeta, unirClases, type Icono } from '../../componentes/ui/primitivos';
import { configuracionEstado } from '../tickets/presentacionTickets';

const opcionesRango = [
  { semanas: 4, etiqueta: '4 semanas' },
  { semanas: 8, etiqueta: '8 semanas' },
  { semanas: 12, etiqueta: '12 semanas' },
];

/** Días hacia adelante en que un vencimiento ya se considera "por vencer". */
const DiasPorVencer = 3;

const formatearHoras = (minutos: number) => `${(minutos / 60).toLocaleString('es', { maximumFractionDigits: 1 })} h`;
const formatearSemana = (fecha: string) => new Date(fecha).toLocaleDateString('es', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const formatearDia = (fecha: Date) => fecha.toLocaleDateString('es', { day: 'numeric', month: 'short' });
const tareaCerrada = (tarea: TareaResumenDto) => tarea.estado === 'Completada' || tarea.estado === 'Cancelada';

export function TableroAnalitica() {
  const [semanas, setSemanas] = useState(8);
  const [resumen, setResumen] = useState<ResumenAnaliticaPersonalDto | null>(null);
  const [conteos, setConteos] = useState<ConteoTicketsDto | null>(null);
  const [tickets, setTickets] = useState<TicketResumenDto[] | null>(null);
  const [proyectos, setProyectos] = useState<ProyectoDto[]>([]);
  const [tareas, setTareas] = useState<TareaResumenDto[] | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoResumenDto[] | null>(null);
  const [verTabla, setVerTabla] = useState(false);

  const periodo = useMemo(() => {
    const fin = new Date();
    fin.setHours(0, 0, 0, 0);
    fin.setDate(fin.getDate() + 1);
    const inicio = new Date(fin);
    inicio.setDate(inicio.getDate() - semanas * 7);
    return { inicio, fin };
  }, [semanas]);

  useEffect(() => {
    setResumen(null);
    apiAnalitica
      .resumen(periodo.inicio.toISOString(), periodo.fin.toISOString(), -periodo.fin.getTimezoneOffset())
      .then(setResumen)
      .catch((errorCarga) => notificar.error('No se pudo cargar la analítica', errorCarga));
  }, [periodo]);

  useEffect(() => {
    apiTickets.conteos().then(setConteos).catch(() => setConteos(null));
    apiTickets
      .listar('Abiertos')
      .then(setTickets)
      .catch(() => setTickets([]));
    apiDocumentos
      .listar({ vista: 'Activos' })
      .then(setDocumentos)
      .catch(() => setDocumentos([]));
    apiProyectos
      .listar()
      .then(async (lista) => {
        setProyectos(lista);
        const porProyecto = await Promise.all(lista.map((proyecto) => apiTareas.listarPorProyecto(proyecto.id)));
        setTareas(porProyecto.flat());
      })
      .catch(() => setTareas([]));
  }, []);

  const semanasConDatos = Math.max(1, resumen?.velocidadSemanal.length ?? semanas);
  const ticketsVencidos = tickets?.filter((ticket) => ticket.estadoSla === 'Vencido').length ?? conteos?.vencidos;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-texto-3">
          Periodo: <span className="font-medium text-texto-2">{formatearDia(periodo.inicio)}</span> –{' '}
          <span className="font-medium text-texto-2">{formatearDia(new Date(periodo.fin.getTime() - 1))}</span>
        </p>
        <SelectorRango semanas={semanas} alCambiar={setSemanas} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <IndicadorClave
          icono={CircleCheckBig}
          tono="violeta"
          titulo="Tareas completadas"
          valor={resumen?.tareasCompletadas}
          detalle={resumen ? `${(resumen.tareasCompletadas / semanasConDatos).toLocaleString('es', { maximumFractionDigits: 1 })} por semana` : undefined}
        />
        <IndicadorClave
          icono={Timer}
          tono="azul"
          titulo="Horas registradas"
          valor={resumen ? formatearHoras(resumen.minutosRegistrados) : undefined}
          detalle={resumen ? `${formatearHoras(resumen.minutosRegistrados / semanasConDatos)} por semana` : undefined}
          destino="/tiempo"
        />
        <IndicadorClave
          icono={SquareCheckBig}
          tono="verde"
          titulo="Tickets resueltos"
          valor={resumen?.ticketsResueltos}
          detalle={
            resumen
              ? resumen.porcentajeSlaResolucion != null
                ? `${resumen.porcentajeSlaResolucion.toLocaleString('es')} % a tiempo`
                : 'Sin fecha de vencimiento'
              : undefined
          }
        />
        <IndicadorClave
          icono={LifeBuoy}
          tono="naranja"
          titulo="Tickets abiertos"
          valor={conteos?.abiertos}
          detalle={conteos ? `${conteos.misAbiertos} tuyos · ${conteos.sinAsignar} sin asignar` : undefined}
          destino="/tickets?vista=Abiertos"
        />
      </div>

      <div className="grid grid-cols-2 divide-borde overflow-hidden rounded-xl border border-borde bg-superficie shadow-tarjeta md:grid-cols-4 md:divide-x">
        <DatoSecundario icono={ListChecks} etiqueta="Tareas abiertas" valor={resumen?.tareasAbiertas} destino="/tareas" />
        <DatoSecundario icono={AlarmClock} etiqueta="Tareas vencidas" valor={resumen?.tareasVencidas} alerta={!!resumen && resumen.tareasVencidas > 0} destino="/tareas" />
        <DatoSecundario icono={FlaskConical} etiqueta="Tickets en pruebas" valor={conteos?.enPruebas} destino="/tickets?vista=EnPruebas" />
        <DatoSecundario icono={TriangleAlert} etiqueta="Tickets vencidos" valor={ticketsVencidos} alerta={!!ticketsVencidos} destino="/tickets?vista=Abiertos" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <RequiereAtencion className="lg:col-span-3" tickets={tickets} tareas={tareas} documentos={documentos} />
        <div className="flex flex-col gap-4 lg:col-span-2">
          <TicketsPorEstado tickets={tickets} />
          <TicketsPorPrioridad tickets={tickets} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">Velocidad semanal</h2>
        <Boton variante="secundario" tamano="sm" icono={verTabla ? BarChart3 : Table2} onClick={() => setVerTabla((actual) => !actual)}>
          {verTabla ? 'Ver gráficos' : 'Ver como tabla'}
        </Boton>
      </div>

      {!resumen ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Esqueleto className="h-60 rounded-xl" />
          <Esqueleto className="h-60 rounded-xl" />
        </div>
      ) : verTabla ? (
        <TablaVelocidad puntos={resumen.velocidadSemanal} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Tarjeta>
            <GraficoBarrasSemanal titulo="Tareas completadas por semana" puntos={resumen.velocidadSemanal} valorDe={(punto) => punto.tareasCompletadas} formatear={(valor) => `${valor}`} />
          </Tarjeta>
          <Tarjeta>
            <GraficoBarrasSemanal titulo="Horas registradas por semana" puntos={resumen.velocidadSemanal} valorDe={(punto) => punto.minutosRegistrados / 60} formatear={(valor) => formatearHoras(valor * 60)} />
          </Tarjeta>
        </div>
      )}

      <TareasPorProyecto proyectos={proyectos} tareas={tareas} />
    </div>
  );
}

function SelectorRango({ semanas, alCambiar }: { semanas: number; alCambiar: (semanas: number) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-borde bg-superficie p-0.5 shadow-tarjeta" role="group" aria-label="Rango de fechas">
      {opcionesRango.map((opcion) => {
        const activa = semanas === opcion.semanas;
        return (
          <button
            key={opcion.semanas}
            type="button"
            onClick={() => alCambiar(opcion.semanas)}
            aria-pressed={activa}
            className={unirClases('relative h-8 rounded-md px-3 text-sm transition-colors', activa ? 'font-medium text-texto' : 'text-texto-2 hover:text-texto')}
          >
            {activa && <motion.span layoutId="rango-activo" className="absolute inset-0 rounded-md bg-superficie-2" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
            <span className="relative">{opcion.etiqueta}</span>
          </button>
        );
      })}
    </div>
  );
}

const tonosIndicador = {
  violeta: 'bg-violet-100 text-violet-600',
  azul: 'bg-sky-100 text-sky-600',
  verde: 'bg-emerald-100 text-emerald-600',
  naranja: 'bg-orange-100 text-orange-600',
};

function IndicadorClave({
  icono: IconoIndicador,
  tono,
  titulo,
  valor,
  detalle,
  destino,
}: {
  icono: Icono;
  tono: keyof typeof tonosIndicador;
  titulo: string;
  valor?: number | string;
  detalle?: string;
  destino?: string;
}) {
  const contenido = (
    <>
      <div className="flex items-center gap-3">
        <span className={unirClases('grid size-9 place-items-center rounded-xl', tonosIndicador[tono])}>
          <IconoIndicador className="size-[18px]" />
        </span>
        <span className="text-sm font-medium text-texto-2">{titulo}</span>
        {destino && <ArrowRight className="ml-auto size-4 text-texto-3 opacity-0 transition-opacity group-hover:opacity-100" />}
      </div>
      <span className="text-3xl font-semibold tabular-nums tracking-tight">{valor ?? <Esqueleto className="h-9 w-20" />}</span>
      <span className="min-h-4 text-xs text-texto-3">{detalle}</span>
    </>
  );
  const clases = 'group flex flex-col gap-3 rounded-xl border border-borde bg-superficie p-5 shadow-tarjeta transition-colors';
  return destino ? (
    <Link to={destino} className={unirClases(clases, 'hover:border-borde-fuerte')}>
      {contenido}
    </Link>
  ) : (
    <section className={clases}>{contenido}</section>
  );
}

function DatoSecundario({ icono: IconoDato, etiqueta, valor, alerta, destino }: { icono: Icono; etiqueta: string; valor?: number; alerta?: boolean; destino: string }) {
  return (
    <Link to={destino} className="flex items-center gap-3 border-borde px-5 py-4 transition-colors hover:bg-fondo max-md:border-b max-md:odd:border-r">
      <IconoDato className={unirClases('size-4 shrink-0', alerta ? 'text-peligro' : 'text-texto-3')} />
      <span className="min-w-0 flex-1 truncate text-sm text-texto-2">{etiqueta}</span>
      <span className={unirClases('text-lg font-semibold tabular-nums', alerta && 'text-peligro')}>{valor ?? <Esqueleto className="h-6 w-8" />}</span>
    </Link>
  );
}

// ---------- Requiere atención ----------

const estiloPendiente: Record<Pendiente['tipo'], { icono: Icono; tono: string }> = {
  ticket: { icono: LifeBuoy, tono: 'bg-orange-50 text-orange-600' },
  tarea: { icono: ListChecks, tono: 'bg-violet-50 text-violet-600' },
  documento: { icono: FileText, tono: 'bg-emerald-50 text-emerald-600' },
};

interface Pendiente {
  id: string;
  tipo: 'ticket' | 'tarea' | 'documento';
  clave: string;
  titulo: string;
  vence: Date;
  vencido: boolean;
  destino: string;
}

function RequiereAtencion({
  tickets,
  tareas,
  documentos,
  className,
}: {
  tickets: TicketResumenDto[] | null;
  tareas: TareaResumenDto[] | null;
  documentos: DocumentoResumenDto[] | null;
  className?: string;
}) {
  const pendientes = useMemo(() => {
    if (!tickets || !tareas || !documentos) return null;
    const ahora = Date.now();
    const limite = ahora + DiasPorVencer * 24 * 60 * 60 * 1000;
    const lista: Pendiente[] = [];
    for (const ticket of tickets) {
      if (!ticket.fechaLimiteResolucion) continue;
      const vence = new Date(ticket.fechaLimiteResolucion);
      if (vence.getTime() > limite) continue;
      lista.push({
        id: ticket.id,
        tipo: 'ticket',
        clave: ticket.numeroExterno ?? ticket.clave,
        titulo: ticket.asunto,
        vence,
        vencido: vence.getTime() < ahora,
        destino: `/tickets/${ticket.id}`,
      });
    }
    for (const tarea of tareas) {
      if (!tarea.fechaVencimiento || tareaCerrada(tarea)) continue;
      const vence = new Date(tarea.fechaVencimiento);
      if (vence.getTime() > limite) continue;
      lista.push({ id: tarea.id, tipo: 'tarea', clave: tarea.clave, titulo: tarea.titulo, vence, vencido: vence.getTime() < ahora, destino: `/tareas/${tarea.id}` });
    }
    // Documentos con la revisión vencida o próxima (los obsoletos no se revisan).
    for (const documento of documentos) {
      if (!documento.fechaRevision || documento.estado === 'Obsoleto') continue;
      const vence = new Date(documento.fechaRevision);
      if (vence.getTime() > limite) continue;
      lista.push({
        id: documento.id,
        tipo: 'documento',
        clave: documento.rutaEsquema,
        titulo: documento.icono ? `${documento.icono} ${documento.titulo}` : documento.titulo,
        vence,
        vencido: vence.getTime() < ahora,
        destino: `/documentos/${documento.id}`,
      });
    }
    return lista.sort((a, b) => a.vence.getTime() - b.vence.getTime());
  }, [tickets, tareas, documentos]);

  const visibles = pendientes?.slice(0, 8) ?? [];
  const vencidos = pendientes?.filter((pendiente) => pendiente.vencido).length ?? 0;

  return (
    <Tarjeta className={unirClases('flex flex-col gap-3', className)}>
      <EncabezadoSeccion
        titulo="Requiere atención"
        detalle={pendientes ? `${vencidos} vencidos · ${pendientes.length - vencidos} vencen en ${DiasPorVencer} días` : undefined}
      />
      {!pendientes ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((indice) => (
            <Esqueleto key={indice} className="h-11 rounded-lg" />
          ))}
        </div>
      ) : pendientes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <span className="grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <PartyPopper className="size-5" />
          </span>
          <p className="text-sm font-medium">Todo al día</p>
          <p className="text-xs text-texto-3">No hay tickets, tareas ni documentos vencidos o por vencer en los próximos {DiasPorVencer} días.</p>
        </div>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {visibles.map((pendiente) => {
            const { icono: IconoTipo, tono } = estiloPendiente[pendiente.tipo];
            return (
              <li key={`${pendiente.tipo}-${pendiente.id}`}>
                <Link to={pendiente.destino} className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-fondo">
                  <span className={unirClases('grid size-8 shrink-0 place-items-center rounded-lg', tono)}>
                    <IconoTipo className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{pendiente.titulo}</span>
                    <span className="block font-mono text-xs text-texto-3">{pendiente.clave}</span>
                  </span>
                  <span
                    className={unirClases(
                      'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium',
                      pendiente.vencido ? 'bg-peligro-suave text-peligro' : 'bg-amber-50 text-amber-700',
                    )}
                  >
                    {pendiente.vencido ? <TriangleAlert className="size-3" /> : <Clock className="size-3" />}
                    {pendiente.tipo === 'documento' ? (pendiente.vencido ? 'Revisión vencida' : 'Revisar') : pendiente.vencido ? 'Venció' : 'Vence'}{' '}
                    {formatearRelativo(pendiente.vence)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {pendientes && pendientes.length > visibles.length && (
        <p className="text-xs text-texto-3">Y {pendientes.length - visibles.length} más. Revisa las listas de tickets, tareas y documentos.</p>
      )}
    </Tarjeta>
  );
}

// ---------- Distribuciones (barras horizontales de una sola serie) ----------

function EncabezadoSeccion({ titulo, detalle, accion }: { titulo: string; detalle?: string; accion?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      {accion ?? (detalle && <span className="text-xs tabular-nums text-texto-3">{detalle}</span>)}
    </div>
  );
}

/** Magnitud por categoría: un solo tono, valor escrito al final de cada barra (sin leyenda: el título nombra la serie). */
function BarrasHorizontales({ filas, cargando, vacio }: { filas: { etiqueta: string; valor: number; detalle?: string }[]; cargando: boolean; vacio: string }) {
  if (cargando)
    return (
      <div className="flex flex-col gap-2.5">
        {[0, 1, 2].map((indice) => (
          <Esqueleto key={indice} className="h-5 rounded-md" />
        ))}
      </div>
    );
  if (filas.length === 0) return <p className="py-4 text-center text-sm text-texto-3">{vacio}</p>;
  const maximo = Math.max(1, ...filas.map((fila) => fila.valor));
  return (
    <ul className="flex flex-col gap-2.5">
      {filas.map((fila) => (
        <li key={fila.etiqueta} className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3" title={`${fila.etiqueta}: ${fila.detalle ?? fila.valor}`}>
          <span className="truncate text-xs text-texto-2">{fila.etiqueta}</span>
          <span className="h-2 rounded-full bg-superficie-2">
            <span className="block h-2 rounded-full bg-acento transition-[width] duration-500" style={{ width: `${Math.max(2, (fila.valor / maximo) * 100)}%` }} />
          </span>
          <span className="text-right text-xs font-medium tabular-nums text-texto">{fila.detalle ?? fila.valor}</span>
        </li>
      ))}
    </ul>
  );
}

function TicketsPorEstado({ tickets }: { tickets: TicketResumenDto[] | null }) {
  const filas = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const ticket of tickets ?? []) conteo.set(ticket.estado, (conteo.get(ticket.estado) ?? 0) + 1);
    // Orden del flujo de trabajo, no por tamaño: así el estado siempre ocupa el mismo lugar.
    return (Object.keys(configuracionEstado) as (keyof typeof configuracionEstado)[])
      .filter((estado) => conteo.has(estado))
      .map((estado) => ({ etiqueta: configuracionEstado[estado].etiqueta, valor: conteo.get(estado)! }));
  }, [tickets]);
  return (
    <Tarjeta className="flex flex-col gap-4">
      <EncabezadoSeccion titulo="Tickets abiertos por estado" detalle={tickets ? `${tickets.length} en total` : undefined} />
      <BarrasHorizontales filas={filas} cargando={!tickets} vacio="No hay tickets abiertos." />
    </Tarjeta>
  );
}

const ordenPrioridad: Prioridad[] = ['Urgente', 'Alta', 'Media', 'Baja'];

function TicketsPorPrioridad({ tickets }: { tickets: TicketResumenDto[] | null }) {
  const filas = useMemo(
    () =>
      ordenPrioridad
        .map((prioridad) => ({ etiqueta: prioridad, valor: (tickets ?? []).filter((ticket) => ticket.prioridad === prioridad).length }))
        .filter((fila) => fila.valor > 0),
    [tickets],
  );
  return (
    <Tarjeta className="flex flex-col gap-4">
      <EncabezadoSeccion titulo="Tickets abiertos por prioridad" />
      <BarrasHorizontales filas={filas} cargando={!tickets} vacio="No hay tickets abiertos." />
    </Tarjeta>
  );
}

function TareasPorProyecto({ proyectos, tareas }: { proyectos: ProyectoDto[]; tareas: TareaResumenDto[] | null }) {
  const filas = useMemo(() => {
    if (!tareas) return [];
    return proyectos
      .map((proyecto) => {
        const delProyecto = tareas.filter((tarea) => tarea.proyectoId === proyecto.id);
        const abiertas = delProyecto.filter((tarea) => !tareaCerrada(tarea)).length;
        return { etiqueta: proyecto.nombre, valor: abiertas, detalle: `${abiertas} / ${delProyecto.length}` };
      })
      .filter((fila) => fila.detalle !== '0 / 0')
      .sort((a, b) => b.valor - a.valor);
  }, [proyectos, tareas]);
  return (
    <Tarjeta className="flex flex-col gap-4">
      <EncabezadoSeccion
        titulo="Tareas abiertas por proyecto"
        accion={
          <Link to="/tareas" className="inline-flex items-center gap-1 text-xs text-texto-3 hover:text-texto">
            <FolderKanban className="size-3.5" />
            abiertas / total
          </Link>
        }
      />
      <BarrasHorizontales filas={filas} cargando={!tareas} vacio="Aún no hay tareas en tus proyectos." />
    </Tarjeta>
  );
}

// ---------- Velocidad semanal ----------

/** Barras SVG de una sola serie: sin leyenda (el título la nombra), eje recesivo y tooltip por barra. */
function GraficoBarrasSemanal({
  titulo,
  puntos,
  valorDe,
  formatear,
}: {
  titulo: string;
  puntos: PuntoVelocidadSemanalDto[];
  valorDe: (punto: PuntoVelocidadSemanalDto) => number;
  formatear: (valor: number) => string;
}) {
  const [indiceActivo, setIndiceActivo] = useState<number | null>(null);
  const ancho = 520;
  const alto = 180;
  const margen = { superior: 12, inferior: 24, izquierdo: 32, derecho: 8 };
  const anchoUtil = ancho - margen.izquierdo - margen.derecho;
  const altoUtil = alto - margen.superior - margen.inferior;

  const valores = puntos.map(valorDe);
  const maximoBruto = Math.max(1, ...valores);
  const paso = Math.pow(10, Math.floor(Math.log10(maximoBruto)));
  const maximo = Math.ceil(maximoBruto / paso) * paso;
  const anchoBanda = anchoUtil / Math.max(1, puntos.length);
  const anchoBarra = Math.min(28, anchoBanda - 2);
  const escalaY = (valor: number) => margen.superior + altoUtil - (valor / maximo) * altoUtil;
  const marcas = [0, maximo / 2, maximo];

  const activo = indiceActivo !== null ? puntos[indiceActivo] : null;

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between text-xs">
        <span className="text-sm font-semibold text-texto">{titulo}</span>
        <span className="tabular-nums text-texto-3">
          {activo ? `Semana del ${formatearSemana(activo.inicioSemana)}: ${formatear(valorDe(activo))}` : `Total: ${formatear(valores.reduce((a, b) => a + b, 0))}`}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full" role="img" aria-label={titulo}>
        {marcas.map((marca) => (
          <g key={marca}>
            <line x1={margen.izquierdo} x2={ancho - margen.derecho} y1={escalaY(marca)} y2={escalaY(marca)} className="stroke-borde" strokeWidth={1} />
            <text x={margen.izquierdo - 6} y={escalaY(marca)} dy="0.32em" textAnchor="end" className="fill-texto-3 text-[10px] tabular-nums">
              {Number.isInteger(marca) ? marca : marca.toFixed(1)}
            </text>
          </g>
        ))}
        {puntos.map((punto, indice) => {
          const valor = valorDe(punto);
          const x = margen.izquierdo + indice * anchoBanda + (anchoBanda - anchoBarra) / 2;
          const y = escalaY(valor);
          const altoBarra = Math.max(0, margen.superior + altoUtil - y);
          const radio = Math.min(4, altoBarra, anchoBarra / 2);
          return (
            <g key={punto.inicioSemana} onMouseEnter={() => setIndiceActivo(indice)} onMouseLeave={() => setIndiceActivo(null)}>
              <rect x={margen.izquierdo + indice * anchoBanda} y={margen.superior} width={anchoBanda} height={altoUtil} fill="transparent" />
              {altoBarra > 0 && (
                <path
                  d={`M${x},${y + altoBarra} V${y + radio} Q${x},${y} ${x + radio},${y} H${x + anchoBarra - radio} Q${x + anchoBarra},${y} ${x + anchoBarra},${y + radio} V${y + altoBarra} Z`}
                  className={indiceActivo === null || indiceActivo === indice ? 'fill-acento' : 'fill-acento opacity-40'}
                >
                  <title>{`Semana del ${formatearSemana(punto.inicioSemana)}: ${formatear(valor)}`}</title>
                </path>
              )}
              {(indice % Math.ceil(puntos.length / 6) === 0 || indice === indiceActivo) && (
                <text x={x + anchoBarra / 2} y={alto - 6} textAnchor="middle" className="fill-texto-3 text-[10px]">
                  {formatearSemana(punto.inicioSemana)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function TablaVelocidad({ puntos }: { puntos: PuntoVelocidadSemanalDto[] }) {
  return (
    <Tarjeta className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-texto-2">
          <tr className="border-b border-borde">
            <th className="px-4 py-2 font-medium">Semana</th>
            <th className="px-4 py-2 text-right font-medium">Tareas completadas</th>
            <th className="px-4 py-2 text-right font-medium">Horas registradas</th>
          </tr>
        </thead>
        <tbody>
          {puntos.map((punto) => (
            <tr key={punto.inicioSemana} className="border-b border-borde last:border-0">
              <td className="px-4 py-2">{formatearSemana(punto.inicioSemana)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{punto.tareasCompletadas}</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatearHoras(punto.minutosRegistrados)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Tarjeta>
  );
}
