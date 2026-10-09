import type { CSSProperties } from 'react';
import { Clock } from 'lucide-react';
import type { EtiquetaTrelloDto, MiembroTrelloDto } from '../../servicios/tipos';
import { unirClases } from '../../componentes/ui/primitivos';

// ---------- Conexión ----------

/** Ruta a la que Trello vuelve tras autorizar, con el token en el fragmento (#token=…): nunca llega a ningún servidor. */
export const RutaRetornoTrello = '/trello';

export function urlAutorizacionTrello(apiKey: string): string {
  const parametros = new URLSearchParams({
    expiration: 'never',
    name: 'Productividad',
    scope: 'read',
    response_type: 'token',
    callback_method: 'fragment',
    key: apiKey,
    return_url: `${window.location.origin}${RutaRetornoTrello}`,
  });
  return `https://trello.com/1/authorize?${parametros}`;
}

/** Lee el token que Trello deja en el fragmento y lo borra de la barra de direcciones (y del historial). */
export function extraerTokenDelFragmento(): string | null {
  const fragmento = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = fragmento.get('token');
  if (!token) return null;
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  return token;
}

// ---------- Etiquetas ----------

/** Colores de etiqueta de Trello en tonos pastel de la app ("green_dark" usa la base "green"). */
const coloresEtiqueta: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  orange: 'bg-orange-100 text-orange-800',
  red: 'bg-rose-100 text-rose-800',
  purple: 'bg-violet-100 text-violet-800',
  blue: 'bg-blue-100 text-blue-800',
  sky: 'bg-sky-100 text-sky-800',
  lime: 'bg-lime-100 text-lime-800',
  pink: 'bg-pink-100 text-pink-800',
  black: 'bg-zinc-200 text-zinc-800',
};

const puntosEtiqueta: Record<string, string> = {
  green: 'bg-emerald-400',
  yellow: 'bg-yellow-400',
  orange: 'bg-orange-400',
  red: 'bg-rose-400',
  purple: 'bg-violet-400',
  blue: 'bg-blue-400',
  sky: 'bg-sky-400',
  lime: 'bg-lime-400',
  pink: 'bg-pink-400',
  black: 'bg-zinc-500',
};

const colorBase = (color: string | null) => (color ?? '').split('_')[0];

export function ChipEtiquetaTrello({ etiqueta, className }: { etiqueta: EtiquetaTrelloDto; className?: string }) {
  const clases = coloresEtiqueta[colorBase(etiqueta.color)] ?? 'bg-superficie-2 text-texto-2';
  // Las etiquetas sin nombre en Trello son solo una franja de color.
  if (!etiqueta.nombre)
    return <span className={unirClases('inline-block h-2 w-8 rounded-full', puntosEtiqueta[colorBase(etiqueta.color)] ?? 'bg-borde-fuerte', className)} aria-label="Etiqueta sin nombre" />;
  return <span className={unirClases('inline-flex h-5 max-w-full items-center truncate rounded px-1.5 text-[11px] font-medium', clases, className)}>{etiqueta.nombre}</span>;
}

// ---------- Miembros ----------

export function AvatarTrello({ miembro, className }: { miembro: Pick<MiembroTrelloDto, 'nombreCompleto' | 'iniciales' | 'urlAvatar'>; className?: string }) {
  const clases = unirClases('size-6 shrink-0 rounded-full ring-2 ring-superficie', className);
  return miembro.urlAvatar ? (
    <img src={miembro.urlAvatar} alt={miembro.nombreCompleto} title={miembro.nombreCompleto} className={unirClases(clases, 'object-cover')} loading="lazy" referrerPolicy="no-referrer" />
  ) : (
    <span title={miembro.nombreCompleto} className={unirClases(clases, 'grid place-items-center bg-indigo-100 text-[10px] font-semibold text-indigo-700')}>
      {miembro.iniciales || miembro.nombreCompleto.slice(0, 2).toUpperCase()}
    </span>
  );
}

// ---------- Vencimientos ----------

export type EstadoVencimiento = 'completado' | 'vencido' | 'hoy' | 'pronto' | 'futuro';

export function estadoVencimiento(vencimiento: string, completado: boolean): EstadoVencimiento {
  if (completado) return 'completado';
  const fecha = new Date(vencimiento);
  const ahora = new Date();
  if (fecha < ahora) return 'vencido';
  const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);
  if (fecha < finHoy) return 'hoy';
  return fecha.getTime() - ahora.getTime() < 3 * 24 * 3600 * 1000 ? 'pronto' : 'futuro';
}

const clasesVencimiento: Record<EstadoVencimiento, string> = {
  completado: 'bg-emerald-100 text-emerald-800',
  vencido: 'bg-rose-100 text-rose-800',
  hoy: 'bg-amber-100 text-amber-800',
  pronto: 'bg-amber-50 text-amber-700',
  futuro: 'bg-superficie-2 text-texto-2',
};

export function formatearVencimiento(vencimiento: string): string {
  const fecha = new Date(vencimiento);
  const mismoAnio = fecha.getFullYear() === new Date().getFullYear();
  return fecha.toLocaleDateString('es', { day: 'numeric', month: 'short', ...(mismoAnio ? {} : { year: 'numeric' }) });
}

export function InsigniaVencimiento({ vencimiento, completado, className }: { vencimiento: string; completado: boolean; className?: string }) {
  const estado = estadoVencimiento(vencimiento, completado);
  return (
    <span
      title={new Date(vencimiento).toLocaleString('es')}
      className={unirClases('inline-flex h-5 items-center gap-1 rounded px-1.5 text-[11px] font-medium', clasesVencimiento[estado], className)}
    >
      <Clock className="size-3" />
      {formatearVencimiento(vencimiento)}
    </span>
  );
}

// ---------- Fondos de tablero ----------

/** Imagen o color de fondo del tablero; sin ninguno, el azul clásico de Trello. */
export function estiloFondoTablero(tablero: { colorFondo: string | null; imagenFondo?: string | null }): CSSProperties {
  if (tablero.imagenFondo) return { backgroundImage: `url("${tablero.imagenFondo.replace(/"/g, '%22')}")`, backgroundSize: 'cover', backgroundPosition: 'center' };
  return { backgroundColor: tablero.colorFondo ?? '#0079bf' };
}
