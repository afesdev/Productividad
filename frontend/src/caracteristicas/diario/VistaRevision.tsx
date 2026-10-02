import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BatteryMedium, CalendarCheck, ChevronLeft, ChevronRight, CircleCheck, ClipboardCopy, Download, Heart, LifeBuoy, Loader2, Timer } from 'lucide-react';
import { apiDiario } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import type { EntradaExploradaDto, RevisionDiarioDto, TipoEntradaDiario } from '../../servicios/tipos';
import { Boton, BotonIcono, unirClases, type Icono } from '../../componentes/ui/primitivos';
import { formatearDuracion, formatearHorasDecimales } from '../tiempo/presentacionTiempo';
import { TarjetaEntrada } from './EntradasDelDia';
import { descargarMarkdown, periodoAMarkdown } from './exportarDiario';
import { aIso, configuracionTipo, deIso, formatearFechaCorta, hoyIso, sumarDias } from './presentacionDiario';

export type PeriodoRevision = 'semana' | 'mes';

/** Primer y último día (incluido) del periodo que contiene la fecha. Semanas de lunes a domingo. */
export function rangoPeriodo(periodo: PeriodoRevision, fecha: string): { desde: string; hasta: string } {
  const dia = deIso(fecha);
  if (periodo === 'mes') {
    return { desde: aIso(new Date(dia.getFullYear(), dia.getMonth(), 1)), hasta: aIso(new Date(dia.getFullYear(), dia.getMonth() + 1, 0)) };
  }
  const desde = sumarDias(fecha, -((dia.getDay() + 6) % 7));
  return { desde, hasta: sumarDias(desde, 6) };
}

/** Revisión de la semana o del mes: horas, ánimo, decisiones, aprendizajes y bloqueos. Se puede copiar como Markdown. */
export function VistaRevision({ periodo, fecha, alCambiar }: { periodo: PeriodoRevision; fecha: string; alCambiar: (periodo: PeriodoRevision, fecha: string) => void }) {
  const { desde, hasta } = rangoPeriodo(periodo, fecha);
  const [revision, setRevision] = useState<RevisionDiarioDto | null>(null);

  useEffect(() => {
    setRevision(null);
    apiDiario
      .revision(desde, hasta)
      .then(setRevision)
      .catch((errorCarga) => notificar.error('No se pudo cargar la revisión', errorCarga));
  }, [desde, hasta]);

  const mover = (delta: number) => {
    const base = deIso(desde);
    alCambiar(periodo, periodo === 'mes' ? aIso(new Date(base.getFullYear(), base.getMonth() + delta, 1)) : sumarDias(desde, 7 * delta));
  };
  const titulo =
    periodo === 'mes'
      ? deIso(desde).toLocaleDateString('es', { month: 'long', year: 'numeric' })
      : `${formatearFechaCorta(desde)} – ${formatearFechaCorta(hasta)} ${deIso(hasta).getFullYear()}`;
  const esActual = desde === rangoPeriodo(periodo, hoyIso()).desde;

  async function copiarMarkdown() {
    if (!revision) return;
    await navigator.clipboard.writeText(aMarkdown(revision, titulo));
    notificar.exito('Resumen copiado', 'Pégalo en tu reporte, correo o nota');
  }

  /** Todas las notas y entradas del periodo en un .md (para Obsidian o archivo). */
  async function exportar() {
    try {
      const dias = await apiDiario.rango(desde, hasta);
      descargarMarkdown(`Diario ${desde} a ${hasta}`, periodoAMarkdown(dias, titulo));
    } catch (errorExportacion) {
      notificar.error('No se pudo exportar', errorExportacion);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-orange-500">Revisión {periodo === 'mes' ? 'mensual' : 'semanal'}</p>
          <h1 className="text-2xl font-semibold tracking-tight first-letter:uppercase">{titulo}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <div className="mr-2 grid grid-cols-2 gap-1 rounded-lg bg-superficie-2 p-1 text-sm">
            {(['semana', 'mes'] as const).map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => alCambiar(opcion, fecha)}
                className={unirClases('rounded-md px-3 py-1', periodo === opcion ? 'bg-superficie font-medium shadow-tarjeta' : 'text-texto-2')}
              >
                {opcion === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
          <BotonIcono icono={ChevronLeft} etiqueta="Periodo anterior" onClick={() => mover(-1)} />
          {!esActual && (
            <Boton variante="secundario" tamano="sm" onClick={() => alCambiar(periodo, hoyIso())}>
              Actual
            </Boton>
          )}
          <BotonIcono icono={ChevronRight} etiqueta="Periodo siguiente" onClick={() => mover(1)} />
          <Boton variante="secundario" tamano="sm" icono={ClipboardCopy} disabled={!revision} onClick={() => void copiarMarkdown()} className="ml-2">
            Copiar resumen
          </Boton>
          <Boton variante="secundario" tamano="sm" icono={Download} onClick={() => void exportar()}>
            Exportar .md
          </Boton>
        </div>
      </header>

      {revision === null ? (
        <p className="flex items-center gap-2 py-10 text-sm text-texto-3">
          <Loader2 className="size-4 animate-spin" />
          Preparando la revisión…
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Indicador icono={Timer} tono="bg-indigo-100 text-indigo-500" etiqueta="Horas registradas" valor={formatearHorasDecimales(revision.minutosRegistrados)} />
            <Indicador icono={CalendarCheck} tono="bg-orange-100 text-orange-500" etiqueta="Días escritos" valor={`${revision.diasConRegistro} / ${revision.dias.length}`} />
            <Indicador icono={CircleCheck} tono="bg-violet-100 text-violet-500" etiqueta="Tareas completadas" valor={String(revision.tareasCompletadas)} detalle={`${revision.tareasCreadas} creadas`} />
            <Indicador icono={LifeBuoy} tono="bg-rose-100 text-rose-500" etiqueta="Tickets trabajados" valor={String(revision.ticketsTrabajados)} detalle={`${revision.ticketsCerrados} cerrados`} />
            <Indicador icono={Heart} tono="bg-pink-100 text-pink-500" etiqueta="Ánimo promedio" valor={revision.animoPromedio?.toLocaleString('es') ?? '—'} detalle="de 5" />
            <Indicador icono={BatteryMedium} tono="bg-amber-100 text-amber-600" etiqueta="Energía promedio" valor={revision.energiaPromedio?.toLocaleString('es') ?? '—'} detalle="de 5" />
          </div>

          <GraficoDias revision={revision} periodo={periodo} />

          <TendenciaAnimo revision={revision} />

          <div className="grid gap-4 lg:grid-cols-3">
            <ListaTipo tipo="Decision" entradas={revision.decisiones} />
            <ListaTipo tipo="Aprendizaje" entradas={revision.aprendizajes} />
            <ListaTipo tipo="Bloqueo" entradas={revision.bloqueos} />
          </div>

          <section className="rounded-2xl border border-borde bg-superficie p-5">
            <h2 className="mb-3 text-sm font-medium">En qué se fue el tiempo</h2>
            {revision.topTiempo.length === 0 ? (
              <p className="text-sm text-texto-3">Sin tiempo registrado en el periodo.</p>
            ) : (
              <ul className="grid gap-2.5 md:grid-cols-2">
                {revision.topTiempo.map((total) => (
                  <li key={`${total.clave}-${total.titulo}`} className="flex flex-col gap-1">
                    <span className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">
                        {total.clave && <span className="font-mono text-xs text-texto-3">{total.clave} </span>}
                        {total.titulo}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-texto-2">{formatearDuracion(total.minutos)}</span>
                    </span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-superficie-2">
                      <span className="block h-full rounded-full bg-indigo-300" style={{ width: `${(total.minutos / Math.max(1, revision.minutosRegistrados)) * 100}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {revision.tareasDiarioCompletadas + revision.tareasDiarioPendientes > 0 && (
              <p className="mt-4 border-t border-borde pt-3 text-xs text-texto-2">
                Checklist del diario: <strong className="font-medium">{revision.tareasDiarioCompletadas}</strong> completadas ·{' '}
                <strong className="font-medium">{revision.tareasDiarioPendientes}</strong> pendientes
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Indicador({ icono: IconoIndicador, tono, etiqueta, valor, detalle }: { icono: Icono; tono: string; etiqueta: string; valor: string; detalle?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-borde bg-superficie p-4">
      <span className={unirClases('grid size-8 place-items-center rounded-lg', tono)}>
        <IconoIndicador className="size-4" />
      </span>
      <span className="text-2xl font-semibold tabular-nums">{valor}</span>
      <span className="text-xs text-texto-2">
        {etiqueta}
        {detalle && <span className="text-texto-3"> · {detalle}</span>}
      </span>
    </div>
  );
}

/** Barras de horas por día con el ánimo (rosa) y la energía (ámbar) como puntos de 1 a 5. */
function GraficoDias({ revision, periodo }: { revision: RevisionDiarioDto; periodo: PeriodoRevision }) {
  const maximo = Math.max(60, ...revision.dias.map((dia) => dia.minutos));
  const hoy = hoyIso();
  return (
    <section className="rounded-2xl border border-borde bg-superficie p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Día a día</h2>
        <span className="flex items-center gap-3 text-xs text-texto-3">
          <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-indigo-300" />Horas</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-rose-400" />Ánimo</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-400" />Energía</span>
        </span>
      </div>
      <div className={unirClases('grid h-44 items-end gap-1', periodo === 'mes' ? 'grid-cols-[repeat(31,minmax(0,1fr))]' : 'grid-cols-7 gap-3')}>
        {revision.dias.map((dia) => (
          <Link
            key={dia.fecha}
            to={dia.fecha === hoy ? '/diario' : `/diario/${dia.fecha}`}
            title={`${formatearFechaCorta(dia.fecha)} · ${formatearDuracion(dia.minutos)}${dia.animo ? ` · ánimo ${dia.animo}` : ''}${dia.energia ? ` · energía ${dia.energia}` : ''}`}
            className="group flex h-full flex-col items-center justify-end gap-1"
          >
            <span className="relative flex w-full flex-1 items-end justify-center">
              {/* Ánimo y energía sobre la misma escala vertical (1-5). */}
              {dia.animo && <span className="absolute left-1/2 size-1.5 -translate-x-[120%] rounded-full bg-rose-400" style={{ bottom: `${(dia.animo / 5) * 100}%` }} />}
              {dia.energia && <span className="absolute left-1/2 size-1.5 translate-x-[20%] rounded-full bg-amber-400" style={{ bottom: `${(dia.energia / 5) * 100}%` }} />}
              <span
                className={unirClases('w-full max-w-10 rounded-t-md transition group-hover:opacity-80', dia.fecha === hoy ? 'bg-indigo-400' : 'bg-indigo-200')}
                style={{ height: `${dia.minutos > 0 ? Math.max(3, (dia.minutos / maximo) * 100) : 0}%` }}
              />
            </span>
            <span className={unirClases('text-[10px] tabular-nums', dia.entradas > 0 ? 'font-medium text-texto-2' : 'text-texto-3')}>
              {periodo === 'mes' ? Number(dia.fecha.slice(8)) : deIso(dia.fecha).toLocaleDateString('es', { weekday: 'short' }).replace('.', '')}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ListaTipo({ tipo, entradas }: { tipo: TipoEntradaDiario; entradas: EntradaExploradaDto[] }) {
  const { icono: IconoTipo, plural, recuadro } = configuracionTipo[tipo];
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-borde bg-superficie p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <span className={unirClases('grid size-6 place-items-center rounded-md', recuadro)}>
          <IconoTipo className="size-3.5" />
        </span>
        {plural}
        <span className="ml-auto text-xs tabular-nums text-texto-3">{entradas.length}</span>
      </h2>
      {entradas.length === 0 ? (
        <p className="text-xs text-texto-3">Ninguno en este periodo.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-borde">
          {entradas.map(({ fecha, entrada }) => (
            <li key={entrada.id} className="py-2">
              <Link to={`/diario/${fecha}`} className="text-[11px] text-texto-3 hover:underline">
                {formatearFechaCorta(fecha)}
              </Link>
              <TarjetaEntrada entrada={entrada} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Resumen en Markdown para pegar en un reporte semanal o en una nota de Obsidian. */
function aMarkdown(revision: RevisionDiarioDto, titulo: string): string {
  const lista = (entradas: EntradaExploradaDto[]) =>
    entradas.length === 0 ? '- (ninguno)' : entradas.map(({ fecha, entrada }) => `- ${entrada.titulo}${entrada.detalleMarkdown ? ` — ${entrada.detalleMarkdown.replace(/\n+/g, ' ')}` : ''} _(${formatearFechaCorta(fecha)})_`).join('\n');
  const lineas: string[] = [
    `# Revisión: ${titulo}`,
    '',
    `- **Horas registradas:** ${formatearHorasDecimales(revision.minutosRegistrados)}`,
    `- **Tareas completadas:** ${revision.tareasCompletadas} (creadas: ${revision.tareasCreadas})`,
    `- **Tickets trabajados:** ${revision.ticketsTrabajados} (cerrados: ${revision.ticketsCerrados})`,
    `- **Ánimo / energía promedio:** ${revision.animoPromedio ?? '—'} / ${revision.energiaPromedio ?? '—'}`,
    '',
    '## Decisiones',
    lista(revision.decisiones),
    '',
    '## Aprendizajes',
    lista(revision.aprendizajes),
    '',
    '## Bloqueos',
    lista(revision.bloqueos),
    '',
    '## Tiempo',
    revision.topTiempo.length === 0 ? '- (sin registros)' : revision.topTiempo.map((total) => `- ${total.clave ? `${total.clave} ` : ''}${total.titulo}: ${formatearDuracion(total.minutos)}`).join('\n'),
    '',
  ];
  return lineas.join('\n');
}

/**
 * Líneas de ánimo (rosa) y energía (ámbar) de 1 a 5 a lo largo del periodo.
 * Los días sin valor cortan la línea en lugar de inventar un dato.
 */
function TendenciaAnimo({ revision }: { revision: RevisionDiarioDto }) {
  const ancho = 700;
  const alto = 160;
  const margen = { izquierda: 24, derecha: 8, arriba: 10, abajo: 22 };
  const pasos = Math.max(1, revision.dias.length - 1);
  const x = (indice: number) => margen.izquierda + (indice / pasos) * (ancho - margen.izquierda - margen.derecha);
  const y = (valor: number) => margen.arriba + ((5 - valor) / 4) * (alto - margen.arriba - margen.abajo);
  const hayDatos = revision.dias.some((dia) => dia.animo || dia.energia);

  /** Tramos continuos de días con valor, como puntos "x,y" para <polyline>. */
  const tramos = (valores: (number | null)[]) => {
    const resultado: string[][] = [];
    let actual: string[] = [];
    valores.forEach((valor, indice) => {
      if (valor) actual.push(`${x(indice)},${y(valor)}`);
      else if (actual.length > 0) {
        resultado.push(actual);
        actual = [];
      }
    });
    if (actual.length > 0) resultado.push(actual);
    return resultado;
  };

  const series = [
    { nombre: 'Ánimo', color: '#fb7185', valores: revision.dias.map((dia) => dia.animo) },
    { nombre: 'Energía', color: '#fbbf24', valores: revision.dias.map((dia) => dia.energia) },
  ];
  const etiquetaCada = revision.dias.length > 14 ? 5 : 1;

  return (
    <section className="rounded-2xl border border-borde bg-superficie p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Tendencia de ánimo y energía</h2>
        <span className="flex items-center gap-3 text-xs text-texto-3">
          {series.map((serie) => (
            <span key={serie.nombre} className="flex items-center gap-1">
              <span className="h-0.5 w-3 rounded-full" style={{ background: serie.color }} />
              {serie.nombre}
            </span>
          ))}
        </span>
      </div>
      {!hayDatos ? (
        <p className="py-6 text-sm text-texto-3">Marca ánimo y energía en la nota del día para ver aquí su evolución.</p>
      ) : (
        <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-44 w-full" role="img" aria-label="Evolución del ánimo y la energía, escala de 1 a 5">
          {[1, 2, 3, 4, 5].map((nivel) => (
            <g key={nivel}>
              <line x1={margen.izquierda} x2={ancho - margen.derecha} y1={y(nivel)} y2={y(nivel)} stroke="#f4f4f5" strokeWidth={1} />
              <text x={margen.izquierda - 8} y={y(nivel) + 3} textAnchor="end" className="fill-texto-3 text-[10px]">
                {nivel}
              </text>
            </g>
          ))}
          {series.map((serie) => (
            <g key={serie.nombre}>
              {tramos(serie.valores).map((puntos, indice) =>
                puntos.length > 1 ? (
                  <polyline key={indice} points={puntos.join(' ')} fill="none" stroke={serie.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                ) : null,
              )}
              {serie.valores.map((valor, indice) => (valor ? <circle key={indice} cx={x(indice)} cy={y(valor)} r={3.5} fill="var(--color-superficie)" stroke={serie.color} strokeWidth={2} /> : null))}
            </g>
          ))}
          {revision.dias.map((dia, indice) =>
            indice % etiquetaCada === 0 ? (
              <text key={dia.fecha} x={x(indice)} y={alto - 6} textAnchor="middle" className="fill-texto-3 text-[10px]">
                {revision.dias.length > 7 ? Number(dia.fecha.slice(8)) : deIso(dia.fecha).toLocaleDateString('es', { weekday: 'short' }).replace('.', '')}
              </text>
            ) : null,
          )}
        </svg>
      )}
    </section>
  );
}
