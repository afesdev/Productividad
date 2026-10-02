import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  CalendarDays,
  FileSpreadsheet,
  ChevronDown,
  FilePlus2,
  FileText,
  Grid2x2,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  ListPlus,
  LogOut,
  Menu,
  Monitor,
  Moon,
  NotebookPen,
  PenTool,
  Plus,
  Search,
  SquareKanban,
  Sun,
  TicketPlus,
  Timer,
  Zap,
} from 'lucide-react';
import { usarSesion } from '../caracteristicas/autenticacion/ContextoSesion';
import { ProveedorCronometro } from '../caracteristicas/tiempo/ContextoCronometro';
import { ProveedorMarcadores, usarMarcadores } from '../caracteristicas/marcadores/ContextoMarcadores';
import { iconosEntidad } from './editor/usarWikiLinks';
import { rutaDeEntidad } from '../servicios/rutas';
import { cambiarTema, usarTema, type Tema } from '../servicios/tema';
import { ChipCronometro } from '../caracteristicas/tiempo/ControlesCronometro';
import { ChipReunionSiguiente } from '../caracteristicas/calendario/ChipReunionSiguiente';
import { PaletaComandos } from './PaletaComandos';
import { BotonPlegarPanel } from './ui/BotonPlegarPanel';
import { BotonIcono, unirClases, type Icono } from './ui/primitivos';

interface EnlaceNavegacion {
  ruta: string;
  etiqueta: string;
  icono: Icono;
  /** Clases literales (Tailwind): fila activa, recuadro del icono y hover en el tono pastel del módulo. */
  tono: { fila: string; icono: string; hover: string };
}

const tonos = {
  cielo: { fila: 'bg-sky-50 text-sky-950', icono: 'bg-sky-100 text-sky-600', hover: 'group-hover:bg-sky-50 group-hover:text-sky-500' },
  rosa: { fila: 'bg-rose-50 text-rose-950', icono: 'bg-rose-100 text-rose-500', hover: 'group-hover:bg-rose-50 group-hover:text-rose-400' },
  violeta: { fila: 'bg-violet-50 text-violet-950', icono: 'bg-violet-100 text-violet-600', hover: 'group-hover:bg-violet-50 group-hover:text-violet-500' },
  ambar: { fila: 'bg-amber-50 text-amber-950', icono: 'bg-amber-100 text-amber-600', hover: 'group-hover:bg-amber-50 group-hover:text-amber-500' },
  esmeralda: { fila: 'bg-emerald-50 text-emerald-950', icono: 'bg-emerald-100 text-emerald-600', hover: 'group-hover:bg-emerald-50 group-hover:text-emerald-500' },
  turquesa: { fila: 'bg-teal-50 text-teal-950', icono: 'bg-teal-100 text-teal-600', hover: 'group-hover:bg-teal-50 group-hover:text-teal-500' },
  melocoton: { fila: 'bg-orange-50 text-orange-950', icono: 'bg-orange-100 text-orange-500', hover: 'group-hover:bg-orange-50 group-hover:text-orange-400' },
  indigo: { fila: 'bg-indigo-50 text-indigo-950', icono: 'bg-indigo-100 text-indigo-500', hover: 'group-hover:bg-indigo-50 group-hover:text-indigo-400' },
};

const secciones: { titulo: string; enlaces: EnlaceNavegacion[] }[] = [
  { titulo: 'General', enlaces: [{ ruta: '/', etiqueta: 'Analítica', icono: LayoutDashboard, tono: tonos.cielo }] },
  {
    titulo: 'Trabajo',
    enlaces: [
      { ruta: '/calendario', etiqueta: 'Calendario', icono: CalendarDays, tono: tonos.cielo },
      { ruta: '/tareas', etiqueta: 'Tareas', icono: SquareKanban, tono: tonos.violeta },
      { ruta: '/matriz', etiqueta: 'Eisenhower', icono: Grid2x2, tono: tonos.ambar },
      { ruta: '/tickets', etiqueta: 'Tickets', icono: LifeBuoy, tono: tonos.rosa },
      { ruta: '/tiempo', etiqueta: 'Tiempo', icono: Timer, tono: tonos.indigo },
      { ruta: '/reporte', etiqueta: 'Reporte', icono: FileSpreadsheet, tono: tonos.esmeralda },
    ],
  },
  {
    titulo: 'Conocimiento',
    enlaces: [
      { ruta: '/diario', etiqueta: 'Diario', icono: NotebookPen, tono: tonos.melocoton },
      { ruta: '/documentos', etiqueta: 'Documentos', icono: FileText, tono: tonos.esmeralda },
      { ruta: '/lienzos', etiqueta: 'Lienzos', icono: PenTool, tono: tonos.melocoton },
      { ruta: '/boveda', etiqueta: 'Bóveda', icono: KeyRound, tono: tonos.turquesa },
    ],
  },
];

const accionesCrear: { ruta: string; etiqueta: string; icono: Icono }[] = [
  { ruta: '/tareas/nueva', etiqueta: 'Nueva tarea', icono: ListPlus },
  { ruta: '/tickets/nuevo', etiqueta: 'Nuevo ticket', icono: TicketPlus },
  { ruta: '/documentos/nuevo', etiqueta: 'Nueva página', icono: FilePlus2 },
  { ruta: '/diario?capturar=1', etiqueta: 'Registrar en el diario (Ctrl+J)', icono: NotebookPen },
];

const claveSidebarPlegado = 'productividad.sidebarPlegado';

function leerPlegado(): boolean {
  try {
    return localStorage.getItem(claveSidebarPlegado) === '1';
  } catch {
    return false;
  }
}

export function DisposicionPrincipal() {
  const [plegado, setPlegado] = useState(leerPlegado);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const ubicacion = useLocation();

  useEffect(() => setMenuMovilAbierto(false), [ubicacion.pathname]);

  // Documentos y Diario tienen su propio panel lateral: ocupan todo el ancho, sin márgenes ni ancho máximo.
  // El editor de un lienzo (/lienzos/:id) va a pantalla completa; la lista (/lienzos) no.
  const pantallaCompleta =
    ubicacion.pathname.startsWith('/documentos') || ubicacion.pathname.startsWith('/diario') || ubicacion.pathname.startsWith('/lienzos/');

  // Ctrl/⌘ + J desde cualquier pantalla: abrir el diario de hoy con la captura rápida enfocada.
  const navegar = useNavigate();
  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'j') {
        evento.preventDefault();
        navegar('/diario?capturar=1');
      }
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [navegar]);

  function alternarPlegado() {
    setPlegado((actual) => {
      try {
        localStorage.setItem(claveSidebarPlegado, actual ? '0' : '1');
      } catch {
        // Preferencia visual: si no hay almacenamiento, solo dura la sesión.
      }
      return !actual;
    });
  }

  return (
    <ProveedorCronometro>
      <ProveedorMarcadores>
        <div className="flex min-h-screen bg-fondo">
          {/* Escritorio: sidebar fijo que se pliega a solo iconos */}
          {/* El contenedor fija el menú; el botón de plegar va fuera del aside (overflow-hidden) para flotar sobre el borde. */}
          <div className="sticky top-0 z-40 hidden h-screen shrink-0 md:block">
            <motion.aside
              initial={false}
              animate={{ width: plegado ? 72 : 256 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="h-full overflow-hidden border-r border-borde bg-superficie"
            >
              <ContenidoSidebar plegado={plegado} />
            </motion.aside>
            <BotonPlegarPanel plegado={plegado} alAlternar={alternarPlegado} etiqueta="menú" className="top-[26px]" />
          </div>

          {/* Móvil: cajón deslizante */}
          <AnimatePresence>
            {menuMovilAbierto && (
              <>
                <motion.div
                  className="fixed inset-0 z-40 bg-zinc-950/30 md:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMenuMovilAbierto(false)}
                />
                <motion.aside
                  className="fixed inset-y-0 left-0 z-50 w-72 border-r border-borde bg-superficie md:hidden"
                  initial={{ x: -280 }}
                  animate={{ x: 0 }}
                  exit={{ x: -280 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 40 }}
                >
                  <ContenidoSidebar plegado={false} />
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
            <BarraSuperior alAbrirMenuMovil={() => setMenuMovilAbierto(true)} />
            {pantallaCompleta ? (
              <main className="flex min-w-0 flex-1 flex-col">
                <Outlet />
              </main>
            ) : (
              <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
                <div className="mx-auto max-w-7xl">
                  <Outlet />
                </div>
              </main>
            )}
          </div>

          <PaletaComandos />
        </div>
      </ProveedorMarcadores>
    </ProveedorCronometro>
  );
}

function ContenidoSidebar({ plegado }: { plegado: boolean }) {
  const navegar = useNavigate();
  const [crearAbierto, setCrearAbierto] = useState(false);
  const esMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

  return (
    <div className="sin-barra-scroll flex h-full w-full flex-col overflow-y-auto px-3 pb-3 pt-4">
      {/* Marca */}
      <div className={unirClases('mb-5 flex items-center gap-3', plegado ? 'justify-center' : 'px-1.5')}>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-400 via-indigo-400 to-sky-400 text-white shadow-tarjeta">
          <Zap className="size-[18px]" fill="currentColor" />
        </span>
        {!plegado && (
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[15px] font-semibold tracking-tight">Productividad</span>
            <span className="block truncate text-xs text-texto-3">Espacio personal</span>
          </span>
        )}
      </div>

      {/* Crear: los accesos se despliegan dentro del menú (un popover quedaría recortado al plegarlo). */}
      <div className="mb-5 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setCrearAbierto((actual) => !actual)}
          aria-expanded={crearAbierto}
          title={plegado ? 'Crear' : undefined}
          className={unirClases(
            'flex h-10 items-center gap-2 rounded-xl bg-primario text-sm font-medium text-sobre-primario shadow-tarjeta transition hover:bg-primario/85',
            plegado ? 'justify-center' : 'px-3',
          )}
        >
          <Plus className={unirClases('size-4 shrink-0 transition-transform', crearAbierto && 'rotate-45')} />
          {!plegado && <span className="flex-1 text-left">Crear</span>}
        </button>
        <AnimatePresence initial={false}>
          {crearAbierto && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="flex flex-col gap-0.5 overflow-hidden rounded-xl border border-borde bg-fondo p-1"
            >
              {accionesCrear.map(({ ruta, etiqueta, icono: IconoAccion }) => (
                <li key={ruta}>
                  <button
                    type="button"
                    title={plegado ? etiqueta : undefined}
                    onClick={() => {
                      setCrearAbierto(false);
                      navegar(ruta);
                    }}
                    className={unirClases(
                      'flex h-8 w-full items-center gap-2.5 rounded-lg text-sm text-texto-2 transition hover:bg-superficie hover:text-texto hover:shadow-tarjeta',
                      plegado ? 'justify-center' : 'px-2',
                    )}
                  >
                    <IconoAccion className="size-4 shrink-0 text-texto-3" />
                    {!plegado && <span className="truncate">{etiqueta}</span>}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* Navegación por secciones, cada módulo con su tono pastel */}
      <nav className="flex flex-col gap-4">
        {secciones.map((seccion) => (
          <div key={seccion.titulo} className="flex flex-col gap-0.5">
            {plegado ? (
              <span className="mx-auto mb-1 h-px w-6 bg-borde" aria-hidden />
            ) : (
              <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3">{seccion.titulo}</p>
            )}
            {seccion.enlaces.map(({ ruta, etiqueta, icono: IconoEnlace, tono }) => (
              <NavLink
                key={ruta}
                to={ruta}
                end={ruta === '/'}
                title={plegado ? etiqueta : undefined}
                className={({ isActive }) =>
                  unirClases(
                    'group flex h-10 items-center gap-3 rounded-xl text-sm transition-colors',
                    plegado ? 'justify-center' : 'px-1.5',
                    isActive ? unirClases('font-medium', tono.fila) : 'text-texto-2 hover:bg-fondo hover:text-texto',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={unirClases('grid size-7 shrink-0 place-items-center rounded-lg transition-colors', isActive ? tono.icono : unirClases('text-texto-3', tono.hover))}>
                      <IconoEnlace className="size-4" />
                    </span>
                    {!plegado && <span className="truncate">{etiqueta}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {!plegado && <ListaMarcadores />}

      {/* Pie: atajo de búsqueda y tema */}
      <div className="mt-auto flex flex-col gap-2 pt-6">
        <SelectorTema plegado={plegado} />
        {!plegado && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('abrir-paleta-comandos'))}
            className="flex items-center gap-2.5 rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-sky-50 px-3 py-2.5 text-left transition hover:border-violet-200"
          >
            <Search className="size-4 shrink-0 text-violet-400" />
            <span className="min-w-0 flex-1 text-xs leading-snug text-texto-2">Busca o salta a cualquier sitio</span>
            <kbd className="shrink-0 rounded-md border border-borde bg-superficie px-1.5 py-0.5 font-sans text-[11px] font-medium text-texto-2">
              {esMac ? '⌘' : 'Ctrl'} K
            </kbd>
          </button>
        )}
      </div>
    </div>
  );
}

const opcionesTema: { valor: Tema; etiqueta: string; icono: Icono }[] = [
  { valor: 'claro', etiqueta: 'Claro', icono: Sun },
  { valor: 'oscuro', etiqueta: 'Oscuro', icono: Moon },
  { valor: 'sistema', etiqueta: 'Sistema', icono: Monitor },
];

function SelectorTema({ plegado }: { plegado: boolean }) {
  const { tema, oscuro } = usarTema();
  if (plegado) {
    const IconoActual = oscuro ? Moon : Sun;
    return (
      <button
        type="button"
        onClick={() => cambiarTema(oscuro ? 'claro' : 'oscuro')}
        title={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        aria-label={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        className="mx-auto grid size-10 place-items-center rounded-xl text-texto-3 transition-colors hover:bg-fondo hover:text-texto"
      >
        <IconoActual className="size-4" />
      </button>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-0.5 rounded-xl border border-borde bg-fondo p-0.5" role="radiogroup" aria-label="Tema">
      {opcionesTema.map(({ valor, etiqueta, icono: IconoTema }) => (
        <button
          key={valor}
          type="button"
          role="radio"
          aria-checked={tema === valor}
          onClick={() => cambiarTema(valor)}
          className={unirClases(
            'flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs transition-colors',
            tema === valor ? 'bg-superficie font-medium text-texto shadow-tarjeta' : 'text-texto-3 hover:text-texto-2',
          )}
        >
          <IconoTema className="size-3.5" />
          {etiqueta}
        </button>
      ))}
    </div>
  );
}

function BarraSuperior({ alAbrirMenuMovil }: { alAbrirMenuMovil: () => void }) {
  const esMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-borde bg-superficie/85 px-4 backdrop-blur md:px-8">
      <BotonIcono icono={Menu} etiqueta="Abrir menú" onClick={alAbrirMenuMovil} className="md:hidden" />

      <button
        onClick={() => window.dispatchEvent(new Event('abrir-paleta-comandos'))}
        className="flex h-9 w-full max-w-md items-center gap-2.5 rounded-lg border border-borde bg-fondo px-3 text-sm text-texto-3 transition hover:border-borde-fuerte hover:text-texto-2"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-left">Buscar tareas, documentos, tickets…</span>
        <kbd className="hidden rounded-md border border-borde bg-superficie px-1.5 py-0.5 font-sans text-[11px] font-medium sm:inline">
          {esMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        <ChipReunionSiguiente />
        <ChipCronometro />
        <MenuUsuario />
      </div>
    </header>
  );
}

function MenuUsuario() {
  const { usuario, cerrarSesion } = usarSesion();
  const [abierto, setAbierto] = useState(false);
  const referencia = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alHacerClic = (evento: MouseEvent) => {
      if (!referencia.current?.contains(evento.target as Node)) setAbierto(false);
    };
    const alPresionarTecla = (evento: KeyboardEvent) => evento.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', alHacerClic);
    document.addEventListener('keydown', alPresionarTecla);
    return () => {
      document.removeEventListener('mousedown', alHacerClic);
      document.removeEventListener('keydown', alPresionarTecla);
    };
  }, [abierto]);

  const iniciales = (usuario?.nombreCompleto ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0]!.toUpperCase())
    .join('');

  return (
    <div ref={referencia} className="relative">
      <button
        onClick={() => setAbierto((actual) => !actual)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-superficie-2"
      >
        <span className="grid size-8 place-items-center rounded-full bg-primario text-xs font-semibold text-sobre-primario">{iniciales}</span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-40 truncate text-sm font-medium leading-tight">{usuario?.nombreCompleto}</span>
          <span className="block text-xs leading-tight text-texto-3">{usuario?.roles[0]}</span>
        </span>
        <ChevronDown className="size-4 text-texto-3" />
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-full mt-2 w-60 origin-top-right rounded-xl border border-borde bg-superficie p-1.5 shadow-flotante"
          >
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-medium">{usuario?.nombreCompleto}</p>
              <p className="truncate text-xs text-texto-2">@{usuario?.nombreUsuario}</p>
              <p className="truncate text-xs text-texto-3">{usuario?.correo}</p>
            </div>
            <div className="my-1 h-px bg-borde" />
            <button
              role="menuitem"
              onClick={() => void cerrarSesion()}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-texto-2 hover:bg-superficie-2 hover:text-texto"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Marcadores (⭐) del usuario: tareas, tickets, documentos favoritos y días del diario. */
function ListaMarcadores() {
  const { marcadores } = usarMarcadores();
  return (
    <div className="mt-5 flex flex-col gap-0.5">
      <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3">Marcadores</p>
      {marcadores.length === 0 ? (
        <p className="px-2.5 text-xs leading-relaxed text-texto-3">Pulsa ☆ en una tarea, ticket, documento o día del diario para tenerlo aquí.</p>
      ) : (
        marcadores.map((marcador) => {
          const IconoMarcador = iconosEntidad[marcador.tipoEntidad];
          const esIconoDocumento = marcador.tipoEntidad === 'Documento' && marcador.referencia;
          return (
            <NavLink
              key={marcador.id}
              to={rutaDeEntidad(marcador.tipoEntidad, marcador.entidadId)}
              title={marcador.referencia && !esIconoDocumento ? `${marcador.referencia} · ${marcador.titulo}` : marcador.titulo}
              className="flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm text-texto-2 transition-colors hover:bg-fondo hover:text-texto"
            >
              {esIconoDocumento ? (
                <span className="w-4 shrink-0 text-center text-[13px] leading-none">{marcador.referencia}</span>
              ) : (
                <IconoMarcador className="size-4 shrink-0 text-amber-400" />
              )}
              <span className="truncate">{marcador.titulo}</span>
            </NavLink>
          );
        })
      )}
    </div>
  );
}
