import type { TipoEntidad } from './tipos';

/** Ruta de la vista de cada tipo de entidad (backlinks, búsqueda, marcadores). */
export function rutaDeEntidad(tipo: TipoEntidad, id: string): string {
  switch (tipo) {
    case 'Tarea':
      return `/tareas?tarea=${id}`;
    case 'Ticket':
      return `/tickets/${id}`;
    case 'Documento':
      return `/documentos/${id}`;
    case 'RegistroDiario':
      return `/diario/registro/${id}`;
    default:
      return '/';
  }
}
