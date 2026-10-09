import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiProyectos, apiTrello } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import type { ListaTareasDto, ProyectoDto } from '../../servicios/tipos';
import { Modal } from '../../componentes/ui/Modal';
import { Boton, Campo, Selector } from '../../componentes/ui/primitivos';

const ClaveUltimaLista = 'trello.importar.lista';

/** Elige proyecto y lista y crea la tarea a partir de la tarjeta (queda vinculada). Recuerda la última lista usada. */
export function ModalImportarTarjetaTrello({
  idTarjeta,
  nombreTarjeta,
  alCerrar,
  alImportar,
}: {
  idTarjeta: string | null;
  nombreTarjeta: string;
  alCerrar: () => void;
  /** Tras crear la tarea (antes de navegar a ella), p. ej. para cerrar el modal de la tarjeta. */
  alImportar?: () => void;
}) {
  const navegar = useNavigate();
  const [proyectos, setProyectos] = useState<ProyectoDto[] | null>(null);
  const [proyectoId, setProyectoId] = useState('');
  const [listas, setListas] = useState<ListaTareasDto[]>([]);
  const [listaId, setListaId] = useState('');
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    if (!idTarjeta) return;
    Promise.all([apiProyectos.listar(), leerUltimaLista()])
      .then(async ([lista, ultima]) => {
        setProyectos(lista);
        // Si la última lista usada sigue existiendo, se preselecciona su proyecto.
        for (const proyecto of ultima ? lista : []) {
          const listasProyecto = await apiProyectos.listarListas(proyecto.id);
          if (listasProyecto.some((otra) => otra.id === ultima)) {
            setProyectoId(proyecto.id);
            setListas(listasProyecto);
            setListaId(ultima!);
            return;
          }
        }
        if (lista[0]) setProyectoId(lista[0].id);
      })
      .catch((error) => notificar.error('No se pudieron cargar los proyectos', error));
  }, [idTarjeta]);

  useEffect(() => {
    if (!proyectoId || listas.some((lista) => lista.proyectoId === proyectoId)) return;
    apiProyectos
      .listarListas(proyectoId)
      .then((nuevas) => {
        setListas(nuevas);
        setListaId(nuevas[0]?.id ?? '');
      })
      .catch((error) => notificar.error('No se pudieron cargar las listas', error));
  }, [proyectoId, listas]);

  async function importar(evento: FormEvent) {
    evento.preventDefault();
    if (!idTarjeta || !listaId) return;
    setImportando(true);
    try {
      const tareaId = await apiTrello.importar(idTarjeta, listaId);
      try {
        localStorage.setItem(ClaveUltimaLista, listaId);
      } catch {
        // Solo se pierde la preselección.
      }
      notificar.exito('Tarea creada desde Trello', nombreTarjeta);
      alCerrar();
      alImportar?.();
      navegar(`/tareas?tarea=${tareaId}`);
    } catch (error) {
      notificar.error('No se pudo importar la tarjeta', error);
    } finally {
      setImportando(false);
    }
  }

  return (
    <Modal
      abierto={idTarjeta !== null}
      alCerrar={alCerrar}
      titulo="Importar como tarea"
      descripcion="Se copian el título, la descripción, los checklists y el vencimiento. La tarjeta queda vinculada; Trello no cambia."
      pie={
        <>
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="formulario-importar-trello" cargando={importando} disabled={!listaId}>
            Crear tarea
          </Boton>
        </>
      }
    >
      <form id="formulario-importar-trello" onSubmit={importar} className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Proyecto">
          <Selector value={proyectoId} onChange={(evento) => setProyectoId(evento.target.value)} disabled={!proyectos}>
            {(proyectos ?? []).map((proyecto) => (
              <option key={proyecto.id} value={proyecto.id}>
                {proyecto.nombre}
              </option>
            ))}
          </Selector>
        </Campo>
        <Campo etiqueta="Lista">
          <Selector value={listaId} onChange={(evento) => setListaId(evento.target.value)} disabled={listas.length === 0}>
            {listas
              .filter((lista) => lista.proyectoId === proyectoId)
              .map((lista) => (
                <option key={lista.id} value={lista.id}>
                  {lista.nombre}
                </option>
              ))}
          </Selector>
        </Campo>
        {proyectos?.length === 0 && <p className="text-sm text-texto-2 sm:col-span-2">Crea primero un proyecto en Tareas.</p>}
      </form>
    </Modal>
  );
}

function leerUltimaLista(): Promise<string | null> {
  try {
    return Promise.resolve(localStorage.getItem(ClaveUltimaLista));
  } catch {
    return Promise.resolve(null);
  }
}
