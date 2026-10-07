import type { ELK as InstanciaElk } from 'elkjs/lib/elk-api';
import { tamanoPaso, type ConexionFlujo, type DireccionFlujo, type TipoPaso } from './modelo';

// ELK pesa ~1,4 MB: se descarga la primera vez que se ordena, no al abrir el editor.
let elk: Promise<InstanciaElk> | null = null;
const obtenerElk = () => (elk ??= import('elkjs/lib/elk.bundled.js').then(({ default: ELK }) => new ELK()));

/**
 * Coloca los pasos con ELK (algoritmo por capas): de arriba abajo o de izquierda a derecha, con las ramas separadas.
 * Devuelve la esquina superior izquierda de cada paso.
 */
export async function ordenarPasos(
  nodos: { id: string; tipo: TipoPaso }[],
  conexiones: Pick<ConexionFlujo, 'id' | 'origen' | 'destino'>[],
  direccion: DireccionFlujo,
): Promise<Map<string, { x: number; y: number }>> {
  const ids = new Set(nodos.map((nodo) => nodo.id));
  const grafo = await (await obtenerElk()).layout({
    id: 'raiz',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direccion,
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.spacing.nodeNodeBetweenLayers': direccion === 'DOWN' ? '64' : '90',
      'elk.spacing.nodeNode': direccion === 'DOWN' ? '56' : '40',
      'elk.spacing.componentComponent': '80',
    },
    children: nodos.map((nodo) => {
      const { ancho, alto } = tamanoPaso(nodo.tipo);
      return { id: nodo.id, width: ancho, height: alto };
    }),
    edges: conexiones
      .filter((conexion) => ids.has(conexion.origen) && ids.has(conexion.destino))
      .map((conexion) => ({ id: conexion.id, sources: [conexion.origen], targets: [conexion.destino] })),
  });
  return new Map((grafo.children ?? []).map((hijo) => [hijo.id, { x: hijo.x ?? 0, y: hijo.y ?? 0 }]));
}
