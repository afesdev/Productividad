import { Grid2x2 } from 'lucide-react';
import { MatrizEisenhower } from '../caracteristicas/tareas/MatrizEisenhower';
import { SelectorProyecto } from '../caracteristicas/proyectos/SelectorProyecto';
import { usarProyectos } from '../caracteristicas/proyectos/usarProyectos';
import { EncabezadoPagina, EstadoVacio } from '../componentes/ui/primitivos';

export function PaginaMatriz() {
  const { proyectos, proyectoId, setProyectoId, cargando, recargar } = usarProyectos();

  return (
    <>
      <EncabezadoPagina
        titulo="Matriz de Eisenhower"
        descripcion="Arrastra las tareas abiertas entre cuadrantes para repriorizar."
        acciones={<SelectorProyecto proyectos={proyectos} proyectoId={proyectoId} alSeleccionar={setProyectoId} alCrear={recargar} alEditar={recargar} />}
      />
      {proyectoId ? (
        <MatrizEisenhower key={proyectoId} proyectoId={proyectoId} />
      ) : (
        !cargando && <EstadoVacio icono={Grid2x2} titulo="Aún no hay proyectos" descripcion="Crea un proyecto para empezar a priorizar tareas." />
      )}
    </>
  );
}
