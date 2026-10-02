import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, ChevronLeft, ChevronRight, Lock, MapPin, Video } from 'lucide-react';
import { apiCalendario } from '../../servicios/api';
import type { EventoCalendarioDto } from '../../servicios/tipos';
import { BotonIcono, Esqueleto, unirClases } from '../../componentes/ui/primitivos';
import { EnlaceUnirse } from './DetalleEvento';
import {
  claveDia,
  clasePunto,
  diasDelEvento,
  fechaLocal,
  formatoDia,
  formatoHora,
  inicioDelDia,
  inicioSemana,
  mismoDia,
  sePuedeUnir,
  sumarDias,
  tiempoRelativo,
  ubicacionUtil,
} from './utilidadesCalendario';

const diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const formatoMes = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' });
const DiasProximos = 7;
const MaximoProximos = 12;

interface PropiedadesPanel {
  /** Rango visible del calendario principal (fin exclusivo): se resalta en el minicalendario. */
  rango: { inicio: Date; fin: Date } | null;
  ahora: Date;
  /** Sube con cada "Actualizar" para volver a pedir los datos. */
  version: number;
  alElegirDia: (dia: Date) => void;
  alSeleccionar: (evento: EventoCalendarioDto) => void;
}

/** Columna izquierda como la de Teams: minicalendario del mes y próximas reuniones con la siguiente destacada. */
export function PanelLateralCalendario({ rango, ahora, version, alElegirDia, alSeleccionar }: PropiedadesPanel) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto pb-2 sin-barra-scroll lg:flex">
      <MiniCalendario rango={rango} ahora={ahora} version={version} alElegirDia={alElegirDia} />
      <ProximasReuniones ahora={ahora} version={version} alSeleccionar={alSeleccionar} />
    </aside>
  );
}

// ---------- Minicalendario ----------

function MiniCalendario({ rango, ahora, version, alElegirDia }: Pick<PropiedadesPanel, 'rango' | 'ahora' | 'version' | 'alElegirDia'>) {
  const [mes, setMes] = useState(() => new Date(ahora.getFullYear(), ahora.getMonth(), 1));
  const [eventosPorDia, setEventosPorDia] = useState<Map<string, EventoCalendarioDto[]>>(new Map());

  // Si el calendario principal sale del mes mostrado (flechas, "Hoy"), el minicalendario lo sigue.
  useEffect(() => {
    if (!rango) return;
    const medio = new Date((rango.inicio.getTime() + rango.fin.getTime()) / 2);
    setMes((actual) => (actual.getFullYear() === medio.getFullYear() && actual.getMonth() === medio.getMonth() ? actual : new Date(medio.getFullYear(), medio.getMonth(), 1)));
  }, [rango]);

  const inicioCuadricula = useMemo(() => inicioSemana(mes), [mes]);
  const dias = useMemo(() => Array.from({ length: 42 }, (_, indice) => sumarDias(inicioCuadricula, indice)), [inicioCuadricula]);

  useEffect(() => {
    const control = new AbortController();
    apiCalendario
      .eventos(inicioCuadricula.toISOString(), sumarDias(inicioCuadricula, 42).toISOString(), false, control.signal)
      .then((eventos) => {
        const mapa = new Map<string, EventoCalendarioDto[]>();
        for (const evento of eventos) {
          if (evento.cancelado) continue;
          for (const dia of diasDelEvento(evento)) mapa.set(claveDia(dia), [...(mapa.get(claveDia(dia)) ?? []), evento]);
        }
        setEventosPorDia(mapa);
      })
      .catch(() => {
        // Los puntos son decorativos: si fallan, el calendario principal ya muestra el error.
      });
    return () => control.abort();
  }, [inicioCuadricula, version]);

  const hoy = inicioDelDia(ahora);
  const enRango = (dia: Date) => !!rango && dia >= inicioDelDia(rango.inicio) && dia < rango.fin;

  return (
    <section className="rounded-xl border border-borde bg-superficie p-3 shadow-tarjeta">
      <div className="mb-2 flex items-center justify-between">
        <span className="pl-1 text-sm font-semibold capitalize">{formatoMes.format(mes)}</span>
        <div className="flex">
          <BotonIcono icono={ChevronLeft} etiqueta="Mes anterior" tamano="sm" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} />
          <BotonIcono icono={ChevronRight} etiqueta="Mes siguiente" tamano="sm" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} />
        </div>
      </div>
      <div className="grid grid-cols-7 text-center">
        {diasSemana.map((dia) => (
          <span key={dia} className="pb-1 text-[11px] font-medium text-texto-3">
            {dia}
          </span>
        ))}
        {dias.map((dia, indice) => {
          const delMes = dia.getMonth() === mes.getMonth();
          const esHoy = mismoDia(dia, hoy);
          const seleccionado = enRango(dia);
          const eventos = eventosPorDia.get(claveDia(dia)) ?? [];
          // La franja del rango visible se une en una sola píldora por semana.
          const bordeIzquierdo = seleccionado && (indice % 7 === 0 || !enRango(sumarDias(dia, -1)));
          const bordeDerecho = seleccionado && (indice % 7 === 6 || !enRango(sumarDias(dia, 1)));
          return (
            <div key={claveDia(dia)} className={unirClases('py-0.5', seleccionado && 'bg-violet-50', bordeIzquierdo && 'rounded-l-lg', bordeDerecho && 'rounded-r-lg')}>
              <button
                type="button"
                onClick={() => alElegirDia(dia)}
                aria-label={formatoDia.format(dia)}
                aria-current={esHoy ? 'date' : undefined}
                className={unirClases(
                  'relative mx-auto grid size-8 place-items-center rounded-full text-xs tabular-nums transition-colors',
                  esHoy ? 'bg-violet-600 font-semibold text-white hover:bg-violet-700' : 'hover:bg-superficie-2',
                  !esHoy && (delMes ? 'text-texto' : 'text-texto-3'),
                )}
              >
                {dia.getDate()}
                {eventos.length > 0 && (
                  <span className="absolute bottom-0.5 flex gap-0.5">
                    {eventos.slice(0, 3).map((evento) => (
                      <span key={evento.id} className={unirClases('size-1 rounded-full', esHoy ? 'bg-white/80' : clasePunto[evento.disponibilidad])} />
                    ))}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------- Próximas reuniones ----------

function ProximasReuniones({ ahora, version, alSeleccionar }: Pick<PropiedadesPanel, 'ahora' | 'version' | 'alSeleccionar'>) {
  const [eventos, setEventos] = useState<EventoCalendarioDto[] | null>(null);
  const [recarga, setRecarga] = useState(0);

  // Se refresca solo cada 5 minutos (lo que dura la caché del backend) además de con "Actualizar".
  useEffect(() => {
    const intervalo = window.setInterval(() => setRecarga((actual) => actual + 1), 5 * 60_000);
    return () => window.clearInterval(intervalo);
  }, []);

  useEffect(() => {
    const control = new AbortController();
    const desde = new Date();
    apiCalendario
      .eventos(inicioDelDia(desde).toISOString(), sumarDias(inicioDelDia(desde), DiasProximos).toISOString(), false, control.signal)
      .then(setEventos)
      .catch(() => {
        if (!control.signal.aborted) setEventos([]);
      });
    return () => control.abort();
  }, [version, recarga]);

  const pendientes = useMemo(
    () => (eventos ?? []).filter((evento) => !evento.cancelado && fechaLocal(evento.fin) > ahora).slice(0, MaximoProximos),
    [eventos, ahora],
  );
  const siguiente = pendientes.find((evento) => !evento.todoElDia && evento.disponibilidad !== 'Libre');
  const resto = useMemo(() => pendientes.filter((evento) => evento !== siguiente), [pendientes, siguiente]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, { dia: Date; eventos: EventoCalendarioDto[] }>();
    for (const evento of resto) {
      const dia = inicioDelDia(fechaLocal(evento.inicio) < ahora ? ahora : fechaLocal(evento.inicio));
      const grupo = mapa.get(claveDia(dia)) ?? { dia, eventos: [] };
      grupo.eventos.push(evento);
      mapa.set(claveDia(dia), grupo);
    }
    return [...mapa.values()];
  }, [resto, ahora]);

  const etiquetaDia = (dia: Date) => {
    const hoy = inicioDelDia(ahora);
    if (mismoDia(dia, hoy)) return 'Hoy';
    if (mismoDia(dia, sumarDias(hoy, 1))) return 'Mañana';
    return formatoDia.format(dia);
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-texto-3">Próximas reuniones</h2>

      {eventos === null ? (
        <div className="flex flex-col gap-2">
          <Esqueleto className="h-24 w-full rounded-xl" />
          <Esqueleto className="h-10 w-full" />
          <Esqueleto className="h-10 w-full" />
        </div>
      ) : pendientes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-borde-fuerte px-4 py-6 text-center text-sm text-texto-2">
          <CalendarCheck className="size-5 text-texto-3" />
          Nada agendado en los próximos {DiasProximos} días.
        </div>
      ) : (
        <>
          {siguiente && <TarjetaSiguiente evento={siguiente} ahora={ahora} alSeleccionar={alSeleccionar} />}
          {grupos.map(({ dia, eventos: delDia }) => (
            <div key={claveDia(dia)} className="flex flex-col gap-1">
              <p className="px-1 text-xs font-medium text-texto-2 first-letter:uppercase">{etiquetaDia(dia)}</p>
              {delDia.map((evento) => (
                <FilaEvento key={evento.id} evento={evento} ahora={ahora} alSeleccionar={alSeleccionar} />
              ))}
            </div>
          ))}
        </>
      )}
    </section>
  );
}

function TarjetaSiguiente({ evento, ahora, alSeleccionar }: { evento: EventoCalendarioDto; ahora: Date; alSeleccionar: (evento: EventoCalendarioDto) => void }) {
  const inicio = fechaLocal(evento.inicio);
  const fin = fechaLocal(evento.fin);
  const enCurso = ahora >= inicio && ahora < fin;
  const ubicacion = ubicacionUtil(evento);
  return (
    <div className={unirClases('flex flex-col gap-2 rounded-xl border p-3 shadow-tarjeta', enCurso ? 'border-violet-300 bg-violet-50' : 'border-borde bg-superficie')}>
      <div className="flex items-center justify-between gap-2">
        <span className={unirClases('inline-flex items-center gap-1.5 text-xs font-semibold', enCurso ? 'text-violet-700' : 'text-texto-2')}>
          {enCurso && <span className="size-1.5 animate-pulse rounded-full bg-violet-600" />}
          {enCurso ? 'En curso' : `Siguiente · ${tiempoRelativo(inicio, fin, ahora).toLowerCase()}`}
        </span>
        {evento.privado && <Lock className="size-3.5 text-texto-3" aria-label="Privada" />}
      </div>
      <button type="button" onClick={() => alSeleccionar(evento)} className="text-left">
        <p className="line-clamp-2 text-sm font-semibold hover:underline">{evento.titulo}</p>
        <p className="mt-0.5 text-xs text-texto-2">
          {formatoHora.format(inicio)} – {formatoHora.format(fin)}
          {!mismoDia(inicio, ahora) && ` · ${formatoDia.format(inicio)}`}
        </p>
        {ubicacion && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-texto-3">
            <MapPin className="size-3 shrink-0" />
            {ubicacion}
          </p>
        )}
      </button>
      {evento.enlaceReunion && (
        <EnlaceUnirse url={evento.enlaceReunion} tamano="sm" className={unirClases('self-start', !sePuedeUnir(evento, ahora) && 'bg-violet-500/90')} />
      )}
    </div>
  );
}

function FilaEvento({ evento, ahora, alSeleccionar }: { evento: EventoCalendarioDto; ahora: Date; alSeleccionar: (evento: EventoCalendarioDto) => void }) {
  const inicio = fechaLocal(evento.inicio);
  const fin = fechaLocal(evento.fin);
  return (
    <div className="group flex items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-superficie-2">
      <span className={unirClases('h-8 w-1 shrink-0 rounded-full', clasePunto[evento.disponibilidad])} />
      <button type="button" onClick={() => alSeleccionar(evento)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium">{evento.titulo}</p>
        <p className="text-xs text-texto-3">{evento.todoElDia ? 'Todo el día' : `${formatoHora.format(inicio)} – ${formatoHora.format(fin)}`}</p>
      </button>
      {evento.enlaceReunion &&
        (sePuedeUnir(evento, ahora) ? (
          <EnlaceUnirse url={evento.enlaceReunion} tamano="sm" />
        ) : (
          <Video className="size-3.5 shrink-0 text-texto-3" aria-label="Reunión de Teams" />
        ))}
    </div>
  );
}
