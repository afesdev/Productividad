import { sileo } from 'sileo';
import { obtenerMensajeError } from './clienteApi';

/**
 * Fachada sobre Sileo: toda la app notifica por aquí, así el estilo y la duración se cambian en un solo lugar.
 */
export const notificar = {
  exito: (titulo: string, descripcion?: string) => sileo.success({ title: titulo, description: descripcion }),

  info: (titulo: string, descripcion?: string) => sileo.info({ title: titulo, description: descripcion }),

  aviso: (titulo: string, descripcion?: string) => sileo.warning({ title: titulo, description: descripcion }),

  /** Acepta un error de Axios/ProblemDetails y extrae el mensaje del backend. */
  error: (titulo: string, error?: unknown) =>
    sileo.error({ title: titulo, description: error === undefined ? undefined : obtenerMensajeError(error), duration: 6000 }),

  /** Muestra "cargando" y lo transforma en éxito o error con animación de morphing. */
  promesa: <T,>(promesa: Promise<T>, mensajes: { cargando: string; exito: string | ((datos: T) => string); error: string }) =>
    sileo.promise(promesa, {
      loading: { title: mensajes.cargando },
      success: (datos) => ({ title: typeof mensajes.exito === 'function' ? mensajes.exito(datos) : mensajes.exito }),
      error: (error) => ({ title: mensajes.error, description: obtenerMensajeError(error) }),
    }),
};
