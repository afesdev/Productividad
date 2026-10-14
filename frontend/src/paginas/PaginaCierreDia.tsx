import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Clock,
  FileSpreadsheet,
  Hourglass,
  Plus,
  Timer,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { apiCalendario, apiDiario, apiPreferencias, apiReporte, apiTiempo } from '../servicios/api';
import { notificar } from '../servicios/notificaciones';
import { motivoNoLaborable } from '../servicios/festivosColombia';
import type { ActividadDiaDto, EventoCalendarioDto, FilaReporteDto, RegistroTiempoDto } from '../servicios/tipos';
import { Boton, BotonIcono, EncabezadoPagina, Entrada, Esqueleto, Insignia, unirClases, type Icono } from '../componentes/ui/primitivos';
import { Modal } from '../componentes/ui/Modal';
import { usarConfirmacion } from '../componentes/ui/DialogoConfirmacion';
import { usarSesion } from '../caracteristicas/autenticacion/ContextoSesion';
import { configuracionTipo, hoyIso } from '../caracteristicas/diario/presentacionDiario';
import { descargarArchivo, fechaLocalIso, filasParaExcel, horasExcel, sumarDiasIso, textoEstado, tituloDia } from '../caracteristicas/reporte/utilidadesReporte';
import { guardarUltimoTablero, leerUltimoTablero, SelectorTablero, usarTablerosReporte } from '../caracteristicas/reporte/tablerosReporte';
import {
  ClaveHorario,
  HorarioPorDefecto,
  aHora,
  calcularHuecos,
  duracion,
  intervalosOcupados,
  minutos,
  minutosDeFecha,
  minutosLaborales,
  normalizarHorario,
  pistasDeHueco,
  reunionesSinRegistrar,
  tiemposSinRegistrar,
  type Intervalo,
  type Sugerencia,
  type Tramo,
} from '../caracteristicas/cierre/logicaCierre';

/** Mismas claves que el reporte: el nombre del ejecutor y las reuniones descartadas se comparten. */
const ClaveEjecutor = 'reporte.ejecutor';
const ClaveReunionesDescartadas = 'reporte.reunionesDescartadas';

interface DatosDia {
  filas: FilaReporteDto[];
  eventos: EventoCalendarioDto[];
  registros: RegistroTiempoDto[];
  actividad: ActividadDiaDto | null;
}

type Elemento =
  | { tipo: 'fila'; inicio: number; fila: FilaReporteDto }
  | { tipo: 'sugerencia'; inicio: number; sugerencia: Sugerencia }
  | { tipo: 'hueco'; inicio: number; hueco: Intervalo; pistas: string[] };

/**
 * Cierre del día: lo registrado en el diario, lo que falta (huecos del horario laboral, reuniones y tiempos del
 * cronómetro sin pasar al diario, actividades sin hora de fin o sin tablero) y, al final, entregar el reporte.
 * Todo se calcula en el navegador con datos que ya existen; lo que se añade va al diario.
 */
export function PaginaCierreDia() {
  const { usuario } = usarSesion();
  const confirmar = usarConfirmacion();
  const [parametros, setParametros] = useSearchParams();
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(parametros.get('fecha') ?? '') ? parametros.get('fecha')! : hoyIso();
  const esHoy = fecha === hoyIso();
  // Lunes a viernes no festivos: los fines de semana y festivos de Colombia no tienen horario, así que no hay huecos.
  const noLaborable = motivoNoLaborable(fecha);

  const [datos, setDatos] = useState<DatosDia | null>(null);
  const [horario, setHorario] = useState<Tramo[]>(HorarioPorDefecto);
  const [editandoHorario, setEditandoHorario] = useState(false);
  const [descartadas, setDescartadas] = useState<Set<string>>(() => new Set(leerJson<string[]>(ClaveReunionesDescartadas) ?? []));
  const [procesando, setProcesando] = useState<'copiar' | 'excel' | null>(null);
  const tableros = usarTablerosReporte();

  useEffect(() => {
    apiPreferencias
      .obtener<Tramo[]>(ClaveHorario)
      .then((guardado) => guardado && setHorario(normalizarHorario(guardado)))
      .catch(() => undefined);
  }, []);

  const cargar = useCallback(async () => {
    const inicioDia = fechaLocalIso(fecha);
    const finDia = fechaLocalIso(sumarDiasIso(fecha, 1));
    // Calendario, cronómetro y actividad son extras: si fallan, el cierre sigue con lo del diario.
    const [filas, eventos, registros, actividad] = await Promise.all([
      apiReporte.actividades(fecha, fecha, false),
      apiCalendario
        .conexion()
        .then((estado) => (estado.conectado ? apiCalendario.eventos(inicioDia.toISOString(), finDia.toISOString()) : []))
        .catch(() => [] as EventoCalendarioDto[]),
      apiTiempo.listar(inicioDia, finDia).catch(() => [] as RegistroTiempoDto[]),
      apiDiario.actividad(fecha).catch(() => null),
    ]);
    setDatos({ filas, eventos, registros, actividad });
  }, [fecha]);

  useEffect(() => {
    setDatos(null);
    cargar().catch((error) => {
      notificar.error('No se pudo cargar el día', error);
      setDatos({ filas: [], eventos: [], registros: [], actividad: null });
    });
  }, [cargar]);

  const ahora = esHoy ? minutosDeFecha(new Date()) : null;

  const { elementos, huecos, sugerencias, minutosRegistrados, conAvisos } = useMemo(() => {
    if (!datos) return { elementos: [] as Elemento[], huecos: [] as Intervalo[], sugerencias: [] as Sugerencia[], minutosRegistrados: 0, conAvisos: 0 };
    const ocupados = intervalosOcupados(datos.filas, ahora);
    const sugeridas = [...reunionesSinRegistrar(datos.eventos, datos.filas, fecha, descartadas), ...tiemposSinRegistrar(datos.registros, ocupados, fecha)];
    // Las sugerencias también tapan huecos: ya se sabe qué se hizo ahí, solo falta añadirlo.
    const huecosDia = noLaborable ? [] : calcularHuecos(horario, [...ocupados, ...sugeridas], ahora);
    const lista: Elemento[] = [
      ...datos.filas.map((fila): Elemento => ({ tipo: 'fila', inicio: minutos(fila.horaInicio), fila })),
      ...sugeridas.map((sugerencia): Elemento => ({ tipo: 'sugerencia', inicio: sugerencia.inicio, sugerencia })),
      ...huecosDia.map((hueco): Elemento => ({ tipo: 'hueco', inicio: hueco.inicio, hueco, pistas: pistasDeHueco(hueco, datos.actividad, datos.registros) })),
    ].sort((a, b) => a.inicio - b.inicio);
    return {
      elementos: lista,
      huecos: huecosDia,
      sugerencias: sugeridas,
      minutosRegistrados: Math.round(datos.filas.reduce((total, fila) => total + (fila.horas ?? 0), 0) * 60),
      conAvisos: datos.filas.filter((fila) => !fila.horaFin || !fila.tableroReporteId).length,
    };
  }, [datos, horario, ahora, fecha, descartadas, noLaborable]);

  const pendientes = (datos?.filas ?? []).filter((fila) => !fila.fechaReportado);
  const todoListo = datos !== null && huecos.length === 0 && sugerencias.length === 0 && conAvisos === 0;

  function irA(nueva: string) {
    setParametros(nueva === hoyIso() ? {} : { fecha: nueva }, { replace: true });
  }

  function tableroPorDefecto(): string | null {
    const ultimo = leerUltimoTablero();
    return tableros?.some((tablero) => tablero.id === ultimo && !tablero.estaArchivado) ? ultimo : null;
  }

  async function crearActividad(titulo: string, inicio: number, fin: number, tableroReporteId: string | null) {
    try {
      await apiDiario.crearEntrada(fecha, {
        tipo: 'Evento',
        titulo: titulo.trim().slice(0, 500),
        detalleMarkdown: null,
        horaInicio: `${aHora(inicio)}:00`,
        horaFin: `${aHora(fin)}:00`,
        completada: false,
        tableroReporteId,
      });
      if (tableroReporteId) guardarUltimoTablero(tableroReporteId);
      notificar.exito('Añadida al diario', titulo);
      await cargar();
    } catch (error) {
      notificar.error('No se pudo añadir', error);
    }
  }

  function descartar(sugerencia: Sugerencia) {
    if (sugerencia.origen !== 'reunion') return;
    setDescartadas((actual) => {
      const nueva = new Set([...actual, sugerencia.idOrigen].slice(-300));
      guardarJson(ClaveReunionesDescartadas, [...nueva]);
      return nueva;
    });
  }

  async function guardarHorario(tramos: Tramo[]) {
    const normalizado = normalizarHorario(tramos);
    setHorario(normalizado);
    setEditandoHorario(false);
    try {
      await apiPreferencias.guardar(ClaveHorario, normalizado);
    } catch (error) {
      notificar.error('No se guardó el horario', error);
    }
  }

  const ejecutor = (leerTexto(ClaveEjecutor) ?? '').trim() || usuario?.nombreCompleto || '';

  async function ofrecerMarcar(filas: FilaReporteDto[]) {
    const aceptado = await confirmar({
      titulo: '¿Marcar como reportadas?',
      descripcion: `${filas.length} ${filas.length === 1 ? 'actividad pasa' : 'actividades pasan'} a "reportadas".`,
      textoConfirmar: 'Marcar reportadas',
    });
    if (!aceptado) return;
    try {
      await apiReporte.marcarReportadas(filas.map((fila) => fila.entradaId), true);
      notificar.exito('Día reportado', tituloDia(fecha));
      await cargar();
    } catch (error) {
      notificar.error('No se pudieron marcar', error);
    }
  }

  async function copiar() {
    if (pendientes.length === 0) return;
    setProcesando('copiar');
    try {
      await navigator.clipboard.writeText(filasParaExcel(pendientes, ejecutor));
      notificar.exito(`${pendientes.length} filas copiadas`, 'Pégalas en el Excel de la empresa con Ctrl+V en la primera columna.');
    } catch {
      notificar.error('No se pudo copiar', 'El navegador bloqueó el portapapeles.');
      setProcesando(null);
      return;
    }
    setProcesando(null);
    await ofrecerMarcar(pendientes);
  }

  async function exportar() {
    if (pendientes.length === 0) return;
    if (!ejecutor) {
      notificar.aviso('Falta el ejecutor', 'Escribe tu nombre en Configurar, en el reporte.');
      return;
    }
    setProcesando('excel');
    try {
      const archivo = await apiReporte.excel(
        pendientes.map((fila) => fila.entradaId),
        ejecutor,
      );
      descargarArchivo(archivo, `Actividades ${fecha}.xlsx`);
    } catch (error) {
      notificar.error('No se pudo generar el Excel', error);
      setProcesando(null);
      return;
    }
    setProcesando(null);
    await ofrecerMarcar(pendientes);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <EncabezadoPagina
        titulo="Cierre del día"
        descripcion="Revisa lo que hiciste, completa lo que falta y entrega el reporte."
        acciones={
          <Boton variante="secundario" icono={Clock} onClick={() => setEditandoHorario(true)}>
            Horario
          </Boton>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <BotonIcono icono={ChevronLeft} etiqueta="Día anterior" onClick={() => irA(sumarDiasIso(fecha, -1))} />
        <BotonIcono icono={ChevronRight} etiqueta="Día siguiente" onClick={() => irA(sumarDiasIso(fecha, 1))} disabled={esHoy} />
        <span className="text-base font-semibold first-letter:uppercase">{tituloDia(fecha)}</span>
        {!esHoy && (
          <Boton variante="fantasma" tamano="sm" onClick={() => irA(hoyIso())}>
            Hoy
          </Boton>
        )}
        {noLaborable && <Insignia tono="neutro">{noLaborable === 'Sábado' || noLaborable === 'Domingo' ? noLaborable : `Festivo · ${noLaborable}`}</Insignia>}
        <span className="ml-auto text-xs text-texto-3">
          Horario: lunes a viernes, {horario.map((tramo) => `${tramo.inicio}–${tramo.fin}`).join(' · ')}
        </span>
      </div>

      {!datos ? (
        <div className="flex flex-col gap-2">
          <Esqueleto className="h-20 w-full rounded-xl" />
          {[0, 1, 2, 3, 4].map((indice) => (
            <Esqueleto key={indice} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Cifra
              valor={`${horasExcel(minutosRegistrados / 60)} h`}
              etiqueta={noLaborable ? 'registradas (día no laborable)' : `registradas de ${horasExcel(minutosLaborales(horario) / 60)} h`}
            />
            <Cifra valor={String(huecos.length)} etiqueta={huecos.length === 1 ? 'hueco' : 'huecos'} tono={huecos.length ? 'text-amber-600' : undefined} />
            <Cifra valor={String(sugerencias.length)} etiqueta="sin pasar al diario" tono={sugerencias.length ? 'text-violet-600' : undefined} />
            <Cifra valor={String(conAvisos)} etiqueta="sin fin o sin tablero" tono={conAvisos ? 'text-rose-600' : undefined} />
          </div>

          {noLaborable && (
            <p className="rounded-xl border border-borde bg-superficie-2 px-4 py-3 text-sm text-texto-2">
              {noLaborable === 'Sábado' || noLaborable === 'Domingo' ? `${noLaborable}: ` : `Festivo en Colombia (${noLaborable}): `}
              no se buscan huecos. Si trabajaste, lo que registres aquí se reporta igual.
            </p>
          )}

          {todoListo && datos.filas.length > 0 && (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <CheckCircle2 className="size-4 shrink-0" />
              Día completo: no hay huecos ni pendientes. {pendientes.length ? 'Ya puedes entregar el reporte.' : 'Ya está reportado.'}
            </p>
          )}

          {elementos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-borde-fuerte px-6 py-12 text-center text-sm text-texto-2">
              Nada registrado este día.{' '}
              <Link to={`/diario/${fecha}`} className="font-medium text-acento hover:underline">
                Abrir el diario
              </Link>
            </div>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {elementos.map((elemento) =>
                elemento.tipo === 'fila' ? (
                  <FilaRegistrada key={`f:${elemento.fila.entradaId}`} fila={elemento.fila} alCambiar={() => void cargar()} />
                ) : elemento.tipo === 'sugerencia' ? (
                  <FilaSugerencia
                    key={elemento.sugerencia.clave}
                    sugerencia={elemento.sugerencia}
                    alAnadir={() => void crearActividad(elemento.sugerencia.titulo, elemento.sugerencia.inicio, elemento.sugerencia.fin, tableroPorDefecto())}
                    alDescartar={() => descartar(elemento.sugerencia)}
                  />
                ) : (
                  <FilaHueco
                    key={`h:${elemento.hueco.inicio}`}
                    hueco={elemento.hueco}
                    pistas={elemento.pistas}
                    tableroInicial={tableroPorDefecto()}
                    alRellenar={(titulo, tablero) => crearActividad(titulo, elemento.hueco.inicio, elemento.hueco.fin, tablero)}
                  />
                ),
              )}
            </ol>
          )}

          <footer className="sticky bottom-3 flex flex-wrap items-center gap-2 rounded-xl border border-borde bg-superficie/95 px-4 py-3 shadow-flotante backdrop-blur">
            <span className="text-sm text-texto-2">
              {pendientes.length ? `${pendientes.length} ${pendientes.length === 1 ? 'actividad pendiente' : 'actividades pendientes'} de reportar` : 'Nada pendiente de reportar'}
            </span>
            <Link to={`/reporte?desde=${fecha}&hasta=${fecha}`} className="text-sm text-texto-3 hover:text-texto hover:underline">
              Ver en el reporte
            </Link>
            <span className="ml-auto flex gap-2">
              <Boton variante="secundario" icono={FileSpreadsheet} cargando={procesando === 'excel'} disabled={!pendientes.length} onClick={() => void exportar()}>
                Exportar Excel
              </Boton>
              <Boton icono={ClipboardCopy} cargando={procesando === 'copiar'} disabled={!pendientes.length} onClick={() => void copiar()}>
                Copiar al Excel
              </Boton>
            </span>
          </footer>
        </>
      )}

      <ModalHorario abierto={editandoHorario} horario={horario} alCerrar={() => setEditandoHorario(false)} alGuardar={(tramos) => void guardarHorario(tramos)} />
    </div>
  );
}

// ---------- Filas de la línea de tiempo ----------

function Hora({ inicio, fin }: { inicio: number | string; fin?: number | string | null }) {
  const texto = (valor: number | string) => (typeof valor === 'number' ? aHora(valor) : valor.slice(0, 5));
  return (
    <span className="w-24 shrink-0 font-mono text-xs tabular-nums text-texto-2">
      {texto(inicio)}
      {fin !== undefined && (fin === null ? ' – ?' : ` – ${texto(fin)}`)}
    </span>
  );
}

/** Actividad del diario: se completan aquí la hora de fin y el tablero si faltan. */
function FilaRegistrada({ fila, alCambiar }: { fila: FilaReporteDto; alCambiar: () => void }) {
  const [fin, setFin] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function guardar(cambios: { horaFin?: string; tableroReporteId?: string | null }) {
    setGuardando(true);
    try {
      await apiReporte.actualizarActividad(fila.entradaId, {
        descripcion: fila.descripcion,
        horaInicio: fila.horaInicio,
        horaFin: fila.horaFin,
        tableroReporteId: fila.tableroReporteId,
        fechaSolicitud: fila.fechaSolicitudPersonalizada ? fila.fechaSolicitud : null,
        ...cambios,
      });
      if (cambios.tableroReporteId) guardarUltimoTablero(cambios.tableroReporteId);
      alCambiar();
    } catch (error) {
      notificar.error('No se pudo guardar', error);
    } finally {
      setGuardando(false);
    }
  }

  function guardarFin(evento: FormEvent) {
    evento.preventDefault();
    if (!/^\d{2}:\d{2}$/.test(fin)) return;
    if (minutos(fin) < minutos(fila.horaInicio)) {
      notificar.aviso('Hora no válida', 'La hora de fin no puede ser anterior a la de inicio.');
      return;
    }
    void guardar({ horaFin: `${fin}:00` });
  }

  const completa = !!fila.horaFin && !!fila.tableroReporteId;
  return (
    <li
      className={unirClases(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2 text-sm',
        completa ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50',
        fila.fechaReportado && 'opacity-70',
      )}
    >
      <Hora inicio={fila.horaInicio} fin={fila.horaFin} />
      <span className="min-w-0 flex-1 truncate">
        {fila.descripcionTexto}
        {fila.claveTarea && <span className="ml-1.5 font-mono text-xs text-texto-3">{fila.claveTarea}</span>}
      </span>
      {fila.tipo !== 'Evento' && <Insignia tono="neutro">{configuracionTipo[fila.tipo].etiqueta}</Insignia>}
      {fila.fechaReportado ? (
        <Insignia tono="exito">Reportada</Insignia>
      ) : (
        <span className={unirClases('rounded-md px-1.5 py-0.5 text-[11px] font-medium', fila.estado === 'Terminada' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')}>
          {textoEstado[fila.estado]}
        </span>
      )}
      {(!fila.horaFin || !fila.tableroReporteId) && (
        <div className="flex w-full flex-wrap items-center gap-2 pl-24">
          {!fila.horaFin && (
            <form onSubmit={guardarFin} className="flex items-center gap-1.5">
              <span className="text-xs text-rose-700">Falta la hora de fin:</span>
              <input type="time" value={fin} onChange={(evento) => setFin(evento.target.value)} aria-label="Hora de fin" className="h-7 rounded-md border border-borde bg-superficie px-1.5 text-xs" />
              <Boton type="submit" tamano="sm" variante="secundario" cargando={guardando} disabled={!fin} className="h-7">
                Guardar
              </Boton>
            </form>
          )}
          {!fila.tableroReporteId && (
            <span className="flex items-center gap-1.5">
              <span className="text-xs text-rose-700">Sin tablero:</span>
              <SelectorTablero compacto valor={null} alCambiar={(id) => id && void guardar({ tableroReporteId: id })} className="h-7 w-48" />
            </span>
          )}
        </div>
      )}
    </li>
  );
}

const iconosOrigen: Record<Sugerencia['origen'], Icono> = { reunion: Video, cronometro: Timer };

function FilaSugerencia({ sugerencia, alAnadir, alDescartar }: { sugerencia: Sugerencia; alAnadir: () => void; alDescartar: () => void }) {
  const IconoOrigen = iconosOrigen[sugerencia.origen];
  return (
    <li className="flex items-center gap-3 rounded-lg border border-dashed border-violet-300 bg-violet-50/40 px-3 py-2 text-sm">
      <Hora inicio={sugerencia.inicio} fin={sugerencia.fin} />
      <IconoOrigen className="size-4 shrink-0 text-violet-500" />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{sugerencia.titulo}</span>
        <span className="block text-xs text-texto-3">{sugerencia.detalle}</span>
      </span>
      <Boton tamano="sm" icono={CalendarPlus} onClick={alAnadir}>
        Añadir
      </Boton>
      {sugerencia.origen === 'reunion' && <BotonIcono icono={X} etiqueta="Descartar (no la hice o no se reporta)" tamano="sm" onClick={alDescartar} />}
    </li>
  );
}

/** Tramo del horario sin nada registrado: se rellena con una actividad (descripción sugerida por lo que se tocó en la app). */
function FilaHueco({
  hueco,
  pistas,
  tableroInicial,
  alRellenar,
}: {
  hueco: Intervalo;
  pistas: string[];
  tableroInicial: string | null;
  alRellenar: (titulo: string, tablero: string | null) => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [tablero, setTablero] = useState<string | null>(tableroInicial);
  const [guardando, setGuardando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!titulo.trim()) return;
    setGuardando(true);
    await alRellenar(titulo, tablero);
    setGuardando(false);
  }

  return (
    <li className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm">
      <div className="flex items-center gap-3">
        <Hora inicio={hueco.inicio} fin={hueco.fin} />
        <Hourglass className="size-4 shrink-0 text-amber-600" />
        <span className="min-w-0 flex-1 text-amber-900">
          Hueco de {duracion(hueco.fin - hueco.inicio)} sin registrar
          {pistas.length > 0 && <span className="block truncate text-xs text-amber-800/80">Tocaste: {pistas.join(' · ')}</span>}
        </span>
        {!abierto && (
          <Boton
            tamano="sm"
            variante="secundario"
            icono={Plus}
            onClick={() => {
              setTitulo(pistas[0] ?? '');
              setAbierto(true);
            }}
          >
            Rellenar
          </Boton>
        )}
      </div>
      {abierto && (
        <form onSubmit={enviar} className="mt-2 flex flex-wrap items-center gap-2 pl-24">
          <Entrada
            autoFocus
            value={titulo}
            maxLength={500}
            onChange={(evento) => setTitulo(evento.target.value)}
            placeholder="¿Qué hiciste en este rato?"
            className="h-8 min-w-56 flex-1 text-sm"
          />
          <SelectorTablero compacto valor={tablero} alCambiar={setTablero} className="h-8 w-44" />
          <Boton type="submit" tamano="sm" cargando={guardando} disabled={!titulo.trim()}>
            Añadir
          </Boton>
          <BotonIcono icono={X} etiqueta="Cancelar" tamano="sm" onClick={() => setAbierto(false)} />
          {pistas.length > 1 && (
            <div className="flex w-full flex-wrap gap-1">
              {pistas.map((pista) => (
                <button
                  key={pista}
                  type="button"
                  onClick={() => setTitulo(pista)}
                  className="rounded-full border border-amber-200 bg-superficie px-2 py-0.5 text-xs text-amber-900 transition hover:border-amber-400"
                >
                  {pista}
                </button>
              ))}
            </div>
          )}
        </form>
      )}
    </li>
  );
}

function Cifra({ valor, etiqueta, tono }: { valor: string; etiqueta: string; tono?: string }) {
  return (
    <div className="rounded-xl bg-superficie-2 px-3.5 py-2.5">
      <p className={unirClases('text-xl font-semibold tabular-nums', tono)}>{valor}</p>
      <p className="text-xs text-texto-2">{etiqueta}</p>
    </div>
  );
}

// ---------- Horario ----------

function ModalHorario({ abierto, horario, alCerrar, alGuardar }: { abierto: boolean; horario: Tramo[]; alCerrar: () => void; alGuardar: (tramos: Tramo[]) => void }) {
  const [tramos, setTramos] = useState<Tramo[]>(horario);
  useEffect(() => {
    if (abierto) setTramos(horario);
  }, [abierto, horario]);

  const cambiar = (indice: number, campo: keyof Tramo, valor: string) => setTramos((actual) => actual.map((tramo, otro) => (otro === indice ? { ...tramo, [campo]: valor } : tramo)));
  const invalido = tramos.some((tramo) => !tramo.inicio || !tramo.fin || minutos(tramo.fin) <= minutos(tramo.inicio));

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Horario laboral"
      descripcion="Los huecos se buscan dentro de estos tramos, de lunes a viernes. Lo que queda fuera (como el almuerzo), los fines de semana y los festivos de Colombia no cuentan."
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton disabled={invalido || tramos.length === 0} onClick={() => alGuardar(tramos)}>
            Guardar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        {tramos.map((tramo, indice) => (
          <div key={indice} className="flex items-center gap-2">
            <input type="time" value={tramo.inicio} onChange={(evento) => cambiar(indice, 'inicio', evento.target.value)} aria-label="Inicio" className="h-9 rounded-lg border border-borde bg-superficie px-2 text-sm" />
            <span className="text-texto-3">a</span>
            <input type="time" value={tramo.fin} onChange={(evento) => cambiar(indice, 'fin', evento.target.value)} aria-label="Fin" className="h-9 rounded-lg border border-borde bg-superficie px-2 text-sm" />
            <BotonIcono icono={Trash2} etiqueta="Quitar tramo" tamano="sm" disabled={tramos.length === 1} onClick={() => setTramos((actual) => actual.filter((_, otro) => otro !== indice))} />
          </div>
        ))}
        <Boton variante="fantasma" tamano="sm" icono={Plus} className="self-start" onClick={() => setTramos((actual) => [...actual, { inicio: '18:00', fin: '19:00' }])}>
          Añadir tramo
        </Boton>
        {invalido && (
          <p className="flex items-center gap-1.5 text-xs text-peligro">
            <AlertTriangle className="size-3.5" /> Cada tramo debe terminar después de empezar.
          </p>
        )}
      </div>
    </Modal>
  );
}

// ---------- Almacenamiento local ----------

function leerTexto(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function leerJson<T>(clave: string): T | null {
  try {
    return JSON.parse(leerTexto(clave) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

function guardarJson(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Solo se pierde que la reunión siga descartada.
  }
}

