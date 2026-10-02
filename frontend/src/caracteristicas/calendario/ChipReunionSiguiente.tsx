import { useEffect, useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { apiCalendario } from '../../servicios/api';
import type { EventoCalendarioDto } from '../../servicios/tipos';
import { unirClases } from '../../componentes/ui/primitivos';
import { DetalleEvento, EnlaceUnirse } from './DetalleEvento';
import { fechaLocal, formatoHora, inicioDelDia, sePuedeUnir, sumarDias, tiempoRelativo } from './utilidadesCalendario';

/** Evento global para que la barra superior se entere de "Actualizar", conectar o desconectar en la página del calendario. */
export const EventoCambioCalendario = 'calendario-cambio';
export const avisarCambioCalendario = () => window.dispatchEvent(new Event(EventoCambioCalendario));

const IntervaloRecargaMs = 5 * 60_000; // lo que dura la caché del backend
const MinutosAviso = 15;

/**
 * Chip de la barra superior con la siguiente reunión de hoy (Outlook/Teams). Sin calendario conectado o sin más
 * reuniones hoy no ocupa espacio. Desde 15 min antes se resalta y desde 10 min antes ofrece "Unirse".
 */
export function ChipReunionSiguiente() {
  const [eventos, setEventos] = useState<EventoCalendarioDto[] | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [ahora, setAhora] = useState(() => new Date());
  const [detalle, setDetalle] = useState<EventoCalendarioDto | null>(null);

  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(new Date()), 30_000);
    const recargar = () => setRecarga((actual) => actual + 1);
    const recargaPeriodica = window.setInterval(() => document.visibilityState === 'visible' && recargar(), IntervaloRecargaMs);
    const alVolver = () => document.visibilityState === 'visible' && recargar();
    window.addEventListener(EventoCambioCalendario, recargar);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      window.clearInterval(reloj);
      window.clearInterval(recargaPeriodica);
      window.removeEventListener(EventoCambioCalendario, recargar);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, []);

  useEffect(() => {
    const control = new AbortController();
    const hoy = inicioDelDia(new Date());
    setAhora(new Date());
    apiCalendario
      .conexion()
      .then((estado) => (estado.conectado ? apiCalendario.eventos(hoy.toISOString(), sumarDias(hoy, 1).toISOString(), false, control.signal) : []))
      .then(setEventos)
      .catch(() => {
        // Es un extra de la barra: si falla, simplemente no se muestra.
        if (!control.signal.aborted) setEventos([]);
      });
    return () => control.abort();
  }, [recarga]);

  const siguiente = useMemo(
    () =>
      (eventos ?? []).find(
        (evento) =>
          !evento.todoElDia &&
          !evento.cancelado &&
          evento.disponibilidad !== 'Libre' &&
          fechaLocal(evento.fin) > ahora &&
          inicioDelDia(fechaLocal(evento.inicio)).getTime() === inicioDelDia(ahora).getTime(),
      ) ?? null,
    [eventos, ahora],
  );

  if (!siguiente) return null;

  const inicio = fechaLocal(siguiente.inicio);
  const fin = fechaLocal(siguiente.fin);
  const enCurso = ahora >= inicio && ahora < fin;
  const pronto = !enCurso && inicio.getTime() - ahora.getTime() <= MinutosAviso * 60_000;
  const cuando = enCurso ? 'Ahora' : pronto ? tiempoRelativo(inicio, fin, ahora) : formatoHora.format(inicio);

  return (
    <>
      <div
        className={unirClases(
          'flex h-9 min-w-0 items-center gap-2 rounded-full border pl-3 text-sm transition-colors',
          sePuedeUnir(siguiente, ahora) ? 'pr-1' : 'pr-3',
          enCurso || pronto ? 'border-violet-300 bg-violet-50 text-violet-950' : 'border-borde bg-superficie text-texto-2',
        )}
      >
        {enCurso ? (
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-violet-600" />
          </span>
        ) : (
          <CalendarClock className={unirClases('size-4 shrink-0', pronto ? 'text-violet-600' : 'text-texto-3')} />
        )}
        <button
          type="button"
          onClick={() => setDetalle(siguiente)}
          title={`${siguiente.titulo} · ${formatoHora.format(inicio)} – ${formatoHora.format(fin)}`}
          className="flex min-w-0 items-center gap-1.5 hover:underline"
        >
          <span className={unirClases('shrink-0 font-medium tabular-nums', (enCurso || pronto) && 'text-violet-700')}>{cuando}</span>
          <span className="hidden max-w-44 truncate lg:block">{siguiente.titulo}</span>
        </button>
        {siguiente.enlaceReunion && sePuedeUnir(siguiente, ahora) && <EnlaceUnirse url={siguiente.enlaceReunion} tamano="sm" className="rounded-full" />}
      </div>
      <DetalleEvento evento={detalle} alCerrar={() => setDetalle(null)} />
    </>
  );
}
