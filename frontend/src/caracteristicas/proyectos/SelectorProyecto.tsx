import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { FolderPlus, Pencil } from 'lucide-react';
import { apiProyectos } from '../../servicios/api';
import { obtenerMensajeError } from '../../servicios/clienteApi';
import { notificar } from '../../servicios/notificaciones';
import type { ProyectoDto } from '../../servicios/tipos';
import { Modal } from '../../componentes/ui/Modal';
import { AreaTexto, Boton, Campo, Entrada, MensajeError, Selector } from '../../componentes/ui/primitivos';

interface PropiedadesSelector {
  proyectos: ProyectoDto[];
  proyectoId: string | null;
  alSeleccionar: (id: string) => void;
  alCrear: () => Promise<void>;
  alEditar?: () => Promise<void>;
}

export function SelectorProyecto({ proyectos, proyectoId, alSeleccionar, alCrear, alEditar }: PropiedadesSelector) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalEdicion, setModalEdicion] = useState(false);
  const alCerrarModal = useCallback(() => setModalAbierto(false), []);
  const alCerrarEdicion = useCallback(() => setModalEdicion(false), []);
  const proyectoActual = proyectos.find((proyecto) => proyecto.id === proyectoId) ?? null;

  return (
    <>
      {proyectos.length > 0 && (
        <Selector aria-label="Proyecto" value={proyectoId ?? ''} onChange={(evento) => alSeleccionar(evento.target.value)} className="w-60">
          {proyectos.map((proyecto) => (
            <option key={proyecto.id} value={proyecto.id}>
              {proyecto.clavePrefijo} · {proyecto.nombre}
            </option>
          ))}
        </Selector>
      )}
      <Boton variante="secundario" icono={FolderPlus} onClick={() => setModalAbierto(true)}>
        Proyecto
      </Boton>
      <ModalNuevoProyecto
        abierto={modalAbierto}
        alCerrar={alCerrarModal}
        alCrear={async (id) => {
          await alCrear();
          alSeleccionar(id);
          setModalAbierto(false);
        }}
      />
      {proyectoActual && alEditar && (
        <>
          <Boton variante="secundario" icono={Pencil} onClick={() => setModalEdicion(true)}>
            Editar
          </Boton>
          <ModalEditarProyecto
            proyecto={proyectoActual}
            abierto={modalEdicion}
            alCerrar={alCerrarEdicion}
            alGuardar={async () => {
              setModalEdicion(false);
              await alEditar();
            }}
          />
        </>
      )}
    </>
  );
}

export function ModalNuevoProyecto({ abierto, alCerrar, alCrear }: { abierto: boolean; alCerrar: () => void; alCrear: (id: string) => Promise<void> }) {
  const [nombre, setNombre] = useState('');
  const [clave, setClave] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cerrar = useCallback(() => {
    setError(null);
    alCerrar();
  }, [alCerrar]);

  const handleNombreChange = useCallback((evento: React.ChangeEvent<HTMLInputElement>) => setNombre(evento.target.value), []);
  const handleClaveChange = useCallback((evento: React.ChangeEvent<HTMLInputElement>) => setClave(evento.target.value.toUpperCase()), []);
  const handleDescripcionChange = useCallback((evento: React.ChangeEvent<HTMLTextAreaElement>) => setDescripcion(evento.target.value), []);

  const enviar = useCallback(async (evento: FormEvent) => {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const id = await apiProyectos.crear(nombre.trim(), clave, descripcion.trim() || undefined);
      await alCrear(id);
      notificar.exito('Proyecto creado', `${clave} · ${nombre.trim()}`);
      setNombre('');
      setClave('');
      setDescripcion('');
    } catch (errorCreacion) {
      setError(obtenerMensajeError(errorCreacion));
    } finally {
      setEnviando(false);
    }
  }, [nombre, clave, descripcion, alCrear]);

  return (
    <Modal
      abierto={abierto}
      alCerrar={cerrar}
      titulo="Nuevo proyecto"
      descripcion="La clave identifica las tareas del proyecto (ej. WEB-105) y no se puede cambiar después."
      pie={
        <>
          <Boton variante="secundario" onClick={cerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="formulario-proyecto" cargando={enviando}>
            Crear proyecto
          </Boton>
        </>
      }
    >
      <form id="formulario-proyecto" onSubmit={enviar} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <Campo etiqueta="Nombre">
            <Entrada required maxLength={100} value={nombre} onChange={handleNombreChange} placeholder="Sitio web" />
          </Campo>
          <Campo etiqueta="Clave">
            <Entrada
              required
              pattern="[A-Za-z]{2,10}"
              title="Entre 2 y 10 letras"
              value={clave}
              onChange={handleClaveChange}
              placeholder="WEB"
              className="font-mono uppercase"
            />
          </Campo>
        </div>
        <Campo etiqueta="Descripción (opcional)">
          <AreaTexto rows={3} maxLength={500} value={descripcion} onChange={handleDescripcionChange} />
        </Campo>
        <MensajeError mensaje={error} />
      </form>
    </Modal>
  );
}

export function ModalEditarProyecto({ proyecto, abierto, alCerrar, alGuardar }: { proyecto: ProyectoDto; abierto: boolean; alCerrar: () => void; alGuardar: () => Promise<void> }) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setNombre(proyecto.nombre);
    setDescripcion(proyecto.descripcion ?? '');
    setError(null);
  }, [abierto, proyecto]);

  const cerrar = useCallback(() => {
    setError(null);
    alCerrar();
  }, [alCerrar]);

  const handleNombreChange = useCallback((evento: React.ChangeEvent<HTMLInputElement>) => setNombre(evento.target.value), []);
  const handleDescripcionChange = useCallback((evento: React.ChangeEvent<HTMLTextAreaElement>) => setDescripcion(evento.target.value), []);

  const enviar = useCallback(async (evento: FormEvent) => {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await apiProyectos.actualizar(proyecto.id, nombre.trim(), descripcion.trim() || null);
      notificar.exito('Proyecto actualizado', nombre.trim());
      await alGuardar();
    } catch (errorGuardado) {
      setError(obtenerMensajeError(errorGuardado));
    } finally {
      setEnviando(false);
    }
  }, [nombre, descripcion, proyecto.id, alGuardar]);

  return (
    <Modal
      abierto={abierto}
      alCerrar={cerrar}
      titulo="Editar proyecto"
      descripcion="La clave no se puede cambiar después."
      pie={
        <>
          <Boton variante="secundario" onClick={cerrar}>Cancelar</Boton>
          <Boton type="submit" form="formulario-editar-proyecto" cargando={enviando}>Guardar</Boton>
        </>
      }
    >
      <form id="formulario-editar-proyecto" onSubmit={enviar} className="flex flex-col gap-4">
        <Campo etiqueta="Nombre">
          <Entrada required maxLength={100} value={nombre} onChange={handleNombreChange} placeholder="Sitio web" />
        </Campo>
        <Campo etiqueta="Descripción (opcional)">
          <AreaTexto rows={3} maxLength={500} value={descripcion} onChange={handleDescripcionChange} />
        </Campo>
        <MensajeError mensaje={error} />
      </form>
    </Modal>
  );
}
