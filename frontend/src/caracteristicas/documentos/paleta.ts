import type { ColorPaleta } from '../../servicios/tipos';

interface TonoPaleta {
  nombre: string;
  /** Punto de color (etiquetas, selector de color). */
  punto: string;
  /** Chip de etiqueta: fondo pastel + texto 700/800 (contraste AA). */
  suave: string;
  /** Icono de carpeta. */
  icono: string;
  /** Degradado pastel para portadas de documento y tarjetas. */
  portada: string;
  /** Tarjeta de carpeta: fondo, borde y hover pastel. */
  azulejo: string;
}

/** Paleta pastel de carpetas y etiquetas. Clases literales para que Tailwind las genere. */
export const paleta: Record<ColorPaleta, TonoPaleta> = {
  gris: {
    nombre: 'Gris',
    punto: 'bg-zinc-300',
    suave: 'bg-zinc-100 text-zinc-700',
    icono: 'text-zinc-400',
    portada: 'from-zinc-100 via-slate-50 to-stone-50',
    azulejo: 'bg-zinc-50 border-zinc-200/70 hover:border-zinc-300',
  },
  rojo: {
    nombre: 'Rojo',
    punto: 'bg-rose-300',
    suave: 'bg-rose-100 text-rose-800',
    icono: 'text-rose-400',
    portada: 'from-rose-100 via-pink-50 to-orange-50',
    azulejo: 'bg-rose-50 border-rose-100 hover:border-rose-200',
  },
  naranja: {
    nombre: 'Naranja',
    punto: 'bg-orange-300',
    suave: 'bg-orange-100 text-orange-800',
    icono: 'text-orange-400',
    portada: 'from-orange-100 via-amber-50 to-rose-50',
    azulejo: 'bg-orange-50 border-orange-100 hover:border-orange-200',
  },
  ambar: {
    nombre: 'Ámbar',
    punto: 'bg-amber-300',
    suave: 'bg-amber-100 text-amber-800',
    icono: 'text-amber-400',
    portada: 'from-amber-100 via-yellow-50 to-lime-50',
    azulejo: 'bg-amber-50 border-amber-100 hover:border-amber-200',
  },
  verde: {
    nombre: 'Verde',
    punto: 'bg-emerald-300',
    suave: 'bg-emerald-100 text-emerald-800',
    icono: 'text-emerald-400',
    portada: 'from-emerald-100 via-green-50 to-teal-50',
    azulejo: 'bg-emerald-50 border-emerald-100 hover:border-emerald-200',
  },
  turquesa: {
    nombre: 'Turquesa',
    punto: 'bg-teal-300',
    suave: 'bg-teal-100 text-teal-800',
    icono: 'text-teal-400',
    portada: 'from-teal-100 via-cyan-50 to-sky-50',
    azulejo: 'bg-teal-50 border-teal-100 hover:border-teal-200',
  },
  azul: {
    nombre: 'Azul',
    punto: 'bg-sky-300',
    suave: 'bg-sky-100 text-sky-800',
    icono: 'text-sky-400',
    portada: 'from-sky-100 via-blue-50 to-indigo-50',
    azulejo: 'bg-sky-50 border-sky-100 hover:border-sky-200',
  },
  violeta: {
    nombre: 'Violeta',
    punto: 'bg-violet-300',
    suave: 'bg-violet-100 text-violet-800',
    icono: 'text-violet-400',
    portada: 'from-violet-100 via-purple-50 to-fuchsia-50',
    azulejo: 'bg-violet-50 border-violet-100 hover:border-violet-200',
  },
  rosa: {
    nombre: 'Rosa',
    punto: 'bg-pink-300',
    suave: 'bg-pink-100 text-pink-800',
    icono: 'text-pink-400',
    portada: 'from-pink-100 via-rose-50 to-violet-50',
    azulejo: 'bg-pink-50 border-pink-100 hover:border-pink-200',
  },
};

/** Documentos sin carpeta (o carpeta sin color): lavanda suave, a juego con el panel lateral. */
export const portadaNeutra = 'from-violet-50 via-indigo-50/60 to-sky-50';

export const coloresPaleta = Object.keys(paleta) as ColorPaleta[];
