import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usarProyectos } from '../caracteristicas/proyectos/usarProyectos';
import { apiProyectos, apiTareas } from '../servicios/api';
import { obtenerMensajeError } from '../servicios/clienteApi';
import { notificar } from '../servicios/notificaciones';
import type { EstadoTarea, EstructuraProyectoDto, Prioridad } from '../servicios/tipos';
import { EditorRico, type ManejadorEditorRico } from '../componentes/editor/EditorRico';
import { usarWikiLinks } from '../componentes/editor/usarWikiLinks';
import { Campo, Casilla, Entrada, MensajeError, Selector } from '../componentes/ui/primitivos';
import { VistaFormulario } from '../componentes/ui/VistaFormulario';

/**
 * Vista completa con la descripción como protagonista: editor visual (las imágenes pegadas se ven en línea)
 * a la izquierda y las propiedades de la tarea en un panel lateral.
 */
export function PaginaNuevaTarea() {
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const { proyectos, proyectoId, setProyectoId } = usarProyectos();
  const [estructura, setEstructura] = useState<EstructuraProyectoDto | null>(null);

  const [listaTareaId, setListaTareaId] = useState(parametros.get('lista') ?? '');
  const [titulo, setTitulo] = useState('');
  const editorDescripcion = useRef<ManejadorEditorRico>(null);
  const opcionesWikiLinks = usarWikiLinks();
  const [estado, setEstado] = useState<EstadoTarea>('Pendiente');
  const [prioridad, setPrioridad] = useState<Prioridad | ''>('');
  const [esUrgente, setEsUrgente] = useState(false);
  const [esImportante, setEsImportante] = useState(true);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [horasEstimadas, setHorasEstimadas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!proyectoId) return;
    apiProyectos
      .estructura(proyectoId)
      .then(setEstructura)
      .catch((errorCarga) => notificar.error('No se pudieron cargar las listas', errorCarga));
  }, [proyectoId]);

  const listas = useMemo(
    () =>
      estructura
        ? [
            ...estructura.carpetas.flatMap((carpeta) => carpeta.listas.map((lista) => ({ ...lista, etiqueta: `${carpeta.nombre} / ${lista.nombre}` }))),
            ...estructura.listasSinCarpeta.map((lista) => ({ ...lista, etiqueta: lista.nombre })),
          ]
        : [],
    [estructura],
  );

  // Si la lista elegida no pertenece al proyecto actual, se toma la primera.
  useEffect(() => {
    if (listas.length > 0 && !listas.some((lista) => lista.id === listaTareaId)) setListaTareaId(listas[0].id);
  }, [listas, listaTareaId]);

  const handleTituloChange = useCallback((evento: React.ChangeEvent<HTMLInputElement>) => setTitulo(evento.target.value), []);
  const handleDescripcionChange = useCallback(() => undefined, []);
  const handleEstadoChange = useCallback((evento: React.ChangeEvent<HTMLSelectElement>) => setEstado(evento.target.value as EstadoTarea), []);
  const handlePrioridadChange = useCallback((evento: React.ChangeEvent<HTMLSelectElement>) => setPrioridad(evento.target.value as Prioridad | ''), []);
  const handleFechaChange = useCallback((evento: React.ChangeEvent<HTMLInputElement>) => setFechaVencimiento(evento.target.value), []);
  const handleHorasChange = useCallback((evento: React.ChangeEvent<HTMLInputElement>) => setHorasEstimadas(evento.target.value), []);
  const handleUrgenteChange = useCallback((evento: React.ChangeEvent<HTMLInputElement>) => setEsUrgente(evento.target.checked), []);
  const handleImportanteChange = useCallback((evento: React.ChangeEvent<HTMLInputElement>) => setEsImportante(evento.target.checked), []);

  const enviar = useCallback(async (evento: FormEvent) => {
    evento.preventDefault();
    setError(null);
    const horas = horasEstimadas.trim() ? Number(horasEstimadas.replace(',', '.')) : null;
    if (horas !== null && (Number.isNaN(horas) || horas < 0 || horas > 999.99)) {
      setError('La estimación debe ser un número de horas entre 0 y 999,99.');
      return;
    }

    const descripcion = editorDescripcion.current?.obtenerMarkdown().trim() ?? '';
    setEnviando(true);
    try {
      const id = await apiTareas.crear({
        listaTareaId,
        titulo: titulo.trim(),
        descripcionMarkdown: descripcion.trim() || undefined,
        estado,
        esUrgente,
        esImportante,
        fechaVencimiento: fechaVencimiento ? new Date(`${fechaVencimiento}T23:59:00`).toISOString() : null,
        ...(prioridad ? { prioridad } : {}),
        ...(horas !== null ? { horasEstimadas: horas } : {}),
      });
      notificar.exito('Tarea creada', titulo.trim());
      navegar(`/tareas?lista=${listaTareaId}&tarea=${id}`);
    } catch (errorCreacion) {
      setError(obtenerMensajeError(errorCreacion));
    } finally {
      setEnviando(false);
    }
  }, [listaTareaId, titulo, estado, esUrgente, esImportante, fechaVencimiento, prioridad, horasEstimadas, navegar]);

  const panelPropiedades = (
    <>
      <h2 className="text-sm font-medium">Propiedades</h2>
      <Campo etiqueta="Proyecto">
        <Selector value={proyectoId ?? ''} onChange={(evento) => setProyectoId(evento.target.value)}>
          {proyectos.map((proyecto) => (
            <option key={proyecto.id} value={proyecto.id}>
              {proyecto.clavePrefijo} · {proyecto.nombre}
            </option>
          ))}
        </Selector>
      </Campo>
      <Campo etiqueta="Lista">
        <Selector required value={listaTareaId} onChange={(evento) => setListaTareaId(evento.target.value)}>
          {listas.map((lista) => (
            <option key={lista.id} value={lista.id}>
              {lista.etiqueta}
            </option>
          ))}
        </Selector>
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Estado">
          <Selector value={estado} onChange={handleEstadoChange}>
            <option value="Pendiente">Pendiente</option>
            <option value="EnProgreso">En progreso</option>
            <option value="Completada">Completada</option>
          </Selector>
        </Campo>
        <Campo etiqueta="Prioridad">
          <Selector value={prioridad} onChange={handlePrioridadChange}>
            <option value="">Automática</option>
            <option>Baja</option>
            <option>Media</option>
            <option>Alta</option>
            <option>Urgente</option>
          </Selector>
        </Campo>
      </div>
      <Campo etiqueta="Vence">
        <Entrada type="date" value={fechaVencimiento} onChange={handleFechaChange} />
      </Campo>
      <Campo etiqueta="Estimación (horas)">
        <Entrada inputMode="decimal" value={horasEstimadas} onChange={handleHorasChange} placeholder="2,5" />
      </Campo>

      <fieldset className="flex flex-col gap-2 border-t border-borde pt-4">
        <legend className="sr-only">Matriz de Eisenhower</legend>
        <span className="text-[13px] font-medium">Matriz de Eisenhower</span>
        <div className="flex flex-wrap gap-5">
          <Casilla etiqueta="Urgente" checked={esUrgente} onChange={handleUrgenteChange} />
          <Casilla etiqueta="Importante" checked={esImportante} onChange={handleImportanteChange} />
        </div>
        <p className="text-xs text-texto-3">Con prioridad automática, la matriz la define.</p>
      </fieldset>
    </>
  );

  return (
    <VistaFormulario
      titulo="Nueva tarea"
      descripcion="Describe la tarea con todo el detalle que necesites; las propiedades van a la derecha."
      alVolver={() => navegar(-1)}
      alEnviar={enviar}
      textoEnviar="Crear tarea"
      enviando={enviando}
      lateral={panelPropiedades}
    >
      <input
        required
        autoFocus
        aria-label="Título"
        maxLength={200}
        value={titulo}
        onChange={handleTituloChange}
        onKeyDown={(evento) => {
          // Enter pasa a la descripción en lugar de enviar el formulario.
          if (evento.key === 'Enter') {
            evento.preventDefault();
            editorDescripcion.current?.enfocar();
          }
        }}
        placeholder="Título de la tarea"
        className="w-full bg-transparent text-2xl font-semibold tracking-tight placeholder:text-texto-3 focus:outline-none"
      />

      <div className="border-t border-borde pt-5 [&_.editor-rico]:min-h-[30vh] [&_.editor-rico]:pb-6 lg:[&_.editor-rico]:min-h-[50vh]">
        <EditorRico
          ref={editorDescripcion}
          contenidoInicial=""
          alCambiar={handleDescripcionChange}
          wikiLinks={opcionesWikiLinks}
          placeholder='Describe la tarea… pega capturas con Ctrl+V, "/" para comandos, "[[" para enlazar'
        />
      </div>

      <MensajeError mensaje={error} />
    </VistaFormulario>
  );
}
