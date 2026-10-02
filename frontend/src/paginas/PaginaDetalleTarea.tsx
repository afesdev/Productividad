import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { apiTareas } from '../servicios/api';
import { notificar } from '../servicios/notificaciones';
import type { TareaResumenDto } from '../servicios/tipos';
import { Boton, EncabezadoPagina } from '../componentes/ui/primitivos';
import { DetalleTarea } from '../caracteristicas/tareas/DetalleTarea';
import { usarConfirmacion } from '../componentes/ui/DialogoConfirmacion';

export function PaginaDetalleTarea() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const [tarea, setTarea] = useState<TareaResumenDto | null>(null);
  const confirmar = usarConfirmacion();

  const cargar = useCallback(async () => {
    try {
      const resumen = await apiTareas.obtener(id);
      setTarea(resumen.resumen);
    } catch (errorCarga) {
      notificar.error('No se pudo cargar la tarea', errorCarga);
    }
  }, [id]);

  useEffect(() => {
    setTarea(null);
    void cargar();
  }, [cargar]);

  async function eliminarTarea() {
    const confirmado = await confirmar({ titulo: 'Eliminar tarea', descripcion: `Se eliminará "${tarea?.titulo ?? 'esta tarea'}". No se puede deshacer.`, textoConfirmar: 'Eliminar', peligrosa: true });
    if (!confirmado) return;
    try {
      await apiTareas.eliminar(id);
      notificar.exito('Tarea eliminada', tarea?.titulo ?? '');
      navegar('/tareas');
    } catch (errorEliminacion) {
      notificar.error('No se pudo eliminar la tarea', errorEliminacion);
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo={tarea?.titulo ?? 'Cargando...'}
        descripcion={tarea ? `${tarea.clave} · ${tarea.estado} · ${tarea.prioridad}` : 'Cargando detalles de la tarea'}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => navegar(-1)}>Volver</Boton>
            <Boton variante="peligro" icono={Trash2} onClick={() => void eliminarTarea()}>Eliminar</Boton>
          </>
        }
      />
      <div className="flex min-h-[calc(100vh-8rem)] flex-1 flex-col">
        <DetalleTarea tareaId={id} modoPagina alCerrar={() => navegar('/tareas')} alAbrirTarea={(id) => navegar(`/tareas/${id}`)} alCambiar={() => void cargar()} />
      </div>
    </>
  );
}
