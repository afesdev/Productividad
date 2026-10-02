import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, LifeBuoy, ListChecks } from 'lucide-react';
import { apiBusqueda } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import { rutaDeEntidad } from '../../servicios/rutas';
import type { TipoEntidad } from '../../servicios/tipos';
import type { Icono } from '../ui/primitivos';
import type { DestinoWikiLink, OpcionesWikiLinks } from './WikiLinks';

export const iconosEntidad: Record<TipoEntidad, Icono> = { Tarea: ListChecks, Ticket: LifeBuoy, Documento: FileText, RegistroDiario: FileText };
const gruposEntidad: Record<TipoEntidad, string> = { Tarea: 'Tareas', Ticket: 'Tickets', Documento: 'Páginas', RegistroDiario: 'Bitácora' };

/** Autocompletado y navegación de [[WikiLinks]] para EditorRico. `excluirId` evita que una entidad se enlace a sí misma. */
export function usarWikiLinks(excluirId?: string): OpcionesWikiLinks {
  const navegar = useNavigate();

  return useMemo(
    () => ({
      buscar: async (termino: string): Promise<DestinoWikiLink[]> => {
        const resultados = await apiBusqueda.buscar(termino);
        return resultados
          .filter((resultado) => resultado.tipo !== 'RegistroDiario' && resultado.id !== excluirId)
          .map((resultado) => ({
            id: `${resultado.tipo}-${resultado.id}`,
            titulo: resultado.tipo === 'Documento' ? resultado.titulo : `${resultado.referencia} · ${resultado.titulo}`,
            descripcion: resultado.tipo === 'Documento' ? resultado.referencia : (resultado.subtitulo ?? undefined),
            icono: iconosEntidad[resultado.tipo],
            grupo: gruposEntidad[resultado.tipo],
            destino: resultado.tipo === 'Documento' ? resultado.titulo : resultado.referencia,
          }));
      },
      alAbrir: async (destino: string) => {
        try {
          const resultados = await apiBusqueda.buscar(destino);
          const normalizado = destino.toLowerCase();
          const encontrado = resultados.find(
            (resultado) => resultado.referencia.toLowerCase() === normalizado || (resultado.tipo === 'Documento' && resultado.titulo.toLowerCase() === normalizado),
          );
          if (encontrado) navegar(rutaDeEntidad(encontrado.tipo, encontrado.id));
          else notificar.aviso('Enlace sin destino', `No hay nada llamado [[${destino}]] todavía.`);
        } catch (errorBusqueda) {
          notificar.error('No se pudo abrir el enlace', errorBusqueda);
        }
      },
    }),
    [excluirId, navegar],
  );
}
