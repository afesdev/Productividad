import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useUpdateNodeInternals,
  type Connection,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowDownToLine, ArrowRightToLine, Code2, Copy, Download, FileCode2, FileImage, FileText, Link2, MousePointerClick, Play, Redo2, Sparkles, Square, Undo2 } from 'lucide-react';
import { apiFlujos } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import { BotonIcono, unirClases } from '../../componentes/ui/primitivos';
import { usarConfirmacion } from '../../componentes/ui/DialogoConfirmacion';
import { MenuAcciones } from '../documentos/MenuAcciones';
import { aMermaid, exportarImagen } from './exportarFlujo';
import { opcionesDe, pasoInicial, TarjetaRecorrido } from './RecorridoFlujo';
import { ordenarPasos } from './disposicion';
import {
  configuracionPaso,
  escribirContenido,
  leerContenido,
  nuevoId,
  tamanoPaso,
  tiposPaso,
  type ContenidoFlujo,
  type DireccionFlujo,
  type TipoPaso,
} from './modelo';
import { ContextoVistaFlujo, NodoPaso, type DatosPaso, type EstadoRecorrido, type NodoPasoFlujo } from './NodoPaso';
import { ModalGenerarIA, PanelConexion, PanelPaso, PanelTexto } from './PanelesFlujo';
import { aTexto, interpretarTexto } from './sintaxis';

export type EstadoGuardadoFlujo = 'guardado' | 'pendiente' | 'guardando' | 'error';

const RetrasoAutoguardado = 800;
const RetrasoHistorial = 400;
const MaximoHistorial = 100;
const TipoArrastre = 'application/x-flujo-paso';
const ClaveModoTecnico = 'flujos.modoTecnico';

const tiposNodo = { paso: NodoPaso };

const opcionesArista = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
  style: { strokeWidth: 1.5 },
  labelBgPadding: [6, 3] as [number, number],
  labelBgBorderRadius: 6,
};

const aNodos = (contenido: ContenidoFlujo): NodoPasoFlujo[] =>
  contenido.nodos.map((paso) => ({
    id: paso.id,
    type: 'paso',
    position: { x: paso.x, y: paso.y },
    data: { tipo: paso.tipo, titulo: paso.titulo, tecnico: paso.tecnico ?? null, descripcion: paso.descripcion ?? null },
  }));

const aAristas = (contenido: ContenidoFlujo): Edge[] =>
  contenido.conexiones.map((conexion) => ({ id: conexion.id, source: conexion.origen, target: conexion.destino, label: conexion.etiqueta ?? undefined }));

const aContenido = (nodos: NodoPasoFlujo[], aristas: Edge[], direccion: DireccionFlujo): ContenidoFlujo => ({
  version: 1,
  direccion,
  nodos: nodos.map((nodo) => ({ id: nodo.id, ...nodo.data, x: nodo.position.x, y: nodo.position.y })),
  conexiones: aristas.map((arista) => ({
    id: arista.id,
    origen: arista.source,
    destino: arista.target,
    etiqueta: typeof arista.label === 'string' ? arista.label : null,
  })),
});

const escribiendo = (destino: EventTarget | null) =>
  destino instanceof HTMLElement && (destino.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(destino.tagName));

/** La app pone la clase .oscuro en <html>; React Flow necesita saberlo para su fondo y controles. */
function usarModoOscuro() {
  const [oscuro, setOscuro] = useState(() => document.documentElement.classList.contains('oscuro'));
  useEffect(() => {
    const observador = new MutationObserver(() => setOscuro(document.documentElement.classList.contains('oscuro')));
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observador.disconnect();
  }, []);
  return oscuro;
}

interface Propiedades {
  flujoId: string;
  /** Para el nombre de los archivos exportados y el enlace [[Flujo: …]]. */
  titulo: string;
  contenidoInicial: string;
  alCambiarEstado: (estado: EstadoGuardadoFlujo) => void;
}

/**
 * Editor de un flujo. Fuente de verdad: el estado de React Flow; el JSON que se guarda se deriva de él (sin selección ni
 * medidas), así que solo hay guardado e historial cuando cambia algo real. Se guarda lo último derivado, nunca lo que
 * haya en la instancia al desmontar (misma lección que en los lienzos).
 */
export function EditorFlujo({ flujoId, titulo, contenidoInicial, alCambiarEstado }: Propiedades) {
  const inicial = useMemo(() => leerContenido(contenidoInicial), [contenidoInicial]);
  const [nodos, setNodos, alCambiarNodos] = useNodesState<NodoPasoFlujo>(aNodos(inicial));
  const [aristas, setAristas, alCambiarAristas] = useEdgesState<Edge>(aAristas(inicial));
  const [direccion, setDireccion] = useState<DireccionFlujo>(inicial.direccion);
  const [modoTecnico, setModoTecnico] = useState(() => {
    try {
      return localStorage.getItem(ClaveModoTecnico) !== 'false';
    } catch {
      return true;
    }
  });
  const [panelTexto, setPanelTexto] = useState<string | null>(null);
  const [modalIA, setModalIA] = useState(false);
  const { screenToFlowPosition, fitView, setCenter, getZoom } = useReactFlow();
  /** Recorrido paso a paso: la ruta seguida (el último es el paso actual). */
  const [ruta, setRuta] = useState<string[] | null>(null);
  const actualizarConectores = useUpdateNodeInternals();
  const contenedor = useRef<HTMLDivElement>(null);
  const confirmar = usarConfirmacion();
  const oscuro = usarModoOscuro();

  // ---------- Guardado ----------

  const json = useMemo(() => escribirContenido(aContenido(nodos, aristas, direccion)), [nodos, aristas, direccion]);
  const ultimoGuardado = useRef(escribirContenido(inicial));
  const pendiente = useRef<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout>>();

  const guardar = useCallback(
    async (contenido: string) => {
      alCambiarEstado('guardando');
      try {
        await apiFlujos.guardarContenido(flujoId, contenido);
        ultimoGuardado.current = contenido;
        if (pendiente.current === contenido) pendiente.current = null;
        alCambiarEstado(pendiente.current ? 'pendiente' : 'guardado');
      } catch (error) {
        alCambiarEstado('error');
        notificar.error('No se pudo guardar el flujo', error);
      }
    },
    [flujoId, alCambiarEstado],
  );

  useEffect(() => {
    if (json === ultimoGuardado.current) {
      pendiente.current = null;
      return;
    }
    pendiente.current = json;
    alCambiarEstado('pendiente');
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => void guardar(json), RetrasoAutoguardado);
  }, [json, guardar, alCambiarEstado]);

  // Al salir se guarda lo pendiente; al cerrar la pestaña con cambios, el navegador avisa.
  useEffect(() => {
    const alSalir = (evento: BeforeUnloadEvent) => {
      if (!pendiente.current) return;
      evento.preventDefault();
      evento.returnValue = '';
    };
    window.addEventListener('beforeunload', alSalir);
    return () => {
      window.removeEventListener('beforeunload', alSalir);
      clearTimeout(temporizador.current);
      if (pendiente.current) void apiFlujos.guardarContenido(flujoId, pendiente.current);
    };
  }, [flujoId]);

  // ---------- Historial (deshacer / rehacer) ----------

  const historial = useRef<string[]>([escribirContenido(inicial)]);
  const posicionHistorial = useRef(0);
  const restaurando = useRef(false);
  const temporizadorHistorial = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (restaurando.current) {
      restaurando.current = false;
      return;
    }
    clearTimeout(temporizadorHistorial.current);
    // Agrupa los cambios seguidos (arrastrar, escribir) en un solo paso de historial.
    temporizadorHistorial.current = setTimeout(() => {
      if (historial.current[posicionHistorial.current] === json) return;
      historial.current = [...historial.current.slice(0, posicionHistorial.current + 1), json].slice(-MaximoHistorial);
      posicionHistorial.current = historial.current.length - 1;
    }, RetrasoHistorial);
  }, [json]);

  const restaurar = useCallback(
    (sentido: -1 | 1) => {
      const destino = posicionHistorial.current + sentido;
      if (destino < 0 || destino >= historial.current.length) return;
      clearTimeout(temporizadorHistorial.current);
      posicionHistorial.current = destino;
      const contenido = leerContenido(historial.current[destino]);
      restaurando.current = true;
      setNodos(aNodos(contenido));
      setAristas(aAristas(contenido));
      setDireccion(contenido.direccion);
    },
    [setNodos, setAristas],
  );

  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent) => {
      if (!(evento.ctrlKey || evento.metaKey) || escribiendo(evento.target) || document.querySelector('[role="dialog"]')) return;
      const tecla = evento.key.toLowerCase();
      if (tecla === 'z' && !evento.shiftKey) restaurar(-1);
      else if (tecla === 'y' || (tecla === 'z' && evento.shiftKey)) restaurar(1);
      else return;
      evento.preventDefault();
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [restaurar]);

  // ---------- Edición ----------

  const tipoDe = useCallback((id: string) => nodos.find((nodo) => nodo.id === id)?.data.tipo, [nodos]);

  /** Desde una validación, la primera flecha se etiqueta "Sí" y la segunda "No". */
  const etiquetaSugerida = useCallback(
    (origen: string, actuales: Edge[]) => {
      if (tipoDe(origen) !== 'validacion') return undefined;
      const usadas = actuales.filter((arista) => arista.source === origen).map((arista) => arista.label);
      if (!usadas.includes('Sí')) return 'Sí';
      if (!usadas.includes('No')) return 'No';
      return undefined;
    },
    [tipoDe],
  );

  const alConectar = useCallback(
    (conexion: Connection) =>
      setAristas((actuales) => addEdge({ ...conexion, id: nuevoId('c'), label: etiquetaSugerida(conexion.source, actuales) }, actuales)),
    [setAristas, etiquetaSugerida],
  );

  /** Añade un paso. Si hay uno seleccionado (y no se soltó en un punto concreto), va debajo y queda conectado a él. */
  const anadirPaso = useCallback(
    (tipo: TipoPaso, punto?: { x: number; y: number }) => {
      const { ancho, alto } = tamanoPaso(tipo);
      const seleccionado = nodos.filter((nodo) => nodo.selected);
      const anterior = !punto && seleccionado.length === 1 ? seleccionado[0] : null;
      let posicion: { x: number; y: number };
      if (punto) posicion = { x: punto.x - ancho / 2, y: punto.y - alto / 2 };
      else if (anterior) {
        const tamanoAnterior = tamanoPaso(anterior.data.tipo);
        posicion =
          direccion === 'DOWN'
            ? { x: anterior.position.x + tamanoAnterior.ancho / 2 - ancho / 2, y: anterior.position.y + tamanoAnterior.alto + 64 }
            : { x: anterior.position.x + tamanoAnterior.ancho + 90, y: anterior.position.y + tamanoAnterior.alto / 2 - alto / 2 };
      } else {
        const caja = contenedor.current?.getBoundingClientRect();
        const centro = caja ? screenToFlowPosition({ x: caja.left + caja.width / 2, y: caja.top + caja.height / 2 }) : { x: 0, y: 0 };
        posicion = { x: centro.x - ancho / 2, y: centro.y - alto / 2 };
      }

      const id = nuevoId('n');
      setNodos((actuales) => [
        ...actuales.map((nodo) => (nodo.selected ? { ...nodo, selected: false } : nodo)),
        { id, type: 'paso', position: posicion, selected: true, data: { tipo, titulo: configuracionPaso[tipo].etiqueta, tecnico: null, descripcion: null } },
      ]);
      if (anterior) setAristas((actuales) => [...actuales, { id: nuevoId('c'), source: anterior.id, target: id, label: etiquetaSugerida(anterior.id, actuales) }]);
    },
    [nodos, direccion, screenToFlowPosition, setNodos, setAristas, etiquetaSugerida],
  );

  function alSoltar(evento: DragEvent) {
    evento.preventDefault();
    const tipo = evento.dataTransfer.getData(TipoArrastre) as TipoPaso;
    if (!(tipo in configuracionPaso)) return;
    anadirPaso(tipo, screenToFlowPosition({ x: evento.clientX, y: evento.clientY }));
  }

  const cambiarPaso = (id: string, cambios: Partial<DatosPaso>) =>
    setNodos((actuales) => actuales.map((nodo) => (nodo.id === id ? { ...nodo, data: { ...nodo.data, ...cambios } } : nodo)));

  const ordenar = useCallback(
    async (nuevaDireccion: DireccionFlujo, nodosBase = nodos, aristasBase = aristas) => {
      if (nodosBase.length === 0) return;
      try {
        const posiciones = await ordenarPasos(
          nodosBase.map((nodo) => ({ id: nodo.id, tipo: nodo.data.tipo })),
          aristasBase.map((arista) => ({ id: arista.id, origen: arista.source, destino: arista.target })),
          nuevaDireccion,
        );
        setDireccion(nuevaDireccion);
        setNodos(nodosBase.map((nodo) => ({ ...nodo, position: posiciones.get(nodo.id) ?? nodo.position })));
        setAristas(aristasBase);
        // Los conectores cambian de lado con la dirección: React Flow debe recalcularlos antes de encuadrar.
        requestAnimationFrame(() => {
          actualizarConectores(nodosBase.map((nodo) => nodo.id));
          void fitView({ padding: 0.15, duration: 300 });
        });
      } catch {
        notificar.error('No se pudo ordenar el flujo');
      }
    },
    [nodos, aristas, setNodos, setAristas, fitView, actualizarConectores],
  );

  /** Reemplaza el diagrama por lo escrito como texto. Conserva las notas de los pasos que siguen existiendo. */
  const aplicarTexto = useCallback(
    async (texto: string) => {
      const { nodos: pasos, conexiones } = interpretarTexto(texto);
      if (pasos.length === 0) return;
      const notas = new Map(nodos.map((nodo) => [`${nodo.data.tipo}|${nodo.data.titulo.trim().toLowerCase()}`, nodo.data.descripcion]));
      const ids = new Map(pasos.map((paso) => [paso.id, nuevoId('n')]));
      const nuevosNodos: NodoPasoFlujo[] = pasos.map((paso) => ({
        id: ids.get(paso.id)!,
        type: 'paso',
        position: { x: 0, y: 0 },
        data: { tipo: paso.tipo, titulo: paso.titulo, tecnico: paso.tecnico ?? null, descripcion: notas.get(`${paso.tipo}|${paso.titulo.trim().toLowerCase()}`) ?? null },
      }));
      const nuevasAristas: Edge[] = conexiones.map((conexion) => ({
        id: nuevoId('c'),
        source: ids.get(conexion.origen)!,
        target: ids.get(conexion.destino)!,
        label: conexion.etiqueta ?? undefined,
      }));
      await ordenar(direccion, nuevosNodos, nuevasAristas);
      setPanelTexto(texto);
      notificar.exito('Diagrama actualizado', `${pasos.length} pasos · Ctrl+Z para deshacer`);
    },
    [nodos, direccion, ordenar],
  );

  async function aplicarDesdeIA(texto: string) {
    setModalIA(false);
    if (nodos.length > 0) {
      const aceptado = await confirmar({
        titulo: 'Reemplazar el diagrama',
        descripcion: 'La IA generó un flujo nuevo. Se reemplazará el diagrama actual (puedes deshacer con Ctrl+Z).',
        textoConfirmar: 'Reemplazar',
      });
      if (!aceptado) {
        setPanelTexto(texto);
        return;
      }
    }
    await aplicarTexto(texto);
  }

  function cambiarModoTecnico() {
    setModoTecnico((actual) => {
      try {
        localStorage.setItem(ClaveModoTecnico, String(!actual));
      } catch {
        // Solo se pierde la preferencia.
      }
      return !actual;
    });
  }

  // Encuadre inicial.
  useEffect(() => {
    if (nodos.length > 0) requestAnimationFrame(() => void fitView({ padding: 0.15 }));
    // Solo al abrir el flujo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Recorrido ----------

  const actual = ruta ? ruta[ruta.length - 1] : null;
  const opciones = useMemo(() => (actual ? opcionesDe(actual, aristas, nodos, direccion) : []), [actual, aristas, nodos, direccion]);
  const estadoRecorrido = useMemo<EstadoRecorrido | null>(
    () => (ruta && actual ? { actual, visitados: new Set(ruta), opciones: new Set(opciones.map((opcion) => opcion.destino)) } : null),
    [ruta, actual, opciones],
  );

  function iniciarRecorrido() {
    const inicio = pasoInicial(nodos, aristas, direccion);
    if (!inicio) return;
    setPanelTexto(null);
    setNodos((actuales) => actuales.map((nodo) => (nodo.selected ? { ...nodo, selected: false } : nodo)));
    setAristas((actuales) => actuales.map((arista) => (arista.selected ? { ...arista, selected: false } : arista)));
    setRuta([inicio]);
  }

  const avanzar = useCallback((destino: string) => setRuta((actuales) => (actuales ? [...actuales, destino] : actuales)), []);
  const volver = useCallback(() => setRuta((actuales) => (actuales && actuales.length > 1 ? actuales.slice(0, -1) : actuales)), []);
  const salirRecorrido = useCallback(() => {
    setRuta(null);
    requestAnimationFrame(() => void fitView({ padding: 0.15, duration: 400 }));
  }, [fitView]);

  // La cámara sigue al paso actual.
  useEffect(() => {
    if (!actual) return;
    const nodo = nodos.find((existente) => existente.id === actual);
    if (!nodo) return;
    const { ancho, alto } = tamanoPaso(nodo.data.tipo);
    // Un poco por encima del centro para que la tarjeta inferior no lo tape.
    void setCenter(nodo.position.x + ancho / 2, nodo.position.y + alto / 2 + 90, { zoom: Math.max(getZoom(), 0.9), duration: 450 });
    // Solo al cambiar de paso, no al mover otros nodos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actual]);

  useEffect(() => {
    if (!ruta) return;
    const alPresionar = (evento: KeyboardEvent) => {
      if (escribiendo(evento.target) || document.querySelector('[role="dialog"]')) return;
      const numero = Number(evento.key);
      if (evento.key === 'Escape') salirRecorrido();
      else if (evento.key === 'ArrowLeft') volver();
      else if ((evento.key === 'ArrowRight' || evento.key === 'Enter' || evento.key === ' ') && opciones.length === 1) avanzar(opciones[0].destino);
      else if (Number.isInteger(numero) && numero >= 1 && numero <= opciones.length) avanzar(opciones[numero - 1].destino);
      else return;
      evento.preventDefault();
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [ruta, opciones, avanzar, volver, salirRecorrido]);

  // ---------- Exportar ----------

  async function exportar(formato: 'png' | 'svg') {
    if (!contenedor.current) return;
    try {
      await exportarImagen(contenedor.current, nodos, formato, titulo);
    } catch {
      notificar.error('No se pudo exportar la imagen');
    }
  }

  async function copiar(texto: string, mensaje: string, detalle?: string) {
    try {
      await navigator.clipboard.writeText(texto);
      notificar.exito(mensaje, detalle);
    } catch {
      notificar.error('No se pudo copiar', 'El navegador bloqueó el portapapeles.');
    }
  }

  const nodoSeleccionado = nodos.filter((nodo) => nodo.selected);
  const aristaSeleccionada = aristas.filter((arista) => arista.selected);
  const vista = useMemo(() => ({ direccion, modoTecnico, recorrido: estadoRecorrido }), [direccion, modoTecnico, estadoRecorrido]);
  const aristasDibujadas = useMemo(() => {
    // En el recorrido: el camino seguido en violeta animado, las salidas del paso actual punteadas y el resto atenuado.
    const camino = new Set(ruta ? ruta.slice(1).map((destino, indice) => `${ruta[indice]}>${destino}`) : []);
    return aristas.map((arista) => {
      const negativa = /^(no|error|falla|rechaza)/i.test(String(arista.label ?? '').trim());
      const base = negativa ? { ...opcionesArista.style, stroke: 'var(--color-rose-400)' } : opcionesArista.style;
      if (!ruta) return { ...arista, animated: arista.selected, style: base };
      if (camino.has(`${arista.source}>${arista.target}`))
        return { ...arista, animated: true, style: { ...base, stroke: 'var(--color-violet-500)', strokeWidth: 2.5 } };
      if (arista.source === actual) return { ...arista, animated: false, style: { ...base, strokeDasharray: '6 4', strokeWidth: 2 } };
      return { ...arista, animated: false, style: { ...base, opacity: 0.2 } };
    });
  }, [aristas, ruta, actual]);

  return (
    <ContextoVistaFlujo.Provider value={vista}>
      <div className="flex min-h-0 flex-1">
        {/* Paleta: arrastrar al lienzo, o clic para añadir (debajo del paso seleccionado y conectado a él). */}
        <nav
          className={unirClases(
            'flex w-44 shrink-0 flex-col gap-1 overflow-y-auto border-r border-borde bg-superficie p-2 transition-opacity sin-barra-scroll',
            ruta && 'pointer-events-none opacity-40',
          )}
          aria-label="Tipos de paso"
        >
          <p className="px-1.5 pb-1 pt-0.5 text-[11px] font-medium uppercase tracking-wider text-texto-3">Pasos</p>
          {tiposPaso.map((tipo) => {
            const configuracion = configuracionPaso[tipo];
            const IconoTipo = configuracion.icono;
            return (
              <button
                key={tipo}
                type="button"
                draggable
                onDragStart={(evento) => {
                  evento.dataTransfer.setData(TipoArrastre, tipo);
                  evento.dataTransfer.effectAllowed = 'move';
                }}
                onClick={() => anadirPaso(tipo)}
                title="Arrastra al lienzo o haz clic para añadir"
                className="flex cursor-grab items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-xs font-medium text-texto-2 transition-colors hover:bg-superficie-2 hover:text-texto active:cursor-grabbing"
              >
                <span className={unirClases('grid size-6 shrink-0 place-items-center rounded-md', configuracion.insignia)}>
                  <IconoTipo className="size-3.5" />
                </span>
                {configuracion.etiqueta}
              </button>
            );
          })}
        </nav>

        <div ref={contenedor} className="relative min-w-0 flex-1" onDragOver={(evento) => evento.preventDefault()} onDrop={alSoltar}>
          <ReactFlow
            nodes={nodos}
            edges={aristasDibujadas}
            nodeTypes={tiposNodo}
            onNodesChange={alCambiarNodos}
            onEdgesChange={alCambiarAristas}
            onConnect={alConectar}
            onNodeClick={(_, nodo) => {
              // En el recorrido, clic en una de las salidas del paso actual = avanzar por esa rama.
              if (ruta && opciones.some((opcion) => opcion.destino === nodo.id)) avanzar(nodo.id);
            }}
            nodesDraggable={!ruta}
            nodesConnectable={!ruta}
            elementsSelectable={!ruta}
            defaultEdgeOptions={opcionesArista}
            colorMode={oscuro ? 'dark' : 'light'}
            deleteKeyCode={ruta ? null : ['Delete', 'Backspace']}
            snapToGrid
            snapGrid={[8, 8]}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />
            <Controls showInteractive={false} position="bottom-left" />
            <MiniMap pannable zoomable position="bottom-right" nodeColor={(nodo) => configuracionPaso[(nodo.data as DatosPaso).tipo]?.minimapa ?? '#a1a1aa'} className="!rounded-lg !border !border-borde" />

            {ruta && actual && (
              <Panel position="top-right" className="rounded-xl border border-borde bg-superficie/95 p-1 shadow-flotante backdrop-blur">
                <button
                  type="button"
                  onClick={salirRecorrido}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-texto-2 transition-colors hover:bg-superficie-2 hover:text-texto"
                >
                  <Square className="size-3.5" />
                  Salir del recorrido
                </button>
              </Panel>
            )}
            {ruta && actual && nodos.some((nodo) => nodo.id === actual) && (
              <Panel position="bottom-center">
                <TarjetaRecorrido
                  paso={nodos.find((nodo) => nodo.id === actual)!.data}
                  numero={ruta.length}
                  opciones={opciones}
                  alElegir={avanzar}
                  alVolver={ruta.length > 1 ? volver : null}
                  alReiniciar={() => setRuta([ruta[0]])}
                  alSalir={salirRecorrido}
                />
              </Panel>
            )}
            <Panel
              position="top-right"
              className={unirClases('flex items-center gap-1 rounded-xl border border-borde bg-superficie/95 p-1 shadow-flotante backdrop-blur', ruta && '!hidden')}
            >
              <button
                type="button"
                onClick={iniciarRecorrido}
                disabled={nodos.length === 0}
                title="Recorrer el flujo paso a paso (desde el paso seleccionado o el inicio)"
                className="inline-flex h-7 items-center gap-1.5 rounded-md bg-emerald-50 px-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
              >
                <Play className="size-3.5" />
                Recorrer
              </button>
              <span className="mx-0.5 h-5 w-px bg-borde" />
              <BotonIcono icono={Undo2} etiqueta="Deshacer (Ctrl+Z)" tamano="sm" onClick={() => restaurar(-1)} />
              <BotonIcono icono={Redo2} etiqueta="Rehacer (Ctrl+Y)" tamano="sm" onClick={() => restaurar(1)} />
              <span className="mx-0.5 h-5 w-px bg-borde" />
              <button
                type="button"
                onClick={cambiarModoTecnico}
                aria-pressed={modoTecnico}
                title="Mostrar u ocultar el detalle técnico de los pasos"
                className={unirClases(
                  'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors',
                  modoTecnico ? 'bg-indigo-50 text-indigo-700' : 'text-texto-2 hover:bg-superficie-2',
                )}
              >
                <Code2 className="size-3.5" />
                {modoTecnico ? 'Técnico' : 'Funcional'}
              </button>
              <BotonIcono icono={ArrowDownToLine} etiqueta="Ordenar de arriba abajo" tamano="sm" onClick={() => void ordenar('DOWN')} />
              <BotonIcono icono={ArrowRightToLine} etiqueta="Ordenar de izquierda a derecha" tamano="sm" onClick={() => void ordenar('RIGHT')} />
              <span className="mx-0.5 h-5 w-px bg-borde" />
              <button
                type="button"
                onClick={() => {
                  const actual = aContenido(nodos, aristas, direccion);
                  setPanelTexto(panelTexto === null ? aTexto(actual.nodos, actual.conexiones) : null);
                }}
                aria-pressed={panelTexto !== null}
                className={unirClases(
                  'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors',
                  panelTexto !== null ? 'bg-superficie-3 text-texto' : 'text-texto-2 hover:bg-superficie-2',
                )}
              >
                <FileText className="size-3.5" />
                Texto
              </button>
              <button
                type="button"
                onClick={() => setModalIA(true)}
                className="inline-flex h-7 items-center gap-1.5 rounded-md bg-violet-50 px-2 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100"
              >
                <Sparkles className="size-3.5" />
                IA
              </button>
              <MenuAcciones
                etiqueta="Exportar"
                disparador={(abrir, abierto) => (
                  <BotonIcono icono={Download} etiqueta="Exportar" tamano="sm" aria-expanded={abierto} onClick={abrir} disabled={nodos.length === 0} />
                )}
                acciones={[
                  { etiqueta: 'Imagen PNG', icono: FileImage, alPulsar: () => void exportar('png') },
                  { etiqueta: 'Imagen SVG', icono: FileImage, alPulsar: () => void exportar('svg') },
                  {
                    etiqueta: 'Copiar como Mermaid',
                    icono: FileCode2,
                    alPulsar: () =>
                      void copiar(
                        `\`\`\`mermaid\n${aMermaid(aContenido(nodos, aristas, direccion), modoTecnico)}\n\`\`\``,
                        'Mermaid copiado',
                        'Pégalo en un documento: se dibuja solo.',
                      ),
                    separadorAntes: true,
                  },
                  {
                    etiqueta: 'Copiar como texto',
                    icono: Copy,
                    alPulsar: () => {
                      const contenido = aContenido(nodos, aristas, direccion);
                      void copiar(aTexto(contenido.nodos, contenido.conexiones), 'Texto copiado');
                    },
                  },
                  {
                    etiqueta: 'Copiar enlace [[Flujo: …]]',
                    icono: Link2,
                    alPulsar: () => void copiar(`[[Flujo: ${titulo.trim()}]]`, 'Enlace copiado', 'Pégalo en un documento, tarea o ticket.'),
                    separadorAntes: true,
                  },
                ]}
              />
            </Panel>
          </ReactFlow>

          {nodos.length === 0 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
              <div className="pointer-events-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-borde bg-superficie/95 p-6 text-center shadow-flotante backdrop-blur">
                <div>
                  <p className="font-semibold">Empieza tu flujo</p>
                  <p className="mt-1 text-sm text-texto-2">Elige cómo quieres crearlo; siempre podrás ajustarlo después.</p>
                </div>
                <div className="grid w-full gap-2 sm:grid-cols-3">
                  <OpcionInicio icono={FileText} titulo="Escribir" descripcion="Pasos como texto" alPulsar={() => setPanelTexto('')} />
                  <OpcionInicio icono={Sparkles} titulo="Describir" descripcion="La IA lo arma" alPulsar={() => setModalIA(true)} />
                  <OpcionInicio icono={MousePointerClick} titulo="Dibujar" descripcion="Desde la paleta" alPulsar={() => anadirPaso('usuario')} />
                </div>
              </div>
            </div>
          )}
        </div>

        {ruta ? null : panelTexto !== null ? (
          <PanelTexto textoInicial={panelTexto} alAplicar={(texto) => void aplicarTexto(texto)} alCerrar={() => setPanelTexto(null)} />
        ) : nodoSeleccionado.length === 1 ? (
          <PanelPaso
            datos={nodoSeleccionado[0].data}
            alCambiar={(cambios) => cambiarPaso(nodoSeleccionado[0].id, cambios)}
            alEliminar={() => {
              const id = nodoSeleccionado[0].id;
              setNodos((actuales) => actuales.filter((nodo) => nodo.id !== id));
              setAristas((actuales) => actuales.filter((arista) => arista.source !== id && arista.target !== id));
            }}
            alCerrar={() => setNodos((actuales) => actuales.map((nodo) => ({ ...nodo, selected: false })))}
          />
        ) : aristaSeleccionada.length === 1 && nodoSeleccionado.length === 0 ? (
          <PanelConexion
            etiqueta={String(aristaSeleccionada[0].label ?? '')}
            alCambiar={(etiqueta) =>
              setAristas((actuales) => actuales.map((arista) => (arista.id === aristaSeleccionada[0].id ? { ...arista, label: etiqueta || undefined } : arista)))
            }
            alEliminar={() => setAristas((actuales) => actuales.filter((arista) => arista.id !== aristaSeleccionada[0].id))}
            alCerrar={() => setAristas((actuales) => actuales.map((arista) => ({ ...arista, selected: false })))}
          />
        ) : null}
      </div>

      <ModalGenerarIA abierto={modalIA} alCerrar={() => setModalIA(false)} alGenerar={(texto) => void aplicarDesdeIA(texto)} />
    </ContextoVistaFlujo.Provider>
  );
}

function OpcionInicio({ icono: IconoOpcion, titulo, descripcion, alPulsar }: { icono: typeof FileText; titulo: string; descripcion: string; alPulsar: () => void }) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-borde px-3 py-3 transition-colors hover:border-violet-200 hover:bg-violet-50"
    >
      <IconoOpcion className="size-5 text-violet-600" />
      <span className="text-sm font-medium">{titulo}</span>
      <span className="text-xs text-texto-3">{descripcion}</span>
    </button>
  );
}
