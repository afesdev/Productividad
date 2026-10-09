import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarPlus, Columns3, Loader2, PartyPopper, Play } from 'lucide-react';
import {
  apiAnalitica,
  apiCalendario,
  apiDiario,
  apiDocumentos,
  apiFlujos,
  apiMarcadores,
  apiReporte,
  apiTareas,
  apiTickets,
  apiTrello,
} from '../../servicios/api';
import { formatearRelativo } from '../../servicios/formato';
import { rutaDeEntidad } from '../../servicios/rutas';
import type {
  ConteoTicketsDto,
  DiaDiarioDto,
  DocumentoResumenDto,
  EventoCalendarioDto,
  FilaReporteDto,
  FlujoResumenDto,
  MarcadorDto,
  ResumenAnaliticaPersonalDto,
  TareaAgendaDto,
  TarjetaAsignadaTrelloDto,
  TicketResumenDto,
} from '../../servicios/tipos';
import { Insignia, unirClases } from '../../componentes/ui/primitivos';
import { iconosEntidad } from '../../componentes/editor/usarWikiLinks';
import { InsigniaEstado, InsigniaPrioridad } from '../tickets/presentacionTickets';
import { DetalleEvento } from '../calendario/DetalleEvento';
import { ProximasReuniones } from '../calendario/PanelLateralCalendario';
import { BarraCaptura } from '../diario/EntradasDelDia';
import { aIso, formatearHora, hoyIso } from '../diario/presentacionDiario';
import { horasExcel } from '../reporte/utilidadesReporte';
import { ModalTarjetaTrello } from '../trello/ModalTarjetaTrello';
import { trelloConectado } from '../trello/conexionTrello';
import { InsigniaVencimiento, estiloFondoTablero } from '../trello/presentacionTrello';
import type { IdWidget } from './configuracionInicio';

// ---------- Piezas comunes ----------

/** Carga con estado de error; se vuelve a pedir al cambiar `clave` o al llamar a `recargar`. */
function usarCarga<T>(cargar: () => Promise<T>, clave = ''): { datos: T | null; error: boolean; recargar: () => void } {
  const [estado, setEstado] = useState<{ datos: T | null; error: boolean }>({ datos: null, error: false });
  const [vuelta, setVuelta] = useState(0);
  useEffect(() => {
    let vigente = true;
    cargar()
      .then((datos) => vigente && setEstado({ datos, error: false }))
      .catch(() => vigente && setEstado({ datos: null, error: true }));
    return () => {
      vigente = false;
    };
    // `cargar` se recrea en cada render; `clave` y `vuelta` deciden cuándo volver a pedir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, vuelta]);
  const recargar = useCallback(() => setVuelta((actual) => actual + 1), []);
  return { ...estado, recargar };
}

const Cargando = () => (
  <div className="grid h-24 place-items-center text-texto-3">
    <Loader2 className="size-5 animate-spin" />
  </div>
);

const ErrorCarga = () => (
  <p className="flex items-center gap-2 py-6 text-sm text-texto-2">
    <AlertTriangle className="size-4 text-amber-500" />
    No se pudo cargar.
  </p>
);

const Vacio = ({ children }: { children: ReactNode }) => <p className="py-6 text-center text-sm text-texto-3">{children}</p>;

/** Fila clicable de las listas de los widgets. */
function Fila({ a, children, className }: { a: string; children: ReactNode; className?: string }) {
  return (
    <Link to={a} className={unirClases('-mx-2 flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-superficie-2', className)}>
      {children}
    </Link>
  );
}

function Estado<T>({ carga, vacio, children }: { carga: { datos: T | null; error: boolean }; vacio?: (datos: T) => ReactNode | null; children: (datos: T) => ReactNode }) {
  if (carga.error) return <ErrorCarga />;
  if (carga.datos === null) return <Cargando />;
  const mensaje = vacio?.(carga.datos);
  return mensaje ? <Vacio>{mensaje}</Vacio> : <>{children(carga.datos)}</>;
}

/** Enlace "Ver todo" de la cabecera de cada widget. */
export const enlaceWidget: Partial<Record<IdWidget, string>> = {
  agenda: '/calendario',
  tareas: '/tareas',
  tickets: '/tickets',
  reporte: '/reporte',
  recientes: '/documentos',
  porRevisar: '/documentos',
  favoritos: '/documentos',
  diario: '/diario',
  flujos: '/flujos',
  semana: '/analitica',
  trello: '/trello',
};

export function ContenidoWidget({ id }: { id: IdWidget }) {
  switch (id) {
    case 'agenda':
      return <WidgetAgenda />;
    case 'tareas':
      return <WidgetTareas />;
    case 'tickets':
      return <WidgetTickets />;
    case 'reporte':
      return <WidgetReporte />;
    case 'recientes':
      return <WidgetDocumentos vista="Activos" />;
    case 'porRevisar':
      return <WidgetDocumentos vista="PorRevisar" />;
    case 'favoritos':
      return <WidgetFavoritos />;
    case 'diario':
      return <WidgetDiario />;
    case 'flujos':
      return <WidgetFlujos />;
    case 'semana':
      return <WidgetSemana />;
    case 'trello':
      return <WidgetTrello />;
  }
}

// ---------- Agenda ----------

function WidgetAgenda() {
  const [ahora, setAhora] = useState(() => new Date());
  const [detalle, setDetalle] = useState<EventoCalendarioDto | null>(null);
  const conexion = usarCarga(() => apiCalendario.conexion());
  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(new Date()), 30_000);
    return () => window.clearInterval(reloj);
  }, []);

  if (conexion.error) return <ErrorCarga />;
  if (!conexion.datos) return <Cargando />;
  if (!conexion.datos.conectado)
    return (
      <Link to="/calendario" className="flex items-center gap-2 py-6 text-sm text-violet-700 hover:underline">
        <CalendarPlus className="size-4" />
        Conecta tu calendario de Outlook / Teams para ver tu agenda aquí.
      </Link>
    );
  return (
    <>
      <ProximasReuniones ahora={ahora} version={0} alSeleccionar={setDetalle} sinTitulo />
      <DetalleEvento evento={detalle} alCerrar={() => setDetalle(null)} />
    </>
  );
}

// ---------- Tareas por vencer ----------

const inicioHoy = () => {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
};

/** Tareas y tarjetas de Trello asignadas (si hay cuenta conectada) mezcladas por vencimiento. */
type ElementoAgenda =
  | { tipo: 'tarea'; id: string; titulo: string; vence: Date; clave: string; contexto: string }
  | { tipo: 'trello'; id: string; titulo: string; vence: Date; contexto: string; colorTablero: string | null };

function WidgetTareas() {
  const [tarjetaAbierta, setTarjetaAbierta] = useState<string | null>(null);
  const carga = usarCarga(async (): Promise<ElementoAgenda[]> => {
    const finSemana = new Date(inicioHoy().getTime() + 8 * 24 * 3600 * 1000);
    const [tareas, tarjetas] = await Promise.all([
      apiTareas.agenda(7),
      // Trello es un extra: sin conexión o con error, el widget sigue mostrando las tareas.
      trelloConectado()
        .then((conectado) => (conectado ? apiTrello.misTarjetas() : []))
        .catch(() => [] as TarjetaAsignadaTrelloDto[]),
    ]);
    return [
      ...tareas.map((tarea: TareaAgendaDto): ElementoAgenda => ({
        tipo: 'tarea',
        id: tarea.id,
        titulo: tarea.titulo,
        vence: new Date(tarea.fechaVencimiento),
        clave: tarea.clave,
        contexto: tarea.nombreProyecto,
      })),
      ...tarjetas
        .filter((asignada) => asignada.tarjeta.vencimiento && !asignada.tarjeta.vencimientoCompletado && new Date(asignada.tarjeta.vencimiento) < finSemana)
        .map(
          (asignada): ElementoAgenda => ({
            tipo: 'trello',
            id: asignada.tarjeta.id,
            titulo: asignada.tarjeta.nombre,
            vence: new Date(asignada.tarjeta.vencimiento!),
            contexto: asignada.nombreTablero,
            colorTablero: asignada.colorFondoTablero,
          }),
        ),
    ].sort((a, b) => a.vence.getTime() - b.vence.getTime());
  });
  const hoy = inicioHoy();
  const manana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
  const grupos = (elementos: ElementoAgenda[]) =>
    [
      { titulo: 'Vencidas', elementos: elementos.filter((elemento) => elemento.vence < hoy), tono: 'text-rose-600' },
      { titulo: 'Hoy', elementos: elementos.filter((elemento) => elemento.vence >= hoy && elemento.vence < manana), tono: 'text-amber-600' },
      { titulo: 'Esta semana', elementos: elementos.filter((elemento) => elemento.vence >= manana), tono: 'text-texto-2' },
    ].filter((grupo) => grupo.elementos.length > 0);

  return (
    <>
      <Estado
        carga={carga}
        vacio={(elementos) =>
          elementos.length === 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <PartyPopper className="size-4" /> Nada por vencer esta semana.
            </span>
          ) : null
        }
      >
        {(elementos) => (
          <div className="flex flex-col gap-3">
            {grupos(elementos).map((grupo) => (
              <div key={grupo.titulo}>
                <p className={unirClases('mb-0.5 text-xs font-semibold', grupo.tono)}>
                  {grupo.titulo} · {grupo.elementos.length}
                </p>
                {grupo.elementos.slice(0, 6).map((elemento) => {
                  const contenido = (
                    <>
                      {elemento.tipo === 'tarea' ? (
                        <span className="w-16 shrink-0 font-mono text-xs text-texto-3">{elemento.clave}</span>
                      ) : (
                        <span className="flex w-16 shrink-0 items-center gap-1 text-xs text-sky-600" title="Tarjeta de Trello">
                          <Columns3 className="size-3.5" /> Trello
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate font-medium">{elemento.titulo}</span>
                      <span className="hidden max-w-[35%] shrink-0 truncate text-xs text-texto-3 sm:inline">{elemento.contexto}</span>
                      <span className={unirClases('w-14 shrink-0 text-right text-xs', grupo.tono)}>
                        {elemento.vence.toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                      </span>
                    </>
                  );
                  return elemento.tipo === 'tarea' ? (
                    <Fila key={elemento.id} a={`/tareas?tarea=${elemento.id}`}>
                      {contenido}
                    </Fila>
                  ) : (
                    <button
                      key={elemento.id}
                      type="button"
                      onClick={() => setTarjetaAbierta(elemento.id)}
                      className="-mx-2 flex w-[calc(100%+1rem)] min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-superficie-2"
                    >
                      {contenido}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Estado>
      <ModalTarjetaTrello idTarjeta={tarjetaAbierta} alCerrar={() => setTarjetaAbierta(null)} />
    </>
  );
}

// ---------- Mis tickets ----------

function WidgetTickets() {
  const carga = usarCarga(() => Promise.all([apiTickets.listar('MisAbiertos'), apiTickets.conteos()]));
  const chips = (conteos: ConteoTicketsDto) =>
    [
      { etiqueta: 'Mis abiertos', valor: conteos.misAbiertos, vista: 'MisAbiertos', tono: 'acento' as const },
      { etiqueta: 'Sin asignar', valor: conteos.sinAsignar, vista: 'SinAsignar', tono: 'neutro' as const },
      { etiqueta: 'En pruebas', valor: conteos.enPruebas, vista: 'EnPruebas', tono: 'neutro' as const },
      { etiqueta: 'Vencidos', valor: conteos.vencidos, vista: 'Abiertos', tono: conteos.vencidos > 0 ? ('peligro' as const) : ('neutro' as const) },
    ];
  return (
    <Estado carga={carga}>
      {([tickets, conteos]: [TicketResumenDto[], ConteoTicketsDto]) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {chips(conteos).map((chip) => (
              <Link key={chip.etiqueta} to={`/tickets?vista=${chip.vista}`}>
                <Insignia tono={chip.tono}>
                  {chip.etiqueta} <span className="tabular-nums">{chip.valor}</span>
                </Insignia>
              </Link>
            ))}
          </div>
          {tickets.length === 0 ? (
            <Vacio>No tienes tickets abiertos.</Vacio>
          ) : (
            <div>
              {tickets.slice(0, 6).map((ticket) => (
                <Fila key={ticket.id} a={`/tickets/${ticket.id}`}>
                  <span className="w-20 shrink-0 font-mono text-xs text-texto-3">{ticket.clave}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{ticket.asunto}</span>
                  <span className="hidden shrink-0 sm:inline-flex">
                    <InsigniaPrioridad prioridad={ticket.prioridad} />
                  </span>
                  <InsigniaEstado estado={ticket.estado} />
                </Fila>
              ))}
            </div>
          )}
        </div>
      )}
    </Estado>
  );
}

// ---------- Pendiente de reportar ----------

function WidgetReporte() {
  const hoy = inicioHoy();
  const inicioMes = aIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const lunes = aIso(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7)));
  // Desde el lunes si la semana empezó el mes anterior, para no perder esos días.
  const desde = lunes < inicioMes ? lunes : inicioMes;
  const carga = usarCarga(() => apiReporte.actividades(desde, hoyIso(), true), desde);

  const resumen = (filas: FilaReporteDto[]) => ({
    actividades: filas.length,
    horas: filas.reduce((total, fila) => total + (fila.horas ?? 0), 0),
    dias: new Set(filas.map((fila) => fila.fecha)).size,
    conAvisos: filas.filter((fila) => !fila.tableroReporteId || !fila.horaFin).length,
  });

  return (
    <Estado carga={carga}>
      {(filas) => {
        const semana = resumen(filas.filter((fila) => fila.fecha >= lunes));
        const mes = resumen(filas.filter((fila) => fila.fecha >= inicioMes));
        return (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { etiqueta: 'Esta semana', datos: semana },
                { etiqueta: 'Este mes', datos: mes },
              ].map(({ etiqueta, datos }) => (
                <div key={etiqueta} className="rounded-xl bg-superficie-2/70 px-3 py-2.5">
                  <p className="text-xs text-texto-3">{etiqueta}</p>
                  <p className="text-xl font-semibold tabular-nums">{horasExcel(datos.horas)} h</p>
                  <p className="text-xs text-texto-2">
                    {datos.actividades} actividades · {datos.dias} {datos.dias === 1 ? 'día' : 'días'}
                  </p>
                </div>
              ))}
            </div>
            {filas.length === 0 ? (
              <p className="text-sm text-emerald-700">Todo reportado. ✓</p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                {semana.conAvisos + mes.conAvisos > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle className="size-3.5" /> {mes.conAvisos} sin tablero u hora de fin
                  </span>
                ) : (
                  <span />
                )}
                <Link to="/reporte" className="text-sm font-medium text-violet-700 hover:underline">
                  Ir al reporte →
                </Link>
              </div>
            )}
          </div>
        );
      }}
    </Estado>
  );
}

// ---------- Documentos ----------

function WidgetDocumentos({ vista }: { vista: 'Activos' | 'PorRevisar' }) {
  const carga = usarCarga(() => apiDocumentos.listar({ vista }), vista);
  return (
    <Estado
      carga={carga}
      vacio={(documentos: DocumentoResumenDto[]) => (documentos.length === 0 ? (vista === 'PorRevisar' ? 'Nada pendiente de revisión.' : 'Aún no hay documentos.') : null)}
    >
      {(documentos) => (
        <div>
          {[...documentos]
            .sort((a, b) => b.fechaActualizacion.localeCompare(a.fechaActualizacion))
            .slice(0, 6)
            .map((documento) => (
              <Fila key={documento.id} a={`/documentos/${documento.id}`}>
                <span className="w-5 shrink-0 text-center">{documento.icono ?? '📄'}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{documento.titulo || 'Sin título'}</span>
                <span className="shrink-0 text-xs text-texto-3">{formatearRelativo(documento.fechaActualizacion)}</span>
              </Fila>
            ))}
        </div>
      )}
    </Estado>
  );
}

// ---------- Favoritos ----------

function WidgetFavoritos() {
  const carga = usarCarga(() => apiMarcadores.listar());
  return (
    <Estado carga={carga} vacio={(marcadores: MarcadorDto[]) => (marcadores.length === 0 ? 'Marca documentos, tickets o tareas con la estrella.' : null)}>
      {(marcadores) => (
        <div>
          {marcadores.slice(0, 8).map((marcador) => {
            const Icono = iconosEntidad[marcador.tipoEntidad];
            return (
              <Fila key={marcador.id} a={rutaDeEntidad(marcador.tipoEntidad, marcador.entidadId)}>
                <Icono className="size-4 shrink-0 text-texto-3" />
                <span className="min-w-0 flex-1 truncate font-medium">{marcador.titulo}</span>
                {marcador.referencia && <span className="shrink-0 font-mono text-xs text-texto-3">{marcador.referencia}</span>}
              </Fila>
            );
          })}
        </div>
      )}
    </Estado>
  );
}

// ---------- Diario de hoy ----------

function WidgetDiario() {
  const fecha = hoyIso();
  const carga = usarCarga<DiaDiarioDto>(() => apiDiario.dia(fecha), fecha);
  return (
    <div className="flex flex-col gap-3">
      <BarraCaptura fecha={fecha} alCrear={async () => carga.recargar()} />
      <Estado carga={carga} vacio={(dia) => (dia.entradas.length === 0 ? 'Aún no registraste nada hoy.' : null)}>
        {(dia) => (
          <div className="grid gap-x-6 sm:grid-cols-2">
            {dia.entradas.slice(0, 10).map((entrada) => (
              <Fila key={entrada.id} a="/diario">
                <span className="w-12 shrink-0 text-xs tabular-nums text-texto-3">{formatearHora(entrada.horaInicio) || '—'}</span>
                <span className={unirClases('min-w-0 flex-1 truncate', entrada.completada && 'text-texto-3 line-through')}>{entrada.titulo.replace(/[*_`]/g, '')}</span>
              </Fila>
            ))}
          </div>
        )}
      </Estado>
    </div>
  );
}

// ---------- Flujos ----------

function WidgetFlujos() {
  const carga = usarCarga(() => apiFlujos.listar());
  return (
    <Estado carga={carga} vacio={(flujos: FlujoResumenDto[]) => (flujos.length === 0 ? 'Aún no hay flujos.' : null)}>
      {(flujos) => (
        <div>
          {flujos.slice(0, 6).map((flujo) => (
            <div key={flujo.id} className="flex items-center gap-1">
              <Fila a={`/flujos/${flujo.id}`} className="flex-1">
                <span className="min-w-0 flex-1 truncate font-medium">{flujo.titulo}</span>
                {flujo.sistema && <span className="shrink-0 text-xs text-texto-3">{flujo.sistema}</span>}
              </Fila>
              <Link
                to={`/flujos/${flujo.id}?recorrer=1`}
                title="Recorrer paso a paso"
                className="grid size-7 shrink-0 place-items-center rounded-md text-emerald-700 transition-colors hover:bg-emerald-50"
              >
                <Play className="size-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </Estado>
  );
}

// ---------- Resumen de la semana ----------

function WidgetSemana() {
  const hoy = inicioHoy();
  const lunes = aIso(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7)));
  const carga = usarCarga<ResumenAnaliticaPersonalDto>(() => apiAnalitica.resumen(lunes, hoyIso(), -new Date().getTimezoneOffset()), lunes);
  return (
    <Estado carga={carga}>
      {(resumen) => (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { etiqueta: 'Tareas completadas', valor: String(resumen.tareasCompletadas) },
            { etiqueta: 'Horas registradas', valor: horasExcel(resumen.minutosRegistrados / 60) },
            { etiqueta: 'Tickets resueltos', valor: String(resumen.ticketsResueltos) },
            { etiqueta: 'Tareas vencidas', valor: String(resumen.tareasVencidas), alerta: resumen.tareasVencidas > 0 },
          ].map((indicador) => (
            <div key={indicador.etiqueta} className="rounded-xl bg-superficie-2/70 px-3 py-2.5">
              <p className={unirClases('text-2xl font-semibold tabular-nums', indicador.alerta && 'text-rose-600')}>{indicador.valor}</p>
              <p className="text-xs text-texto-2">{indicador.etiqueta}</p>
            </div>
          ))}
        </div>
      )}
    </Estado>
  );
}

// ---------- Trello ----------

/** Tarjetas de Trello asignadas y sin completar, por vencimiento; sin conexión invita a conectar. */
function WidgetTrello() {
  const [abierta, setAbierta] = useState<string | null>(null);
  const carga = usarCarga(async (): Promise<{ conectado: boolean; tarjetas: TarjetaAsignadaTrelloDto[] }> => {
    const conexion = await apiTrello.conexion();
    return conexion.conectado ? { conectado: true, tarjetas: await apiTrello.misTarjetas() } : { conectado: false, tarjetas: [] };
  });
  const pendientes = (tarjetas: TarjetaAsignadaTrelloDto[]) =>
    tarjetas
      .filter((asignada) => !asignada.tarjeta.vencimientoCompletado)
      .sort((a, b) => (a.tarjeta.vencimiento ?? '9999').localeCompare(b.tarjeta.vencimiento ?? '9999'));

  return (
    <>
      <Estado
        carga={carga}
        vacio={(datos) =>
          !datos.conectado ? (
            <span>
              <Link to="/trello" className="font-medium text-acento hover:underline">
                Conecta tu cuenta de Trello
              </Link>{' '}
              para ver tus tarjetas aquí.
            </span>
          ) : pendientes(datos.tarjetas).length === 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <PartyPopper className="size-4" /> Sin tarjetas pendientes.
            </span>
          ) : null
        }
      >
        {(datos) => (
          <div className="flex flex-col">
            {pendientes(datos.tarjetas)
              .slice(0, 8)
              .map(({ tarjeta, nombreTablero, colorFondoTablero }) => (
                <button
                  key={tarjeta.id}
                  type="button"
                  onClick={() => setAbierta(tarjeta.id)}
                  className="-mx-2 flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-superficie-2"
                >
                  <span className="size-2 shrink-0 rounded-full" style={estiloFondoTablero({ colorFondo: colorFondoTablero })} />
                  <span className="min-w-0 flex-1 truncate font-medium">{tarjeta.nombre}</span>
                  <span className="hidden max-w-[35%] shrink-0 truncate text-xs text-texto-3 sm:inline">{nombreTablero}</span>
                  {tarjeta.vencimiento && <InsigniaVencimiento vencimiento={tarjeta.vencimiento} completado={false} className="shrink-0" />}
                </button>
              ))}
          </div>
        )}
      </Estado>
      <ModalTarjetaTrello idTarjeta={abierta} alCerrar={() => setAbierta(null)} />
    </>
  );
}
