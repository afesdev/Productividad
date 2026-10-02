import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import esLocale from '@fullcalendar/core/locales/es';
import type { DatesSetArg, DayHeaderContentArg, EventClickArg, EventContentArg, EventInput, EventSourceFuncArg } from '@fullcalendar/core';
import { CalendarDays, ChevronLeft, ChevronRight, Keyboard, Link2, Lock, MapPin, RefreshCw, Unplug, Video } from 'lucide-react';
import { apiCalendario } from '../servicios/api';
import { notificar } from '../servicios/notificaciones';
import type { EstadoConexionCalendarioDto, EventoCalendarioDto } from '../servicios/tipos';
import { Boton, BotonIcono, Campo, EncabezadoPagina, Entrada, Esqueleto, MensajeError, Tarjeta, unirClases } from '../componentes/ui/primitivos';
import { Modal } from '../componentes/ui/Modal';
import { usarConfirmacion } from '../componentes/ui/DialogoConfirmacion';
import { MenuAcciones } from '../caracteristicas/documentos/MenuAcciones';
import { avisarCambioCalendario } from '../caracteristicas/calendario/ChipReunionSiguiente';
import { DetalleEvento, EnlaceUnirse } from '../caracteristicas/calendario/DetalleEvento';
import { PanelLateralCalendario } from '../caracteristicas/calendario/PanelLateralCalendario';
import { fechaLocal, sePuedeUnir, ubicacionUtil } from '../caracteristicas/calendario/utilidadesCalendario';

type Vista = 'timeGridDay' | 'semanaLaboral' | 'timeGridWeek' | 'dayGridMonth';

const vistas: { valor: Vista; etiqueta: string; atajo: string }[] = [
  { valor: 'timeGridDay', etiqueta: 'Día', atajo: 'D' },
  { valor: 'semanaLaboral', etiqueta: 'Semana laboral', atajo: 'L' },
  { valor: 'timeGridWeek', etiqueta: 'Semana', atajo: 'S' },
  { valor: 'dayGridMonth', etiqueta: 'Mes', atajo: 'M' },
];

const ClaveVista = 'calendario.vista';

function leerVista(): Vista {
  try {
    const guardada = localStorage.getItem(ClaveVista);
    return vistas.some((vista) => vista.valor === guardada) ? (guardada as Vista) : 'semanaLaboral';
  } catch {
    return 'semanaLaboral';
  }
}

/** Mismas reglas que el backend (ReglasUrlCalendario): solo enlaces https de Outlook. */
const hostsOutlook = ['outlook.office365.com', 'outlook.office.com', 'outlook.live.com'];

function validarEnlace(url: string): string | null {
  try {
    const destino = new URL(url.trim());
    if (destino.protocol !== 'https:' || !hostsOutlook.includes(destino.hostname.toLowerCase())) return 'Usa el enlace ICS que genera Outlook (https://outlook.office365.com/…/calendar.ics).';
    if (!destino.pathname.toLowerCase().endsWith('.ics')) return 'Ese parece el enlace HTML. Copia el enlace ICS (termina en .ics).';
    return null;
  } catch {
    return 'No es un enlace válido.';
  }
}

export function PaginaCalendario() {
  const [conexion, setConexion] = useState<EstadoConexionCalendarioDto | null>(null);
  const [cambiandoEnlace, setCambiandoEnlace] = useState(false);
  const confirmar = usarConfirmacion();

  useEffect(() => {
    apiCalendario
      .conexion()
      .then(setConexion)
      .catch((error) => {
        notificar.error('No se pudo consultar el calendario', error);
        setConexion({ conectado: false, fechaConexion: null });
      });
  }, []);

  async function desconectar() {
    const aceptado = await confirmar({
      titulo: 'Desconectar el calendario',
      descripcion: 'Se borra el enlace guardado. Para que deje de funcionar del todo, cancela también la publicación en Outlook.',
      textoConfirmar: 'Desconectar',
      peligrosa: true,
    });
    if (!aceptado) return;
    try {
      await apiCalendario.desconectar();
      setConexion({ conectado: false, fechaConexion: null });
      avisarCambioCalendario();
      notificar.exito('Calendario desconectado');
    } catch (error) {
      notificar.error('No se pudo desconectar', error);
    }
  }

  if (!conexion) {
    return (
      <div className="flex flex-col gap-4">
        <Esqueleto className="h-9 w-48" />
        <Esqueleto className="h-[60vh] w-full" />
      </div>
    );
  }

  if (!conexion.conectado) {
    return (
      <>
        <EncabezadoPagina titulo="Calendario" descripcion="Tus reuniones de Outlook y Teams, solo lectura." />
        <PanelConexion alConectar={setConexion} />
      </>
    );
  }

  return (
    <>
      <VistaCalendario alCambiarEnlace={() => setCambiandoEnlace(true)} alDesconectar={() => void desconectar()} />
      <Modal abierto={cambiandoEnlace} alCerrar={() => setCambiandoEnlace(false)} titulo="Cambiar enlace del calendario" ancho="lg">
        <FormularioEnlace
          alConectar={(estado) => {
            setConexion(estado);
            setCambiandoEnlace(false);
          }}
        />
      </Modal>
    </>
  );
}

// ---------- Conexión ----------

function PanelConexion({ alConectar }: { alConectar: (estado: EstadoConexionCalendarioDto) => void }) {
  return (
    <Tarjeta className="mx-auto flex max-w-2xl flex-col gap-5 p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600">
          <CalendarDays className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">Conecta tu calendario de Outlook / Teams</h2>
          <p className="mt-1 text-sm text-texto-2">Se lee el calendario que publicas desde Outlook. La app solo lo muestra: no crea ni modifica reuniones.</p>
        </div>
      </div>
      <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-texto-2">
        <li>
          Abre <span className="font-medium text-texto">outlook.office.com</span> → ⚙️ Configuración → <span className="font-medium text-texto">Calendario</span> →{' '}
          <span className="font-medium text-texto">Calendarios compartidos</span>.
        </li>
        <li>
          En <span className="font-medium text-texto">Publicar un calendario</span> elige &quot;Calendario&quot; y &quot;Puede ver todos los detalles&quot;, y pulsa Publicar.
        </li>
        <li>
          Copia el <span className="font-medium text-texto">vínculo ICS</span> (termina en <code className="rounded bg-superficie-2 px-1 text-xs">.ics</code>) y pégalo aquí.
        </li>
      </ol>
      <FormularioEnlace alConectar={alConectar} />
      <p className="flex items-start gap-2 rounded-lg bg-superficie-2 px-3 py-2 text-xs text-texto-2">
        <Lock className="mt-0.5 size-3.5 shrink-0" />
        El enlace da acceso a tu calendario sin iniciar sesión: se guarda cifrado y no se muestra de nuevo. Si se filtra, cancela la publicación en Outlook y vuelve a publicar.
      </p>
    </Tarjeta>
  );
}

function FormularioEnlace({ alConectar }: { alConectar: (estado: EstadoConexionCalendarioDto) => void }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [conectando, setConectando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const problema = validarEnlace(url);
    if (problema) {
      setError(problema);
      return;
    }
    setError(null);
    setConectando(true);
    try {
      const estado = await apiCalendario.conectar(url.trim());
      setUrl('');
      notificar.exito('Calendario conectado');
      avisarCambioCalendario();
      alConectar(estado);
    } catch (errorConexion) {
      notificar.error('No se pudo conectar el calendario', errorConexion);
    } finally {
      setConectando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-2">
      <Campo etiqueta="Vínculo ICS">
        <Entrada
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://outlook.office365.com/owa/calendar/…/calendar.ics"
          value={url}
          onChange={(evento) => setUrl(evento.target.value)}
        />
      </Campo>
      <MensajeError mensaje={error} />
      <div className="flex justify-end">
        <Boton type="submit" icono={Link2} cargando={conectando} disabled={!url.trim()}>
          Conectar
        </Boton>
      </div>
    </form>
  );
}


// ---------- Calendario ----------

const aEventoCalendario = (evento: EventoCalendarioDto): EventInput => ({
  id: evento.id,
  title: evento.titulo,
  start: evento.inicio,
  end: evento.fin,
  allDay: evento.todoElDia,
  classNames: ['evento-cal', `evento-${evento.disponibilidad}`, evento.cancelado ? 'evento-cancelado' : ''].filter(Boolean),
  extendedProps: { evento },
});

const formatoDiaSemana = new Intl.DateTimeFormat('es', { weekday: 'short' });
const textoAtajos = 'Atajos: T hoy · ← → anterior / siguiente · D día · L semana laboral · S semana · M mes · R actualizar';

/** Hora actual que se renueva cada 30 s: mueve "siguiente reunión", el botón Unirse y el atenuado de lo pasado. */
function usarAhora() {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const intervalo = window.setInterval(() => setAhora(new Date()), 30_000);
    return () => window.clearInterval(intervalo);
  }, []);
  return ahora;
}

const escribiendo = (destino: EventTarget | null) =>
  destino instanceof HTMLElement && (destino.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(destino.tagName));

function VistaCalendario({ alCambiarEnlace, alDesconectar }: { alCambiarEnlace: () => void; alDesconectar: () => void }) {
  const calendario = useRef<FullCalendar>(null);
  const forzarActualizacion = useRef(false);
  // Tras "Actualizar", la barra superior se refresca cuando el backend ya tiene la descarga nueva.
  const avisarAlTerminar = useRef(false);
  const [vista, setVista] = useState<Vista>(leerVista);
  const [titulo, setTitulo] = useState('');
  const [rango, setRango] = useState<{ inicio: Date; fin: Date } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [version, setVersion] = useState(0);
  const [seleccionado, setSeleccionado] = useState<EventoCalendarioDto | null>(null);
  const ahora = usarAhora();

  const api = () => calendario.current?.getApi();

  const cargarEventos = useCallback((info: EventSourceFuncArg, exito: (eventos: EventInput[]) => void, fallo: (error: Error) => void) => {
    const actualizar = forzarActualizacion.current;
    forzarActualizacion.current = false;
    apiCalendario
      .eventos(info.start.toISOString(), info.end.toISOString(), actualizar)
      .then((eventos) => exito(eventos.map(aEventoCalendario)))
      .catch((error) => {
        notificar.error('No se pudo cargar el calendario', error);
        fallo(error instanceof Error ? error : new Error('Error al cargar eventos'));
      });
  }, []);

  function cambiarVista(nueva: Vista, fecha?: Date) {
    setVista(nueva);
    api()?.changeView(nueva, fecha);
    try {
      localStorage.setItem(ClaveVista, nueva);
    } catch {
      // Sin almacenamiento solo se pierde la preferencia.
    }
  }

  function actualizar() {
    forzarActualizacion.current = true;
    avisarAlTerminar.current = true;
    api()?.refetchEvents();
    setVersion((actual) => actual + 1);
  }

  const actualizarActual = useRef(actualizar);
  actualizarActual.current = actualizar;
  const cambiarVistaActual = useRef(cambiarVista);
  cambiarVistaActual.current = cambiarVista;

  // Atajos de teclado como en Teams/Outlook; no actúan mientras se escribe ni con un modal abierto.
  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.ctrlKey || evento.metaKey || evento.altKey || escribiendo(evento.target) || document.querySelector('[role="dialog"]')) return;
      const calendarioApi = calendario.current?.getApi();
      if (!calendarioApi) return;
      const tecla = evento.key.toLowerCase();
      const vistaAtajo = vistas.find((opcion) => opcion.atajo.toLowerCase() === tecla);
      if (tecla === 't') calendarioApi.today();
      else if (evento.key === 'ArrowLeft') calendarioApi.prev();
      else if (evento.key === 'ArrowRight') calendarioApi.next();
      else if (tecla === 'r') actualizarActual.current();
      else if (vistaAtajo) cambiarVistaActual.current(vistaAtajo.valor);
      else return;
      evento.preventDefault();
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, []);

  const contenidoEvento = useCallback((info: EventContentArg) => <ContenidoEvento info={info} ahora={ahora} />, [ahora]);

  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[32rem] flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="mr-2 text-2xl font-semibold tracking-tight">Calendario</h1>
          <Boton variante="secundario" tamano="sm" icono={CalendarDays} onClick={() => api()?.today()} title="Ir a hoy (T)">
            Hoy
          </Boton>
          <div className="flex">
            <BotonIcono icono={ChevronLeft} etiqueta="Anterior (←)" tamano="sm" onClick={() => api()?.prev()} />
            <BotonIcono icono={ChevronRight} etiqueta="Siguiente (→)" tamano="sm" onClick={() => api()?.next()} />
          </div>
          <span className="truncate text-base font-semibold first-letter:uppercase">{titulo}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-superficie-2 p-0.5 text-sm" role="tablist" aria-label="Vista">
            {vistas.map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                role="tab"
                aria-selected={vista === opcion.valor}
                title={`${opcion.etiqueta} (${opcion.atajo})`}
                onClick={() => cambiarVista(opcion.valor)}
                className={unirClases(
                  'h-8 rounded-md px-3 font-medium transition-colors',
                  vista === opcion.valor ? 'bg-superficie text-texto shadow-tarjeta' : 'text-texto-2 hover:text-texto',
                )}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>
          <BotonIcono
            icono={RefreshCw}
            etiqueta="Actualizar desde Outlook (R)"
            onClick={actualizar}
            disabled={cargando}
            className={unirClases(cargando && '[&_svg]:animate-spin')}
          />
          <BotonIcono icono={Keyboard} etiqueta={textoAtajos} className="hidden cursor-help md:inline-grid" />
          <MenuAcciones
            acciones={[
              { etiqueta: 'Cambiar enlace ICS…', icono: Link2, alPulsar: alCambiarEnlace },
              { etiqueta: 'Desconectar calendario', icono: Unplug, alPulsar: alDesconectar, peligrosa: true, separadorAntes: true },
            ]}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-4">
        <PanelLateralCalendario
          rango={rango}
          ahora={ahora}
          version={version}
          alElegirDia={(dia) => api()?.gotoDate(dia)}
          alSeleccionar={setSeleccionado}
        />

        <div className="calendario-outlook relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-borde bg-superficie shadow-tarjeta">
          {cargando && <span className="barra-carga absolute inset-x-0 top-0 z-10 h-0.5" aria-hidden />}
          <FullCalendar
            ref={calendario}
            plugins={[timeGridPlugin, dayGridPlugin]}
            locale={esLocale}
            initialView={vista}
            views={{ semanaLaboral: { type: 'timeGridWeek', weekends: false } }}
            headerToolbar={false}
            height="100%"
            firstDay={1}
            nowIndicator
            navLinks
            navLinkDayClick={(fecha: Date) => cambiarVista('timeGridDay', fecha)}
            allDayText="Todo el día"
            slotDuration="00:30:00"
            scrollTime="07:30:00"
            scrollTimeReset={false}
            slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
            eventTimeFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
            businessHours={{ daysOfWeek: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '18:00' }}
            dayMaxEventRows={4}
            eventMinHeight={22}
            events={cargarEventos}
            loading={(cargandoAhora: boolean) => {
              setCargando(cargandoAhora);
              if (!cargandoAhora && avisarAlTerminar.current) {
                avisarAlTerminar.current = false;
                avisarCambioCalendario();
              }
            }}
            datesSet={(info: DatesSetArg) => {
              setTitulo(info.view.title);
              setRango({ inicio: info.start, fin: info.end });
            }}
            dayHeaderContent={(info: DayHeaderContentArg) => <CabeceraDia info={info} />}
            eventClassNames={(info) => (info.event.end && info.event.end < ahora ? ['evento-pasado'] : [])}
            eventClick={(info: EventClickArg) => {
              // El botón "Unirse" dentro del evento abre Teams; no debe abrir además el detalle.
              if ((info.jsEvent.target as Element | null)?.closest('.evento-unirse')) return;
              info.jsEvent.preventDefault();
              setSeleccionado(info.event.extendedProps.evento as EventoCalendarioDto);
            }}
            eventContent={contenidoEvento}
          />
        </div>
      </div>

      <DetalleEvento evento={seleccionado} alCerrar={() => setSeleccionado(null)} />
    </div>
  );
}

/** Cabecera de día como en Teams: día de la semana pequeño y número grande; hoy en un círculo violeta. */
function CabeceraDia({ info }: { info: DayHeaderContentArg }) {
  if (info.view.type === 'dayGridMonth') return <span className="text-xs font-medium capitalize text-texto-2">{formatoDiaSemana.format(info.date)}</span>;
  return (
    <span className="flex flex-col items-center gap-0.5 py-0.5">
      <span className={unirClases('text-[11px] font-medium uppercase tracking-wide', info.isToday ? 'text-violet-700' : 'text-texto-3')}>
        {formatoDiaSemana.format(info.date).replace('.', '')}
      </span>
      <span
        className={unirClases(
          'grid size-8 place-items-center rounded-full text-lg font-semibold tabular-nums',
          info.isToday ? 'bg-violet-600 text-white' : info.isPast ? 'text-texto-3' : 'text-texto',
        )}
      >
        {info.date.getDate()}
      </span>
    </span>
  );
}

/** Bloque del evento: más detalle cuanto más largo es (como Teams), y "Unirse" directo cuando la reunión está por empezar o en curso. */
function ContenidoEvento({ info, ahora }: { info: EventContentArg; ahora: Date }) {
  const evento = info.event.extendedProps.evento as EventoCalendarioDto;
  const iconos = (
    <>
      {evento.enlaceReunion && <Video className="size-3 shrink-0 opacity-70" aria-label="Reunión de Teams" />}
      {evento.privado && <Lock className="size-3 shrink-0 opacity-70" aria-label="Privada" />}
    </>
  );

  if (info.view.type === 'dayGridMonth' || info.event.allDay) {
    return (
      <div className="flex min-w-0 items-center gap-1 overflow-hidden px-1.5 py-0.5 text-xs leading-tight">
        {iconos}
        {!info.event.allDay && info.timeText && <span className="shrink-0 opacity-75">{info.timeText}</span>}
        <span className="truncate font-medium">{info.event.title}</span>
      </div>
    );
  }

  const minutos = (fechaLocal(evento.fin).getTime() - fechaLocal(evento.inicio).getTime()) / 60_000;
  const ubicacion = ubicacionUtil(evento);
  const secundario = ubicacion ?? evento.organizador;
  const unirse = evento.enlaceReunion && minutos >= 30 && sePuedeUnir(evento, ahora);

  return (
    <div className={unirClases('flex h-full min-w-0 flex-col overflow-hidden px-1.5 py-0.5 text-xs leading-tight', minutos <= 30 && 'flex-row items-center gap-1')}>
      <span className="flex min-w-0 items-start gap-1 font-semibold">
        <span className="mt-px flex shrink-0 gap-1">{iconos}</span>
        <span className={minutos >= 45 ? 'line-clamp-2' : 'truncate'}>{info.event.title}</span>
      </span>
      {info.timeText && <span className="shrink-0 truncate opacity-75">{info.timeText}</span>}
      {minutos >= 60 && secundario && (
        <span className="mt-0.5 flex min-w-0 items-center gap-1 truncate opacity-75">
          {ubicacion && <MapPin className="size-3 shrink-0" />}
          <span className="truncate">{secundario}</span>
        </span>
      )}
      {unirse && evento.enlaceReunion && <EnlaceUnirse url={evento.enlaceReunion} tamano="sm" className="mt-auto self-start" />}
    </div>
  );
}
