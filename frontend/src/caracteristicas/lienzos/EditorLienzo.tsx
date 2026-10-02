import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Excalidraw, serializeAsJSON } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import '@excalidraw/excalidraw/index.css';
import { apiLienzos } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';

export type EstadoGuardado = 'guardado' | 'guardando' | 'sinCambios' | 'error';

const RETRASO_AUTOGUARDADO = 1000;

/** Datos iniciales para Excalidraw a partir de la escena serializada guardada. */
function analizarEscena(contenidoJson: string) {
  try {
    const escena = JSON.parse(contenidoJson);
    return {
      elements: escena.elements ?? [],
      appState: escena.appState ?? {},
      files: escena.files ?? {},
    };
  } catch {
    return { elements: [], appState: {}, files: {} };
  }
}

interface Propiedades {
  lienzoId: string;
  contenidoInicial: string;
  alCambiarEstado?: (estado: EstadoGuardado) => void;
  /** Registra en el padre una función para forzar el guardado (botón "Guardar"). */
  alRegistrarGuardado?: (guardarAhora: () => void) => void;
}

/**
 * Lienzo de Excalidraw con autoguardado.
 *
 * Clave: Excalidraw emite muchos onChange de inicialización/idle (incluida la restauración de la
 * escena, que puede reportar 0 elementos por un instante). Guardar cualquiera de esos sobrescribiría
 * el dibujo. Por eso el autoguardado se activa SOLO después de la primera interacción real del usuario
 * dentro del lienzo (pointer o teclado). El botón "Guardar" fuerza un guardado inmediato.
 */
export function EditorLienzo({ lienzoId, contenidoInicial, alCambiarEstado, alRegistrarGuardado }: Propiedades) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const ultimaEscenaGuardada = useRef(contenidoInicial);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interaccion = useRef(false);

  const datosIniciales = useMemo(() => analizarEscena(contenidoInicial), [contenidoInicial]);

  const guardar = useCallback(
    async (escenaJson: string) => {
      alCambiarEstado?.('guardando');
      try {
        await apiLienzos.guardar(lienzoId, escenaJson);
        ultimaEscenaGuardada.current = escenaJson;
        alCambiarEstado?.('guardado');
      } catch (error) {
        alCambiarEstado?.('error');
        notificar.error('No se pudo guardar el lienzo', error);
      }
    },
    [lienzoId, alCambiarEstado],
  );

  const escenaActual = useCallback(() => {
    if (!api) return null;
    return serializeAsJSON(api.getSceneElements(), api.getAppState(), api.getFiles(), 'database');
  }, [api]);

  const alCambiar = useCallback(
    (elements: readonly unknown[], appState: unknown, files: unknown) => {
      // Ignora todos los onChange previos a que el usuario toque el lienzo (init, restauración, idle).
      if (!interaccion.current) return;

      const escenaJson = serializeAsJSON(elements as never, appState as never, files as never, 'database');
      if (escenaJson === ultimaEscenaGuardada.current) return;

      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => void guardar(escenaJson), RETRASO_AUTOGUARDADO);
    },
    [guardar],
  );

  // Guardado manual inmediato (botón "Guardar").
  const guardarAhora = useCallback(() => {
    const escenaJson = escenaActual();
    if (escenaJson === null) return;
    if (temporizador.current) clearTimeout(temporizador.current);
    void guardar(escenaJson);
  }, [escenaActual, guardar]);

  useEffect(() => {
    alRegistrarGuardado?.(guardarAhora);
  }, [alRegistrarGuardado, guardarAhora]);

  // Guarda lo pendiente al desmontar (solo si el usuario llegó a interactuar).
  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      if (!api || !interaccion.current) return;
      const escenaJson = serializeAsJSON(api.getSceneElements(), api.getAppState(), api.getFiles(), 'database');
      if (escenaJson !== ultimaEscenaGuardada.current) void apiLienzos.guardar(lienzoId, escenaJson);
    };
  }, [api, lienzoId]);

  return (
    <div
      className="h-full w-full"
      onPointerDownCapture={() => {
        interaccion.current = true;
      }}
      onKeyDownCapture={() => {
        interaccion.current = true;
      }}
    >
      <Excalidraw excalidrawAPI={setApi} initialData={datosIniciales} onChange={alCambiar} langCode="es-ES" theme="light" />
    </div>
  );
}
