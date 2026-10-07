import {
  CircleCheck,
  CircleX,
  Cog,
  Database,
  Diamond,
  Globe,
  Monitor,
  Play,
  Plug,
  Send,
  User,
} from 'lucide-react';
import type { Icono } from '../../componentes/ui/primitivos';

export type TipoPaso = 'inicio' | 'usuario' | 'vista' | 'validacion' | 'sp' | 'api' | 'externo' | 'proceso' | 'salida' | 'error' | 'fin';
export type DireccionFlujo = 'DOWN' | 'RIGHT';

export interface PasoFlujo {
  id: string;
  tipo: TipoPaso;
  /** Lo que pasa, en lenguaje funcional: "Valida el rango de fechas". */
  titulo: string;
  /** Dato técnico: archivo de la vista, SP, endpoint, regla… */
  tecnico?: string | null;
  /** Notas en Markdown (solo en el panel de detalle). */
  descripcion?: string | null;
  x: number;
  y: number;
}

export interface ConexionFlujo {
  id: string;
  origen: string;
  destino: string;
  etiqueta?: string | null;
}

export interface ContenidoFlujo {
  version: 1;
  direccion: DireccionFlujo;
  nodos: PasoFlujo[];
  conexiones: ConexionFlujo[];
}

interface ConfiguracionTipo {
  etiqueta: string;
  icono: Icono;
  /** Palabras con las que se escribe en la sintaxis de texto; la primera es la canónica. */
  palabras: string[];
  /** Qué se espera en el dato técnico (etiqueta del campo en el panel). */
  campoTecnico: string | null;
  /** Clases literales (Tailwind) para que el escáner las encuentre. */
  tarjeta: string;
  insignia: string;
  minimapa: string;
  terminal?: boolean;
}

export const configuracionPaso: Record<TipoPaso, ConfiguracionTipo> = {
  inicio: {
    etiqueta: 'Inicio',
    icono: Play,
    palabras: ['inicio', 'comienzo'],
    campoTecnico: null,
    tarjeta: 'border-zinc-300 bg-superficie',
    insignia: 'bg-zinc-100 text-zinc-600',
    minimapa: '#a1a1aa',
  },
  usuario: {
    etiqueta: 'Acción del usuario',
    icono: User,
    palabras: ['usuario', 'u', 'accion', 'acción'],
    campoTecnico: 'Rol o detalle',
    tarjeta: 'border-violet-200 bg-violet-50',
    insignia: 'bg-violet-100 text-violet-700',
    minimapa: '#8b5cf6',
  },
  vista: {
    etiqueta: 'Vista',
    icono: Monitor,
    palabras: ['vista', 'v', 'pantalla', 'pagina', 'página'],
    campoTecnico: 'Archivo o ruta',
    tarjeta: 'border-sky-200 bg-sky-50',
    insignia: 'bg-sky-100 text-sky-700',
    minimapa: '#0ea5e9',
  },
  validacion: {
    etiqueta: 'Validación',
    icono: Diamond,
    palabras: ['validacion', 'validación', 'decision', 'decisión', 'si', 'regla'],
    campoTecnico: 'Regla',
    tarjeta: 'border-amber-300 bg-amber-50',
    insignia: 'bg-amber-100 text-amber-800',
    minimapa: '#f59e0b',
  },
  sp: {
    etiqueta: 'Procedimiento / SQL',
    icono: Database,
    palabras: ['sp', 'sql', 'procedimiento', 'bd'],
    campoTecnico: 'Procedimiento o consulta',
    tarjeta: 'border-indigo-200 bg-indigo-50',
    insignia: 'bg-indigo-100 text-indigo-700',
    minimapa: '#6366f1',
  },
  api: {
    etiqueta: 'API',
    icono: Plug,
    palabras: ['api', 'endpoint', 'servicio'],
    campoTecnico: 'Método y endpoint',
    tarjeta: 'border-teal-200 bg-teal-50',
    insignia: 'bg-teal-100 text-teal-700',
    minimapa: '#14b8a6',
  },
  externo: {
    etiqueta: 'Sistema externo',
    icono: Globe,
    palabras: ['externo', 'tercero', 'integracion', 'integración'],
    campoTecnico: 'Sistema o URL',
    tarjeta: 'border-zinc-300 bg-zinc-50',
    insignia: 'bg-zinc-200 text-zinc-700',
    minimapa: '#71717a',
  },
  proceso: {
    etiqueta: 'Proceso',
    icono: Cog,
    palabras: ['proceso', 'p', 'logica', 'lógica', 'paso'],
    campoTecnico: 'Clase o método',
    tarjeta: 'border-borde-fuerte bg-superficie',
    insignia: 'bg-superficie-2 text-texto-2',
    minimapa: '#a1a1aa',
  },
  salida: {
    etiqueta: 'Salida',
    icono: Send,
    palabras: ['salida', 's', 'resultado', 'notificacion', 'notificación', 'correo'],
    campoTecnico: 'Archivo, correo o mensaje',
    tarjeta: 'border-pink-200 bg-pink-50',
    insignia: 'bg-pink-100 text-pink-700',
    minimapa: '#ec4899',
  },
  error: {
    etiqueta: 'Error',
    icono: CircleX,
    palabras: ['error', 'e', 'falla'],
    campoTecnico: 'Mensaje o código',
    tarjeta: 'border-rose-300 bg-rose-50',
    insignia: 'bg-rose-100 text-rose-700',
    minimapa: '#f43f5e',
    terminal: true,
  },
  fin: {
    etiqueta: 'Fin',
    icono: CircleCheck,
    palabras: ['fin', 'final', 'termina'],
    campoTecnico: null,
    tarjeta: 'border-emerald-300 bg-emerald-50',
    insignia: 'bg-emerald-100 text-emerald-700',
    minimapa: '#10b981',
    terminal: true,
  },
};

export const tiposPaso = Object.keys(configuracionPaso) as TipoPaso[];

/** Tamaño fijo por tipo: ELK necesita conocerlo antes de dibujar. */
export function tamanoPaso(tipo: TipoPaso): { ancho: number; alto: number } {
  if (tipo === 'validacion') return { ancho: 220, alto: 124 };
  if (tipo === 'inicio' || tipo === 'fin') return { ancho: 168, alto: 52 };
  return { ancho: 248, alto: 84 };
}

export const contenidoVacio = (): ContenidoFlujo => ({ version: 1, direccion: 'DOWN', nodos: [], conexiones: [] });

/** Acepta el JSON guardado (o uno incompleto) y devuelve siempre un contenido válido. */
export function leerContenido(json: string): ContenidoFlujo {
  try {
    const datos = JSON.parse(json) as Partial<ContenidoFlujo>;
    const nodos = (Array.isArray(datos.nodos) ? datos.nodos : []).filter((nodo) => nodo && typeof nodo.id === 'string' && nodo.tipo in configuracionPaso);
    const ids = new Set(nodos.map((nodo) => nodo.id));
    const conexiones = (Array.isArray(datos.conexiones) ? datos.conexiones : []).filter((conexion) => conexion && ids.has(conexion.origen) && ids.has(conexion.destino));
    return { version: 1, direccion: datos.direccion === 'RIGHT' ? 'RIGHT' : 'DOWN', nodos, conexiones };
  } catch {
    return contenidoVacio();
  }
}

export function escribirContenido(contenido: ContenidoFlujo): string {
  return JSON.stringify({
    version: 1,
    direccion: contenido.direccion,
    nodos: contenido.nodos.map(({ id, tipo, titulo, tecnico, descripcion, x, y }) => ({
      id,
      tipo,
      titulo,
      tecnico: tecnico?.trim() || null,
      descripcion: descripcion?.trim() || null,
      x: Math.round(x),
      y: Math.round(y),
    })),
    conexiones: contenido.conexiones.map(({ id, origen, destino, etiqueta }) => ({ id, origen, destino, etiqueta: etiqueta?.trim() || null })),
  });
}

let contador = 0;
/** Ids cortos y únicos dentro del flujo. */
export const nuevoId = (prefijo: string) => `${prefijo}${Date.now().toString(36)}${(contador++).toString(36)}`;
