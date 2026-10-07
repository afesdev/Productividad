import { createContext, memo, useContext } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { unirClases } from '../../componentes/ui/primitivos';
import { configuracionPaso, tamanoPaso, type DireccionFlujo, type TipoPaso } from './modelo';

export interface DatosPaso extends Record<string, unknown> {
  tipo: TipoPaso;
  titulo: string;
  tecnico?: string | null;
  descripcion?: string | null;
}

export interface EstadoRecorrido {
  actual: string;
  /** Pasos ya recorridos (se ven normales). */
  visitados: ReadonlySet<string>;
  /** Pasos a los que se puede avanzar desde el actual (se ven a medio atenuar). */
  opciones: ReadonlySet<string>;
}

/** Opciones de dibujo comunes a todos los pasos (no se guardan en cada nodo). */
export const ContextoVistaFlujo = createContext<{ direccion: DireccionFlujo; modoTecnico: boolean; recorrido: EstadoRecorrido | null }>({
  direccion: 'DOWN',
  modoTecnico: true,
  recorrido: null,
});

/** En el recorrido: el paso actual resaltado, lo recorrido normal, las siguientes opciones a medias y el resto atenuado. */
function claseRecorrido(recorrido: EstadoRecorrido | null, id: string, rombo = false) {
  if (!recorrido) return '';
  if (recorrido.actual === id)
    return rombo ? 'scale-105 drop-shadow-[0_0_14px_rgba(139,92,246,0.75)]' : 'scale-105 ring-4 ring-violet-400 ring-offset-2 ring-offset-fondo';
  if (recorrido.visitados.has(id)) return '';
  if (recorrido.opciones.has(id)) return 'opacity-70';
  return 'opacity-20 saturate-50';
}

export type NodoPasoFlujo = Node<DatosPaso, 'paso'>;

const claseConector = '!size-2.5 !border-2 !border-superficie !bg-texto-3 transition-opacity';

/** Tarjeta de un paso: icono y tipo, título funcional y, en modo técnico, el dato técnico en monoespaciada. */
function NodoPasoBase({ id, data, selected }: NodeProps<NodoPasoFlujo>) {
  const configuracion = configuracionPaso[data.tipo];
  const Icono = configuracion.icono;
  const { ancho, alto } = tamanoPaso(data.tipo);
  const vista = useContext(ContextoVistaFlujo);
  const vertical = vista.direccion === 'DOWN';
  const tecnico = vista.modoTecnico && data.tecnico;

  const conectores = (
    <>
      <Handle type="target" position={vertical ? Position.Top : Position.Left} className={claseConector} />
      <Handle type="source" position={vertical ? Position.Bottom : Position.Right} className={claseConector} />
    </>
  );

  if (data.tipo === 'validacion') {
    return (
      <div
        className={unirClases('group relative grid place-items-center transition duration-300', claseRecorrido(vista.recorrido, id, true))}
        style={{ width: ancho, height: alto }}
        title={data.descripcion ?? undefined}
      >
        {/* Rombo dibujado con SVG para que el borde siga la forma. */}
        <svg viewBox={`0 0 ${ancho} ${alto}`} className="absolute inset-0 overflow-visible" aria-hidden>
          <polygon
            points={`${ancho / 2},2 ${ancho - 2},${alto / 2} ${ancho / 2},${alto - 2} 2,${alto / 2}`}
            className={unirClases('fill-amber-50 stroke-amber-300 transition-colors', selected && 'stroke-amber-500')}
            strokeWidth={selected ? 2.5 : 1.5}
            strokeLinejoin="round"
          />
        </svg>
        <div className="relative flex max-w-[64%] flex-col items-center gap-0.5 text-center">
          <span className="line-clamp-2 text-xs font-semibold leading-tight text-amber-950">{data.titulo}</span>
          {tecnico && <span className="line-clamp-1 font-mono text-[10px] text-amber-800/80">{data.tecnico}</span>}
        </div>
        {conectores}
      </div>
    );
  }

  if (data.tipo === 'inicio' || data.tipo === 'fin') {
    return (
      <div
        className={unirClases(
          'flex items-center justify-center gap-2 rounded-full border-2 px-4 text-sm font-semibold shadow-tarjeta transition duration-300',
          configuracion.tarjeta,
          data.tipo === 'fin' ? 'text-emerald-800' : 'text-texto-2',
          selected && 'ring-3 ring-violet-200',
          claseRecorrido(vista.recorrido, id),
        )}
        style={{ width: ancho, height: alto }}
        title={data.descripcion ?? undefined}
      >
        <Icono className="size-4 shrink-0" />
        <span className="truncate">{data.titulo}</span>
        {conectores}
      </div>
    );
  }

  return (
    <div
      className={unirClases(
        'flex flex-col justify-center gap-1 rounded-xl border px-3 py-2 shadow-tarjeta transition duration-300',
        configuracion.tarjeta,
        selected && 'ring-3 ring-violet-200',
        claseRecorrido(vista.recorrido, id),
      )}
      style={{ width: ancho, minHeight: alto }}
      title={data.descripcion ?? undefined}
    >
      <span className={unirClases('inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', configuracion.insignia)}>
        <Icono className="size-3" />
        {configuracion.etiqueta}
      </span>
      <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-texto">{data.titulo}</span>
      {tecnico && <span className="truncate font-mono text-[11px] text-texto-2">{data.tecnico}</span>}
      {conectores}
    </div>
  );
}

export const NodoPaso = memo(NodoPasoBase);
