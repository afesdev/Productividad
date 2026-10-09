import { CalendarDays, FileText, Hash, LifeBuoy, ListChecks, Server, Workflow } from 'lucide-react';
import { apiGrafo } from '../../servicios/api';
import { rutaDeEntidad } from '../../servicios/rutas';
import type { AristaGrafoDto, GrafoDto, NodoGrafoDto, TipoAristaGrafo, TipoNodoGrafo } from '../../servicios/tipos';
import type { Icono } from '../../componentes/ui/primitivos';

/** Color (hex: Cytoscape no lee variables CSS), forma y texto de cada tipo de nodo. */
export const configuracionNodo: Record<TipoNodoGrafo, { etiqueta: string; plural: string; color: string; forma: string; icono: Icono }> = {
  Documento: { etiqueta: 'Documento', plural: 'Documentos', color: '#10b981', forma: 'ellipse', icono: FileText },
  Tarea: { etiqueta: 'Tarea', plural: 'Tareas', color: '#8b5cf6', forma: 'ellipse', icono: ListChecks },
  Ticket: { etiqueta: 'Ticket', plural: 'Tickets', color: '#f43f5e', forma: 'ellipse', icono: LifeBuoy },
  RegistroDiario: { etiqueta: 'Día del diario', plural: 'Diario', color: '#f97316', forma: 'ellipse', icono: CalendarDays },
  Flujo: { etiqueta: 'Flujo', plural: 'Flujos', color: '#0ea5e9', forma: 'round-rectangle', icono: Workflow },
  Etiqueta: { etiqueta: 'Etiqueta', plural: 'Etiquetas', color: '#a1a1aa', forma: 'diamond', icono: Hash },
  Sistema: { etiqueta: 'Sistema', plural: 'Sistemas', color: '#f59e0b', forma: 'hexagon', icono: Server },
};

export const tiposNodo = Object.keys(configuracionNodo) as TipoNodoGrafo[];

export const etiquetaArista: Record<TipoAristaGrafo, string> = {
  Enlace: 'Enlace [[…]]',
  Etiqueta: 'Etiqueta',
  Sistema: 'Sistema',
  Relacion: 'Relación',
  Jerarquia: 'Subpágina',
};

/** Ruta para abrir el nodo, o null si es solo un agrupador (etiqueta, sistema sin proyecto de soporte). */
export function rutaNodo(nodo: NodoGrafoDto): string | null {
  switch (nodo.tipo) {
    case 'Documento':
    case 'Tarea':
    case 'Ticket':
    case 'RegistroDiario':
    case 'Flujo':
      return nodo.entidadId ? rutaDeEntidad(nodo.tipo, nodo.entidadId) : null;
    case 'Sistema':
      return nodo.entidadId ? `/tickets?vista=Todos&proyecto=${nodo.entidadId}` : null;
    case 'Etiqueta':
      return nodo.entidadId ? `/tickets?vista=Todos&etiqueta=${nodo.entidadId}` : null;
  }
}

export const idNodo = (tipo: TipoNodoGrafo, id: string) => `${tipo}:${id}`;

// El grafo se comparte entre la página y los paneles "Conexiones"; se refresca si tiene más de 30 s.
let cache: { datos: GrafoDto; momento: number } | null = null;
let pendiente: Promise<GrafoDto> | null = null;

export function obtenerGrafo(forzar = false): Promise<GrafoDto> {
  if (!forzar && cache && Date.now() - cache.momento < 30_000) return Promise.resolve(cache.datos);
  pendiente ??= apiGrafo
    .obtener()
    .then((datos) => {
      // Una API sin /grafo (no reiniciada tras actualizar) responde con la página web: mejor un error claro.
      if (!datos || !Array.isArray(datos.nodos) || !Array.isArray(datos.aristas))
        throw new Error('La API no devolvió el grafo. Reiníciala para cargar la versión nueva.');
      cache = { datos, momento: Date.now() };
      return datos;
    })
    .finally(() => {
      pendiente = null;
    });
  return pendiente;
}

/** Ids de los nodos a como mucho `saltos` conexiones del nodo dado (incluido él). */
export function vecindario(aristas: AristaGrafoDto[], id: string, saltos: number): Set<string> {
  const vecinos = new Map<string, string[]>();
  for (const arista of aristas) {
    vecinos.set(arista.origen, [...(vecinos.get(arista.origen) ?? []), arista.destino]);
    vecinos.set(arista.destino, [...(vecinos.get(arista.destino) ?? []), arista.origen]);
  }
  const visitados = new Set([id]);
  let frontera = [id];
  for (let salto = 0; salto < saltos; salto++) {
    const siguiente: string[] = [];
    for (const actual of frontera)
      for (const vecino of vecinos.get(actual) ?? [])
        if (!visitados.has(vecino)) {
          visitados.add(vecino);
          siguiente.push(vecino);
        }
    frontera = siguiente;
  }
  return visitados;
}

/** Grado (número de conexiones) de cada nodo: decide su tamaño en el lienzo. */
export function grados(aristas: AristaGrafoDto[]): Map<string, number> {
  const resultado = new Map<string, number>();
  for (const arista of aristas) {
    resultado.set(arista.origen, (resultado.get(arista.origen) ?? 0) + 1);
    resultado.set(arista.destino, (resultado.get(arista.destino) ?? 0) + 1);
  }
  return resultado;
}
