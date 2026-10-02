import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { almacenSesion } from './almacenSesion';
import type { RespuestaSesion } from './tipos';

export const clienteApi = axios.create({ baseURL: '/api/v1', withCredentials: true });

clienteApi.interceptors.request.use((configuracion) => {
  const { tokenAcceso } = almacenSesion.obtener();
  if (tokenAcceso) configuracion.headers.Authorization = `Bearer ${tokenAcceso}`;
  return configuracion;
});

// Un único refresco en vuelo aunque fallen varias peticiones a la vez.
let refrescoEnCurso: Promise<string | null> | null = null;

export function refrescarSesion(): Promise<string | null> {
  refrescoEnCurso ??= axios
    .post<RespuestaSesion>('/api/v1/autenticacion/refrescar', null, { withCredentials: true })
    .then(({ data }) => {
      almacenSesion.establecer(data.tokenAcceso, data.usuario);
      return data.tokenAcceso;
    })
    .catch(() => {
      almacenSesion.limpiar();
      return null;
    })
    .finally(() => {
      refrescoEnCurso = null;
    });
  return refrescoEnCurso;
}

clienteApi.interceptors.response.use(
  (respuesta) => respuesta,
  async (error: AxiosError) => {
    const peticionOriginal = error.config as (InternalAxiosRequestConfig & { _reintentada?: boolean }) | undefined;
    const esRutaAutenticacion = peticionOriginal?.url?.startsWith('/autenticacion');

    if (error.response?.status === 401 && peticionOriginal && !peticionOriginal._reintentada && !esRutaAutenticacion) {
      peticionOriginal._reintentada = true;
      const nuevoToken = await refrescarSesion();
      if (nuevoToken) return clienteApi(peticionOriginal);
    }
    return Promise.reject(error);
  },
);

/** Extrae un mensaje legible de un ProblemDetails del backend. */
export function obtenerMensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const problema = error.response?.data as { detail?: string; title?: string; errors?: Record<string, string[]> } | undefined;
    if (problema?.errors) return Object.values(problema.errors).flat().join(' ');
    if (problema?.detail) return problema.detail;
    if (problema?.title) return problema.title;
    if (error.response?.status === 429) return 'Demasiados intentos. Espere un minuto.';
  }
  return 'Ocurrió un error inesperado.';
}
