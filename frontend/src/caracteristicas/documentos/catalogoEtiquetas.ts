import { useEffect, useState } from 'react';
import { apiDocumentos } from '../../servicios/api';
import type { EtiquetaConConteoDto } from '../../servicios/tipos';

/**
 * Catálogo único de etiquetas (documentos, tickets y tareas). Se comparte entre pantallas y se recarga al crear una
 * etiqueta nueva desde cualquier selector.
 */
let cache: EtiquetaConConteoDto[] | null = null;
let pendiente: Promise<EtiquetaConConteoDto[]> | null = null;
const suscriptores = new Set<(etiquetas: EtiquetaConConteoDto[]) => void>();

export function recargarCatalogoEtiquetas(): Promise<EtiquetaConConteoDto[]> {
  pendiente = apiDocumentos
    .estructura()
    .then((estructura) => {
      cache = estructura.etiquetas;
      suscriptores.forEach((avisar) => avisar(estructura.etiquetas));
      return estructura.etiquetas;
    })
    .finally(() => {
      pendiente = null;
    });
  return pendiente;
}

export function usarCatalogoEtiquetas(): EtiquetaConConteoDto[] {
  const [etiquetas, setEtiquetas] = useState<EtiquetaConConteoDto[]>(cache ?? []);
  useEffect(() => {
    suscriptores.add(setEtiquetas);
    if (!cache && !pendiente) recargarCatalogoEtiquetas().catch(() => undefined);
    return () => {
      suscriptores.delete(setEtiquetas);
    };
  }, []);
  return etiquetas;
}
