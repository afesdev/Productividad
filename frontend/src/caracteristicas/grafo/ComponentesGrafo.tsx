import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, Loader2, Network, Waypoints } from 'lucide-react';
import type { AristaGrafoDto, GrafoDto, NodoGrafoDto, TipoNodoGrafo } from '../../servicios/tipos';
import { Modal } from '../../componentes/ui/Modal';
import { Boton, unirClases } from '../../componentes/ui/primitivos';
import { configuracionNodo, etiquetaArista, idNodo, obtenerGrafo, rutaNodo, vecindario } from './datosGrafo';

export const LienzoGrafo = lazy(() => import('./LienzoGrafo'));

export function usarModoOscuro() {
  const [oscuro, setOscuro] = useState(() => document.documentElement.classList.contains('oscuro'));
  useEffect(() => {
    const observador = new MutationObserver(() => setOscuro(document.documentElement.classList.contains('oscuro')));
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observador.disconnect();
  }, []);
  return oscuro;
}

export const CargandoGrafo = () => (
  <div className="grid h-full place-items-center text-texto-3">
    <Loader2 className="size-6 animate-spin" />
  </div>
);

/** Panel con el nodo seleccionado, su botón para abrirlo y sus conexiones directas (clic = seleccionar esa). */
export function PanelNodo({
  nodo,
  grafo,
  alSeleccionar,
  alCerrarAntesDeNavegar,
}: {
  nodo: NodoGrafoDto;
  grafo: GrafoDto;
  alSeleccionar: (id: string) => void;
  alCerrarAntesDeNavegar?: () => void;
}) {
  const configuracion = configuracionNodo[nodo.tipo];
  const Icono = configuracion.icono;
  const ruta = rutaNodo(nodo);
  const porId = useMemo(() => new Map(grafo.nodos.map((existente) => [existente.id, existente])), [grafo]);
  const conexiones = useMemo(
    () =>
      grafo.aristas
        .filter((arista) => arista.origen === nodo.id || arista.destino === nodo.id)
        .map((arista) => ({ arista, otro: porId.get(arista.origen === nodo.id ? arista.destino : arista.origen) }))
        .filter((conexion): conexion is { arista: AristaGrafoDto; otro: NodoGrafoDto } => !!conexion.otro)
        .sort((a, b) => a.otro.tipo.localeCompare(b.otro.tipo) || a.otro.titulo.localeCompare(b.otro.titulo, 'es')),
    [grafo, nodo, porId],
  );

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg text-white" style={{ backgroundColor: configuracion.color }}>
          <Icono className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-texto-3">
            {configuracion.etiqueta}
            {nodo.referencia && nodo.tipo !== 'Documento' ? ` · ${nodo.referencia}` : ''}
          </p>
          <p className="break-words text-sm font-semibold">
            {nodo.tipo === 'Etiqueta' ? '#' : nodo.tipo === 'Documento' && nodo.referencia ? `${nodo.referencia} ` : ''}
            {nodo.titulo}
          </p>
        </div>
      </div>
      {ruta && (
        <Link
          to={ruta}
          onClick={alCerrarAntesDeNavegar}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primario px-3 text-xs font-medium text-sobre-primario transition-colors hover:bg-primario/85"
        >
          <ExternalLink className="size-3.5" />
          {nodo.tipo === 'Etiqueta' ? 'Ver tickets con esta etiqueta' : nodo.tipo === 'Sistema' ? 'Ver tickets del sistema' : 'Abrir'}
        </Link>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-texto-3">{conexiones.length} conexiones</p>
        {conexiones.length === 0 ? (
          <p className="text-sm text-texto-3">Sin conexiones todavía. Enlázalo con [[…]], una etiqueta o un sistema.</p>
        ) : (
          <ul className="flex flex-col">
            {conexiones.map(({ arista, otro }) => {
              const IconoOtro = configuracionNodo[otro.tipo].icono;
              return (
                <li key={`${arista.origen}-${arista.destino}-${arista.tipo}`}>
                  <button
                    type="button"
                    onClick={() => alSeleccionar(otro.id)}
                    className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm transition-colors hover:bg-superficie-2"
                  >
                    <IconoOtro className="size-3.5 shrink-0" style={{ color: configuracionNodo[otro.tipo].color }} />
                    <span className="min-w-0 flex-1 truncate">{otro.tipo === 'Etiqueta' ? `#${otro.titulo}` : otro.titulo}</span>
                    <span className="shrink-0 text-[10px] text-texto-3">{etiquetaArista[arista.tipo]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Botón "Conexiones" para la cabecera de un documento, ticket, tarea o flujo: abre su grafo local
 * (el elemento y lo que lo rodea a 1 o 2 saltos), como el panel de conexiones de Obsidian.
 */
export function BotonConexiones({ tipo, id, className }: { tipo: TipoNodoGrafo; id: string; className?: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title="Ver sus conexiones en el grafo"
        className={unirClases(
          'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-texto-2 transition-colors hover:bg-superficie-2 hover:text-texto',
          className,
        )}
      >
        <Waypoints className="size-4" />
        <span className="hidden sm:inline">Conexiones</span>
      </button>
      {abierto && <ModalConexiones centro={idNodo(tipo, id)} alCerrar={() => setAbierto(false)} />}
    </>
  );
}

function ModalConexiones({ centro, alCerrar }: { centro: string; alCerrar: () => void }) {
  const navegar = useNavigate();
  const oscuro = usarModoOscuro();
  const [grafo, setGrafo] = useState<GrafoDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saltos, setSaltos] = useState(2);
  const [seleccionado, setSeleccionado] = useState<string>(centro);

  useEffect(() => {
    // Siempre fresco: se acaba de editar el elemento y sus enlaces pueden haber cambiado.
    obtenerGrafo(true)
      .then(setGrafo)
      .catch((motivo: unknown) => setError(motivo instanceof Error ? motivo.message : 'No se pudo cargar el grafo.'));
  }, []);

  const local = useMemo(() => {
    if (!grafo) return null;
    const ids = vecindario(grafo.aristas, centro, saltos);
    return {
      nodos: grafo.nodos.filter((nodo) => ids.has(nodo.id)),
      aristas: grafo.aristas.filter((arista) => ids.has(arista.origen) && ids.has(arista.destino)),
    };
  }, [grafo, centro, saltos]);
  const nodoSeleccionado = grafo?.nodos.find((nodo) => nodo.id === seleccionado) ?? null;

  return (
    <Modal abierto alCerrar={alCerrar} titulo="Conexiones" ancho="xl">
      <div className="flex flex-col gap-3 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg bg-superficie-2 p-0.5 text-xs" role="group" aria-label="Profundidad">
            {[1, 2].map((valor) => (
              <button
                key={valor}
                type="button"
                aria-pressed={saltos === valor}
                onClick={() => setSaltos(valor)}
                className={unirClases('h-7 rounded-md px-2.5 font-medium', saltos === valor ? 'bg-superficie text-texto shadow-tarjeta' : 'text-texto-2')}
              >
                {valor === 1 ? 'Directas' : 'A 2 saltos'}
              </button>
            ))}
          </div>
          <Boton
            variante="fantasma"
            tamano="sm"
            icono={Network}
            onClick={() => {
              alCerrar();
              navegar(`/grafo?foco=${encodeURIComponent(centro)}`);
            }}
          >
            Abrir en el grafo completo
          </Boton>
        </div>
        {error ? (
          <p className="py-10 text-center text-sm text-texto-2">{error}</p>
        ) : !local || !grafo ? (
          <div className="h-[26rem]">
            <CargandoGrafo />
          </div>
        ) : local.nodos.length <= 1 ? (
          <p className="py-10 text-center text-sm text-texto-2">
            Aún no tiene conexiones. Enlázalo desde un documento con <code className="rounded bg-superficie-2 px-1 font-mono text-xs">[[…]]</code>, ponle una etiqueta o asígnale un sistema.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-[1fr_15rem]">
            <div className="h-[26rem] overflow-hidden rounded-xl border border-borde bg-superficie">
              <Suspense fallback={<CargandoGrafo />}>
                <LienzoGrafo
                  nodos={local.nodos}
                  aristas={local.aristas}
                  seleccionado={seleccionado}
                  foco={centro}
                  oscuro={oscuro}
                  alSeleccionar={(id) => setSeleccionado(id ?? centro)}
                  alAbrir={(nodo) => {
                    const ruta = rutaNodo(nodo);
                    if (!ruta) return;
                    alCerrar();
                    navegar(ruta);
                  }}
                />
              </Suspense>
            </div>
            {nodoSeleccionado && (
              <div className="h-[26rem] overflow-hidden">
                <PanelNodo nodo={nodoSeleccionado} grafo={{ ...grafo, nodos: local.nodos, aristas: local.aristas }} alSeleccionar={setSeleccionado} alCerrarAntesDeNavegar={alCerrar} />
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
