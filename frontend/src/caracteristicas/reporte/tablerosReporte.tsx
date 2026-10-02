import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiReporte } from '../../servicios/api';
import type { TableroReporteDto } from '../../servicios/tipos';
import { unirClases } from '../../componentes/ui/primitivos';

// El catálogo es pequeño y cambia poco: se comparte entre el diario y el reporte y se recarga al editarlo.
let cache: TableroReporteDto[] | null = null;
let pendiente: Promise<TableroReporteDto[]> | null = null;
const suscriptores = new Set<(tableros: TableroReporteDto[]) => void>();

export function recargarTableros(): Promise<TableroReporteDto[]> {
  pendiente = apiReporte
    .tableros()
    .then((tableros) => {
      cache = tableros;
      suscriptores.forEach((avisar) => avisar(tableros));
      return tableros;
    })
    .finally(() => {
      pendiente = null;
    });
  return pendiente;
}

/** Tableros del usuario (incluye archivados; filtra con `estaArchivado` donde haga falta). */
export function usarTablerosReporte(): TableroReporteDto[] | null {
  const [tableros, setTableros] = useState(cache);
  useEffect(() => {
    suscriptores.add(setTableros);
    if (!cache && !pendiente) recargarTableros().catch(() => setTableros([]));
    return () => {
      suscriptores.delete(setTableros);
    };
  }, []);
  return tableros;
}

const ClaveUltimoTablero = 'reporte.ultimoTablero';

/** Último tablero elegido al registrar: se propone en la siguiente entrada. */
export function leerUltimoTablero(): string | null {
  try {
    return localStorage.getItem(ClaveUltimoTablero);
  } catch {
    return null;
  }
}

export function guardarUltimoTablero(id: string | null) {
  try {
    if (id) localStorage.setItem(ClaveUltimoTablero, id);
  } catch {
    // Solo se pierde la sugerencia.
  }
}

/**
 * Selector compacto de tablero. Ofrece los activos y, si la entrada ya tenía uno archivado, también ese.
 * Sin tableros configurados enlaza a la configuración del reporte.
 */
export function SelectorTablero({
  valor,
  alCambiar,
  className,
  compacto = false,
}: {
  valor: string | null;
  alCambiar: (id: string | null) => void;
  className?: string;
  compacto?: boolean;
}) {
  const tableros = usarTablerosReporte();
  if (tableros === null) return null;
  const opciones = tableros.filter((tablero) => !tablero.estaArchivado || tablero.id === valor);
  if (opciones.length === 0) {
    return (
      <Link to="/reporte?configurar=1" className={unirClases('text-xs text-violet-700 hover:underline', className)}>
        Configurar tableros
      </Link>
    );
  }
  return (
    <select
      value={valor ?? ''}
      onChange={(evento) => alCambiar(evento.target.value || null)}
      aria-label="Tablero de Trello"
      title="Tablero de Trello (reporte de actividades)"
      className={unirClases(
        'rounded-lg border border-borde bg-superficie text-texto shadow-tarjeta transition hover:border-borde-fuerte focus:border-acento focus:outline-none focus:ring-3 focus:ring-acento/15',
        compacto ? 'h-7 max-w-44 px-2 text-xs' : 'h-9 w-full px-3 text-sm',
        !valor && 'text-texto-3',
        className,
      )}
    >
      <option value="">Sin tablero</option>
      {opciones.map((tablero) => (
        <option key={tablero.id} value={tablero.id}>
          {tablero.nombre}
          {tablero.estaArchivado ? ' (archivado)' : ''}
        </option>
      ))}
    </select>
  );
}
