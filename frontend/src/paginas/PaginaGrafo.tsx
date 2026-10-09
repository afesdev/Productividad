import { Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Crosshair, RefreshCw, Search, X } from 'lucide-react';
import type { GrafoDto, TipoNodoGrafo } from '../servicios/tipos';
import { BotonIcono, Casilla, unirClases } from '../componentes/ui/primitivos';
import { notificar } from '../servicios/notificaciones';
import { configuracionNodo, obtenerGrafo, rutaNodo, tiposNodo, vecindario } from '../caracteristicas/grafo/datosGrafo';
import { CargandoGrafo, LienzoGrafo, PanelNodo, usarModoOscuro } from '../caracteristicas/grafo/ComponentesGrafo';

/** Grafo de conocimiento completo: todo lo enlazado entre documentos, tareas, tickets, diario, flujos, etiquetas y sistemas. */
export function PaginaGrafo() {
  const navegar = useNavigate();
  const oscuro = usarModoOscuro();
  const [parametros, setParametros] = useSearchParams();
  const [grafo, setGrafo] = useState<GrafoDto | null>(null);
  const [visibles, setVisibles] = useState<Set<TipoNodoGrafo>>(() => new Set(tiposNodo));
  const [ocultarSueltos, setOcultarSueltos] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState<string | null>(parametros.get('foco'));
  const foco = parametros.get('foco');
  const [saltos, setSaltos] = useState(2);

  function cargar(forzar = false) {
    obtenerGrafo(forzar)
      .then(setGrafo)
      .catch((error) => notificar.error('No se pudo cargar el grafo', error));
  }

  useEffect(() => cargar(), []);

  const conteos = useMemo(() => {
    const mapa = new Map<TipoNodoGrafo, number>();
    for (const nodo of grafo?.nodos ?? []) mapa.set(nodo.tipo, (mapa.get(nodo.tipo) ?? 0) + 1);
    return mapa;
  }, [grafo]);

  /** Nodos y aristas tras aplicar tipos visibles, foco y "ocultar sueltos". */
  const visible = useMemo(() => {
    if (!grafo) return null;
    let nodos = grafo.nodos.filter((nodo) => visibles.has(nodo.tipo));
    let ids = new Set(nodos.map((nodo) => nodo.id));
    let aristas = grafo.aristas.filter((arista) => ids.has(arista.origen) && ids.has(arista.destino));
    if (foco && ids.has(foco)) {
      const cerca = vecindario(aristas, foco, saltos);
      nodos = nodos.filter((nodo) => cerca.has(nodo.id));
      ids = cerca;
      aristas = aristas.filter((arista) => ids.has(arista.origen) && ids.has(arista.destino));
    }
    if (ocultarSueltos) {
      const conectados = new Set(aristas.flatMap((arista) => [arista.origen, arista.destino]));
      nodos = nodos.filter((nodo) => conectados.has(nodo.id) || nodo.id === foco);
    }
    return { nodos, aristas };
  }, [grafo, visibles, foco, saltos, ocultarSueltos]);

  const coincidencias = useMemo(() => {
    const termino = busqueda.trim().toLowerCase().replace(/^#/, '');
    if (!termino || !grafo) return [];
    return grafo.nodos
      .filter((nodo) => nodo.titulo.toLowerCase().includes(termino) || nodo.referencia?.toLowerCase().includes(termino))
      .slice(0, 8);
  }, [busqueda, grafo]);

  const enfocar = (id: string | null) => {
    setSeleccionado(id);
    setParametros(id ? { foco: id } : {}, { replace: true });
    setBusqueda('');
  };

  const alternarTipo = (tipo: TipoNodoGrafo) =>
    setVisibles((actuales) => {
      const nuevos = new Set(actuales);
      if (nuevos.has(tipo)) nuevos.delete(tipo);
      else nuevos.add(tipo);
      return nuevos;
    });

  const nodoSeleccionado = grafo?.nodos.find((nodo) => nodo.id === seleccionado) ?? null;
  const nodoFoco = grafo?.nodos.find((nodo) => nodo.id === foco) ?? null;

  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[32rem] flex-col gap-3">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="mr-2 text-2xl font-semibold tracking-tight">Grafo</h1>
        <div className="relative w-72 max-w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-3" />
          <input
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            onKeyDown={(evento) => evento.key === 'Enter' && coincidencias[0] && enfocar(coincidencias[0].id)}
            placeholder="Buscar y centrar (título, TCK-12, #etiqueta)…"
            aria-label="Buscar en el grafo"
            className="h-9 w-full rounded-lg border border-borde bg-superficie pl-9 pr-3 text-sm shadow-tarjeta focus:border-acento focus:outline-none"
          />
          {coincidencias.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-borde bg-superficie p-1 shadow-flotante">
              {coincidencias.map((nodo) => {
                const Icono = configuracionNodo[nodo.tipo].icono;
                return (
                  <li key={nodo.id}>
                    <button type="button" onClick={() => enfocar(nodo.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-superficie-2">
                      <Icono className="size-4 shrink-0" style={{ color: configuracionNodo[nodo.tipo].color }} />
                      <span className="min-w-0 flex-1 truncate">{nodo.tipo === 'Etiqueta' ? `#${nodo.titulo}` : nodo.titulo}</span>
                      <span className="shrink-0 text-xs text-texto-3">{configuracionNodo[nodo.tipo].etiqueta}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {nodoFoco && (
          <span className="inline-flex items-center gap-2 rounded-lg bg-violet-50 px-2.5 py-1 text-xs text-violet-900">
            <Crosshair className="size-3.5" />
            Centrado en <strong className="max-w-48 truncate">{nodoFoco.titulo}</strong>
            <select value={saltos} onChange={(evento) => setSaltos(Number(evento.target.value))} className="rounded bg-transparent font-medium" aria-label="Profundidad">
              <option value={1}>1 salto</option>
              <option value={2}>2 saltos</option>
              <option value={3}>3 saltos</option>
            </select>
            <button type="button" onClick={() => enfocar(null)} aria-label="Ver todo el grafo" className="rounded p-0.5 hover:bg-violet-100">
              <X className="size-3.5" />
            </button>
          </span>
        )}
        <BotonIcono icono={RefreshCw} etiqueta="Volver a cargar" onClick={() => cargar(true)} className="ml-auto" />
      </header>

      <div className="flex flex-wrap items-center gap-1.5">
        {tiposNodo.map((tipo) => {
          const { plural, color } = configuracionNodo[tipo];
          const activo = visibles.has(tipo);
          return (
            <button
              key={tipo}
              type="button"
              aria-pressed={activo}
              onClick={() => alternarTipo(tipo)}
              className={unirClases(
                'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition',
                activo ? 'border-borde bg-superficie text-texto' : 'border-transparent text-texto-3 line-through opacity-60',
              )}
            >
              <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
              {plural}
              <span className="tabular-nums text-texto-3">{conteos.get(tipo) ?? 0}</span>
            </button>
          );
        })}
        <Casilla etiqueta="Ocultar sin conexiones" checked={ocultarSueltos} onChange={(evento) => setOcultarSueltos(evento.target.checked)} className="ml-2 text-xs" />
        {grafo?.recortado && <span className="text-xs text-amber-700">Se muestran los 1.500 más recientes de cada tipo.</span>}
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-borde bg-superficie shadow-tarjeta">
          {!visible ? (
            <CargandoGrafo />
          ) : visible.nodos.length === 0 ? (
            <p className="grid h-full place-items-center px-6 text-center text-sm text-texto-2">
              Nada que mostrar con estos filtros. Enlaza documentos, tickets o tareas con [[…]] o etiquetas para ver tu grafo.
            </p>
          ) : (
            <Suspense fallback={<CargandoGrafo />}>
              <LienzoGrafo
                nodos={visible.nodos}
                aristas={visible.aristas}
                seleccionado={seleccionado}
                foco={foco}
                oscuro={oscuro}
                alSeleccionar={setSeleccionado}
                alAbrir={(nodo) => {
                  const ruta = rutaNodo(nodo);
                  if (ruta) navegar(ruta);
                }}
              />
            </Suspense>
          )}
          <p className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-texto-3">Clic: ver conexiones · Doble clic: abrir · Rueda: zoom</p>
        </div>
        {nodoSeleccionado && grafo && (
          <aside className="hidden w-72 shrink-0 flex-col gap-3 overflow-hidden rounded-xl border border-borde bg-superficie p-4 shadow-tarjeta md:flex">
            <PanelNodo nodo={nodoSeleccionado} grafo={grafo} alSeleccionar={setSeleccionado} />
            <button type="button" onClick={() => enfocar(nodoSeleccionado.id)} className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-violet-700 hover:underline">
              <Crosshair className="size-3.5" />
              Centrar el grafo en este elemento
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
