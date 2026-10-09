import { useEffect, useState } from 'react';
import { apiFlujos, apiProyectosSoporte } from '../../servicios/api';
import type { ProyectoSoporteDto } from '../../servicios/tipos';
import { normalizarNombre } from './formato';

/**
 * "Sistema" unificado por nombre: el campo libre de los flujos y los proyectos de soporte de los tickets.
 * "Sygnus" en un flujo y el proyecto de soporte "SYGNUS" son el mismo sistema (sin mayúsculas ni tildes).
 */
export interface Sistemas {
  /** Nombres sin repetir, ordenados (se muestra la forma del proyecto de soporte si existe). */
  nombres: string[];
  /** Proyecto de soporte con ese nombre, o null si el sistema solo existe en flujos. */
  proyectoDe: (nombre: string | null | undefined) => ProyectoSoporteDto | null;
}

let cache: Promise<{ sistemasFlujo: string[]; proyectos: ProyectoSoporteDto[] }> | null = null;

/** Olvida lo cargado (al crear o renombrar sistemas): la próxima lectura vuelve a pedirlo. */
export function invalidarSistemas() {
  cache = null;
}

/** Se pide una vez y se comparte entre todos los bloques del documento. */
function cargar() {
  if (!cache)
    cache = Promise.all([apiFlujos.sistemas().catch(() => [] as string[]), apiProyectosSoporte.listar(true).catch(() => [] as ProyectoSoporteDto[])]).then(
      ([sistemasFlujo, proyectos]) => ({ sistemasFlujo, proyectos }),
    );
  return cache;
}

export function usarSistemas(): Sistemas | null {
  const [sistemas, setSistemas] = useState<Sistemas | null>(null);
  useEffect(() => {
    let vigente = true;
    void cargar().then(({ sistemasFlujo, proyectos }) => {
      if (!vigente) return;
      const porNombre = new Map<string, ProyectoSoporteDto>(proyectos.map((proyecto) => [normalizarNombre(proyecto.nombre), proyecto]));
      const nombres = new Map<string, string>();
      for (const proyecto of proyectos.filter((proyecto) => proyecto.estaActivo)) nombres.set(normalizarNombre(proyecto.nombre), proyecto.nombre);
      for (const sistema of sistemasFlujo) if (!nombres.has(normalizarNombre(sistema))) nombres.set(normalizarNombre(sistema), sistema);
      setSistemas({
        nombres: [...nombres.values()].sort((a, b) => a.localeCompare(b, 'es')),
        proyectoDe: (nombre) => (nombre ? (porNombre.get(normalizarNombre(nombre)) ?? null) : null),
      });
    });
    return () => {
      vigente = false;
    };
  }, []);
  return sistemas;
}
