import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { FolderKanban, Plus } from 'lucide-react';
import { ArbolProyecto } from '../caracteristicas/tareas/ArbolProyecto';
import { DetalleTarea } from '../caracteristicas/tareas/DetalleTarea';
import { TableroKanban } from '../caracteristicas/tareas/TableroKanban';
import { SelectorProyecto } from '../caracteristicas/proyectos/SelectorProyecto';
import { usarProyectos } from '../caracteristicas/proyectos/usarProyectos';
import { apiProyectos, apiTareas } from '../servicios/api';
import { escucharTareasProyecto } from '../servicios/conexionSignalR';
import { notificar } from '../servicios/notificaciones';
import type { EstadoTarea, EstructuraProyectoDto, TareaResumenDto } from '../servicios/tipos';
import { Boton, EncabezadoPagina, EstadoVacio, Esqueleto } from '../componentes/ui/primitivos';

/** Reemplaza o agrega la tarea y mantiene el orden por lista e índice. */
function fusionarTarea(tareas: TareaResumenDto[], actualizada: TareaResumenDto): TareaResumenDto[] {
  const sinLaTarea = tareas.filter((tarea) => tarea.id !== actualizada.id);
  return [...sinLaTarea, actualizada].sort((a, b) => a.indiceOrden - b.indiceOrden);
}

export function PaginaTareas() {
  const { proyectos, proyectoId, setProyectoId, cargando, recargar } = usarProyectos();
  const [parametros, setParametros] = useSearchParams();
  const [estructura, setEstructura] = useState<EstructuraProyectoDto | null>(null);
  const [tareas, setTareas] = useState<TareaResumenDto[]>([]);
  const navegar = useNavigate();

  const tareaAbierta = parametros.get('tarea');
  const listaSeleccionadaId = parametros.get('lista');

  const todasLasListas = useMemo(
    () => (estructura ? [...estructura.carpetas.flatMap((carpeta) => carpeta.listas), ...estructura.listasSinCarpeta] : []),
    [estructura],
  );
  const nombresListas = useMemo(() => Object.fromEntries(todasLasListas.map((lista) => [lista.id, lista.nombre])), [todasLasListas]);

  const actualizarParametro = useCallback(
    (clave: string, valor: string | null) => {
      setParametros(
        (actuales) => {
          const siguientes = new URLSearchParams(actuales);
          if (valor) siguientes.set(clave, valor);
          else siguientes.delete(clave);
          return siguientes;
        },
        { replace: clave === 'lista' },
      );
    },
    [setParametros],
  );

  const recargarEstructura = useCallback(async () => {
    if (!proyectoId) return;
    try {
      setEstructura(await apiProyectos.estructura(proyectoId));
    } catch (errorCarga) {
      notificar.error('No se pudieron cargar las listas', errorCarga);
    }
  }, [proyectoId]);

  useEffect(() => {
    if (!proyectoId) return;
    setEstructura(null);
    setTareas([]);
    void recargarEstructura();
    apiTareas
      .listarPorProyecto(proyectoId)
      .then(setTareas)
      .catch((errorCarga) => notificar.error('No se pudieron cargar las tareas', errorCarga));

    return escucharTareasProyecto(proyectoId, {
      alActualizar: (tarea) => setTareas((actuales) => fusionarTarea(actuales, tarea)),
      alEliminar: (tareaId) => setTareas((actuales) => actuales.filter((tarea) => tarea.id !== tareaId)),
    });
  }, [proyectoId, recargarEstructura]);

  // Si la lista seleccionada ya no existe (se borró), se vuelve a "Todas".
  useEffect(() => {
    if (estructura && listaSeleccionadaId && !todasLasListas.some((lista) => lista.id === listaSeleccionadaId)) actualizarParametro('lista', null);
  }, [estructura, listaSeleccionadaId, todasLasListas, actualizarParametro]);

  const tareasVisibles = listaSeleccionadaId ? tareas.filter((tarea) => tarea.listaTareaId === listaSeleccionadaId) : tareas;

  async function moverTarea(tarea: TareaResumenDto, estado: EstadoTarea, antesDeTareaId: string | null) {
    const referencia = antesDeTareaId ? tareas.find((candidata) => candidata.id === antesDeTareaId) : null;
    // Con "Todas las listas" solo se reordena si la referencia es de la misma lista.
    const antesDe = referencia && referencia.listaTareaId === tarea.listaTareaId ? antesDeTareaId : null;
    const anteriores = tareas;

    setTareas((actuales) => {
      const sinLaTarea = actuales.filter((candidata) => candidata.id !== tarea.id);
      const posicion = antesDe ? sinLaTarea.findIndex((candidata) => candidata.id === antesDe) : sinLaTarea.length;
      sinLaTarea.splice(posicion, 0, { ...tarea, estado });
      return sinLaTarea;
    });

    try {
      await apiTareas.mover(tarea.id, tarea.listaTareaId, estado, antesDe);
      // El reordenamiento renumera hermanas: se recarga para tener los índices reales.
      if (proyectoId) setTareas(await apiTareas.listarPorProyecto(proyectoId));
      if (estado !== tarea.estado) void recargarEstructura();
    } catch (errorMovimiento) {
      setTareas(anteriores);
      notificar.error('No se pudo mover la tarea', errorMovimiento);
    }
  }

  async function crearRapido(titulo: string, estado: EstadoTarea) {
    const listaDestino = listaSeleccionadaId ?? todasLasListas[0]?.id;
    if (!listaDestino) {
      notificar.aviso('No hay listas', 'Crea una lista antes de añadir tareas.');
      return;
    }
    try {
      const id = await apiTareas.crear({ listaTareaId: listaDestino, titulo, estado, esUrgente: false, esImportante: false });
      const creada = await apiTareas.obtener(id);
      setTareas((actuales) => fusionarTarea(actuales, creada.resumen));
      void recargarEstructura();
    } catch (errorCreacion) {
      notificar.error('No se pudo crear la tarea', errorCreacion);
    }
  }

  const alCambiarDesdeDetalle = useCallback(
    (tareaId: string, resumen: TareaResumenDto | null) => {
      setTareas((actuales) => (resumen ? fusionarTarea(actuales, resumen) : actuales.filter((tarea) => tarea.id !== tareaId && tarea.tareaPadreId !== tareaId)));
      void recargarEstructura();
    },
    [recargarEstructura],
  );

  const tituloLista = listaSeleccionadaId ? nombresListas[listaSeleccionadaId] : 'Todas las listas';

  return (
    <>
      <EncabezadoPagina
        titulo="Tareas"
        descripcion="Arrastra las tarjetas para cambiar su estado u orden. Clic para ver y editar el detalle."
        acciones={
          <>
            <SelectorProyecto proyectos={proyectos} proyectoId={proyectoId} alSeleccionar={setProyectoId} alCrear={recargar} alEditar={recargar} />
            {proyectoId && (
              <Boton icono={Plus} onClick={() => navegar(`/tareas/nueva${listaSeleccionadaId ? `?lista=${listaSeleccionadaId}` : ''}`)}>
                Nueva tarea
              </Boton>
            )}
          </>
        }
      />

      {!proyectoId ? (
        !cargando && (
          <EstadoVacio icono={FolderKanban} titulo="Aún no hay proyectos" descripcion="Crea tu primer proyecto para organizar tareas en listas y carpetas." />
        )
      ) : (
        <div className="grid gap-6 lg:grid-cols-[232px_1fr]">
          <aside className="lg:sticky lg:top-20 lg:self-start">
            {estructura ? (
              <ArbolProyecto
                estructura={estructura}
                listaSeleccionadaId={listaSeleccionadaId}
                alSeleccionarLista={(listaId) => actualizarParametro('lista', listaId)}
                alCambiar={recargarEstructura}
              />
            ) : (
              <div className="flex flex-col gap-2">
                <Esqueleto className="h-8" />
                <Esqueleto className="h-8" />
                <Esqueleto className="h-8 w-2/3" />
              </div>
            )}
          </aside>
          <div className="flex min-w-0 flex-col gap-3">
            <h2 className="text-sm font-medium text-texto-2">{tituloLista}</h2>
            <TableroKanban
              tareas={tareasVisibles}
              nombresListas={nombresListas}
              mostrarLista={!listaSeleccionadaId}
              alMover={(tarea, estado, antesDe) => void moverTarea(tarea, estado, antesDe)}
              alAbrir={(tarea) => actualizarParametro('tarea', tarea.id)}
              alCrearRapido={crearRapido}
            />
          </div>
        </div>
      )}

      <AnimatePresence>
        {tareaAbierta && (
          <DetalleTarea
            key={tareaAbierta}
            tareaId={tareaAbierta}
            alCerrar={() => actualizarParametro('tarea', null)}
            alAbrirTarea={(id) => actualizarParametro('tarea', id)}
            alCambiar={alCambiarDesdeDetalle}
          />
        )}
      </AnimatePresence>
    </>
  );
}
