import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LifeBuoy, ListChecks, Pencil, Plus, Search, Timer, Trash2, X } from 'lucide-react';
import { apiBusqueda, apiTiempo, type DestinoTiempo } from '../servicios/api';
import { obtenerMensajeError } from '../servicios/clienteApi';
import { notificar } from '../servicios/notificaciones';
import type { RegistroTiempoDto, ResultadoBusquedaDto } from '../servicios/tipos';
import { usarCronometro } from '../caracteristicas/tiempo/ContextoCronometro';
import {
  claveDia,
  formatearDuracion,
  formatearHoraLocal,
  formatearHorasDecimales,
  inicioSemana,
  rutaDestino,
  sumarDiasFecha,
} from '../caracteristicas/tiempo/presentacionTiempo';
import { usarConfirmacion } from '../componentes/ui/DialogoConfirmacion';
import { Modal } from '../componentes/ui/Modal';
import { Boton, BotonIcono, Campo, EncabezadoPagina, Entrada, Esqueleto, EstadoVacio, MensajeError, unirClases } from '../componentes/ui/primitivos';

/** /tiempo?semana=AAAA-MM-DD (lunes). Semana de lunes a domingo en hora local. */
export function PaginaTiempo() {
  const [parametros, setParametros] = useSearchParams();
  const { version, activo, notificarCambio } = usarCronometro();
  const confirmar = usarConfirmacion();
  const lunes = useMemo(() => {
    const parametro = parametros.get('semana');
    const fecha = parametro && /^\d{4}-\d{2}-\d{2}$/.test(parametro) ? new Date(`${parametro}T00:00:00`) : new Date();
    return inicioSemana(Number.isNaN(fecha.getTime()) ? new Date() : fecha);
  }, [parametros]);
  const [registros, setRegistros] = useState<RegistroTiempoDto[] | null>(null);
  const [edicion, setEdicion] = useState<RegistroTiempoDto | 'nuevo' | null>(null);

  const cargar = useCallback(async () => {
    try {
      setRegistros(await apiTiempo.listar(lunes, sumarDiasFecha(lunes, 7)));
    } catch (errorCarga) {
      notificar.error('No se pudo cargar el tiempo', errorCarga);
    }
  }, [lunes]);

  useEffect(() => {
    void cargar();
  }, [cargar, version]);

  const dias = useMemo(() => Array.from({ length: 7 }, (_, indice) => sumarDiasFecha(lunes, indice)), [lunes]);
  const porDia = useMemo(() => {
    const grupos = new Map<string, RegistroTiempoDto[]>();
    for (const registro of registros ?? []) {
      const clave = claveDia(new Date(registro.fechaInicio));
      grupos.set(clave, [...(grupos.get(clave) ?? []), registro]);
    }
    return grupos;
  }, [registros]);
  const minutosDia = (dia: Date) => (porDia.get(claveDia(dia)) ?? []).reduce((total, registro) => total + registro.minutos, 0);
  const totalSemana = (registros ?? []).reduce((total, registro) => total + registro.minutos, 0);
  const maximoDia = Math.max(60, ...dias.map(minutosDia));
  const hoy = claveDia(new Date());

  // Totales por tarea / ticket / tiempo libre.
  const porDestino = useMemo(() => {
    const totales = new Map<string, { etiqueta: string; clave: string | null; ruta: string | null; minutos: number }>();
    for (const registro of registros ?? []) {
      const clave = registro.tareaId ?? registro.ticketId ?? `libre:${registro.titulo}`;
      const actual = totales.get(clave) ?? { etiqueta: registro.titulo, clave: registro.clave, ruta: rutaDestino(registro), minutos: 0 };
      actual.minutos += registro.minutos;
      totales.set(clave, actual);
    }
    return [...totales.values()].sort((a, b) => b.minutos - a.minutos);
  }, [registros]);

  function irASemana(fecha: Date | null) {
    setParametros(fecha ? { semana: claveDia(fecha) } : {}, { replace: true });
  }

  async function eliminar(registro: RegistroTiempoDto) {
    const confirmado = await confirmar({
      titulo: 'Eliminar registro',
      descripcion: `Se eliminarán ${formatearDuracion(registro.minutos)} de "${registro.titulo}".${registro.ticketId ? ' También se descuentan del tiempo dedicado del ticket.' : ''}`,
      textoConfirmar: 'Eliminar',
      peligrosa: true,
    });
    if (!confirmado) return;
    try {
      await apiTiempo.eliminar(registro.id);
      notificarCambio();
    } catch (errorEliminacion) {
      notificar.error('No se pudo eliminar', errorEliminacion);
    }
  }

  const etiquetaSemana = `${lunes.toLocaleDateString('es', { day: 'numeric', month: 'short' })} – ${sumarDiasFecha(lunes, 6).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const esEstaSemana = claveDia(inicioSemana(new Date())) === claveDia(lunes);

  return (
    <>
      <EncabezadoPagina
        titulo="Tiempo"
        descripcion="Lo que dedicaste a tareas, tickets y tiempo libre. Arranca el cronómetro desde la barra superior o desde cada tarea y ticket."
        acciones={
          <Boton icono={Plus} onClick={() => setEdicion('nuevo')}>
            Registrar tiempo
          </Boton>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <BotonIcono icono={ChevronLeft} etiqueta="Semana anterior" onClick={() => irASemana(sumarDiasFecha(lunes, -7))} />
        <span className="min-w-48 text-center text-sm font-medium">{etiquetaSemana}</span>
        <BotonIcono icono={ChevronRight} etiqueta="Semana siguiente" onClick={() => irASemana(sumarDiasFecha(lunes, 7))} />
        {!esEstaSemana && (
          <Boton variante="secundario" tamano="sm" onClick={() => irASemana(null)}>
            Esta semana
          </Boton>
        )}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Horas por día */}
        <section className="rounded-2xl border border-borde bg-superficie p-5 shadow-tarjeta">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-medium">Horas por día</h2>
            <span className="text-2xl font-semibold tabular-nums">{formatearHorasDecimales(totalSemana)}</span>
          </div>
          <div className="grid h-40 grid-cols-7 items-end gap-3">
            {dias.map((dia) => {
              const minutos = minutosDia(dia);
              const esHoy = claveDia(dia) === hoy;
              return (
                <div key={claveDia(dia)} className="flex h-full flex-col items-center justify-end gap-1.5">
                  <span className="text-[11px] tabular-nums text-texto-3">{minutos > 0 ? formatearHorasDecimales(minutos) : ''}</span>
                  <div
                    className={unirClases('w-full max-w-12 rounded-t-lg transition-all', esHoy ? 'bg-gradient-to-t from-indigo-400 to-violet-300' : 'bg-indigo-100')}
                    style={{ height: `${Math.max(minutos > 0 ? 4 : 0, (minutos / maximoDia) * 100)}%` }}
                  />
                  <span className={unirClases('text-xs capitalize', esHoy ? 'font-semibold text-indigo-700' : 'text-texto-2')}>
                    {dia.toLocaleDateString('es', { weekday: 'short' }).replace('.', '')}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Por tarea / ticket */}
        <section className="rounded-2xl border border-borde bg-superficie p-5 shadow-tarjeta">
          <h2 className="mb-3 text-sm font-medium">En qué se fue</h2>
          {porDestino.length === 0 ? (
            <p className="text-sm text-texto-3">Sin tiempo registrado esta semana.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {porDestino.slice(0, 6).map((destino) => (
                <li key={`${destino.clave}-${destino.etiqueta}`} className="flex flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-2 text-sm">
                    {destino.ruta ? (
                      <Link to={destino.ruta} className="min-w-0 truncate hover:underline">
                        {destino.clave && <span className="font-mono text-xs text-texto-3">{destino.clave} </span>}
                        {destino.etiqueta}
                      </Link>
                    ) : (
                      <span className="min-w-0 truncate">{destino.etiqueta}</span>
                    )}
                    <span className="shrink-0 text-xs tabular-nums text-texto-2">{formatearDuracion(destino.minutos)}</span>
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-superficie-2">
                    <span className="block h-full rounded-full bg-indigo-300" style={{ width: `${(destino.minutos / Math.max(1, totalSemana)) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Historial */}
      {registros === null ? (
        <Esqueleto className="h-40 rounded-2xl" />
      ) : registros.length === 0 ? (
        <EstadoVacio
          icono={Timer}
          titulo="Sin registros esta semana"
          descripcion="Pulsa ▶ Cronometrar en una tarea o ticket, usa el cronómetro de la barra superior o registra tiempo a mano."
          accion={
            <Boton icono={Plus} onClick={() => setEdicion('nuevo')}>
              Registrar tiempo
            </Boton>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {[...dias].reverse().filter((dia) => porDia.has(claveDia(dia))).map((dia) => (
            <section key={claveDia(dia)} className="flex flex-col gap-2">
              <h3 className="flex items-baseline gap-2 text-sm">
                <span className="font-medium capitalize">{dia.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                <span className="text-xs tabular-nums text-texto-3">{formatearDuracion(minutosDia(dia))}</span>
              </h3>
              <ul className="divide-y divide-borde overflow-hidden rounded-2xl border border-borde bg-superficie shadow-tarjeta">
                {porDia.get(claveDia(dia))!.map((registro) => {
                  const enCurso = registro.fechaFin === null;
                  const ruta = rutaDestino(registro);
                  const IconoDestino = registro.tareaId ? ListChecks : registro.ticketId ? LifeBuoy : Timer;
                  return (
                    <li key={registro.id} className="group flex items-center gap-3 px-4 py-3">
                      <span className="w-28 shrink-0 text-xs tabular-nums text-texto-2">
                        {formatearHoraLocal(registro.fechaInicio)} – {enCurso ? <span className="font-medium text-rose-600">en curso</span> : formatearHoraLocal(registro.fechaFin!)}
                      </span>
                      <IconoDestino className="size-4 shrink-0 text-texto-3" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {registro.clave && <span className="mr-1.5 font-mono text-xs text-texto-3">{registro.clave}</span>}
                          {ruta ? (
                            <Link to={ruta} className="hover:underline">
                              {registro.titulo}
                            </Link>
                          ) : (
                            registro.titulo
                          )}
                        </span>
                        {registro.descripcion && (registro.tareaId || registro.ticketId) && <span className="block truncate text-xs text-texto-3">{registro.descripcion}</span>}
                      </span>
                      <span className="shrink-0 text-sm font-medium tabular-nums">{formatearDuracion(registro.minutos)}</span>
                      <span className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        {!enCurso && <BotonIcono icono={Pencil} etiqueta="Editar registro" tamano="sm" onClick={() => setEdicion(registro)} />}
                        {!(enCurso && activo?.id === registro.id) && (
                          <BotonIcono icono={Trash2} etiqueta="Eliminar registro" tamano="sm" className="hover:text-peligro" onClick={() => void eliminar(registro)} />
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ModalRegistroTiempo
        edicion={edicion}
        alCerrar={() => setEdicion(null)}
        alGuardar={() => {
          setEdicion(null);
          notificarCambio();
        }}
      />
    </>
  );
}

type TipoDestino = 'libre' | 'tarea' | 'ticket';

/** Registro manual o edición de un tramo: fecha, horas, y a qué se imputa (tarea, ticket o tiempo libre). */
function ModalRegistroTiempo({ edicion, alCerrar, alGuardar }: { edicion: RegistroTiempoDto | 'nuevo' | null; alCerrar: () => void; alGuardar: () => void }) {
  const [fecha, setFecha] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [tipo, setTipo] = useState<TipoDestino>('libre');
  const [destino, setDestino] = useState<{ id: string; etiqueta: string } | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!edicion) return;
    setError(null);
    if (edicion === 'nuevo') {
      const ahora = new Date();
      const haceUnaHora = new Date(ahora.getTime() - 60 * 60 * 1000);
      setFecha(claveDia(ahora));
      setDesde(formatearHoraLocal(haceUnaHora.toISOString()));
      setHasta(formatearHoraLocal(ahora.toISOString()));
      setTipo('libre');
      setDestino(null);
      setDescripcion('');
      return;
    }
    const inicio = new Date(edicion.fechaInicio);
    setFecha(claveDia(inicio));
    setDesde(formatearHoraLocal(edicion.fechaInicio));
    setHasta(edicion.fechaFin ? formatearHoraLocal(edicion.fechaFin) : '');
    setTipo(edicion.tareaId ? 'tarea' : edicion.ticketId ? 'ticket' : 'libre');
    setDestino(edicion.tareaId || edicion.ticketId ? { id: (edicion.tareaId ?? edicion.ticketId)!, etiqueta: `${edicion.clave ?? ''} ${edicion.titulo}`.trim() } : null);
    setDescripcion(edicion.descripcion ?? '');
  }, [edicion]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!edicion) return;
    if (tipo !== 'libre' && !destino) {
      setError(tipo === 'tarea' ? 'Elige la tarea.' : 'Elige el ticket.');
      return;
    }
    const inicio = new Date(`${fecha}T${desde}:00`);
    let fin = new Date(`${fecha}T${hasta}:00`);
    // "22:00 – 01:30" cruza la medianoche.
    if (fin <= inicio) fin = sumarDiasFecha(fin, 1);
    const cuerpo: DestinoTiempo & { fechaInicio: string; fechaFin: string } = {
      tareaId: tipo === 'tarea' ? destino!.id : null,
      ticketId: tipo === 'ticket' ? destino!.id : null,
      descripcion: descripcion.trim() || null,
      fechaInicio: inicio.toISOString(),
      fechaFin: fin.toISOString(),
    };
    setEnviando(true);
    setError(null);
    try {
      if (edicion === 'nuevo') await apiTiempo.crear(cuerpo);
      else await apiTiempo.actualizar(edicion.id, cuerpo);
      notificar.exito('Tiempo registrado', formatearDuracion(Math.round((fin.getTime() - inicio.getTime()) / 60000)));
      alGuardar();
    } catch (errorGuardado) {
      setError(obtenerMensajeError(errorGuardado));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      abierto={edicion !== null}
      alCerrar={alCerrar}
      titulo={edicion === 'nuevo' ? 'Registrar tiempo' : 'Editar registro'}
      descripcion="Si es de un ticket, las horas se suman a su tiempo dedicado."
      pie={
        <>
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="formulario-tiempo" cargando={enviando}>
            Guardar
          </Boton>
        </>
      }
    >
      <form id="formulario-tiempo" onSubmit={enviar} className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Campo etiqueta="Fecha">
            <Entrada type="date" required value={fecha} max={claveDia(new Date())} onChange={(evento) => setFecha(evento.target.value)} />
          </Campo>
          <Campo etiqueta="Desde">
            <Entrada type="time" required value={desde} onChange={(evento) => setDesde(evento.target.value)} />
          </Campo>
          <Campo etiqueta="Hasta">
            <Entrada type="time" required value={hasta} onChange={(evento) => setHasta(evento.target.value)} />
          </Campo>
        </div>

        <Campo etiqueta="¿En qué?">
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-superficie-2 p-1 text-sm" role="radiogroup">
            {(
              [
                ['libre', 'Tiempo libre'],
                ['tarea', 'Tarea'],
                ['ticket', 'Ticket'],
              ] as const
            ).map(([valor, etiqueta]) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={tipo === valor}
                onClick={() => {
                  setTipo(valor);
                  setDestino(null);
                }}
                className={unirClases('rounded-md py-1.5', tipo === valor ? 'bg-superficie font-medium shadow-tarjeta' : 'text-texto-2')}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </Campo>

        {tipo !== 'libre' &&
          (destino ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-950">
              <span className="min-w-0 truncate">{destino.etiqueta}</span>
              <BotonIcono icono={X} etiqueta="Cambiar" tamano="sm" onClick={() => setDestino(null)} />
            </div>
          ) : (
            <BuscadorDestino tipo={tipo} alElegir={setDestino} />
          ))}

        <Campo etiqueta={tipo === 'libre' ? 'Descripción' : 'Nota (opcional)'}>
          <Entrada
            required={tipo === 'libre'}
            maxLength={250}
            value={descripcion}
            onChange={(evento) => setDescripcion(evento.target.value)}
            placeholder={tipo === 'libre' ? 'Reunión de planificación' : 'Qué hiciste'}
          />
        </Campo>
        <MensajeError mensaje={error} />
      </form>
    </Modal>
  );
}

function BuscadorDestino({ tipo, alElegir }: { tipo: 'tarea' | 'ticket'; alElegir: (destino: { id: string; etiqueta: string }) => void }) {
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusquedaDto[]>([]);

  useEffect(() => {
    if (termino.trim().length < 2) {
      setResultados([]);
      return;
    }
    const controlador = new AbortController();
    const temporizador = window.setTimeout(() => {
      apiBusqueda
        .buscar(termino.trim(), controlador.signal)
        .then((lista) => setResultados(lista.filter((resultado) => resultado.tipo === (tipo === 'tarea' ? 'Tarea' : 'Ticket')).slice(0, 8)))
        .catch(() => undefined);
    }, 200);
    return () => {
      window.clearTimeout(temporizador);
      controlador.abort();
    };
  }, [termino, tipo]);

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-3" />
        <Entrada autoFocus value={termino} onChange={(evento) => setTermino(evento.target.value)} placeholder={tipo === 'tarea' ? 'Buscar tarea (WEB-105, título…)' : 'Buscar ticket (TCK-1042, asunto…)'} className="pl-9" />
      </div>
      {resultados.length > 0 && (
        <ul className="max-h-48 overflow-y-auto rounded-lg border border-borde">
          {resultados.map((resultado) => (
            <li key={resultado.id}>
              <button
                type="button"
                onClick={() => alElegir({ id: resultado.id, etiqueta: `${resultado.referencia} ${resultado.titulo}` })}
                className="flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm hover:bg-superficie-2"
              >
                <span className="shrink-0 font-mono text-xs text-texto-3">{resultado.referencia}</span>
                <span className="truncate">{resultado.titulo}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
