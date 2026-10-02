import { useEffect, useMemo, useRef, useState, type KeyboardEvent as EventoTecladoReact } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  CalendarDays,
  CornerDownLeft,
  FileText,
  Grid2x2,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  Plus,
  Search,
  SquareCheck,
  SquareKanban,
} from 'lucide-react';
import { apiBusqueda } from '../servicios/api';
import type { ResultadoBusquedaDto, TipoEntidad } from '../servicios/tipos';
import { unirClases, type Icono } from './ui/primitivos';

interface ElementoPaleta {
  id: string;
  grupo: string;
  titulo: string;
  detalle?: string;
  icono: Icono;
  /** null = entidad sin vista disponible todavía (se muestra deshabilitada). */
  ruta: string | null;
}

const accionesRapidas: ElementoPaleta[] = [
  { id: 'nuevo-ticket', grupo: 'Acciones', titulo: 'Nuevo ticket', icono: Plus, ruta: '/tickets/nuevo' },
  { id: 'nueva-tarea', grupo: 'Acciones', titulo: 'Nueva tarea', icono: Plus, ruta: '/tareas/nueva' },
  { id: 'ir-tickets', grupo: 'Ir a', titulo: 'Tickets', icono: LifeBuoy, ruta: '/tickets' },
  { id: 'nuevo-documento', grupo: 'Acciones', titulo: 'Nuevo documento', icono: Plus, ruta: '/documentos/nuevo' },
  { id: 'ir-tablero', grupo: 'Ir a', titulo: 'Analítica', icono: LayoutDashboard, ruta: '/' },
  { id: 'ir-tareas', grupo: 'Ir a', titulo: 'Tareas', icono: SquareKanban, ruta: '/tareas' },
  { id: 'ir-matriz', grupo: 'Ir a', titulo: 'Matriz de Eisenhower', icono: Grid2x2, ruta: '/matriz' },
  { id: 'ir-documentos', grupo: 'Ir a', titulo: 'Documentos', icono: FileText, ruta: '/documentos' },
  { id: 'ir-boveda', grupo: 'Ir a', titulo: 'Bóveda de secretos', icono: KeyRound, ruta: '/boveda' },
];

const configuracionTipo: Record<TipoEntidad, { grupo: string; icono: Icono }> = {
  Tarea: { grupo: 'Tareas', icono: SquareCheck },
  Documento: { grupo: 'Documentos', icono: FileText },
  Ticket: { grupo: 'Tickets', icono: LifeBuoy },
  RegistroDiario: { grupo: 'Registros diarios', icono: CalendarDays },
};

function rutaDe(resultado: ResultadoBusquedaDto): string | null {
  switch (resultado.tipo) {
    case 'Tarea':
      return `/tareas?tarea=${resultado.id}`;
    case 'Documento':
      return `/documentos/${resultado.id}`;
    case 'Ticket':
      return `/tickets/${resultado.id}`;
    default:
      return null; // Módulo de bitácora: pendiente en el frontend.
  }
}

/**
 * Buscador omnipresente: Ctrl + K (⌘ + K en macOS) desde cualquier pantalla.
 * Consulta /api/v1/busqueda con debounce y cancela la petición anterior al seguir escribiendo.
 */
export function PaletaComandos() {
  const navegar = useNavigate();
  const [abierta, setAbierta] = useState(false);
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusquedaDto[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(0);
  const referenciaEntrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function alPresionarTecla(evento: KeyboardEvent) {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault();
        setAbierta((actual) => !actual);
      }
    }
    const alAbrirDesdeBoton = () => setAbierta(true);
    window.addEventListener('keydown', alPresionarTecla);
    window.addEventListener('abrir-paleta-comandos', alAbrirDesdeBoton);
    return () => {
      window.removeEventListener('keydown', alPresionarTecla);
      window.removeEventListener('abrir-paleta-comandos', alAbrirDesdeBoton);
    };
  }, []);

  useEffect(() => {
    if (abierta) {
      setTermino('');
      setResultados([]);
      setIndiceActivo(0);
      requestAnimationFrame(() => referenciaEntrada.current?.focus());
    }
  }, [abierta]);

  useEffect(() => {
    const terminoLimpio = termino.trim();
    if (!abierta || terminoLimpio.length < 2) {
      setResultados([]);
      setBuscando(false);
      return;
    }
    const controlador = new AbortController();
    setBuscando(true);
    const temporizador = window.setTimeout(() => {
      apiBusqueda
        .buscar(terminoLimpio, controlador.signal)
        .then((encontrados) => {
          setResultados(encontrados);
          setIndiceActivo(0);
        })
        .catch(() => undefined)
        .finally(() => {
          if (!controlador.signal.aborted) setBuscando(false);
        });
    }, 150);
    return () => {
      window.clearTimeout(temporizador);
      controlador.abort();
    };
  }, [termino, abierta]);

  const elementos = useMemo<ElementoPaleta[]>(() => {
    const terminoMinusculas = termino.trim().toLowerCase();
    const acciones = accionesRapidas.filter((accion) => accion.titulo.toLowerCase().includes(terminoMinusculas));
    const encontrados = resultados.map<ElementoPaleta>((resultado) => ({
      id: `${resultado.tipo}-${resultado.id}`,
      grupo: configuracionTipo[resultado.tipo].grupo,
      icono: configuracionTipo[resultado.tipo].icono,
      titulo: resultado.titulo,
      detalle: resultado.referencia,
      ruta: rutaDe(resultado),
    }));
    return [...encontrados, ...acciones];
  }, [resultados, termino]);

  function ejecutar(elemento: ElementoPaleta | undefined) {
    if (!elemento?.ruta) return;
    setAbierta(false);
    navegar(elemento.ruta);
  }

  function alPresionarTeclaEntrada(evento: EventoTecladoReact<HTMLInputElement>) {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setIndiceActivo((indice) => Math.min(indice + 1, elementos.length - 1));
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setIndiceActivo((indice) => Math.max(indice - 1, 0));
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      ejecutar(elementos[indiceActivo]);
    } else if (evento.key === 'Escape') {
      setAbierta(false);
    }
  }

  let grupoAnterior = '';

  return createPortal(
    <AnimatePresence>
      {abierta && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            className="absolute inset-0 bg-zinc-950/25 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onMouseDown={() => setAbierta(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Paleta de comandos"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-borde bg-superficie shadow-flotante"
          >
            <div className="flex items-center gap-3 border-b border-borde px-4">
              {buscando ? <Loader2 className="size-4 animate-spin text-texto-3" /> : <Search className="size-4 text-texto-3" />}
              <input
                ref={referenciaEntrada}
                value={termino}
                onChange={(evento) => setTermino(evento.target.value)}
                onKeyDown={alPresionarTeclaEntrada}
                placeholder="Buscar o escribir un comando… (ej. WEB-105)"
                role="combobox"
                aria-expanded="true"
                aria-controls="lista-paleta"
                aria-activedescendant={elementos[indiceActivo] ? `paleta-${elementos[indiceActivo].id}` : undefined}
                className="h-13 flex-1 bg-transparent text-[15px] outline-none placeholder:text-texto-3"
              />
              <kbd className="rounded-md border border-borde px-1.5 py-0.5 text-[11px] text-texto-3">Esc</kbd>
            </div>

            <ul id="lista-paleta" role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
              {elementos.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-texto-3">{buscando ? 'Buscando…' : 'Sin resultados'}</li>
              )}
              {elementos.map((elemento, indice) => {
                const mostrarGrupo = elemento.grupo !== grupoAnterior;
                grupoAnterior = elemento.grupo;
                const activo = indice === indiceActivo;
                const IconoElemento = elemento.icono;
                return (
                  <li key={elemento.id} role="presentation">
                    {mostrarGrupo && <p className="px-3 pb-1.5 pt-3 text-[11px] font-medium uppercase tracking-wider text-texto-3">{elemento.grupo}</p>}
                    <div
                      id={`paleta-${elemento.id}`}
                      role="option"
                      aria-selected={activo}
                      aria-disabled={!elemento.ruta}
                      onMouseEnter={() => setIndiceActivo(indice)}
                      onClick={() => ejecutar(elemento)}
                      className={unirClases(
                        'relative flex h-10 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm',
                        !elemento.ruta && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      {activo && (
                        <motion.span layoutId="resaltado-paleta" className="absolute inset-0 rounded-lg bg-superficie-2" transition={{ type: 'spring', stiffness: 600, damping: 40 }} />
                      )}
                      <IconoElemento className="relative size-4 shrink-0 text-texto-3" />
                      <span className="relative flex-1 truncate">{elemento.titulo}</span>
                      <span className="relative shrink-0 font-mono text-xs text-texto-3">{elemento.ruta ? elemento.detalle : 'vista pendiente'}</span>
                      {activo && elemento.ruta && <CornerDownLeft className="relative size-3.5 text-texto-3" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
