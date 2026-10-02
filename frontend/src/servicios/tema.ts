import { useSyncExternalStore } from 'react';

export type Tema = 'claro' | 'oscuro' | 'sistema';

const ClaveTema = 'productividad.tema';
const consultaOscuro = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const oyentes = new Set<() => void>();

function leerTema(): Tema {
  try {
    const guardado = localStorage.getItem(ClaveTema);
    return guardado === 'claro' || guardado === 'oscuro' ? guardado : 'sistema';
  } catch {
    return 'sistema';
  }
}

let temaActual = leerTema();

const esOscuro = () => temaActual === 'oscuro' || (temaActual === 'sistema' && !!consultaOscuro?.matches);

function aplicar() {
  document.documentElement.classList.toggle('oscuro', esOscuro());
  oyentes.forEach((oyente) => oyente());
}

// "Sistema" sigue los cambios del sistema operativo en vivo.
consultaOscuro?.addEventListener('change', () => temaActual === 'sistema' && aplicar());

export function cambiarTema(tema: Tema) {
  temaActual = tema;
  try {
    localStorage.setItem(ClaveTema, tema);
  } catch {
    // Preferencia visual: sin almacenamiento solo dura la sesión.
  }
  aplicar();
}

const suscribir = (oyente: () => void) => {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
};

/** Tema elegido y si en este momento se ve oscuro (el script de index.html ya lo aplicó antes de pintar). */
export function usarTema(): { tema: Tema; oscuro: boolean } {
  const tema = useSyncExternalStore(suscribir, () => temaActual);
  const oscuro = useSyncExternalStore(suscribir, esOscuro);
  return { tema, oscuro };
}
