import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ListPlus } from 'lucide-react';
import { apiDiario, apiProyectos } from '../../servicios/api';
import { obtenerMensajeError } from '../../servicios/clienteApi';
import { notificar } from '../../servicios/notificaciones';
import type { EntradaDiarioDto, EstructuraProyectoDto } from '../../servicios/tipos';
import { Modal } from '../../componentes/ui/Modal';
import { Boton, Campo, Casilla, Entrada, MensajeError, Selector } from '../../componentes/ui/primitivos';
import { usarProyectos } from '../proyectos/usarProyectos';

/** Crea una tarea real (módulo Tareas) desde una entrada del diario; el detalle pasa a ser la descripción. */
export function ModalConvertirEnTarea({ entrada, alCerrar, alConvertir }: { entrada: EntradaDiarioDto | null; alCerrar: () => void; alConvertir: () => Promise<void> }) {
  const { proyectos, proyectoId, setProyectoId } = usarProyectos();
  const [estructura, setEstructura] = useState<EstructuraProyectoDto | null>(null);
  const [listaTareaId, setListaTareaId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [esUrgente, setEsUrgente] = useState(false);
  const [esImportante, setEsImportante] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!entrada) return;
    // Los títulos de las entradas admiten Markdown en línea; en la tarea va el texto plano.
    setTitulo(entrada.titulo.replace(/[*_`~]/g, '').slice(0, 200));
    setEsUrgente(entrada.tipo === 'Bloqueo');
    setEsImportante(true);
    setError(null);
  }, [entrada]);

  useEffect(() => {
    if (!entrada || !proyectoId) return;
    apiProyectos.estructura(proyectoId).then(setEstructura).catch((errorCarga) => setError(obtenerMensajeError(errorCarga)));
  }, [entrada, proyectoId]);

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

  useEffect(() => {
    if (listas.length > 0 && !listas.some((lista) => lista.id === listaTareaId)) setListaTareaId(listas[0].id);
  }, [listas, listaTareaId]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!entrada || !listaTareaId) return;
    setEnviando(true);
    setError(null);
    try {
      await apiDiario.convertirEnTarea(entrada.id, { listaTareaId, titulo: titulo.trim() || null, esUrgente, esImportante });
      notificar.exito('Tarea creada', titulo.trim());
      await alConvertir();
    } catch (errorConversion) {
      setError(obtenerMensajeError(errorConversion));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      abierto={entrada !== null}
      alCerrar={alCerrar}
      titulo="Convertir en tarea"
      descripcion="Se crea en el módulo Tareas y queda enlazada a esta entrada del diario."
      pie={
        <>
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="formulario-convertir" icono={ListPlus} cargando={enviando} disabled={!listaTareaId}>
            Crear tarea
          </Boton>
        </>
      }
    >
      <form id="formulario-convertir" onSubmit={enviar} className="flex flex-col gap-4">
        <Campo etiqueta="Título">
          <Entrada required autoFocus maxLength={200} value={titulo} onChange={(evento) => setTitulo(evento.target.value)} />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
        <div className="flex flex-wrap gap-6">
          <Casilla etiqueta="Urgente" checked={esUrgente} onChange={(evento) => setEsUrgente(evento.target.checked)} />
          <Casilla etiqueta="Importante" checked={esImportante} onChange={(evento) => setEsImportante(evento.target.checked)} />
        </div>
        {entrada?.detalleMarkdown && <p className="text-xs text-texto-3">El detalle de la entrada se copia como descripción de la tarea.</p>}
        <MensajeError mensaje={error} />
      </form>
    </Modal>
  );
}
