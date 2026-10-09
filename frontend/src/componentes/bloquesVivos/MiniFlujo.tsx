import { Background, BackgroundVariant, Controls, ReactFlow, ReactFlowProvider, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { leerContenido } from '../../caracteristicas/flujos/modelo';
import { ContextoVistaFlujo, NodoPaso, type NodoPasoFlujo } from '../../caracteristicas/flujos/NodoPaso';

const tiposNodo = { paso: NodoPaso };
const estilo = { strokeWidth: 1.5 };

/**
 * Miniatura de solo lectura de un flujo (sin ELK: usa las posiciones guardadas). No captura la rueda del ratón para no
 * bloquear el desplazamiento del documento; se mueve arrastrando y se acerca con los controles de zoom.
 */
export default function MiniFlujo({ contenidoJson, oscuro }: { contenidoJson: string; oscuro: boolean }) {
  const contenido = leerContenido(contenidoJson);
  const nodos: NodoPasoFlujo[] = contenido.nodos.map((paso) => ({
    id: paso.id,
    type: 'paso',
    position: { x: paso.x, y: paso.y },
    data: { tipo: paso.tipo, titulo: paso.titulo, tecnico: paso.tecnico ?? null, descripcion: paso.descripcion ?? null },
  }));
  const aristas: Edge[] = contenido.conexiones.map((conexion) => ({
    id: conexion.id,
    source: conexion.origen,
    target: conexion.destino,
    label: conexion.etiqueta ?? undefined,
    type: 'smoothstep',
    style: /^(no|error|falla|rechaza)/i.test(conexion.etiqueta ?? '') ? { ...estilo, stroke: 'var(--color-rose-400)' } : estilo,
    labelBgPadding: [6, 3] as [number, number],
    labelBgBorderRadius: 6,
  }));

  return (
    <ContextoVistaFlujo.Provider value={{ direccion: contenido.direccion, modoTecnico: true, recorrido: null }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodos}
          edges={aristas}
          nodeTypes={tiposNodo}
          colorMode={oscuro ? 'dark' : 'light'}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          minZoom={0.1}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          preventScrolling={false}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>
      </ReactFlowProvider>
    </ContextoVistaFlujo.Provider>
  );
}
