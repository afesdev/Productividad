import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarPlus,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  FileSpreadsheet,
  Loader2,
  NotebookPen,
  RotateCcw,
  Settings2,
  Video,
  X,
} from 'lucide-react';
import { apiCalendario, apiDiario, apiReporte } from '../servicios/api';
import { notificar } from '../servicios/notificaciones';
import type { DatosFilaReporte, EventoCalendarioDto, FilaReporteDto } from '../servicios/tipos';
import { Boton, BotonIcono, EncabezadoPagina, EstadoVacio, Esqueleto, Insignia, unirClases } from '../componentes/ui/primitivos';
import { usarConfirmacion } from '../componentes/ui/DialogoConfirmacion';
import { usarSesion } from '../caracteristicas/autenticacion/ContextoSesion';
import { aIso, hoyIso, normalizarHora } from '../caracteristicas/diario/presentacionDiario';
import { fechaLocal } from '../caracteristicas/calendario/utilidadesCalendario';
import { ModalConfiguracionReporte } from '../caracteristicas/reporte/ModalConfiguracionReporte';
import { leerUltimoTablero, SelectorTablero, usarTablerosReporte } from '../caracteristicas/reporte/tablerosReporte';
import {
  avisosFila,
  desplazarAncla,
  descargarArchivo,
  fechaLocalIso,
  filasParaExcel,
  horasExcel,
  rangoDePeriodo,
  sumarDiasIso,
  textoEstado,
  tituloDia,
  tituloPeriodo,
  type Periodo,
} from '../caracteristicas/reporte/utilidadesReporte';

const periodos: { valor: Periodo; etiqueta: string }[] = [
  { valor: 'dia', etiqueta: 'Día' },
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'mes', etiqueta: 'Mes' },
  { valor: 'rango', etiqueta: 'Rango' },
];

const ClaveEjecutor = 'reporte.ejecutor';
const ClaveReunionesDescartadas = 'reporte.reunionesDescartadas';

function leerLocal(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function escribirLocal(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // Solo se pierde la preferencia.
  }
}

/** Reunión del calendario que aún no está en el diario. */
interface ReunionSugerida {
  evento: EventoCalendarioDto;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

const horaLocal = (fecha: Date) => `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}:00`;
const minutosDe = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));

export function PaginaReporte() {
  const { usuario } = usarSesion();
  const confirmar = usarConfirmacion();
  const [parametros, setParametros] = useSearchParams();
  const desdeUrl = parametros.get('desde');
  const hastaUrl = parametros.get('hasta');

  const [periodo, setPeriodo] = useState<Periodo>(desdeUrl ? (desdeUrl === hastaUrl ? 'dia' : 'rango') : 'semana');
  const [ancla, setAncla] = useState(desdeUrl ?? hoyIso());
  const [rangoLibre, setRangoLibre] = useState({ desde: desdeUrl ?? hoyIso(), hasta: hastaUrl ?? desdeUrl ?? hoyIso() });
  // Si se llega desde el diario ("Reportar este día") se muestra todo el día, también lo ya reportado.
  const [soloPendientes, setSoloPendientes] = useState(!desdeUrl);
  const [ejecutor, setEjecutor] = useState(() => leerLocal(ClaveEjecutor) ?? '');
  const [configurando, setConfigurando] = useState(parametros.get('configurar') === '1');

  const [filas, setFilas] = useState<FilaReporteDto[] | null>(null);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [reuniones, setReuniones] = useState<ReunionSugerida[]>([]);
  const [descartadas, setDescartadas] = useState<Set<string>>(() => new Set(JSON.parse(leerLocal(ClaveReunionesDescartadas) ?? '[]') as string[]));
  const [procesando, setProcesando] = useState<'copiar' | 'excel' | 'marcar' | null>(null);
  const tableros = usarTablerosReporte();

  const { desde, hasta } = periodo === 'rango' ? rangoLibre : rangoDePeriodo(periodo, ancla);
  const ejecutorEfectivo = ejecutor.trim() || usuario?.nombreCompleto || '';

  const cargar = useCallback(async () => {
    try {
      const resultado = await apiReporte.actividades(desde, hasta, soloPendientes);
      setFilas(resultado);
      // Por defecto se seleccionan las pendientes de reportar.
      setSeleccion(new Set(resultado.filter((fila) => !fila.fechaReportado).map((fila) => fila.entradaId)));
    } catch (error) {
      notificar.error('No se pudo cargar el reporte', error);
      setFilas([]);
    }
  }, [desde, hasta, soloPendientes]);

  useEffect(() => {
    setFilas(null);
    void cargar();
  }, [cargar]);

  // Reuniones del calendario de Teams del rango (si está conectado) que no tienen entrada en el diario.
  useEffect(() => {
    const control = new AbortController();
    setReuniones([]);
    const inicioRango = fechaLocalIso(desde);
    const finRango = fechaLocalIso(sumarDiasIso(hasta, 1));
    // El calendario admite hasta 62 días por consulta.
    if (finRango.getTime() - inicioRango.getTime() > 62 * 86_400_000) return;
    apiCalendario
      .conexion()
      .then((estado) => (estado.conectado ? apiCalendario.eventos(inicioRango.toISOString(), finRango.toISOString(), false, control.signal) : []))
      .then((eventos) =>
        setReuniones(
          eventos
            .filter((evento) => !evento.todoElDia && !evento.cancelado && evento.disponibilidad !== 'Libre')
            .map((evento) => {
              const inicio = fechaLocal(evento.inicio);
              const fin = fechaLocal(evento.fin);
              return { evento, fecha: aIso(inicio), horaInicio: horaLocal(inicio), horaFin: aIso(fin) === aIso(inicio) ? horaLocal(fin) : '23:59:00' };
            }),
        ),
      )
      .catch(() => undefined);
    return () => control.abort();
  }, [desde, hasta]);

  const sugeridasPorDia = useMemo(() => {
    const mapa = new Map<string, ReunionSugerida[]>();
    for (const reunion of reuniones) {
      if (descartadas.has(reunion.evento.id)) continue;
      // Ya registrada si hay una actividad ese día que empieza a menos de 10 min o con el mismo título.
      const yaEsta = (filas ?? []).some(
        (fila) =>
          fila.fecha === reunion.fecha &&
          (Math.abs(minutosDe(fila.horaInicio) - minutosDe(reunion.horaInicio)) <= 10 || fila.descripcionTexto.trim().toLowerCase() === reunion.evento.titulo.trim().toLowerCase()),
      );
      if (!yaEsta) mapa.set(reunion.fecha, [...(mapa.get(reunion.fecha) ?? []), reunion]);
    }
    return mapa;
  }, [reuniones, filas, descartadas]);

  const dias = useMemo(() => {
    const fechas = new Set([...(filas ?? []).map((fila) => fila.fecha), ...sugeridasPorDia.keys()]);
    return [...fechas].sort();
  }, [filas, sugeridasPorDia]);

  const seleccionadas = useMemo(() => (filas ?? []).filter((fila) => seleccion.has(fila.entradaId)), [filas, seleccion]);
  const totalHoras = (filas ?? []).reduce((total, fila) => total + (fila.horas ?? 0), 0);
  const conAvisos = (filas ?? []).filter((fila) => avisosFila(fila).length > 0).length;

  function cambiarPeriodo(nuevo: Periodo) {
    if (nuevo === 'rango') setRangoLibre({ desde, hasta });
    setPeriodo(nuevo);
    if (parametros.has('desde')) setParametros({}, { replace: true });
  }

  function cambiarEjecutor(nombre: string) {
    setEjecutor(nombre);
    escribirLocal(ClaveEjecutor, nombre);
  }

  function reemplazarFila(nueva: FilaReporteDto) {
    setFilas((actuales) => actuales?.map((fila) => (fila.entradaId === nueva.entradaId ? nueva : fila)) ?? null);
  }

  function alternar(id: string) {
    setSeleccion((actual) => {
      const nueva = new Set(actual);
      if (nueva.has(id)) nueva.delete(id);
      else nueva.add(id);
      return nueva;
    });
  }

  async function ofrecerMarcar(filasEntregadas: FilaReporteDto[]) {
    const pendientes = filasEntregadas.filter((fila) => !fila.fechaReportado);
    if (pendientes.length === 0) return;
    const aceptado = await confirmar({
      titulo: '¿Marcar como reportadas?',
      descripcion: `${pendientes.length} ${pendientes.length === 1 ? 'actividad pasa' : 'actividades pasan'} a "reportadas" y dejarán de salir en "Solo pendientes".`,
      textoConfirmar: 'Marcar reportadas',
    });
    if (aceptado) await marcar(pendientes.map((fila) => fila.entradaId), true);
  }

  async function marcar(ids: string[], reportadas: boolean) {
    setProcesando('marcar');
    try {
      const cantidad = await apiReporte.marcarReportadas(ids, reportadas);
      notificar.exito(reportadas ? `${cantidad} marcadas como reportadas` : `${cantidad} vuelven a pendientes`);
      await cargar();
    } catch (error) {
      notificar.error('No se pudieron marcar', error);
    } finally {
      setProcesando(null);
    }
  }

  function revisarAvisos(lista: FilaReporteDto[]) {
    const problemas = lista.filter((fila) => avisosFila(fila).length > 0).length;
    if (problemas > 0) notificar.aviso(`${problemas} ${problemas === 1 ? 'fila tiene' : 'filas tienen'} avisos`, 'Sin tablero o sin hora de fin: revísalas en el Excel.');
    if (!ejecutorEfectivo) notificar.aviso('Falta el ejecutor', 'Escribe tu nombre en Configurar.');
  }

  async function copiar() {
    if (seleccionadas.length === 0) return;
    setProcesando('copiar');
    try {
      await navigator.clipboard.writeText(filasParaExcel(seleccionadas, ejecutorEfectivo));
      notificar.exito(`${seleccionadas.length} filas copiadas`, 'Pégalas en el Excel de la empresa con Ctrl+V en la primera columna.');
      revisarAvisos(seleccionadas);
    } catch {
      notificar.error('No se pudo copiar', 'El navegador bloqueó el portapapeles.');
      setProcesando(null);
      return;
    }
    setProcesando(null);
    await ofrecerMarcar(seleccionadas);
  }

  async function exportar() {
    if (seleccionadas.length === 0) return;
    if (!ejecutorEfectivo) {
      notificar.aviso('Falta el ejecutor', 'Escribe tu nombre en Configurar.');
      setConfigurando(true);
      return;
    }
    setProcesando('excel');
    try {
      const archivo = await apiReporte.excel(
        seleccionadas.map((fila) => fila.entradaId),
        ejecutorEfectivo,
      );
      const primera = seleccionadas[0].fecha;
      const ultima = seleccionadas[seleccionadas.length - 1].fecha;
      descargarArchivo(archivo, primera === ultima ? `Actividades ${primera}.xlsx` : `Actividades ${primera} a ${ultima}.xlsx`);
      revisarAvisos(seleccionadas);
    } catch (error) {
      notificar.error('No se pudo generar el Excel', error);
      setProcesando(null);
      return;
    }
    setProcesando(null);
    await ofrecerMarcar(seleccionadas);
  }

  async function anadirReunion(reunion: ReunionSugerida) {
    const ultimo = leerUltimoTablero();
    const tablero = tableros?.some((opcion) => opcion.id === ultimo && !opcion.estaArchivado) ? ultimo : null;
    try {
      await apiDiario.crearEntrada(reunion.fecha, {
        tipo: 'Evento',
        titulo: reunion.evento.titulo.slice(0, 500),
        detalleMarkdown: null,
        horaInicio: reunion.horaInicio,
        horaFin: reunion.horaFin,
        completada: false,
        tableroReporteId: tablero,
      });
      notificar.exito('Reunión añadida al diario');
      await cargar();
    } catch (error) {
      notificar.error('No se pudo añadir la reunión', error);
    }
  }

  function descartarReunion(id: string) {
    setDescartadas((actual) => {
      // Solo se recuerdan las últimas 300 para no crecer sin límite.
      const nueva = new Set([...actual, id].slice(-300));
      escribirLocal(ClaveReunionesDescartadas, JSON.stringify([...nueva]));
      return nueva;
    });
  }

  const todasSeleccionadas = (filas?.length ?? 0) > 0 && seleccion.size === filas?.length;

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        titulo="Reporte de actividades"
        descripcion="Lo registrado en el diario con hora, listo para el Excel de la empresa."
        acciones={
          <Boton variante="secundario" icono={Settings2} onClick={() => setConfigurando(true)}>
            Configurar
          </Boton>
        }
      />

      {/* Periodo y filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg bg-superficie-2 p-0.5 text-sm" role="tablist" aria-label="Periodo">
          {periodos.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              role="tab"
              aria-selected={periodo === opcion.valor}
              onClick={() => cambiarPeriodo(opcion.valor)}
              className={unirClases(
                'h-8 rounded-md px-3 font-medium transition-colors',
                periodo === opcion.valor ? 'bg-superficie text-texto shadow-tarjeta' : 'text-texto-2 hover:text-texto',
              )}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>

        {periodo === 'rango' ? (
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={rangoLibre.desde}
              max={rangoLibre.hasta}
              onChange={(evento) => evento.target.value && setRangoLibre({ ...rangoLibre, desde: evento.target.value })}
              className="h-9 rounded-lg border border-borde bg-superficie px-2 shadow-tarjeta"
              aria-label="Desde"
            />
            <span className="text-texto-3">a</span>
            <input
              type="date"
              value={rangoLibre.hasta}
              min={rangoLibre.desde}
              onChange={(evento) => evento.target.value && setRangoLibre({ ...rangoLibre, hasta: evento.target.value })}
              className="h-9 rounded-lg border border-borde bg-superficie px-2 shadow-tarjeta"
              aria-label="Hasta"
            />
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <BotonIcono icono={ChevronLeft} etiqueta="Anterior" tamano="sm" onClick={() => setAncla(desplazarAncla(periodo, ancla, -1))} />
            <BotonIcono icono={ChevronRight} etiqueta="Siguiente" tamano="sm" onClick={() => setAncla(desplazarAncla(periodo, ancla, 1))} />
            <span className="ml-1 text-sm font-semibold first-letter:uppercase">{tituloPeriodo(periodo, desde, hasta)}</span>
            <Boton variante="fantasma" tamano="sm" onClick={() => setAncla(hoyIso())} className="ml-1">
              Hoy
            </Boton>
          </div>
        )}

        <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-sm text-texto-2">
          <input type="checkbox" checked={soloPendientes} onChange={(evento) => setSoloPendientes(evento.target.checked)} className="size-4 accent-violet-600" />
          Solo pendientes de reportar
        </label>
      </div>

      {/* Resumen y acciones */}
      {filas && filas.length > 0 && (
        <div className="sticky top-14 z-20 -mx-1 flex flex-wrap items-center gap-3 rounded-xl border border-borde bg-superficie/95 px-3 py-2 shadow-tarjeta backdrop-blur">
          <span className="text-sm">
            <span className="font-semibold tabular-nums">{filas.length}</span> actividades ·{' '}
            <span className="font-semibold tabular-nums">{horasExcel(totalHoras)}</span> h
          </span>
          {conAvisos > 0 && (
            <Insignia tono="aviso" icono={AlertTriangle}>
              {conAvisos} con avisos
            </Insignia>
          )}
          <span className="text-xs text-texto-3">{seleccionadas.length} seleccionadas</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Boton
              variante="fantasma"
              tamano="sm"
              icono={CheckCheck}
              disabled={seleccionadas.length === 0 || procesando !== null}
              onClick={() => void marcar(seleccionadas.map((fila) => fila.entradaId), true)}
            >
              Marcar reportadas
            </Boton>
            {seleccionadas.some((fila) => fila.fechaReportado) && (
              <Boton
                variante="fantasma"
                tamano="sm"
                icono={RotateCcw}
                disabled={procesando !== null}
                onClick={() => void marcar(seleccionadas.filter((fila) => fila.fechaReportado).map((fila) => fila.entradaId), false)}
              >
                Volver a pendientes
              </Boton>
            )}
            <Boton variante="secundario" tamano="sm" icono={FileSpreadsheet} cargando={procesando === 'excel'} disabled={seleccionadas.length === 0 || procesando !== null} onClick={() => void exportar()}>
              Descargar .xlsx
            </Boton>
            <Boton tamano="sm" icono={ClipboardCopy} cargando={procesando === 'copiar'} disabled={seleccionadas.length === 0 || procesando !== null} onClick={() => void copiar()}>
              Copiar para Excel
            </Boton>
          </div>
        </div>
      )}

      {/* Tabla */}
      {filas === null ? (
        <div className="flex flex-col gap-2">
          <Esqueleto className="h-10 w-full" />
          <Esqueleto className="h-10 w-full" />
          <Esqueleto className="h-10 w-full" />
        </div>
      ) : dias.length === 0 ? (
        <EstadoVacio
          icono={NotebookPen}
          titulo={soloPendientes ? 'Nada pendiente de reportar' : 'Sin actividades con hora'}
          descripcion="El reporte sale de las entradas del diario que tienen hora de inicio (por ejemplo «e: 10-11 web config»)."
          accion={
            <Link to={`/diario/${hasta > hoyIso() ? hoyIso() : hasta}`} className="text-sm font-medium text-violet-700 hover:underline">
              Ir al diario
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-borde bg-superficie shadow-tarjeta">
          <table className="w-full min-w-[64rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-borde bg-fondo text-left text-[11px] font-medium uppercase tracking-wide text-texto-3">
                <th className="w-9 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todas"
                    checked={todasSeleccionadas}
                    onChange={() => setSeleccion(todasSeleccionadas ? new Set() : new Set(filas.map((fila) => fila.entradaId)))}
                    className="size-4 accent-violet-600"
                  />
                </th>
                <th className="w-32 px-2 py-2">F. solicitud</th>
                <th className="w-24 px-2 py-2">Inicio</th>
                <th className="w-24 px-2 py-2">Fin</th>
                <th className="px-2 py-2">Descripción</th>
                <th className="w-48 px-2 py-2">Tablero</th>
                <th className="w-32 px-2 py-2">Estado</th>
                <th className="w-16 px-2 py-2 text-right">Horas</th>
              </tr>
            </thead>
            {dias.map((dia) => {
              const delDia = (filas ?? []).filter((fila) => fila.fecha === dia);
              const sugeridas = sugeridasPorDia.get(dia) ?? [];
              const horasDia = delDia.reduce((total, fila) => total + (fila.horas ?? 0), 0);
              return (
                <tbody key={dia} className="border-b border-borde last:border-b-0">
                  <tr className="bg-superficie-2/50">
                    <td colSpan={8} className="px-3 py-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold first-letter:uppercase">{tituloDia(dia)}</span>
                        <span className="text-xs tabular-nums text-texto-3">{horasExcel(horasDia)} h</span>
                        <Link to={`/diario/${dia}`} className="ml-auto text-xs text-texto-3 hover:text-violet-700 hover:underline">
                          Abrir en el diario
                        </Link>
                      </div>
                    </td>
                  </tr>
                  {delDia.map((fila) => (
                    <FilaActividad key={fila.entradaId} fila={fila} seleccionada={seleccion.has(fila.entradaId)} alAlternar={() => alternar(fila.entradaId)} alGuardar={reemplazarFila} />
                  ))}
                  {sugeridas.map((reunion) => (
                    <tr key={reunion.evento.id} className="text-texto-3">
                      <td className="px-3 py-1.5">
                        <CalendarPlus className="size-4 text-violet-400" aria-hidden />
                      </td>
                      <td className="px-2 py-1.5 text-xs">Reunión</td>
                      <td className="px-2 py-1.5 tabular-nums">{reunion.horaInicio.slice(0, 5)}</td>
                      <td className="px-2 py-1.5 tabular-nums">{reunion.horaFin.slice(0, 5)}</td>
                      <td className="px-2 py-1.5" colSpan={3}>
                        <span className="inline-flex items-center gap-1.5 italic">
                          <Video className="size-3.5 shrink-0" />
                          {reunion.evento.titulo}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex justify-end gap-1">
                          <Boton variante="secundario" tamano="sm" onClick={() => void anadirReunion(reunion)}>
                            Añadir
                          </Boton>
                          <BotonIcono icono={X} etiqueta="Descartar sugerencia" tamano="sm" onClick={() => descartarReunion(reunion.evento.id)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      )}

      <ModalConfiguracionReporte abierto={configurando} alCerrar={() => setConfigurando(false)} ejecutor={ejecutor || usuario?.nombreCompleto || ''} alCambiarEjecutor={cambiarEjecutor} />
    </div>
  );
}

/** Fila editable: cada cambio se guarda en la entrada del diario (texto y horas al salir del campo; listas al elegir). */
function FilaActividad({
  fila,
  seleccionada,
  alAlternar,
  alGuardar,
}: {
  fila: FilaReporteDto;
  seleccionada: boolean;
  alAlternar: () => void;
  alGuardar: (fila: FilaReporteDto) => void;
}) {
  // Se edita el texto sin Markdown; si se cambia, la entrada del diario queda con ese texto plano.
  const [descripcion, setDescripcion] = useState(fila.descripcionTexto);
  const [inicio, setInicio] = useState(fila.horaInicio.slice(0, 5));
  const [fin, setFin] = useState(fila.horaFin?.slice(0, 5) ?? '');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setDescripcion(fila.descripcionTexto);
    setInicio(fila.horaInicio.slice(0, 5));
    setFin(fila.horaFin?.slice(0, 5) ?? '');
  }, [fila]);

  async function guardar(cambios: Partial<DatosFilaReporte>) {
    const datos: DatosFilaReporte = {
      descripcion: fila.descripcion,
      horaInicio: fila.horaInicio,
      horaFin: fila.horaFin,
      tableroReporteId: fila.tableroReporteId,
      fechaSolicitud: fila.fechaSolicitudPersonalizada ? fila.fechaSolicitud : null,
      estado: fila.estado,
      ...cambios,
    };
    setGuardando(true);
    try {
      alGuardar(await apiReporte.actualizarActividad(fila.entradaId, datos));
    } catch (error) {
      notificar.error('No se pudo guardar', error);
      setDescripcion(fila.descripcionTexto);
      setInicio(fila.horaInicio.slice(0, 5));
      setFin(fila.horaFin?.slice(0, 5) ?? '');
    } finally {
      setGuardando(false);
    }
  }

  function guardarHoras() {
    const horaInicio = normalizarHora(inicio);
    const horaFin = fin ? normalizarHora(fin) : null;
    if (!horaInicio || (fin && !horaFin)) {
      notificar.aviso('Hora no válida', 'Usa el formato HH:mm.');
      return;
    }
    if (horaInicio === fila.horaInicio && horaFin === fila.horaFin) return;
    void guardar({ horaInicio, horaFin });
  }

  const avisos = avisosFila(fila);
  const claseCampo = 'h-8 w-full rounded-md border border-transparent bg-transparent px-2 transition hover:border-borde focus:border-acento focus:bg-superficie focus:outline-none';

  return (
    <tr className={unirClases('group border-t border-borde/60 align-middle', fila.fechaReportado && 'text-texto-2', seleccionada ? 'bg-violet-50/40' : 'hover:bg-superficie-2/40')}>
      <td className="px-3 py-1">
        <input type="checkbox" checked={seleccionada} onChange={alAlternar} aria-label={`Seleccionar ${fila.descripcionTexto}`} className="size-4 accent-violet-600" />
      </td>
      <td className="px-1 py-1">
        <input
          type="date"
          value={fila.fechaSolicitud}
          max={fila.fecha}
          onChange={(evento) => evento.target.value && evento.target.value !== fila.fechaSolicitud && void guardar({ fechaSolicitud: evento.target.value })}
          title={fila.fechaSolicitudPersonalizada ? 'Fecha de solicitud elegida' : 'Por defecto: creación de la tarea o el día de la actividad'}
          className={unirClases(claseCampo, 'text-xs tabular-nums', !fila.fechaSolicitudPersonalizada && 'text-texto-3')}
        />
      </td>
      <td className="px-1 py-1">
        <input type="time" value={inicio} onChange={(evento) => setInicio(evento.target.value)} onBlur={guardarHoras} className={unirClases(claseCampo, 'tabular-nums')} aria-label="Hora inicio" />
      </td>
      <td className="px-1 py-1">
        <input
          type="time"
          value={fin}
          onChange={(evento) => setFin(evento.target.value)}
          onBlur={guardarHoras}
          aria-label="Hora fin"
          className={unirClases(claseCampo, 'tabular-nums', !fila.horaFin && 'border-amber-300 bg-amber-50')}
        />
      </td>
      <td className="px-1 py-1">
        <div className="flex items-center gap-1.5">
          <input
            value={descripcion}
            maxLength={500}
            onChange={(evento) => setDescripcion(evento.target.value)}
            onBlur={() => descripcion.trim() && descripcion.trim() !== fila.descripcionTexto && void guardar({ descripcion: descripcion.trim() })}
            onKeyDown={(evento) => evento.key === 'Enter' && evento.currentTarget.blur()}
            aria-label="Descripción"
            className={claseCampo}
          />
          {fila.claveTarea && <Insignia tono="neutro">{fila.claveTarea}</Insignia>}
          {fila.fechaReportado && (
            <Insignia tono="exito" icono={CheckCheck}>
              Reportada
            </Insignia>
          )}
          {guardando && <Loader2 className="size-3.5 shrink-0 animate-spin text-texto-3" />}
        </div>
      </td>
      <td className="px-1 py-1">
        <div className="flex items-center gap-1">
          <SelectorTablero
            compacto
            valor={fila.tableroReporteId}
            alCambiar={(id) => void guardar({ tableroReporteId: id })}
            className={unirClases('max-w-none flex-1', avisos.includes('Sin tablero') && 'border-amber-300 bg-amber-50')}
          />
          {fila.tableroSugerido && (
            <span className="text-[10px] font-medium uppercase text-violet-600" title="Sugerido por el proyecto de la tarea; elige uno para fijarlo">
              sug.
            </span>
          )}
        </div>
      </td>
      <td className="px-1 py-1">
        <select
          value={fila.estado}
          onChange={(evento) => void guardar({ estado: evento.target.value as DatosFilaReporte['estado'] })}
          aria-label="Estado"
          className={unirClases(
            'h-7 w-full rounded-lg border px-2 text-xs font-medium focus:outline-none',
            fila.estado === 'Terminada' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800',
          )}
        >
          <option value="Terminada">{textoEstado.Terminada}</option>
          <option value="EnProceso">{textoEstado.EnProceso}</option>
        </select>
      </td>
      <td className="px-3 py-1 text-right font-medium tabular-nums">{fila.horas === null ? <span className="text-amber-600">—</span> : horasExcel(fila.horas)}</td>
    </tr>
  );
}
