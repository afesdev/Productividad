import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Star } from 'lucide-react';
import { apiMarcadores } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import type { MarcadorDto, TipoEntidad } from '../../servicios/tipos';
import { unirClases } from '../../componentes/ui/primitivos';

/** Evento para avisar de cambios hechos por otras vías (p. ej. la estrella de Documentos). */
export const EventoMarcadoresCambiados = 'marcadores-cambiados';

interface ValorMarcadores {
  marcadores: MarcadorDto[];
  estaMarcado: (tipo: TipoEntidad, id: string) => boolean;
  alternar: (tipo: TipoEntidad, id: string) => Promise<void>;
}

const ContextoMarcadores = createContext<ValorMarcadores | null>(null);

export function ProveedorMarcadores({ children }: { children: ReactNode }) {
  const [marcadores, setMarcadores] = useState<MarcadorDto[]>([]);
  const ubicacion = useLocation();

  const cargar = useCallback(() => {
    apiMarcadores.listar().then(setMarcadores).catch(() => undefined);
  }, []);

  // Al navegar se refresca: un título pudo cambiar o un elemento pudo borrarse.
  useEffect(() => {
    cargar();
  }, [cargar, ubicacion.pathname]);

  useEffect(() => {
    window.addEventListener(EventoMarcadoresCambiados, cargar);
    return () => window.removeEventListener(EventoMarcadoresCambiados, cargar);
  }, [cargar]);

  const estaMarcado = useCallback((tipo: TipoEntidad, id: string) => marcadores.some((marcador) => marcador.tipoEntidad === tipo && marcador.entidadId === id), [marcadores]);

  const alternar = useCallback(
    async (tipo: TipoEntidad, id: string) => {
      try {
        const marcado = await apiMarcadores.alternar(tipo, id);
        notificar.exito(marcado ? 'Añadido a marcadores' : 'Quitado de marcadores');
        cargar();
      } catch (errorMarcador) {
        notificar.error('No se pudo actualizar el marcador', errorMarcador);
      }
    },
    [cargar],
  );

  const valor = useMemo(() => ({ marcadores, estaMarcado, alternar }), [marcadores, estaMarcado, alternar]);
  return <ContextoMarcadores.Provider value={valor}>{children}</ContextoMarcadores.Provider>;
}

export function usarMarcadores(): ValorMarcadores {
  const valor = useContext(ContextoMarcadores);
  if (!valor) throw new Error('usarMarcadores debe usarse dentro de ProveedorMarcadores.');
  return valor;
}

/** Estrella para marcar o desmarcar una tarea, ticket o día del diario. */
export function BotonMarcador({ tipo, id, className }: { tipo: TipoEntidad; id: string; className?: string }) {
  const { estaMarcado, alternar } = usarMarcadores();
  const marcado = estaMarcado(tipo, id);
  return (
    <button
      type="button"
      onClick={() => void alternar(tipo, id)}
      aria-pressed={marcado}
      aria-label={marcado ? 'Quitar de marcadores' : 'Añadir a marcadores'}
      title={marcado ? 'Quitar de marcadores' : 'Añadir a marcadores'}
      className={unirClases('grid size-8 place-items-center rounded-lg transition hover:bg-superficie-2', marcado ? 'text-amber-400' : 'text-texto-3 hover:text-texto-2', className)}
    >
      <Star className="size-4" fill={marcado ? 'currentColor' : 'none'} />
    </button>
  );
}
