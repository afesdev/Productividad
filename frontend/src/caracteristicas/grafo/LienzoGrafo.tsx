import { useEffect, useRef } from 'react';
import cytoscape, { type Core, type ElementDefinition, type StylesheetJson } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import type { AristaGrafoDto, NodoGrafoDto } from '../../servicios/tipos';
import { configuracionNodo, grados } from './datosGrafo';

let extensionRegistrada = false;
function registrarExtension() {
  if (extensionRegistrada) return;
  cytoscape.use(fcose);
  extensionRegistrada = true;
}

const recortar = (texto: string, maximo = 32) => (texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto);

function estilos(colorTexto: string, colorFondo: string): StylesheetJson {
  return [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        shape: 'data(forma)' as never,
        width: 'data(tamano)',
        height: 'data(tamano)',
        label: 'data(etiqueta)',
        color: colorTexto,
        'font-size': 10,
        'font-family': 'Inter, system-ui, sans-serif',
        'text-valign': 'bottom',
        'text-margin-y': 4,
        'text-outline-color': colorFondo,
        'text-outline-width': 2,
        // Con poco zoom las etiquetas se ocultan para no saturar; reaparecen al acercarse.
        'min-zoomed-font-size': 7,
        'border-width': 0,
        'transition-property': 'opacity, border-width',
        'transition-duration': 150,
      },
    },
    { selector: 'node[tipo = "Etiqueta"]', style: { 'background-opacity': 0.75 } },
    {
      selector: 'edge',
      style: {
        width: 1.2,
        'line-color': '#a1a1aa',
        opacity: 0.55,
        'curve-style': 'haystack',
        'transition-property': 'opacity',
        'transition-duration': 150,
      },
    },
    { selector: 'edge[tipo = "Etiqueta"]', style: { 'line-style': 'dashed', opacity: 0.35 } },
    { selector: 'edge[tipo = "Sistema"]', style: { 'line-style': 'dotted', 'line-color': '#f59e0b', opacity: 0.45 } },
    { selector: 'edge[tipo = "Relacion"]', style: { 'line-color': '#8b5cf6', width: 1.6 } },
    { selector: 'edge[tipo = "Jerarquia"]', style: { 'line-color': '#10b981', width: 2 } },
    { selector: '.atenuado', style: { opacity: 0.12 } },
    { selector: 'node.resaltado', style: { 'min-zoomed-font-size': 0, 'font-weight': 600 } },
    { selector: 'edge.resaltado', style: { opacity: 0.9, width: 2 } },
    { selector: 'node.seleccionado', style: { 'border-width': 4, 'border-color': '#7c3aed', 'border-opacity': 0.6, 'min-zoomed-font-size': 0, 'font-weight': 700 } },
  ];
}

interface Propiedades {
  nodos: NodoGrafoDto[];
  aristas: AristaGrafoDto[];
  seleccionado: string | null;
  /** Nodo en el que centrar la vista (búsqueda o grafo local). */
  foco?: string | null;
  oscuro: boolean;
  alSeleccionar: (id: string | null) => void;
  alAbrir: (nodo: NodoGrafoDto) => void;
}

/**
 * Lienzo de Cytoscape con disposición de fuerzas (fcose). Pasar el ratón por un nodo resalta sus vecinos;
 * clic selecciona, doble clic abre. Se carga bajo demanda (Cytoscape ya viene con Mermaid).
 */
export default function LienzoGrafo({ nodos, aristas, seleccionado, foco, oscuro, alSeleccionar, alAbrir }: Propiedades) {
  const contenedor = useRef<HTMLDivElement>(null);
  const cy = useRef<Core | null>(null);
  const porId = useRef(new Map<string, NodoGrafoDto>());
  const callbacks = useRef({ alSeleccionar, alAbrir });
  callbacks.current = { alSeleccionar, alAbrir };

  // Crear la instancia una vez.
  useEffect(() => {
    registrarExtension();
    const raiz = getComputedStyle(document.documentElement);
    const instancia = cytoscape({
      container: contenedor.current,
      style: estilos(raiz.getPropertyValue('--color-texto').trim() || '#18181b', raiz.getPropertyValue('--color-superficie').trim() || '#ffffff'),
      minZoom: 0.15,
      maxZoom: 3,
      // Zoom con rueda propio (abajo): `wheelSensitivity` distinto de 1 hace que Cytoscape avise en consola.
      userZoomingEnabled: false,
    });
    const alRodar = (evento: WheelEvent) => {
      evento.preventDefault();
      const caja = contenedor.current!.getBoundingClientRect();
      // Misma fórmula que Cytoscape con sensibilidad 0.25; deltaMode 1 = líneas (Firefox).
      const delta = evento.deltaY * (evento.deltaMode === 1 ? 33 : 1);
      instancia.zoom({
        level: instancia.zoom() * Math.pow(10, (-delta / 250) * 0.25),
        renderedPosition: { x: evento.clientX - caja.left, y: evento.clientY - caja.top },
      });
    };
    contenedor.current!.addEventListener('wheel', alRodar, { passive: false });
    instancia.on('tap', 'node', (evento) => callbacks.current.alSeleccionar(evento.target.id()));
    instancia.on('tap', (evento) => evento.target === instancia && callbacks.current.alSeleccionar(null));
    instancia.on('dbltap', 'node', (evento) => {
      const nodo = porId.current.get(evento.target.id());
      if (nodo) callbacks.current.alAbrir(nodo);
    });
    instancia.on('mouseover', 'node', (evento) => {
      const vecindad = evento.target.closedNeighborhood();
      instancia.elements().not(vecindad).addClass('atenuado');
      vecindad.addClass('resaltado');
      if (contenedor.current) contenedor.current.style.cursor = 'pointer';
    });
    instancia.on('mouseout', 'node', () => {
      instancia.elements().removeClass('atenuado resaltado');
      if (contenedor.current) contenedor.current.style.cursor = '';
    });
    cy.current = instancia;
    const elemento = contenedor.current!;
    return () => {
      elemento.removeEventListener('wheel', alRodar);
      instancia.destroy();
      cy.current = null;
    };
    // Los colores del tema se aplican abajo cuando cambia `oscuro`.
  }, []);

  // Tema (claro/oscuro): solo cambian los colores del texto.
  useEffect(() => {
    const instancia = cy.current;
    if (!instancia) return;
    const raiz = getComputedStyle(document.documentElement);
    instancia.style(estilos(raiz.getPropertyValue('--color-texto').trim() || '#18181b', raiz.getPropertyValue('--color-superficie').trim() || '#ffffff'));
  }, [oscuro]);

  // Datos: reemplazar elementos y recolocar.
  useEffect(() => {
    const instancia = cy.current;
    if (!instancia) return;
    porId.current = new Map(nodos.map((nodo) => [nodo.id, nodo]));
    const grado = grados(aristas);
    const elementos: ElementDefinition[] = [
      ...nodos.map((nodo) => ({
        group: 'nodes' as const,
        data: {
          id: nodo.id,
          tipo: nodo.tipo,
          etiqueta: recortar(nodo.tipo === 'Etiqueta' ? `#${nodo.titulo}` : nodo.titulo),
          color: configuracionNodo[nodo.tipo].color,
          forma: configuracionNodo[nodo.tipo].forma,
          tamano: 12 + Math.min(grado.get(nodo.id) ?? 0, 20) * 1.8,
        },
      })),
      ...aristas.map((arista, indice) => ({ group: 'edges' as const, data: { id: `a${indice}`, source: arista.origen, target: arista.destino, tipo: arista.tipo } })),
    ];
    instancia.elements().remove();
    instancia.add(elementos);
    const disposicion = instancia.layout({
      name: 'fcose',
      quality: nodos.length > 600 ? 'draft' : 'default',
      randomize: true,
      animate: nodos.length < 400,
      animationDuration: 500,
      nodeRepulsion: () => 6500,
      idealEdgeLength: () => 80,
      nodeSeparation: 60,
      packComponents: true,
    } as never);
    disposicion.one('layoutstop', () => {
      const centro = foco ? instancia.getElementById(foco) : null;
      if (centro && centro.nonempty()) instancia.animate({ center: { eles: centro }, zoom: Math.max(instancia.zoom(), 1) }, { duration: 300 });
      else instancia.fit(undefined, 40);
    });
    disposicion.run();
    // `foco` se aplica en su propio efecto cuando cambia sin cambiar los datos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodos, aristas]);

  useEffect(() => {
    const instancia = cy.current;
    if (!instancia) return;
    instancia.nodes().removeClass('seleccionado');
    if (seleccionado) instancia.getElementById(seleccionado).addClass('seleccionado');
  }, [seleccionado, nodos]);

  useEffect(() => {
    const instancia = cy.current;
    if (!instancia || !foco) return;
    const centro = instancia.getElementById(foco);
    if (centro.nonempty()) instancia.animate({ center: { eles: centro }, zoom: Math.max(instancia.zoom(), 1.1) }, { duration: 350 });
  }, [foco]);

  return <div ref={contenedor} className="h-full w-full" />;
}
