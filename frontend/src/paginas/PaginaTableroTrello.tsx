import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlignLeft, ArrowLeft, CheckSquare, Columns3, ExternalLink, ListFilter, MessageSquare, Paperclip, RefreshCw, Tag, UserRound, X } from 'lucide-react';
import { apiTrello } from '../servicios/api';
import { notificar } from '../servicios/notificaciones';
import type { MiembroTrelloDto, TableroTrelloDto, TarjetaTrelloDto } from '../servicios/tipos';
import { Boton, EstadoVacio, Esqueleto, unirClases, type Icono } from '../componentes/ui/primitivos';
import { ModalTarjetaTrello } from '../caracteristicas/trello/ModalTarjetaTrello';
import { ImagenTrello } from '../caracteristicas/trello/ImagenTrello';
import { AvatarTrello, ChipEtiquetaTrello, InsigniaVencimiento, estiloFondoTablero } from '../caracteristicas/trello/presentacionTrello';

/** Colores de portada de Trello (franja superior de la tarjeta). */
const coloresPortada: Record<string, string> = {
  green: 'bg-emerald-300',
  yellow: 'bg-yellow-300',
  orange: 'bg-orange-300',
  red: 'bg-rose-300',
  purple: 'bg-violet-300',
  blue: 'bg-blue-300',
  sky: 'bg-sky-300',
  lime: 'bg-lime-300',
  pink: 'bg-pink-300',
  black: 'bg-zinc-400',
};

/**
 * Tablero de Trello en solo lectura, con su fondo como en Trello: listas en columnas, portadas con imagen y filtros
 * por texto, etiqueta, miembro y "mis tarjetas".
 */
export function PaginaTableroTrello() {
  const { id = '' } = useParams();
  const [tablero, setTablero] = useState<TableroTrelloDto | null>(null);
  const [usuarioMiembro, setUsuarioMiembro] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [etiquetaId, setEtiquetaId] = useState('');
  const [miembroId, setMiembroId] = useState('');
  const [abierta, setAbierta] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setTablero(null);
    setError(false);
    Promise.all([apiTrello.tablero(id), apiTrello.conexion()])
      .then(([datos, conexion]) => {
        if (!vigente) return;
        setTablero(datos);
        setUsuarioMiembro(conexion.usuarioMiembro);
      })
      .catch((errorCarga) => {
        if (!vigente) return;
        setError(true);
        notificar.error('No se pudo cargar el tablero', errorCarga);
      });
    return () => {
      vigente = false;
    };
  }, [id]);

  async function actualizar() {
    setActualizando(true);
    try {
      setTablero(await apiTrello.tablero(id, true));
    } catch (errorCarga) {
      notificar.error('No se pudo actualizar el tablero', errorCarga);
    } finally {
      setActualizando(false);
    }
  }

  const miembros = useMemo(() => new Map((tablero?.miembros ?? []).map((miembro) => [miembro.id, miembro])), [tablero]);
  const idPropio = useMemo(() => tablero?.miembros.find((miembro) => miembro.usuario === usuarioMiembro)?.id ?? null, [tablero, usuarioMiembro]);
  // Solo se ofrecen etiquetas que usa alguna tarjeta.
  const etiquetasUsadas = useMemo(() => {
    const usadas = new Set(tablero?.tarjetas.flatMap((tarjeta) => tarjeta.etiquetas.map((etiqueta) => etiqueta.id)) ?? []);
    return (tablero?.etiquetas ?? []).filter((etiqueta) => usadas.has(etiqueta.id));
  }, [tablero]);

  const filtrando = Boolean(filtro.trim() || etiquetaId || miembroId);
  const columnas = useMemo(() => {
    if (!tablero) return [];
    const texto = filtro.trim().toLowerCase();
    const visibles = tablero.tarjetas.filter(
      (tarjeta) =>
        (!miembroId || tarjeta.idMiembros.includes(miembroId)) &&
        (!etiquetaId || tarjeta.etiquetas.some((etiqueta) => etiqueta.id === etiquetaId)) &&
        (!texto || tarjeta.nombre.toLowerCase().includes(texto) || tarjeta.etiquetas.some((etiqueta) => etiqueta.nombre.toLowerCase().includes(texto))),
    );
    return tablero.listas.map((lista) => ({ lista, tarjetas: visibles.filter((tarjeta) => tarjeta.idLista === lista.id) }));
  }, [tablero, filtro, etiquetaId, miembroId]);
  const totalVisibles = columnas.reduce((total, columna) => total + columna.tarjetas.length, 0);

  function limpiarFiltros() {
    setFiltro('');
    setEtiquetaId('');
    setMiembroId('');
  }

  if (error)
    return (
      <EstadoVacio
        icono={Columns3}
        titulo="No se pudo cargar el tablero"
        descripcion="Puede que ya no tengas acceso o que Trello no responda."
        accion={
          <Link to="/trello?vista=tableros">
            <Boton variante="secundario" icono={ArrowLeft}>
              Volver a los tableros
            </Boton>
          </Link>
        }
      />
    );

  if (!tablero)
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-superficie-2 p-3">
        <Esqueleto className="h-10 w-1/3 rounded-lg" />
        <div className="flex gap-3">
          {[0, 1, 2, 3].map((indice) => (
            <Esqueleto key={indice} className="h-96 w-72 shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="relative flex h-[calc(100vh-6.5rem)] min-h-[32rem] flex-col overflow-hidden rounded-2xl shadow-tarjeta" style={estiloFondoTablero(tablero)}>
      {/* Velo para que el texto blanco se lea sobre cualquier fondo. */}
      <span className="pointer-events-none absolute inset-0 bg-black/20" />

      <header className="relative flex flex-wrap items-center gap-2 bg-black/25 px-3 py-2.5 text-white backdrop-blur-sm">
        <Link to="/trello?vista=tableros" className="grid size-8 place-items-center rounded-lg transition hover:bg-white/20" aria-label="Volver a los tableros">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="mr-2 min-w-0 truncate text-lg font-bold drop-shadow">{tablero.nombre}</h1>

        <label className="relative">
          <ListFilter className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/70" />
          <input
            value={filtro}
            onChange={(evento) => setFiltro(evento.target.value)}
            placeholder="Filtrar tarjetas…"
            aria-label="Filtrar tarjetas"
            className="h-8 w-44 rounded-lg border border-white/20 bg-white/15 pl-8 pr-2 text-sm text-white placeholder:text-white/60 focus:border-white/50 focus:bg-white/25 focus:outline-none"
          />
        </label>
        {etiquetasUsadas.length > 0 && (
          <SelectorEnTablero icono={Tag} valor={etiquetaId} alCambiar={setEtiquetaId} etiqueta="Filtrar por etiqueta">
            <option value="">Etiquetas</option>
            {etiquetasUsadas.map((etiqueta) => (
              <option key={etiqueta.id} value={etiqueta.id}>
                {etiqueta.nombre || `(${etiqueta.color ?? 'sin color'})`}
              </option>
            ))}
          </SelectorEnTablero>
        )}
        <SelectorEnTablero icono={UserRound} valor={miembroId} alCambiar={setMiembroId} etiqueta="Filtrar por miembro">
          <option value="">Miembros</option>
          {idPropio && <option value={idPropio}>Mis tarjetas</option>}
          {tablero.miembros
            .filter((miembro) => miembro.id !== idPropio)
            .map((miembro) => (
              <option key={miembro.id} value={miembro.id}>
                {miembro.nombreCompleto}
              </option>
            ))}
        </SelectorEnTablero>
        {filtrando && (
          <button type="button" onClick={limpiarFiltros} className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/90 px-2.5 text-xs font-medium text-zinc-800 transition hover:bg-white">
            <X className="size-3.5" />
            {totalVisibles} de {tablero.tarjetas.length}
          </button>
        )}

        <span className="ml-auto flex items-center gap-1.5">
          <span className="hidden -space-x-1.5 md:flex">
            {tablero.miembros.slice(0, 6).map((miembro) => (
              <AvatarTrello key={miembro.id} miembro={miembro} className="ring-white/50" />
            ))}
            {tablero.miembros.length > 6 && <span className="grid size-6 place-items-center rounded-full bg-white/30 text-[10px] font-semibold">+{tablero.miembros.length - 6}</span>}
          </span>
          <button
            type="button"
            onClick={() => void actualizar()}
            aria-label="Actualizar"
            title="Actualizar"
            className="grid size-8 place-items-center rounded-lg transition hover:bg-white/20"
          >
            <RefreshCw className={unirClases('size-4', actualizando && 'animate-spin')} />
          </button>
          <a href={tablero.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/20 px-2.5 text-xs font-medium transition hover:bg-white/30">
            <ExternalLink className="size-3.5" />
            Abrir en Trello
          </a>
        </span>
      </header>

      <div className="relative flex min-h-0 flex-1 items-start gap-3 overflow-x-auto p-3">
        {columnas.map(({ lista, tarjetas }) => (
          <section key={lista.id} className="flex max-h-full w-72 shrink-0 flex-col rounded-xl bg-superficie-2/95 shadow-tarjeta backdrop-blur">
            <h2 className="flex items-center justify-between gap-2 px-3 pb-1.5 pt-2.5 text-sm font-semibold">
              <span className="truncate">{lista.nombre}</span>
              <span className="rounded-full bg-superficie px-1.5 text-xs font-medium text-texto-3">{tarjetas.length}</span>
            </h2>
            <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto px-2 pb-2">
              {tarjetas.map((tarjeta) => (
                <li key={tarjeta.id}>
                  <TarjetaTablero tarjeta={tarjeta} miembros={miembros} esMia={idPropio !== null && tarjeta.idMiembros.includes(idPropio)} alAbrir={() => setAbierta(tarjeta.id)} />
                </li>
              ))}
              {tarjetas.length === 0 && <li className="px-1.5 py-2 text-center text-xs text-texto-3">{filtrando ? 'Nada coincide' : 'Sin tarjetas'}</li>}
            </ul>
          </section>
        ))}
      </div>

      <ModalTarjetaTrello idTarjeta={abierta} alCerrar={() => setAbierta(null)} />
    </div>
  );
}

function SelectorEnTablero({
  icono: IconoSelector,
  valor,
  alCambiar,
  etiqueta,
  children,
}: {
  icono: Icono;
  valor: string;
  alCambiar: (valor: string) => void;
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <label className={unirClases('relative inline-flex h-8 items-center rounded-lg border text-sm transition', valor ? 'border-white bg-white text-zinc-800' : 'border-white/20 bg-white/15 text-white hover:bg-white/25')}>
      <IconoSelector className="pointer-events-none absolute left-2.5 size-3.5 opacity-80" />
      <select
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        aria-label={etiqueta}
        className="h-full max-w-40 cursor-pointer appearance-none bg-transparent pl-8 pr-3 focus:outline-none [&>option]:text-zinc-800"
      >
        {children}
      </select>
    </label>
  );
}

function TarjetaTablero({ tarjeta, miembros, esMia, alAbrir }: { tarjeta: TarjetaTrelloDto; miembros: Map<string, MiembroTrelloDto>; esMia: boolean; alAbrir: () => void }) {
  const asignados = tarjeta.idMiembros.map((idMiembro) => miembros.get(idMiembro)).filter((miembro): miembro is MiembroTrelloDto => miembro !== undefined);
  const checklistCompleto = tarjeta.elementosChecklist > 0 && tarjeta.elementosChecklistHechos === tarjeta.elementosChecklist;
  const tieneInsignias = tarjeta.vencimiento || tarjeta.tieneDescripcion || tarjeta.comentarios || tarjeta.adjuntos || tarjeta.elementosChecklist || asignados.length;
  const colorPortada = tarjeta.colorPortada ? coloresPortada[tarjeta.colorPortada.split('_')[0]] : undefined;

  return (
    <button
      type="button"
      onClick={alAbrir}
      className={unirClases(
        'group w-full overflow-hidden rounded-lg bg-superficie text-left shadow-tarjeta ring-1 transition hover:ring-2 hover:ring-sky-400',
        esMia ? 'ring-sky-200' : 'ring-borde',
      )}
    >
      {tarjeta.idAdjuntoPortada ? (
        <ImagenTrello idTarjeta={tarjeta.id} idAdjunto={tarjeta.idAdjuntoPortada} alt="" className="h-32 w-full" />
      ) : (
        colorPortada && <span className={unirClases('block h-8', colorPortada)} />
      )}
      <span className="flex flex-col gap-1.5 px-2.5 py-2">
        {tarjeta.etiquetas.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {tarjeta.etiquetas.map((etiqueta) => (
              <ChipEtiquetaTrello key={etiqueta.id} etiqueta={etiqueta} />
            ))}
          </span>
        )}
        <span className="text-sm leading-snug">{tarjeta.nombre}</span>
        {tieneInsignias ? (
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-texto-3">
            {tarjeta.vencimiento && <InsigniaVencimiento vencimiento={tarjeta.vencimiento} completado={tarjeta.vencimientoCompletado} />}
            {tarjeta.tieneDescripcion && <AlignLeft className="size-3.5" aria-label="Tiene descripción" />}
            {tarjeta.comentarios > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <MessageSquare className="size-3.5" />
                {tarjeta.comentarios}
              </span>
            )}
            {tarjeta.adjuntos > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Paperclip className="size-3.5" />
                {tarjeta.adjuntos}
              </span>
            )}
            {tarjeta.elementosChecklist > 0 && (
              <span className={unirClases('inline-flex items-center gap-0.5 rounded px-1', checklistCompleto && 'bg-emerald-100 text-emerald-800')}>
                <CheckSquare className="size-3.5" />
                {tarjeta.elementosChecklistHechos}/{tarjeta.elementosChecklist}
              </span>
            )}
            {asignados.length > 0 && (
              <span className="ml-auto flex -space-x-1.5">
                {asignados.slice(0, 4).map((miembro) => (
                  <AvatarTrello key={miembro.id} miembro={miembro} className="size-5" />
                ))}
              </span>
            )}
          </span>
        ) : null}
      </span>
    </button>
  );
}
