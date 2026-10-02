import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, FileText, Loader2 } from 'lucide-react';
import { apiDiario } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import type { DiaDiarioDto } from '../../servicios/tipos';
import { Boton, BotonIcono, unirClases } from '../../componentes/ui/primitivos';
import { MarkdownEnLinea } from './EntradasDelDia';
import { descargarMarkdown, periodoAMarkdown } from './exportarDiario';
import { configuracionTipo, deIso, formatearFechaCorta, formatearHora, hoyIso, sumarDias } from './presentacionDiario';
import { rangoPeriodo } from './VistaRevision';

/** Semana de lunes a domingo en columnas: entradas de cada día, ánimo/energía y si tiene nota. */
export function VistaSemana({ fecha, alCambiar }: { fecha: string; alCambiar: (fecha: string) => void }) {
  const { desde, hasta } = rangoPeriodo('semana', fecha);
  const [dias, setDias] = useState<DiaDiarioDto[] | null>(null);
  const hoy = hoyIso();

  useEffect(() => {
    setDias(null);
    apiDiario
      .rango(desde, hasta)
      .then(setDias)
      .catch((errorCarga) => notificar.error('No se pudo cargar la semana', errorCarga));
  }, [desde, hasta]);

  const porFecha = new Map((dias ?? []).map((dia) => [dia.fecha, dia]));
  const fechas = Array.from({ length: 7 }, (_, indice) => sumarDias(desde, indice));
  const titulo = `${formatearFechaCorta(desde)} – ${formatearFechaCorta(hasta)} ${deIso(hasta).getFullYear()}`;
  const esActual = desde === rangoPeriodo('semana', hoy).desde;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-orange-500">Vista semanal</p>
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <BotonIcono icono={ChevronLeft} etiqueta="Semana anterior" onClick={() => alCambiar(sumarDias(desde, -7))} />
          {!esActual && (
            <Boton variante="secundario" tamano="sm" onClick={() => alCambiar(hoy)}>
              Esta semana
            </Boton>
          )}
          <BotonIcono icono={ChevronRight} etiqueta="Semana siguiente" onClick={() => alCambiar(sumarDias(desde, 7))} />
          <Boton
            variante="secundario"
            tamano="sm"
            icono={Download}
            disabled={!dias}
            className="ml-2"
            onClick={() => dias && descargarMarkdown(`Diario ${desde} a ${hasta}`, periodoAMarkdown(dias, titulo))}
          >
            Exportar .md
          </Boton>
        </div>
      </header>

      {dias === null ? (
        <p className="flex items-center gap-2 py-10 text-sm text-texto-3">
          <Loader2 className="size-4 animate-spin" />
          Cargando la semana…
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {fechas.map((dia) => {
            const registro = porFecha.get(dia);
            const esHoy = dia === hoy;
            return (
              <section
                key={dia}
                className={unirClases('flex min-h-48 flex-col gap-2 rounded-2xl border p-3', esHoy ? 'border-orange-200 bg-orange-50/40' : 'border-borde bg-superficie')}
              >
                <Link to={esHoy ? '/diario' : `/diario/${dia}`} className="flex items-baseline justify-between gap-2 rounded-lg px-1 hover:bg-superficie-2">
                  <span className={unirClases('text-sm font-medium capitalize', esHoy && 'text-orange-700')}>
                    {deIso(dia).toLocaleDateString('es', { weekday: 'short' }).replace('.', '')} {Number(dia.slice(8))}
                  </span>
                  <span className="flex items-center gap-1">
                    {registro?.contenidoMarkdown.trim() && <FileText className="size-3.5 text-texto-3" aria-label="Tiene nota" />}
                    <Puntos valor={registro?.animo ?? null} tono="bg-rose-300" etiqueta="Ánimo" />
                    <Puntos valor={registro?.energia ?? null} tono="bg-amber-300" etiqueta="Energía" />
                  </span>
                </Link>
                {!registro || registro.entradas.length === 0 ? (
                  <p className="px-1 text-xs text-texto-3">{registro?.contenidoMarkdown.trim() ? 'Solo nota' : 'Sin entradas'}</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {registro.entradas.map((entrada) => {
                      const { icono: IconoTipo, recuadro } = configuracionTipo[entrada.tipo];
                      return (
                        <li key={entrada.id} className="flex items-start gap-1.5 text-xs leading-snug">
                          <span className={unirClases('mt-px grid size-4 shrink-0 place-items-center rounded', recuadro)}>
                            <IconoTipo className="size-2.5" />
                          </span>
                          <span className={unirClases('min-w-0 break-words', entrada.tipo === 'Tarea' && entrada.completada && 'text-texto-3 line-through')}>
                            {entrada.horaInicio && <span className="mr-1 tabular-nums text-texto-3">{formatearHora(entrada.horaInicio)}</span>}
                            <MarkdownEnLinea texto={entrada.titulo} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Puntos({ valor, tono, etiqueta }: { valor: number | null; tono: string; etiqueta: string }) {
  if (!valor) return null;
  return (
    <span className="flex gap-px" title={`${etiqueta} ${valor}/5`} aria-label={`${etiqueta} ${valor} de 5`}>
      {[1, 2, 3, 4, 5].map((nivel) => (
        <span key={nivel} className={unirClases('size-1 rounded-full', nivel <= valor ? tono : 'bg-superficie-3')} />
      ))}
    </span>
  );
}
