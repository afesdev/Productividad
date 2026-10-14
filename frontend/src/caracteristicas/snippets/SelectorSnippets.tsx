import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Code2, Loader2, Search, Star } from 'lucide-react';
import { apiSnippets } from '../../servicios/api';
import type { SnippetDto } from '../../servicios/tipos';
import { Modal } from '../../componentes/ui/Modal';
import { unirClases } from '../../componentes/ui/primitivos';
import { VistaSnippet } from './VistaSnippet';
import { etiquetaLenguaje, lenguajeResaltado } from './utilidadesSnippets';

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function filtrar(snippets: SnippetDto[], texto: string) {
  const consulta = normalizar(texto.trim());
  if (!consulta) return snippets;
  return snippets.filter((snippet) => normalizar(`${snippet.titulo} ${snippet.descripcion ?? ''} ${snippet.contenido} ${snippet.lenguaje}`).includes(consulta));
}

/** Carga la biblioteca una vez por apertura (ya viene ordenada: favoritos y más usados primero). */
function usarSnippets(activo: boolean) {
  const [snippets, setSnippets] = useState<SnippetDto[] | null>(null);
  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    apiSnippets
      .listar()
      .then((lista) => vigente && setSnippets(lista))
      .catch(() => vigente && setSnippets([]));
    return () => {
      vigente = false;
    };
  }, [activo]);
  return snippets;
}

// ---------- Selector para el editor ("/snippet") ----------

export interface SnippetInsertado {
  /** Lenguaje para el bloque de código (null = sin resaltado). */
  lenguaje: string | null;
  contenido: string;
}

type Solicitud = () => Promise<SnippetInsertado | null>;

// Lo registra ProveedorSelectorSnippets: los comandos "/" del editor no son componentes de React.
let solicitar: Solicitud | null = null;

/** Abre el selector y resuelve con el snippet (variables ya sustituidas) o null si se cancela. */
export const solicitarSnippet: Solicitud = () => (solicitar ? solicitar() : Promise.resolve(null));

export function ProveedorSelectorSnippets() {
  const [abierto, setAbierto] = useState(false);
  const resolver = useRef<(valor: SnippetInsertado | null) => void>();

  useEffect(() => {
    solicitar = () =>
      new Promise((resolverPromesa) => {
        resolver.current?.(null);
        resolver.current = resolverPromesa;
        setAbierto(true);
      });
    return () => {
      solicitar = null;
    };
  }, []);

  function responder(valor: SnippetInsertado | null) {
    resolver.current?.(valor);
    resolver.current = undefined;
    setAbierto(false);
  }

  return (
    <Modal abierto={abierto} alCerrar={() => responder(null)} titulo="Insertar snippet" descripcion="Se inserta como bloque de código con las variables rellenas." ancho="xl">
      {abierto && <ContenidoSelector alInsertar={(snippet, contenido) => responder({ lenguaje: lenguajeResaltado(snippet.lenguaje), contenido })} />}
    </Modal>
  );
}

function ContenidoSelector({ alInsertar }: { alInsertar: (snippet: SnippetDto, contenido: string) => void }) {
  const snippets = usarSnippets(true);
  const [texto, setTexto] = useState('');
  const [elegidoId, setElegidoId] = useState<string | null>(null);
  const visibles = useMemo(() => filtrar(snippets ?? [], texto), [snippets, texto]);
  const elegido = visibles.find((snippet) => snippet.id === elegidoId) ?? visibles[0] ?? null;

  if (snippets === null) return <Loader2 className="mx-auto my-10 size-5 animate-spin text-texto-3" />;
  if (snippets.length === 0)
    return (
      <p className="py-10 text-center text-sm text-texto-2">
        Aún no tienes snippets.{' '}
        <Link to="/snippets" className="font-medium text-acento hover:underline">
          Crea el primero
        </Link>
      </p>
    );

  return (
    <div className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col gap-2">
        <label className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-texto-3" />
          <input
            autoFocus
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Buscar snippet…"
            aria-label="Buscar snippet"
            className="h-9 w-full rounded-lg border border-borde bg-superficie pl-8 pr-3 text-sm focus:border-acento focus:outline-none"
          />
        </label>
        <ul className="flex max-h-80 flex-col overflow-y-auto">
          {visibles.map((snippet) => (
            <li key={snippet.id}>
              <button
                type="button"
                onClick={() => setElegidoId(snippet.id)}
                className={unirClases(
                  'flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm',
                  elegido?.id === snippet.id ? 'bg-violet-50 text-violet-950' : 'hover:bg-superficie-2',
                )}
              >
                <span className="min-w-0 flex-1 truncate">{snippet.titulo}</span>
                {snippet.esFavorito && <Star className="size-3 shrink-0 fill-amber-300 text-amber-400" />}
                <span className="shrink-0 text-[10px] uppercase text-texto-3">{etiquetaLenguaje(snippet.lenguaje)}</span>
              </button>
            </li>
          ))}
          {visibles.length === 0 && <li className="px-2 py-4 text-center text-xs text-texto-3">Nada coincide.</li>}
        </ul>
      </div>
      <div className="min-w-0">
        {elegido ? (
          <>
            <p className="mb-2 text-sm font-semibold">{elegido.titulo}</p>
            <VistaSnippet key={elegido.id} snippet={elegido} textoAccion="Insertar" alUsar={(contenido) => alInsertar(elegido, contenido)} />
          </>
        ) : null}
      </div>
    </div>
  );
}

// ---------- Lista compacta (panel de referencia) ----------

/** Búsqueda y lista desplegable de snippets para el panel lateral: copiar sin salir de la página. */
export function ListaSnippetsCompacta() {
  const snippets = usarSnippets(true);
  const [texto, setTexto] = useState('');
  const [desplegado, setDesplegado] = useState<string | null>(null);
  const visibles = useMemo(() => filtrar(snippets ?? [], texto).slice(0, 40), [snippets, texto]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-borde px-3 py-2">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-texto-3" />
          <input
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Buscar snippet…"
            aria-label="Buscar snippet"
            className="h-8 w-full rounded-lg border border-borde bg-superficie pl-7 pr-2 text-sm focus:border-acento focus:outline-none"
          />
        </label>
        <Link to="/snippets" className="shrink-0 text-xs font-medium text-acento hover:underline">
          Gestionar
        </Link>
      </div>
      {snippets === null ? (
        <Loader2 className="mx-auto my-8 size-5 animate-spin text-texto-3" />
      ) : snippets.length === 0 ? (
        <p className="px-6 py-10 text-center text-xs text-texto-2">
          Aún no tienes snippets.{' '}
          <Link to="/snippets" className="font-medium text-acento hover:underline">
            Crea el primero
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-3">
          {visibles.map((snippet) => (
            <li key={snippet.id} className="overflow-hidden rounded-xl border border-borde bg-superficie">
              <button
                type="button"
                onClick={() => setDesplegado((actual) => (actual === snippet.id ? null : snippet.id))}
                aria-expanded={desplegado === snippet.id}
                className="flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left text-sm"
              >
                <Code2 className="size-4 shrink-0 text-texto-3" />
                <span className="min-w-0 flex-1 truncate font-medium">{snippet.titulo}</span>
                {snippet.esFavorito && <Star className="size-3 shrink-0 fill-amber-300 text-amber-400" />}
                <ChevronDown className={unirClases('size-4 shrink-0 text-texto-3 transition-transform', desplegado === snippet.id && 'rotate-180')} />
              </button>
              {desplegado === snippet.id && (
                <div className="border-t border-borde px-3 py-2.5">
                  <VistaSnippet snippet={snippet} compacto />
                </div>
              )}
            </li>
          ))}
          {visibles.length === 0 && <li className="py-6 text-center text-xs text-texto-3">Nada coincide.</li>}
        </ul>
      )}
    </div>
  );
}
