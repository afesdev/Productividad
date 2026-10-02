import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, GitBranch, GitCommitHorizontal, GitMerge, LifeBuoy, RefreshCw } from 'lucide-react';
import { apiRepositorios } from '../servicios/api';
import { formatearFechaHora, formatearRelativo } from '../servicios/formato';
import { notificar } from '../servicios/notificaciones';
import type { GrafoRepositorioDto, RamaGrafoDto } from '../servicios/tipos';
import { coloresCarril, disponerGrafo, type FilaGrafo } from '../caracteristicas/tickets/grafoCommits';
import { PanelCommit } from '../caracteristicas/tickets/PanelCommit';
import { Boton, EncabezadoPagina, EstadoVacio, Esqueleto, unirClases } from '../componentes/ui/primitivos';

const AltoFila = 34;
const AnchoCarril = 16;
const MargenGrafo = 12;
const RadioNodo = 4.5;
const xCarril = (carril: number) => MargenGrafo + carril * AnchoCarril;

/** Grafo de commits estilo GitLens: carriles por rama, merges y ramificaciones, con las puntas de rama etiquetadas. */
export function PaginaGrafoRepositorio() {
  const { id = '' } = useParams();
  const [grafo, setGrafo] = useState<GrafoRepositorioDto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ramaResaltada, setRamaResaltada] = useState<string | null>(null);
  const [shaSeleccionado, setShaSeleccionado] = useState<string | null>(null);
  const cerrarPanel = useCallback(() => setShaSeleccionado(null), []);
  const filasRef = useRef(new Map<string, HTMLTableRowElement>());

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setGrafo(await apiRepositorios.grafo(id));
    } catch (errorCarga) {
      notificar.error('No se pudo cargar el grafo', errorCarga);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const disposicion = useMemo(() => (grafo ? disponerGrafo(grafo.commits, grafo.ramas) : null), [grafo]);
  const anchoGrafo = disposicion ? xCarril(disposicion.carriles - 1) + MargenGrafo : 0;
  const shasEnGrafo = useMemo(() => new Set(grafo?.commits.map((commit) => commit.sha) ?? []), [grafo]);
  const filaSeleccionada = disposicion?.filas.find((fila) => fila.commit.sha === shaSeleccionado);

  function elegirCommit(sha: string) {
    setShaSeleccionado(sha);
    filasRef.current.get(sha)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function irARama(rama: RamaGrafoDto) {
    setRamaResaltada(rama.nombre);
    filasRef.current.get(rama.shaPunta)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <>
      <Link to="/tickets/repositorios" className="mb-3 inline-flex items-center gap-1.5 text-sm text-texto-2 hover:text-texto">
        <ArrowLeft className="size-4" />
        Repositorios
      </Link>
      <EncabezadoPagina
        titulo={grafo ? `Grafo · ${grafo.nombre}` : 'Grafo del repositorio'}
        descripcion={
          grafo
            ? `${grafo.nombreCompleto} · rama principal, desarrollo y ramas con commits en los últimos ${grafo.diasRecientes} días.`
            : 'Historial reciente de ramas, ramificaciones y merges.'
        }
        acciones={
          <div className="flex items-center gap-2">
            {grafo && (
              <a
                href={grafo.urlWeb}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-texto-2 transition-colors hover:bg-superficie-2 hover:text-texto"
              >
                <ExternalLink className="size-4" />
                GitHub
              </a>
            )}
            <Boton variante="secundario" icono={RefreshCw} cargando={cargando && grafo !== null} onClick={() => void cargar()}>
              Actualizar
            </Boton>
          </div>
        }
      />

      {!grafo || !disposicion ? (
        cargando ? (
          <div className="flex flex-col gap-3">
            <Esqueleto className="h-10 rounded-xl" />
            <Esqueleto className="h-96 rounded-xl" />
          </div>
        ) : (
          <EstadoVacio icono={GitBranch} titulo="No se pudo cargar el grafo" descripcion="Revisa que el token de GitHub tenga acceso a este repositorio." />
        )
      ) : disposicion.filas.length === 0 ? (
        <EstadoVacio icono={GitCommitHorizontal} titulo="Sin commits recientes" descripcion="No hay historial para mostrar en las ramas incluidas." />
      ) : (
        <div className="flex flex-col gap-4">
          <LeyendaRamas ramas={grafo.ramas} colorRama={disposicion.colorRama} resaltada={ramaResaltada} alElegir={irARama} />

          <div className="overflow-x-auto rounded-xl border border-borde bg-superficie shadow-tarjeta">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 border-b border-borde bg-fondo text-left text-xs text-texto-2">
                <tr>
                  <th className="px-3 py-2.5 font-medium" style={{ width: anchoGrafo + 24 }}>
                    Grafo
                  </th>
                  <th className="px-3 py-2.5 font-medium">Commit</th>
                  <th className="px-3 py-2.5 font-medium">Autor</th>
                  <th className="px-3 py-2.5 font-medium">Fecha</th>
                  <th className="px-3 py-2.5 text-right font-medium">SHA</th>
                </tr>
              </thead>
              <tbody>
                {disposicion.filas.map((fila) => (
                  <FilaCommit
                    key={fila.commit.sha}
                    fila={fila}
                    anchoGrafo={anchoGrafo}
                    resaltada={fila.ramas.some((rama) => rama.nombre === ramaResaltada)}
                    seleccionada={fila.commit.sha === shaSeleccionado}
                    alElegir={() => setShaSeleccionado(fila.commit.sha)}
                    refFila={(elemento) => {
                      if (elemento) filasRef.current.set(fila.commit.sha, elemento);
                      else filasRef.current.delete(fila.commit.sha);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-texto-3">
            {disposicion.filas.length} commits de {grafo.ramas.length} ramas. Haz clic en un commit para ver sus archivos y cambios. Las líneas punteadas al final continúan en historial más antiguo.
          </p>
        </div>
      )}

      {grafo && (
        <PanelCommit
          repositorioId={grafo.repositorioId}
          sha={shaSeleccionado}
          ramas={filaSeleccionada?.ramas ?? []}
          shasEnGrafo={shasEnGrafo}
          alElegirCommit={elegirCommit}
          alCerrar={cerrarPanel}
        />
      )}
    </>
  );
}

function LeyendaRamas({
  ramas,
  colorRama,
  resaltada,
  alElegir,
}: {
  ramas: RamaGrafoDto[];
  colorRama: Map<string, number>;
  resaltada: string | null;
  alElegir: (rama: RamaGrafoDto) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Ramas">
      {ramas.map((rama) => {
        const color = colorRama.get(rama.nombre);
        return (
          <button
            key={rama.nombre}
            type="button"
            onClick={() => alElegir(rama)}
            title={`Ir a la punta de ${rama.nombre} · último commit ${formatearRelativo(rama.fechaUltimoCommit)}`}
            className={unirClases(
              'inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 font-mono text-xs transition-colors',
              resaltada === rama.nombre ? 'border-borde-fuerte bg-superficie-2 text-texto' : 'border-borde bg-superficie text-texto-2 hover:border-borde-fuerte hover:text-texto',
              (rama.esPrincipal || rama.esDesarrollo) && 'font-semibold',
            )}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color === undefined ? 'var(--color-borde-fuerte, #d4d4d8)' : coloresCarril[color] }} />
            <span className="truncate">{rama.nombre}</span>
            {rama.claveTicket && <span className="shrink-0 rounded bg-orange-50 px-1 font-sans text-[10px] font-medium text-orange-700">{rama.claveTicket}</span>}
          </button>
        );
      })}
    </div>
  );
}

function FilaCommit({
  fila,
  anchoGrafo,
  resaltada,
  seleccionada,
  alElegir,
  refFila,
}: {
  fila: FilaGrafo;
  anchoGrafo: number;
  resaltada: boolean;
  seleccionada: boolean;
  alElegir: () => void;
  refFila: (elemento: HTMLTableRowElement | null) => void;
}) {
  const { commit } = fila;
  return (
    <tr
      ref={refFila}
      style={{ height: AltoFila }}
      onClick={alElegir}
      aria-selected={seleccionada}
      className={unirClases(
        'cursor-pointer border-b border-borde/60 transition-colors last:border-0 hover:bg-fondo',
        resaltada && 'bg-amber-50/60',
        seleccionada && 'bg-violet-50 hover:bg-violet-50',
      )}
    >
      <td className="px-3 py-0" style={{ width: anchoGrafo + 24 }}>
        <SegmentoGrafo fila={fila} ancho={anchoGrafo} />
      </td>
      <td className="max-w-0 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          {fila.ramas.map((rama) => (
            <EtiquetaRama key={rama.nombre} rama={rama} color={coloresCarril[fila.color]} />
          ))}
          {fila.esMerge && <GitMerge className="size-3.5 shrink-0 text-texto-3" aria-label="Merge" />}
          <span className={unirClases('truncate', fila.esMerge ? 'text-texto-2' : 'text-texto')} title={commit.mensaje}>
            {commit.mensaje}
          </span>
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-1.5 text-xs text-texto-2">{commit.autor}</td>
      <td className="whitespace-nowrap px-3 py-1.5 text-xs text-texto-3" title={formatearFechaHora(commit.fecha)}>
        {formatearRelativo(commit.fecha)}
      </td>
      <td className="whitespace-nowrap px-3 py-1.5 text-right">
        <a href={commit.url} target="_blank" rel="noreferrer" onClick={(evento) => evento.stopPropagation()} className="font-mono text-xs text-texto-3 hover:text-texto hover:underline">
          {commit.sha.slice(0, 7)}
        </a>
      </td>
    </tr>
  );
}

function EtiquetaRama({ rama, color }: { rama: RamaGrafoDto; color: string }) {
  const contenido = (
    <>
      <GitBranch className="size-3 shrink-0" style={{ color }} />
      <span className="max-w-56 truncate">{rama.nombre}</span>
    </>
  );
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <span
        className={unirClases(
          'inline-flex items-center gap-1 rounded-md border bg-superficie px-1.5 py-0.5 font-mono text-[11px] text-texto',
          rama.esPrincipal || rama.esDesarrollo ? 'font-semibold' : 'font-medium',
        )}
        style={{ borderColor: color }}
        title={rama.nombre}
      >
        {contenido}
      </span>
      {rama.ticketId && (
        <Link
          to={`/tickets/${rama.ticketId}`}
          onClick={(evento) => evento.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-1.5 py-0.5 text-[11px] font-medium text-orange-700 hover:bg-orange-100"
          title="Abrir el ticket vinculado"
        >
          <LifeBuoy className="size-3" />
          {rama.claveTicket}
        </Link>
      )}
    </span>
  );
}

/** Dibuja la porción del grafo de una fila: tramos que la cruzan, llegan al nodo o salen hacia los padres. */
function SegmentoGrafo({ fila, ancho }: { fila: FilaGrafo; ancho: number }) {
  const medio = AltoFila / 2;
  const cx = xCarril(fila.columna);
  const curva = (x1: number, y1: number, x2: number, y2: number) =>
    x1 === x2 ? `M${x1},${y1} L${x2},${y2}` : `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`;

  return (
    <svg width={ancho} height={AltoFila} className="block overflow-visible" aria-hidden>
      {fila.tramos.map((tramo, indice) => {
        const color = coloresCarril[tramo.color];
        const d =
          tramo.tramo === 'completa'
            ? curva(xCarril(tramo.desde), 0, xCarril(tramo.hasta), AltoFila)
            : tramo.tramo === 'superior'
              ? curva(xCarril(tramo.desde), 0, cx, medio)
              : curva(cx, medio, xCarril(tramo.hasta), AltoFila);
        return <path key={indice} d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeDasharray={tramo.truncado ? '2 3' : undefined} />;
      })}
      {fila.esMerge ? (
        <circle cx={cx} cy={medio} r={RadioNodo} fill="var(--color-superficie)" stroke={coloresCarril[fila.color]} strokeWidth={2} />
      ) : (
        <circle cx={cx} cy={medio} r={fila.ramas.length > 0 ? RadioNodo + 1 : RadioNodo} fill={coloresCarril[fila.color]} stroke="var(--color-superficie)" strokeWidth={2} />
      )}
    </svg>
  );
}
