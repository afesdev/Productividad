import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  Clock,
  Columns3,
  Inbox,
  KeyRound,
  Link2,
  ListFilter,
  Lock,
  MessageSquare,
  RefreshCw,
  Shield,
  Star,
  Unplug,
  Users,
} from 'lucide-react';
import { apiTrello } from '../servicios/api';
import { formatearRelativo } from '../servicios/formato';
import { notificar } from '../servicios/notificaciones';
import type { EstadoConexionTrelloDto, TableroTrelloResumenDto, TarjetaAsignadaTrelloDto } from '../servicios/tipos';
import { Boton, Casilla, EncabezadoPagina, EstadoVacio, Esqueleto, Selector, Tarjeta, unirClases, type Icono } from '../componentes/ui/primitivos';
import { usarConfirmacion } from '../componentes/ui/DialogoConfirmacion';
import { MenuAcciones } from '../caracteristicas/documentos/MenuAcciones';
import { ModalTarjetaTrello } from '../caracteristicas/trello/ModalTarjetaTrello';
import { invalidarConexionTrello } from '../caracteristicas/trello/conexionTrello';
import {
  ChipEtiquetaTrello,
  InsigniaVencimiento,
  estiloFondoTablero,
  extraerTokenDelFragmento,
  urlAutorizacionTrello,
} from '../caracteristicas/trello/presentacionTrello';

type Vista = 'tarjetas' | 'tableros';

/**
 * Trello en solo lectura: "Mis tarjetas" (asignadas a mí en todos los tableros) y la lista de tableros.
 * También recibe la vuelta de la autorización de Trello (#token=… en el fragmento).
 */
export function PaginaTrello() {
  const [conexion, setConexion] = useState<EstadoConexionTrelloDto | null>(null);
  const [parametros, setParametros] = useSearchParams();
  const vista: Vista = parametros.get('vista') === 'tableros' ? 'tableros' : 'tarjetas';
  const [recarga, setRecarga] = useState({ vuelta: 0, actualizar: false });
  const confirmar = usarConfirmacion();
  // StrictMode ejecuta el efecto dos veces: el token del fragmento solo se envía una.
  const iniciado = useRef(false);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    const token = extraerTokenDelFragmento();
    const peticion = token
      ? apiTrello.conectar(token).then((estado) => {
          invalidarConexionTrello();
          notificar.exito('Trello conectado', estado.nombreMiembro ?? undefined);
          return estado;
        })
      : apiTrello.conexion();
    peticion.then(setConexion).catch((error) => {
      notificar.error(token ? 'No se pudo conectar Trello' : 'No se pudo consultar Trello', error);
      apiTrello
        .conexion()
        .then(setConexion)
        .catch(() => setConexion({ apiKey: null, conectado: false, nombreMiembro: null, usuarioMiembro: null, fechaConexion: null }));
    });
  }, []);

  async function desconectar() {
    const aceptado = await confirmar({
      titulo: 'Desconectar Trello',
      descripcion: 'Se borra el acceso guardado y se revoca en Trello. Tus tableros no cambian.',
      textoConfirmar: 'Desconectar',
      peligrosa: true,
    });
    if (!aceptado) return;
    try {
      await apiTrello.desconectar();
      invalidarConexionTrello();
      setConexion((actual) => (actual ? { ...actual, conectado: false, nombreMiembro: null, usuarioMiembro: null, fechaConexion: null } : actual));
      notificar.exito('Trello desconectado');
    } catch (error) {
      notificar.error('No se pudo desconectar', error);
    }
  }

  if (!conexion) {
    return (
      <div className="flex flex-col gap-4">
        <Esqueleto className="h-9 w-48" />
        <Esqueleto className="h-[50vh] w-full" />
      </div>
    );
  }

  if (!conexion.conectado) {
    return (
      <>
        <EncabezadoPagina titulo="Trello" descripcion="Tus tarjetas y tableros de Trello, solo lectura." />
        <PanelConexion apiKey={conexion.apiKey} />
      </>
    );
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Trello"
        descripcion={`Conectado como ${conexion.nombreMiembro}${conexion.usuarioMiembro ? ` (@${conexion.usuarioMiembro})` : ''} · solo lectura`}
        acciones={
          <>
            <Boton variante="secundario" icono={RefreshCw} onClick={() => setRecarga((actual) => ({ vuelta: actual.vuelta + 1, actualizar: true }))}>
              Actualizar
            </Boton>
            <MenuAcciones acciones={[{ etiqueta: 'Desconectar Trello', icono: Unplug, alPulsar: () => void desconectar(), peligrosa: true }]} />
          </>
        }
      />

      <div className="mb-5 flex border-b border-borde" role="tablist">
        {(
          [
            { valor: 'tarjetas', etiqueta: 'Mis tarjetas', icono: Inbox },
            { valor: 'tableros', etiqueta: 'Tableros', icono: Columns3 },
          ] as const
        ).map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            role="tab"
            aria-selected={vista === opcion.valor}
            onClick={() => setParametros(opcion.valor === 'tarjetas' ? {} : { vista: opcion.valor }, { replace: true })}
            className={unirClases(
              '-mb-px inline-flex h-10 items-center gap-1.5 border-b-2 px-4 text-sm font-medium transition-colors',
              vista === opcion.valor ? 'border-sky-500 text-texto' : 'border-transparent text-texto-2 hover:text-texto',
            )}
          >
            <opcion.icono className="size-4" />
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      {vista === 'tarjetas' ? (
        <VistaMisTarjetas key={`t${recarga.vuelta}`} actualizar={recarga.actualizar} />
      ) : (
        <VistaTableros key={`b${recarga.vuelta}`} actualizar={recarga.actualizar} />
      )}
    </>
  );
}

// ---------- Conexión ----------

function PanelConexion({ apiKey }: { apiKey: string | null }) {
  return (
    <Tarjeta className="mx-auto flex max-w-2xl flex-col gap-5 p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-600">
          <Columns3 className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">Conecta tu cuenta de Trello</h2>
          <p className="mt-1 text-sm text-texto-2">
            Verás las tarjetas asignadas a ti y los tableros que administras o en los que participas. La app solo lee: no crea, mueve ni comenta tarjetas.
          </p>
        </div>
      </div>
      {apiKey ? (
        <div className="flex justify-end">
          <Boton icono={Link2} onClick={() => window.location.assign(urlAutorizacionTrello(apiKey))}>
            Conectar con Trello
          </Boton>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <KeyRound className="mt-0.5 size-4 shrink-0" />
          <div>
            Falta configurar la integración en el servidor:
            <ol className="mt-1 list-decimal pl-5 text-xs">
              <li>Crea un Power-Up en trello.com/power-ups/admin y genera su API key.</li>
              <li>
                Guárdala en los secretos de la API como <code className="rounded bg-amber-100 px-1">Trello:ApiKey</code>.
              </li>
              <li>Añade el dominio de la app (y localhost) a los orígenes permitidos del Power-Up.</li>
            </ol>
          </div>
        </div>
      )}
      <p className="flex items-start gap-2 rounded-lg bg-superficie-2 px-3 py-2 text-xs text-texto-2">
        <Lock className="mt-0.5 size-3.5 shrink-0" />
        Trello te pedirá permiso de solo lectura. El acceso se guarda cifrado; al desconectar se borra y se revoca en Trello.
      </p>
    </Tarjeta>
  );
}

// ---------- Mis tarjetas ----------

type Grupo = { clave: string; titulo: string; tono: string; color?: string | null; tarjetas: TarjetaAsignadaTrelloDto[] };
type Agrupacion = 'fecha' | 'tablero';

const ClaveAgrupacion = 'trello.misTarjetas.agrupacion';

const ordenarPorVencimiento = (tarjetas: TarjetaAsignadaTrelloDto[]) =>
  [...tarjetas].sort((a, b) => (a.tarjeta.vencimiento ?? '9999').localeCompare(b.tarjeta.vencimiento ?? '9999'));

function agruparPorFecha(tarjetas: TarjetaAsignadaTrelloDto[]): Grupo[] {
  const ahora = new Date();
  const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);
  const finSemana = new Date(finHoy.getTime() + 6 * 24 * 3600 * 1000);
  const grupos: Grupo[] = [
    { clave: 'vencidas', titulo: 'Vencidas', tono: 'text-rose-600', tarjetas: [] },
    { clave: 'hoy', titulo: 'Hoy', tono: 'text-amber-600', tarjetas: [] },
    { clave: 'semana', titulo: 'Próximos 7 días', tono: 'text-texto-2', tarjetas: [] },
    { clave: 'despues', titulo: 'Más adelante', tono: 'text-texto-2', tarjetas: [] },
    { clave: 'sin-fecha', titulo: 'Sin fecha', tono: 'text-texto-3', tarjetas: [] },
    { clave: 'completadas', titulo: 'Completadas', tono: 'text-emerald-600', tarjetas: [] },
  ];
  for (const asignada of ordenarPorVencimiento(tarjetas)) {
    const { vencimiento, vencimientoCompletado } = asignada.tarjeta;
    const fecha = vencimiento ? new Date(vencimiento) : null;
    const indice = vencimientoCompletado ? 5 : !fecha ? 4 : fecha < ahora ? 0 : fecha < finHoy ? 1 : fecha < finSemana ? 2 : 3;
    grupos[indice].tarjetas.push(asignada);
  }
  return grupos.filter((grupo) => grupo.tarjetas.length > 0);
}

function agruparPorTablero(tarjetas: TarjetaAsignadaTrelloDto[]): Grupo[] {
  const grupos = new Map<string, Grupo>();
  for (const asignada of ordenarPorVencimiento(tarjetas)) {
    const clave = asignada.tarjeta.idTablero;
    if (!grupos.has(clave)) grupos.set(clave, { clave, titulo: asignada.nombreTablero, tono: 'text-texto', color: asignada.colorFondoTablero, tarjetas: [] });
    grupos.get(clave)!.tarjetas.push(asignada);
  }
  return [...grupos.values()].sort((a, b) => b.tarjetas.length - a.tarjetas.length || a.titulo.localeCompare(b.titulo, 'es'));
}

function VistaMisTarjetas({ actualizar }: { actualizar: boolean }) {
  const [tarjetas, setTarjetas] = useState<TarjetaAsignadaTrelloDto[] | null>(null);
  const [error, setError] = useState(false);
  const [verCompletadas, setVerCompletadas] = useState(false);
  const [texto, setTexto] = useState('');
  const [tableroId, setTableroId] = useState('');
  const [agrupacion, setAgrupacion] = useState<Agrupacion>(() => (leerPreferencia(ClaveAgrupacion) === 'tablero' ? 'tablero' : 'fecha'));
  const [abierta, setAbierta] = useState<string | null>(null);

  useEffect(() => {
    apiTrello
      .misTarjetas(actualizar)
      .then(setTarjetas)
      .catch((errorCarga) => {
        setError(true);
        notificar.error('No se pudieron cargar tus tarjetas', errorCarga);
      });
  }, [actualizar]);

  const tableros = useMemo(() => {
    const porId = new Map<string, { id: string; nombre: string; total: number }>();
    for (const asignada of tarjetas ?? []) {
      const actual = porId.get(asignada.tarjeta.idTablero) ?? { id: asignada.tarjeta.idTablero, nombre: asignada.nombreTablero, total: 0 };
      actual.total++;
      porId.set(actual.id, actual);
    }
    return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [tarjetas]);

  const grupos = useMemo(() => {
    if (!tarjetas) return [];
    const consulta = texto.trim().toLowerCase();
    const visibles = tarjetas.filter(
      (asignada) =>
        (verCompletadas || !asignada.tarjeta.vencimientoCompletado) &&
        (!tableroId || asignada.tarjeta.idTablero === tableroId) &&
        (!consulta ||
          asignada.tarjeta.nombre.toLowerCase().includes(consulta) ||
          asignada.nombreLista.toLowerCase().includes(consulta) ||
          asignada.tarjeta.etiquetas.some((etiqueta) => etiqueta.nombre.toLowerCase().includes(consulta))),
    );
    return agrupacion === 'tablero' ? agruparPorTablero(visibles) : agruparPorFecha(visibles);
  }, [tarjetas, verCompletadas, tableroId, texto, agrupacion]);

  function cambiarAgrupacion(nueva: Agrupacion) {
    setAgrupacion(nueva);
    guardarPreferencia(ClaveAgrupacion, nueva);
  }

  if (error) return <EstadoVacio icono={Inbox} titulo="No se pudieron cargar tus tarjetas" descripcion="Pulsa Actualizar para intentarlo de nuevo." />;
  if (!tarjetas) return <ListaEsqueleto />;
  if (tarjetas.length === 0)
    return <EstadoVacio icono={Inbox} titulo="No tienes tarjetas asignadas" descripcion="Aquí aparecen las tarjetas de Trello en las que eres miembro." />;

  const completadas = tarjetas.filter((asignada) => asignada.tarjeta.vencimientoCompletado).length;
  const ahora = new Date();
  const vencidas = tarjetas.filter((asignada) => asignada.tarjeta.vencimiento && !asignada.tarjeta.vencimientoCompletado && new Date(asignada.tarjeta.vencimiento) < ahora).length;
  const totalVisibles = grupos.reduce((total, grupo) => total + grupo.tarjetas.length, 0);

  return (
    <>
      <div className="mb-5 grid grid-cols-3 gap-3 sm:max-w-md">
        <Cifra valor={tarjetas.length - completadas} etiqueta="Pendientes" />
        <Cifra valor={vencidas} etiqueta="Vencidas" tono={vencidas > 0 ? 'text-rose-600' : undefined} />
        <Cifra valor={tableros.length} etiqueta={tableros.length === 1 ? 'Tablero' : 'Tableros'} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <CampoFiltro valor={texto} alCambiar={setTexto} placeholder="Buscar en mis tarjetas…" />
        {tableros.length > 1 && (
          <Selector value={tableroId} onChange={(evento) => setTableroId(evento.target.value)} aria-label="Filtrar por tablero" className="h-8 w-auto max-w-56 text-sm">
            <option value="">Todos los tableros</option>
            {tableros.map((tablero) => (
              <option key={tablero.id} value={tablero.id}>
                {tablero.nombre} ({tablero.total})
              </option>
            ))}
          </Selector>
        )}
        <Segmentado
          valor={agrupacion}
          alCambiar={cambiarAgrupacion}
          opciones={[
            { valor: 'fecha', etiqueta: 'Por fecha', icono: CalendarClock },
            { valor: 'tablero', etiqueta: 'Por tablero', icono: Columns3 },
          ]}
        />
        {completadas > 0 && (
          <Casilla className="ml-auto" etiqueta={`Completadas (${completadas})`} checked={verCompletadas} onChange={(evento) => setVerCompletadas(evento.target.checked)} />
        )}
      </div>

      <div className="flex flex-col gap-6">
        {grupos.map((grupo) => (
          <section key={grupo.clave}>
            <h2 className={unirClases('mb-1.5 flex items-center gap-2 text-xs font-semibold', grupo.tono)}>
              {agrupacion === 'tablero' && <span className="size-2.5 rounded-sm" style={estiloFondoTablero({ colorFondo: grupo.color ?? null })} />}
              {grupo.titulo} · {grupo.tarjetas.length}
            </h2>
            <ul className="divide-y divide-borde/60 overflow-hidden rounded-xl border border-borde bg-superficie">
              {grupo.tarjetas.map((asignada) => (
                <li key={asignada.tarjeta.id}>
                  <FilaTarjeta asignada={asignada} mostrarTablero={agrupacion === 'fecha'} alAbrir={() => setAbierta(asignada.tarjeta.id)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        {totalVisibles === 0 &&
          (texto || tableroId ? (
            <p className="py-8 text-center text-sm text-texto-3">Ninguna tarjeta coincide con los filtros.</p>
          ) : (
            <EstadoVacio icono={CheckCircle2} titulo="Todo completado" descripcion="Tus tarjetas asignadas tienen el vencimiento marcado como hecho." />
          ))}
      </div>
      <ModalTarjetaTrello idTarjeta={abierta} alCerrar={() => setAbierta(null)} />
    </>
  );
}

function FilaTarjeta({ asignada, mostrarTablero, alAbrir }: { asignada: TarjetaAsignadaTrelloDto; mostrarTablero: boolean; alAbrir: () => void }) {
  const { tarjeta, nombreTablero, nombreLista, colorFondoTablero } = asignada;
  const checklistCompleto = tarjeta.elementosChecklist > 0 && tarjeta.elementosChecklistHechos === tarjeta.elementosChecklist;
  return (
    <button type="button" onClick={alAbrir} className="flex w-full min-w-0 items-stretch text-left text-sm transition-colors hover:bg-superficie-2">
      {/* Franja con el color del tablero. */}
      <span className="w-1 shrink-0" style={estiloFondoTablero({ colorFondo: colorFondoTablero })} />
      <span className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-2.5">
        <span className="min-w-0 flex-1">
          <span className={unirClases('block truncate font-medium', tarjeta.vencimientoCompletado && 'text-texto-3 line-through')}>{tarjeta.nombre}</span>
          <span className="block truncate text-xs text-texto-3">{mostrarTablero ? `${nombreTablero}${nombreLista ? ` · ${nombreLista}` : ''}` : nombreLista}</span>
        </span>
        <span className="hidden max-w-[30%] flex-wrap justify-end gap-1 lg:flex">
          {tarjeta.etiquetas.slice(0, 3).map((etiqueta) => (
            <ChipEtiquetaTrello key={etiqueta.id} etiqueta={etiqueta} />
          ))}
        </span>
        <span className="hidden shrink-0 items-center gap-2.5 text-xs text-texto-3 sm:flex">
          {tarjeta.elementosChecklist > 0 && (
            <span className={unirClases('inline-flex items-center gap-0.5 rounded px-1', checklistCompleto && 'bg-emerald-100 text-emerald-800')}>
              <CheckSquare className="size-3.5" />
              {tarjeta.elementosChecklistHechos}/{tarjeta.elementosChecklist}
            </span>
          )}
          {tarjeta.comentarios > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <MessageSquare className="size-3.5" />
              {tarjeta.comentarios}
            </span>
          )}
        </span>
        {tarjeta.vencimiento && <InsigniaVencimiento vencimiento={tarjeta.vencimiento} completado={tarjeta.vencimientoCompletado} className="shrink-0" />}
      </span>
    </button>
  );
}

function Cifra({ valor, etiqueta, tono }: { valor: number; etiqueta: string; tono?: string }) {
  return (
    <div className="rounded-xl bg-superficie-2 px-3.5 py-2.5">
      <p className={unirClases('text-xl font-semibold tabular-nums', tono)}>{valor}</p>
      <p className="text-xs text-texto-2">{etiqueta}</p>
    </div>
  );
}

function CampoFiltro({ valor, alCambiar, placeholder }: { valor: string; alCambiar: (valor: string) => void; placeholder: string }) {
  return (
    <label className="relative w-full max-w-xs">
      <ListFilter className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-texto-3" />
      <input
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-8 w-full rounded-lg border border-borde bg-superficie pl-8 pr-3 text-sm placeholder:text-texto-3 focus:border-acento focus:outline-none"
      />
    </label>
  );
}

function Segmentado<T extends string>({ valor, alCambiar, opciones }: { valor: T; alCambiar: (valor: T) => void; opciones: { valor: T; etiqueta: string; icono: Icono }[] }) {
  return (
    <div className="inline-flex rounded-lg bg-superficie-2 p-0.5" role="radiogroup">
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          role="radio"
          aria-checked={valor === opcion.valor}
          onClick={() => alCambiar(opcion.valor)}
          className={unirClases(
            'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
            valor === opcion.valor ? 'bg-superficie text-texto shadow-tarjeta' : 'text-texto-2 hover:text-texto',
          )}
        >
          <opcion.icono className="size-3.5" />
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  );
}

// ---------- Tableros ----------

function VistaTableros({ actualizar }: { actualizar: boolean }) {
  const [tableros, setTableros] = useState<TableroTrelloResumenDto[] | null>(null);
  const [error, setError] = useState(false);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    apiTrello
      .tableros(actualizar)
      .then(setTableros)
      .catch((errorCarga) => {
        setError(true);
        notificar.error('No se pudieron cargar los tableros', errorCarga);
      });
  }, [actualizar]);

  const secciones = useMemo(() => {
    if (!tableros) return [];
    const texto = filtro.trim().toLowerCase();
    const visibles = tableros
      .filter((tablero) => !texto || tablero.nombre.toLowerCase().includes(texto) || (tablero.nombreWorkspace ?? '').toLowerCase().includes(texto))
      .sort((a, b) => (b.fechaUltimaActividad ?? '').localeCompare(a.fechaUltimaActividad ?? ''));
    const porWorkspace = new Map<string, TableroTrelloResumenDto[]>();
    for (const tablero of visibles) {
      const clave = tablero.nombreWorkspace ?? 'Sin workspace';
      porWorkspace.set(clave, [...(porWorkspace.get(clave) ?? []), tablero]);
    }
    const destacados = visibles.filter((tablero) => tablero.destacado);
    // Al filtrar sobran los accesos rápidos: se ve directamente cada workspace.
    const recientes = texto || visibles.length <= 4 ? [] : visibles.slice(0, 4);
    return [
      ...(destacados.length && !texto ? [{ titulo: 'Destacados', icono: Star, tableros: destacados }] : []),
      ...(recientes.length ? [{ titulo: 'Actividad reciente', icono: Clock, tableros: recientes }] : []),
      ...[...porWorkspace.entries()]
        .sort(([a], [b]) => a.localeCompare(b, 'es'))
        .map(([titulo, lista]) => ({ titulo, icono: Users, tableros: [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) })),
    ];
  }, [tableros, filtro]);

  if (error) return <EstadoVacio icono={Columns3} titulo="No se pudieron cargar los tableros" descripcion="Pulsa Actualizar para intentarlo de nuevo." />;
  if (!tableros)
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((indice) => (
          <Esqueleto key={indice} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  if (tableros.length === 0) return <EstadoVacio icono={Columns3} titulo="No tienes tableros abiertos" />;

  return (
    <>
      <div className="mb-5">
        <CampoFiltro valor={filtro} alCambiar={setFiltro} placeholder="Filtrar tableros o workspaces…" />
      </div>
      <div className="flex flex-col gap-8">
        {secciones.map((seccion) => (
          <section key={seccion.titulo}>
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <seccion.icono className={unirClases('size-4', seccion.icono === Star ? 'fill-amber-300 text-amber-400' : 'text-texto-3')} />
              {seccion.titulo}
              <span className="font-normal text-texto-3">· {seccion.tableros.length}</span>
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {seccion.tableros.map((tablero) => (
                <li key={tablero.id}>
                  <MosaicoTablero tablero={tablero} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        {secciones.length === 0 && <p className="py-8 text-center text-sm text-texto-3">Ningún tablero coincide con "{filtro}".</p>}
      </div>
    </>
  );
}

function MosaicoTablero({ tablero }: { tablero: TableroTrelloResumenDto }) {
  return (
    <Link
      to={`/trello/tableros/${tablero.id}`}
      style={estiloFondoTablero(tablero)}
      className="group relative flex h-28 flex-col justify-between overflow-hidden rounded-xl p-3 text-white shadow-tarjeta transition hover:-translate-y-0.5 hover:shadow-flotante"
    >
      <span className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/40 transition-colors group-hover:from-black/55" />
      <span className="relative flex items-start justify-between gap-2">
        <span className="line-clamp-2 font-semibold leading-snug drop-shadow">{tablero.nombre}</span>
        {tablero.destacado && <Star className="size-4 shrink-0 fill-amber-300 text-amber-300 drop-shadow" aria-label="Destacado" />}
      </span>
      <span className="relative flex items-center gap-1.5 text-[11px] font-medium text-white/90">
        {tablero.esAdmin && (
          <span className="inline-flex items-center gap-1 rounded bg-white/25 px-1.5 py-0.5 backdrop-blur">
            <Shield className="size-3" />
            Admin
          </span>
        )}
        {tablero.fechaUltimaActividad && <span className="truncate drop-shadow">Actividad {formatearRelativo(tablero.fechaUltimaActividad)}</span>}
      </span>
    </Link>
  );
}

function ListaEsqueleto() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2, 3, 4, 5].map((indice) => (
        <Esqueleto key={indice} className="h-12 rounded-lg" />
      ))}
    </div>
  );
}

function leerPreferencia(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function guardarPreferencia(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // Preferencia visual: sin almacenamiento solo dura la sesión.
  }
}
