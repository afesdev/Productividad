import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ResumenDiaDiarioDto, TipoEntradaDiario } from '../../servicios/tipos';
import { BotonIcono, unirClases } from '../../componentes/ui/primitivos';
import { aIso, configuracionTipo, hoyIso } from './presentacionDiario';

const diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Tipos presentes en el día, en orden fijo, para pintar sus puntos. */
function tiposDelDia(resumen: ResumenDiaDiarioDto): TipoEntradaDiario[] {
  const tipos: [TipoEntradaDiario, number][] = [
    ['Evento', resumen.eventos],
    ['Tarea', resumen.tareas],
    ['Decision', resumen.decisiones],
    ['Aprendizaje', resumen.aprendizajes],
    ['Bloqueo', resumen.bloqueos],
    ['Nota', resumen.notas],
  ];
  return tipos.filter(([, cantidad]) => cantidad > 0).map(([tipo]) => tipo);
}

/**
 * Mes con semanas de lunes a domingo. Cada día con registro muestra un punto por tipo de entrada
 * y un subrayado si tiene nota escrita.
 */
export function CalendarioMes({
  anio,
  mes,
  resumenes,
  seleccionada,
  alElegirDia,
  alCambiarMes,
}: {
  anio: number;
  /** 1-12 */
  mes: number;
  resumenes: ResumenDiaDiarioDto[];
  seleccionada: string | null;
  alElegirDia: (fecha: string) => void;
  alCambiarMes: (anio: number, mes: number) => void;
}) {
  const hoy = hoyIso();
  const primerDia = new Date(anio, mes - 1, 1);
  const desplazamiento = (primerDia.getDay() + 6) % 7; // lunes = 0
  const diasEnMes = new Date(anio, mes, 0).getDate();
  const porFecha = new Map(resumenes.map((resumen) => [resumen.fecha, resumen]));
  const celdas: (string | null)[] = [
    ...Array.from({ length: desplazamiento }, () => null),
    ...Array.from({ length: diasEnMes }, (_, indice) => aIso(new Date(anio, mes - 1, indice + 1))),
  ];

  const moverMes = (delta: number) => {
    const destino = new Date(anio, mes - 1 + delta, 1);
    alCambiarMes(destino.getFullYear(), destino.getMonth() + 1);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold capitalize">{primerDia.toLocaleDateString('es', { month: 'long', year: 'numeric' })}</span>
        <span className="flex">
          <BotonIcono icono={ChevronLeft} etiqueta="Mes anterior" tamano="sm" onClick={() => moverMes(-1)} />
          <BotonIcono icono={ChevronRight} etiqueta="Mes siguiente" tamano="sm" onClick={() => moverMes(1)} />
        </span>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {diasSemana.map((dia) => (
          <span key={dia} className="py-1 text-[11px] font-medium text-texto-3">
            {dia}
          </span>
        ))}
        {celdas.map((fecha, indice) => {
          if (!fecha) return <span key={`vacio-${indice}`} />;
          const resumen = porFecha.get(fecha);
          const tipos = resumen ? tiposDelDia(resumen) : [];
          const elegida = fecha === seleccionada;
          const esHoy = fecha === hoy;
          return (
            <button
              key={fecha}
              type="button"
              onClick={() => alElegirDia(fecha)}
              aria-label={fecha}
              aria-current={elegida ? 'date' : undefined}
              className={unirClases(
                'flex h-10 flex-col items-center justify-center gap-0.5 rounded-lg text-[13px] tabular-nums transition',
                elegida ? 'bg-superficie font-semibold text-texto shadow-tarjeta' : 'text-texto-2 hover:bg-superficie/70',
                esHoy && !elegida && 'font-semibold text-violet-700',
                fecha > hoy && !resumen && 'text-texto-3',
              )}
            >
              <span className={unirClases(resumen?.tieneNota && 'underline decoration-violet-300 decoration-2 underline-offset-2')}>{Number(fecha.slice(8))}</span>
              <span className="flex h-1.5 gap-0.5">
                {tipos.slice(0, 4).map((tipo) => (
                  <span key={tipo} className={unirClases('size-1.5 rounded-full', configuracionTipo[tipo].punto)} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
