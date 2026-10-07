import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Excalidraw, serializeAsJSON } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { apiLienzos } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';

export type EstadoGuardado = 'guardado' | 'guardando' | 'sinCambios' | 'error';

const RETRASO_AUTOGUARDADO = 800;

/**
 * Escena serializada para guardar. Tipo "local" y no "database": "database" descarta los archivos (`files`), así que
 * las imágenes pegadas o insertadas desaparecían al reabrir el lienzo.
 */
const serializar = (elements: unknown, appState: unknown, files: unknown) =>
  serializeAsJSON(elements as never, appState as never, files as never, 'local');

/** Datos iniciales para Excalidraw a partir de la escena serializada guardada. */
function analizarEscena(contenidoJson: string) {
  try {
    const escena = JSON.parse(contenidoJson);
    return {
      elements: escena.elements ?? [],
      appState: escena.appState ?? {},
      files: escena.files ?? {},
      // El desplazamiento no se guarda: sin esto, lo dibujado lejos del origen quedaba fuera de la vista al reabrir.
      scrollToContent: true,
    };
  } catch {
    return { elements: [], appState: {}, files: {}, scrollToContent: true };
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
  const ultimaEscenaGuardada = useRef(contenidoInicial);
  /**
   * Última escena que entregó Excalidraw en onChange (tras la primera interacción). Es la fuente de verdad para
   * guardar: NO se lee de la API imperativa porque al desmontarse Excalidraw reemplaza su escena por una vacía, y el
   * guardado "al salir" sobrescribía el lienzo con nada.
   */
  const escenaActual = useRef<string | null>(null);
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

  /** Escena con cambios sin guardar, o null si no hay nada pendiente. */
  const pendiente = useCallback(() => {
    const escenaJson = escenaActual.current;
    return escenaJson !== null && escenaJson !== ultimaEscenaGuardada.current ? escenaJson : null;
  }, []);

  const alCambiar = useCallback(
    (elements: readonly unknown[], appState: unknown, files: unknown) => {
      // Ignora todos los onChange previos a que el usuario toque el lienzo (init, restauración, idle).
      if (!interaccion.current) return;

      const escenaJson = serializar(elements, appState, files);
      escenaActual.current = escenaJson;
      if (escenaJson === ultimaEscenaGuardada.current) return;

      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => void guardar(escenaJson), RETRASO_AUTOGUARDADO);
    },
    [guardar],
  );

  // Guardado manual inmediato (botón "Guardar").
  const guardarAhora = useCallback(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    const escenaJson = pendiente();
    if (escenaJson === null) {
      alCambiarEstado?.('sinCambios');
      return;
    }
    void guardar(escenaJson);
  }, [pendiente, guardar, alCambiarEstado]);

  useEffect(() => {
    alRegistrarGuardado?.(guardarAhora);
  }, [alRegistrarGuardado, guardarAhora]);

  // Al salir del editor se guarda lo pendiente (la última escena vista, no la de Excalidraw ya desmontado).
  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      const escenaJson = pendiente();
      if (escenaJson !== null) void apiLienzos.guardar(lienzoId, escenaJson);
    },
    [lienzoId, pendiente],
  );

  // Al cambiar de pestaña se guarda ya lo pendiente; al cerrar o recargar con cambios sin guardar, el navegador avisa.
  useEffect(() => {
    const alOcultar = () => {
      if (document.visibilityState !== 'hidden') return;
      const escenaJson = pendiente();
      if (escenaJson === null) return;
      if (temporizador.current) clearTimeout(temporizador.current);
      void guardar(escenaJson);
    };
    const alSalir = (evento: BeforeUnloadEvent) => {
      if (pendiente() === null) return;
      evento.preventDefault();
      evento.returnValue = '';
    };
    document.addEventListener('visibilitychange', alOcultar);
    window.addEventListener('beforeunload', alSalir);
    return () => {
      document.removeEventListener('visibilitychange', alOcultar);
      window.removeEventListener('beforeunload', alSalir);
    };
  }, [pendiente, guardar]);

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
      <Excalidraw initialData={datosIniciales} onChange={alCambiar} langCode="es-ES" theme="light" />
    </div>
  );
}
