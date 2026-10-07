import { ArrowLeft, ArrowRight, CircleCheck, RotateCcw, X } from 'lucide-react';
import type { Edge } from '@xyflow/react';
import { VistaMarkdown } from '../../componentes/VistaMarkdown';
import { Boton, BotonIcono, unirClases } from '../../componentes/ui/primitivos';
import { configuracionPaso, type DireccionFlujo } from './modelo';
import type { DatosPaso, NodoPasoFlujo } from './NodoPaso';

export interface OpcionRecorrido {
  destino: string;
  etiqueta: string;
  /** Rama negativa (No, Error…): se pinta en rojo suave. */
  negativa: boolean;
}

const esNegativa = (texto: string) => /^(no|error|falla|rechaza)/i.test(texto.trim());

/** Salidas de un paso, en el orden en que se ven en el diagrama (izquierda→derecha o arriba→abajo). */
export function opcionesDe(id: string, aristas: Edge[], nodos: NodoPasoFlujo[], direccion: DireccionFlujo): OpcionRecorrido[] {
  const porId = new Map(nodos.map((nodo) => [nodo.id, nodo]));
  return aristas
    .filter((arista) => arista.source === id && porId.has(arista.target))
    .sort((a, b) => {
      const pa = porId.get(a.target)!.position;
      const pb = porId.get(b.target)!.position;
      return direccion === 'DOWN' ? pa.x - pb.x || pa.y - pb.y : pa.y - pb.y || pa.x - pb.x;
    })
    .map((arista) => {
      const etiqueta = typeof arista.label === 'string' && arista.label.trim() ? arista.label.trim() : porId.get(arista.target)!.data.titulo;
      return { destino: arista.target, etiqueta, negativa: typeof arista.label === 'string' && esNegativa(arista.label) };
    });
}

/**
 * Paso inicial: el seleccionado si hay uno; si no, un "inicio" sin entradas o el primer paso sin entradas
 * (el de más arriba o más a la izquierda según la dirección).
 */
export function pasoInicial(nodos: NodoPasoFlujo[], aristas: Edge[], direccion: DireccionFlujo): string | null {
  const seleccionado = nodos.filter((nodo) => nodo.selected);
  if (seleccionado.length === 1) return seleccionado[0].id;
  const conEntrada = new Set(aristas.map((arista) => arista.target));
  const raices = nodos.filter((nodo) => !conEntrada.has(nodo.id));
  const candidatos = raices.length > 0 ? raices : nodos;
  const orden = (a: NodoPasoFlujo, b: NodoPasoFlujo) =>
    (a.data.tipo === 'inicio' ? -1 : 0) - (b.data.tipo === 'inicio' ? -1 : 0) ||
    (direccion === 'DOWN' ? a.position.y - b.position.y || a.position.x - b.position.x : a.position.x - b.position.x || a.position.y - b.position.y);
  return [...candidatos].sort(orden)[0]?.id ?? null;
}

/** Tarjeta flotante del recorrido: el paso actual con su detalle y los botones para avanzar por cada rama. */
export function TarjetaRecorrido({
  paso,
  numero,
  opciones,
  alElegir,
  alVolver,
  alReiniciar,
  alSalir,
}: {
  paso: DatosPaso;
  numero: number;
  opciones: OpcionRecorrido[];
  alElegir: (destino: string) => void;
  alVolver: (() => void) | null;
  alReiniciar: () => void;
  alSalir: () => void;
}) {
  const configuracion = configuracionPaso[paso.tipo];
  const Icono = configuracion.icono;
  const final = opciones.length === 0;

  return (
    <div className="flex w-[min(34rem,calc(100vw-2rem))] flex-col gap-3 rounded-2xl border border-borde bg-superficie p-4 shadow-flotante" role="region" aria-label="Recorrido del flujo">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium tabular-nums text-texto-3">Paso {numero}</span>
        <span className={unirClases('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold', configuracion.insignia)}>
          <Icono className="size-3" />
          {configuracion.etiqueta}
        </span>
        <BotonIcono icono={X} etiqueta="Salir del recorrido (Esc)" tamano="sm" onClick={alSalir} className="ml-auto" />
      </div>

      <div>
        <p className="text-base font-semibold leading-snug">{paso.titulo}</p>
        {paso.tecnico && <p className="mt-1 break-all font-mono text-xs text-texto-2">{paso.tecnico}</p>}
      </div>
      {paso.descripcion && (
        <div className="max-h-40 overflow-y-auto rounded-lg bg-fondo px-3 py-2">
          <VistaMarkdown contenido={paso.descripcion} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-borde pt-3">
        <Boton variante="fantasma" tamano="sm" icono={ArrowLeft} disabled={!alVolver} onClick={() => alVolver?.()} title="Paso anterior (←)">
          Anterior
        </Boton>
        <div className="ml-auto flex flex-wrap justify-end gap-2">
          {final ? (
            <>
              <span className={unirClases('inline-flex items-center gap-1.5 text-sm font-medium', paso.tipo === 'error' ? 'text-rose-700' : 'text-emerald-700')}>
                <CircleCheck className="size-4" />
                {paso.tipo === 'error' ? 'El proceso termina con error' : 'Fin del recorrido'}
              </span>
              <Boton variante="secundario" tamano="sm" icono={RotateCcw} onClick={alReiniciar}>
                Reiniciar
              </Boton>
            </>
          ) : opciones.length === 1 ? (
            <Boton tamano="sm" onClick={() => alElegir(opciones[0].destino)} title="Siguiente (→ o Enter)">
              Siguiente
              <ArrowRight className="size-4" />
            </Boton>
          ) : (
            opciones.map((opcion, indice) => (
              <button
                key={opcion.destino}
                type="button"
                onClick={() => alElegir(opcion.destino)}
                title={`Tecla ${indice + 1}`}
                className={unirClases(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors',
                  opcion.negativa ? 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100' : 'border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100',
                )}
              >
                <kbd className="rounded bg-white/70 px-1 font-sans text-[10px] text-texto-3">{indice + 1}</kbd>
                {opcion.etiqueta}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
