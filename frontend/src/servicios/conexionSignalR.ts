import { HubConnectionBuilder, LogLevel, type HubConnection } from '@microsoft/signalr';
import { almacenSesion } from './almacenSesion';
import type { TareaResumenDto } from './tipos';

let conexion: HubConnection | null = null;
let inicio: Promise<void> | null = null;

function obtenerConexion(): HubConnection {
  conexion ??= new HubConnectionBuilder()
    .withUrl('/hubs/notificaciones', { accessTokenFactory: () => almacenSesion.obtener().tokenAcceso ?? '' })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();
  return conexion;
}

async function asegurarConexion(): Promise<HubConnection> {
  const hub = obtenerConexion();
  if (hub.state === 'Disconnected') {
    inicio ??= hub.start().finally(() => {
      inicio = null;
    });
  }
  if (inicio) await inicio;
  return hub;
}

export interface OyentesTareas {
  alActualizar?: (tarea: TareaResumenDto) => void;
  alEliminar?: (tareaId: string) => void;
}

/**
 * Se suscribe a los cambios de tareas de un proyecto. Devuelve la función para cancelar la suscripción.
 */
export function escucharTareasProyecto(proyectoId: string, oyentes: OyentesTareas): () => void {
  let cancelado = false;
  const alActualizar = (tarea: TareaResumenDto) => {
    if (tarea.proyectoId === proyectoId) oyentes.alActualizar?.(tarea);
  };
  const alEliminar = (tareaId: string) => oyentes.alEliminar?.(tareaId);

  asegurarConexion()
    .then(async (hub) => {
      if (cancelado) return;
      hub.on('TareaActualizada', alActualizar);
      hub.on('TareaEliminada', alEliminar);
      await hub.invoke('SuscribirseAProyecto', proyectoId);
    })
    .catch(() => {
      // Tiempo real es una mejora: si falla, la UI sigue funcionando por HTTP.
    });

  return () => {
    cancelado = true;
    const hub = obtenerConexion();
    hub.off('TareaActualizada', alActualizar);
    hub.off('TareaEliminada', alEliminar);
    if (hub.state === 'Connected') hub.invoke('DesuscribirseDeProyecto', proyectoId).catch(() => undefined);
  };
}

export async function detenerConexion() {
  if (conexion) await conexion.stop();
  conexion = null;
}
