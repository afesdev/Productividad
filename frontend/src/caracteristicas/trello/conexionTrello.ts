import { apiTrello } from '../../servicios/api';
import type { EstadoConexionTrelloDto } from '../../servicios/tipos';

/**
 * Estado de la conexión con Trello compartido por las piezas que se muestran solo si hay cuenta conectada
 * (vínculos en tareas y tickets, calendario, Inicio): una petición por sesión de página.
 */
let peticion: Promise<EstadoConexionTrelloDto> | null = null;

export function obtenerConexionTrello(): Promise<EstadoConexionTrelloDto> {
  peticion ??= apiTrello.conexion().catch((error) => {
    peticion = null;
    throw error;
  });
  return peticion;
}

/** Llamar al conectar o desconectar para que la próxima consulta vuelva a preguntar al servidor. */
export function invalidarConexionTrello() {
  peticion = null;
}

/** true si hay cuenta de Trello conectada; ante cualquier error, false (las integraciones simplemente no se muestran). */
export const trelloConectado = () =>
  obtenerConexionTrello()
    .then((conexion) => conexion.conectado)
    .catch(() => false);
