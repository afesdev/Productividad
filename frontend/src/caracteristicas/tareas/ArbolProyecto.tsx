import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, Folder, FolderOpen, FolderPlus, Layers, List, ListPlus, MoreHorizontal, Plus } from 'lucide-react';
import { apiCarpetas, apiListas, apiProyectos } from '../../servicios/api';
import { obtenerMensajeError } from '../../servicios/clienteApi';
import { notificar } from '../../servicios/notificaciones';
import type { CarpetaDto, EstructuraProyectoDto, ListaResumenDto } from '../../servicios/tipos';
import { usarConfirmacion } from '../../componentes/ui/DialogoConfirmacion';
import { Modal } from '../../componentes/ui/Modal';
import { Boton, BotonIcono, Campo, Entrada, MensajeError, Selector, unirClases, type Icono } from '../../componentes/ui/primitivos';

interface PropiedadesArbol {
  estructura: EstructuraProyectoDto;
  listaSeleccionadaId: string | null;
  alSeleccionarLista: (listaId: string | null) => void;
  alCambiar: () => Promise<void>;
}

/** Qué se está editando en el modal: creación o edición de carpeta/lista. */
type EdicionArbol =
  | { tipo: 'nueva-carpeta' }
  | { tipo: 'nueva-lista'; carpetaId: string | null }
  | { tipo: 'editar-carpeta'; carpeta: CarpetaDto }
  | { tipo: 'editar-lista'; lista: ListaResumenDto };

/** Barra lateral Proyecto → Carpetas → Listas; crear/editar se hace en un modal corto. */
export function ArbolProyecto({ estructura, listaSeleccionadaId, alSeleccionarLista, alCambiar }: PropiedadesArbol) {
  const [edicion, setEdicion] = useState<EdicionArbol | null>(null);

  const totalTareas = [...estructura.listasSinCarpeta, ...estructura.carpetas.flatMap((carpeta) => carpeta.listas)].reduce(
    (total, lista) => total + lista.totalTareas,
    0,
  );

  return (
    <nav aria-label="Listas del proyecto" className="flex flex-col gap-0.5 text-sm">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-texto-3">Listas</span>
        <span className="flex">
          <BotonIcono icono={ListPlus} etiqueta="Nueva lista" tamano="sm" onClick={() => setEdicion({ tipo: 'nueva-lista', carpetaId: null })} />
          <BotonIcono icono={FolderPlus} etiqueta="Nueva carpeta" tamano="sm" onClick={() => setEdicion({ tipo: 'nueva-carpeta' })} />
        </span>
      </div>

      <FilaNodo icono={Layers} etiqueta="Todas las listas" contador={totalTareas} activa={listaSeleccionadaId === null} alPulsar={() => alSeleccionarLista(null)} />

      {estructura.carpetas.map((carpeta) => (
        <NodoCarpeta
          key={carpeta.id}
          carpeta={carpeta}
          listaSeleccionadaId={listaSeleccionadaId}
          alSeleccionarLista={alSeleccionarLista}
          alEditar={setEdicion}
        />
      ))}

      {estructura.listasSinCarpeta.map((lista) => (
        <FilaNodo
          key={lista.id}
          icono={List}
          etiqueta={lista.nombre}
          contador={lista.totalTareas}
          activa={lista.id === listaSeleccionadaId}
          alPulsar={() => alSeleccionarLista(lista.id)}
          alEditar={() => setEdicion({ tipo: 'editar-lista', lista })}
        />
      ))}

      <ModalEdicionArbol
        edicion={edicion}
        estructura={estructura}
        alCerrar={() => setEdicion(null)}
        alGuardar={async (listaCreadaId) => {
          setEdicion(null);
          await alCambiar();
          if (listaCreadaId) alSeleccionarLista(listaCreadaId);
        }}
      />
    </nav>
  );
}

function NodoCarpeta({
  carpeta,
  listaSeleccionadaId,
  alSeleccionarLista,
  alEditar,
}: {
  carpeta: CarpetaDto;
  listaSeleccionadaId: string | null;
  alSeleccionarLista: (listaId: string) => void;
  alEditar: (edicion: EdicionArbol) => void;
}) {
  const [abierta, setAbierta] = useState(true);

  return (
    <div>
      <div className="group flex h-8 items-center rounded-lg hover:bg-superficie-2">
        <button onClick={() => setAbierta((actual) => !actual)} aria-expanded={abierta} className="flex min-w-0 flex-1 items-center gap-1.5 px-2 text-left font-medium text-texto">
          <motion.span animate={{ rotate: abierta ? 90 : 0 }} transition={{ duration: 0.15 }} className="grid">
            <ChevronRight className="size-3.5 text-texto-3" />
          </motion.span>
          {abierta ? <FolderOpen className="size-4 text-texto-3" /> : <Folder className="size-4 text-texto-3" />}
          <span className="truncate">{carpeta.nombre}</span>
        </button>
        <span className="flex pr-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <BotonIcono icono={Plus} etiqueta={`Nueva lista en ${carpeta.nombre}`} tamano="sm" onClick={() => alEditar({ tipo: 'nueva-lista', carpetaId: carpeta.id })} />
          <BotonIcono icono={MoreHorizontal} etiqueta={`Editar ${carpeta.nombre}`} tamano="sm" onClick={() => alEditar({ tipo: 'editar-carpeta', carpeta })} />
        </span>
      </div>
      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="ml-[15px] overflow-hidden border-l border-borde pl-1.5"
          >
            {carpeta.listas.length === 0 && <p className="px-2 py-1.5 text-xs text-texto-3">Sin listas</p>}
            {carpeta.listas.map((lista) => (
              <FilaNodo
                key={lista.id}
                icono={List}
                etiqueta={lista.nombre}
                contador={lista.totalTareas}
                activa={lista.id === listaSeleccionadaId}
                alPulsar={() => alSeleccionarLista(lista.id)}
                alEditar={() => alEditar({ tipo: 'editar-lista', lista })}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilaNodo({
  icono: IconoNodo,
  etiqueta,
  contador,
  activa,
  alPulsar,
  alEditar,
}: {
  icono: Icono;
  etiqueta: string;
  contador: number;
  activa: boolean;
  alPulsar: () => void;
  alEditar?: () => void;
}) {
  return (
    <div className={unirClases('group flex h-8 items-center rounded-lg transition-colors', activa ? 'bg-superficie-2' : 'hover:bg-superficie-2')}>
      <button
        onClick={alPulsar}
        aria-current={activa ? 'true' : undefined}
        className={unirClases('flex min-w-0 flex-1 items-center gap-2 px-2 text-left', activa ? 'font-medium text-texto' : 'text-texto-2')}
      >
        <IconoNodo className={unirClases('size-4 shrink-0', activa ? 'text-texto' : 'text-texto-3')} />
        <span className="flex-1 truncate">{etiqueta}</span>
        <span className="text-xs tabular-nums text-texto-3 group-hover:hidden">{contador}</span>
      </button>
      {alEditar && (
        <span className="hidden pr-1 group-hover:flex focus-within:flex">
          <BotonIcono icono={MoreHorizontal} etiqueta={`Editar ${etiqueta}`} tamano="sm" onClick={alEditar} />
        </span>
      )}
    </div>
  );
}

function ModalEdicionArbol({
  edicion,
  estructura,
  alCerrar,
  alGuardar,
}: {
  edicion: EdicionArbol | null;
  estructura: EstructuraProyectoDto;
  alCerrar: () => void;
  alGuardar: (listaCreadaId?: string) => Promise<void>;
}) {
  const confirmar = usarConfirmacion();
  const [nombre, setNombre] = useState('');
  const [carpetaId, setCarpetaId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [edicionPrevia, setEdicionPrevia] = useState<EdicionArbol | null>(null);

  // Al abrir el modal se cargan los valores de lo que se edita.
  if (edicion !== edicionPrevia) {
    setEdicionPrevia(edicion);
    setError(null);
    setNombre(edicion?.tipo === 'editar-carpeta' ? edicion.carpeta.nombre : edicion?.tipo === 'editar-lista' ? edicion.lista.nombre : '');
    setCarpetaId(
      edicion?.tipo === 'nueva-lista' ? (edicion.carpetaId ?? '') : edicion?.tipo === 'editar-lista' ? (edicion.lista.carpetaId ?? '') : '',
    );
  }

  const esLista = edicion?.tipo === 'nueva-lista' || edicion?.tipo === 'editar-lista';
  const esEdicion = edicion?.tipo === 'editar-carpeta' || edicion?.tipo === 'editar-lista';
  const titulo = { 'nueva-carpeta': 'Nueva carpeta', 'nueva-lista': 'Nueva lista', 'editar-carpeta': 'Editar carpeta', 'editar-lista': 'Editar lista' }[
    edicion?.tipo ?? 'nueva-lista'
  ];

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!edicion) return;
    setEnviando(true);
    setError(null);
    try {
      const proyectoId = estructura.proyecto.id;
      let listaCreadaId: string | undefined;
      if (edicion.tipo === 'nueva-carpeta') await apiProyectos.crearCarpeta(proyectoId, nombre.trim());
      if (edicion.tipo === 'nueva-lista') listaCreadaId = await apiProyectos.crearLista(proyectoId, nombre.trim(), carpetaId || null);
      if (edicion.tipo === 'editar-carpeta') await apiCarpetas.actualizar(edicion.carpeta.id, nombre.trim());
      if (edicion.tipo === 'editar-lista') await apiListas.actualizar(edicion.lista.id, nombre.trim(), carpetaId || null);
      notificar.exito(esEdicion ? 'Cambios guardados' : `${esLista ? 'Lista' : 'Carpeta'} creada`, nombre.trim());
      await alGuardar(listaCreadaId);
    } catch (errorGuardado) {
      setError(obtenerMensajeError(errorGuardado));
    } finally {
      setEnviando(false);
    }
  }

  async function eliminar() {
    if (edicion?.tipo !== 'editar-carpeta' && edicion?.tipo !== 'editar-lista') return;
    const esCarpeta = edicion.tipo === 'editar-carpeta';
    const nombreActual = esCarpeta ? edicion.carpeta.nombre : edicion.lista.nombre;
    const confirmado = await confirmar({
      titulo: `Eliminar ${esCarpeta ? 'carpeta' : 'lista'}`,
      descripcion: esCarpeta
        ? `"${nombreActual}" se eliminará y sus listas pasarán a la raíz del proyecto. Las tareas no se tocan.`
        : `"${nombreActual}" se eliminará. Solo es posible si la lista está vacía.`,
      textoConfirmar: 'Eliminar',
      peligrosa: true,
    });
    if (!confirmado) return;

    try {
      if (esCarpeta) await apiCarpetas.eliminar(edicion.carpeta.id);
      else await apiListas.eliminar(edicion.lista.id);
      notificar.exito(`${esCarpeta ? 'Carpeta' : 'Lista'} eliminada`, nombreActual);
      await alGuardar();
    } catch (errorEliminacion) {
      notificar.error('No se pudo eliminar', errorEliminacion);
    }
  }

  return (
    <Modal
      abierto={edicion !== null}
      alCerrar={alCerrar}
      titulo={titulo}
      ancho="sm"
      pie={
        <>
          {esEdicion && (
            <Boton variante="fantasma" className="mr-auto text-peligro hover:text-peligro" onClick={() => void eliminar()}>
              Eliminar
            </Boton>
          )}
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="formulario-arbol" cargando={enviando}>
            {esEdicion ? 'Guardar' : 'Crear'}
          </Boton>
        </>
      }
    >
      <form id="formulario-arbol" onSubmit={enviar} className="flex flex-col gap-4">
        <Campo etiqueta="Nombre">
          <Entrada required maxLength={100} value={nombre} onChange={(evento) => setNombre(evento.target.value)} placeholder={esLista ? 'Sprint 12' : 'Backend'} />
        </Campo>
        {esLista && (
          <Campo etiqueta="Carpeta">
            <Selector value={carpetaId} onChange={(evento) => setCarpetaId(evento.target.value)}>
              <option value="">Sin carpeta</option>
              {estructura.carpetas.map((carpeta) => (
                <option key={carpeta.id} value={carpeta.id}>
                  {carpeta.nombre}
                </option>
              ))}
            </Selector>
          </Campo>
        )}
        <MensajeError mensaje={error} />
      </form>
    </Modal>
  );
}
