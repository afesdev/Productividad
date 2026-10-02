import type { UsuarioDto } from './tipos';

/**
 * El token de acceso vive solo en memoria (nunca en localStorage) para reducir el impacto de un XSS.
 * Al recargar la página, la sesión se recupera con la cookie HttpOnly de refresco.
 */
interface EstadoSesion {
  tokenAcceso: string | null;
  usuario: UsuarioDto | null;
}

type Suscriptor = (estado: EstadoSesion) => void;

let estadoActual: EstadoSesion = { tokenAcceso: null, usuario: null };
const suscriptores = new Set<Suscriptor>();

export const almacenSesion = {
  obtener: (): EstadoSesion => estadoActual,

  establecer(tokenAcceso: string, usuario: UsuarioDto) {
    estadoActual = { tokenAcceso, usuario };
    suscriptores.forEach((suscriptor) => suscriptor(estadoActual));
  },

  limpiar() {
    estadoActual = { tokenAcceso: null, usuario: null };
    suscriptores.forEach((suscriptor) => suscriptor(estadoActual));
  },

  suscribir(suscriptor: Suscriptor) {
    suscriptores.add(suscriptor);
    return () => {
      suscriptores.delete(suscriptor);
    };
  },
};
