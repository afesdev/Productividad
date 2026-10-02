import { Link } from 'react-router-dom';
import { Check, FolderKanban, Settings2 } from 'lucide-react';
import type { ProyectoSoporteDto, ProyectoTicketDto } from '../../servicios/tipos';
import { unirClases } from '../../componentes/ui/primitivos';
import { paleta } from '../documentos/paleta';

/** Chip pastel de un proyecto (categoría) del ticket. */
export function ChipProyecto({ proyecto, className }: { proyecto: Pick<ProyectoTicketDto, 'nombre' | 'color'>; className?: string }) {
  const tono = paleta[proyecto.color] ?? paleta.violeta;
  return (
    <span className={unirClases('inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', tono.suave, className)}>
      <span className={unirClases('size-1.5 shrink-0 rounded-full', tono.punto)} />
      <span className="truncate">{proyecto.nombre}</span>
    </span>
  );
}

/**
 * Selección múltiple de proyectos como chips que se activan y desactivan.
 * `ajenos`: proyectos ya asignados que no son del catálogo del usuario (ticket compartido): se muestran fijos y se conservan.
 */
export function SelectorProyectos({
  catalogo,
  seleccionados,
  ajenos = [],
  alCambiar,
  deshabilitado,
}: {
  catalogo: ProyectoSoporteDto[] | null;
  seleccionados: string[];
  ajenos?: ProyectoTicketDto[];
  alCambiar: (ids: string[]) => void;
  deshabilitado?: boolean;
}) {
  function alternar(id: string) {
    alCambiar(seleccionados.includes(id) ? seleccionados.filter((actual) => actual !== id) : [...seleccionados, id]);
  }

  if (catalogo !== null && catalogo.length === 0 && ajenos.length === 0) {
    return (
      <Link
        to="/tickets/proyectos"
        className="flex items-center gap-2 rounded-lg border border-dashed border-violet-200 bg-violet-50/50 px-3 py-2.5 text-xs text-violet-800 transition hover:bg-violet-50"
      >
        <FolderKanban className="size-4 shrink-0" />
        Crea proyectos (portal, API, app móvil…) para clasificar los tickets.
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Proyectos">
        {ajenos.map((proyecto) => (
          <span key={proyecto.id} title="Proyecto de otra persona: se conserva">
            <ChipProyecto proyecto={proyecto} className="opacity-80" />
          </span>
        ))}
        {catalogo?.map((proyecto) => {
          const activo = seleccionados.includes(proyecto.id);
          const tono = paleta[proyecto.color] ?? paleta.violeta;
          return (
            <button
              key={proyecto.id}
              type="button"
              aria-pressed={activo}
              disabled={deshabilitado}
              onClick={() => alternar(proyecto.id)}
              className={unirClases(
                'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition disabled:opacity-60',
                activo ? unirClases(tono.suave, 'border-transparent') : 'border-borde text-texto-2 hover:bg-superficie-2 hover:text-texto',
              )}
            >
              {activo ? <Check className="size-3" /> : <span className={unirClases('size-1.5 rounded-full', tono.punto)} />}
              {proyecto.nombre}
            </button>
          );
        })}
      </div>
      <Link to="/tickets/proyectos" className="inline-flex items-center gap-1 self-start text-xs text-texto-3 hover:text-texto-2 hover:underline">
        <Settings2 className="size-3" />
        Gestionar proyectos
      </Link>
    </div>
  );
}
