import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, BookOpen, Code2, History, MessageSquare, Pencil, Rocket } from 'lucide-react';
import { AccionesTicket } from '../caracteristicas/tickets/AccionesTicket';
import { usarCronometro } from '../caracteristicas/tiempo/ContextoCronometro';
import { BotonCronometro } from '../caracteristicas/tiempo/ControlesCronometro';
import { BotonMarcador } from '../caracteristicas/marcadores/ContextoMarcadores';
import { LineaFlujo } from '../caracteristicas/tickets/LineaFlujo';
import { PestanaCodigo } from '../caracteristicas/tickets/PestanaCodigo';
import { PestanaConversacion, PestanaDespliegues, PestanaHistorial, PestanaResumen } from '../caracteristicas/tickets/PestanasTicket';
import {
  aFechaInput,
  datosDeDetalle,
  deFechaInput,
  etiquetaTipo,
  InsigniaEstado,
  InsigniaPrioridad,
  InsigniaSla,
  leerHoras,
  prioridades,
  tiposTicket,
} from '../caracteristicas/tickets/presentacionTickets';
import { apiProyectos, apiProyectosSoporte, apiTareas, apiTickets, type DatosTicket } from '../servicios/api';
import { ChipProyecto, SelectorProyectos } from '../caracteristicas/tickets/ProyectosTicket';
import { obtenerMensajeError } from '../servicios/clienteApi';
import { formatearFechaHora, formatearRelativo } from '../servicios/formato';
import { notificar } from '../servicios/notificaciones';
import type { Prioridad, ProyectoSoporteDto, TicketDetalleDto, TipoTicket, UsuarioAsignableDto } from '../servicios/tipos';
import { Avatar } from '../componentes/ui/Avatar';
import { Modal } from '../componentes/ui/Modal';
import { Boton, BotonIcono, Campo, Entrada, Esqueleto, Insignia, MensajeError, Selector, unirClases, type Icono } from '../componentes/ui/primitivos';

type Pestana = 'resumen' | 'codigo' | 'despliegues' | 'conversacion' | 'historial';

export function PaginaDetalleTicket() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const pestana = (parametros.get('pestana') as Pestana | null) ?? 'resumen';
  const [detalle, setDetalle] = useState<TicketDetalleDto | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioAsignableDto[]>([]);
  const [editando, setEditando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setDetalle(await apiTickets.obtener(id));
    } catch (errorCarga) {
      notificar.error('No se pudo cargar el ticket', errorCarga);
    }
  }, [id]);

  useEffect(() => {
    setDetalle(null);
    void cargar();
  }, [cargar]);

  // Detener el cronómetro de este ticket suma horas al tiempo dedicado: se recarga para mostrarlas.
  const { version: versionTiempo } = usarCronometro();
  useEffect(() => {
    if (versionTiempo > 0) void cargar();
  }, [versionTiempo, cargar]);

  useEffect(() => {
    apiTickets.usuariosAsignables().then(setUsuarios).catch(() => undefined);
  }, []);

  if (!detalle) {
    return (
      <div className="flex flex-col gap-4">
        <Esqueleto className="h-8 w-2/3" />
        <Esqueleto className="h-24 rounded-xl" />
        <Esqueleto className="h-80 rounded-xl" />
      </div>
    );
  }

  const { resumen } = detalle;
  const totalArchivos = detalle.ramas.reduce((total, rama) => total + rama.totalArchivos, 0);
  const pestanas: { valor: Pestana; etiqueta: string; icono: Icono; contador?: number }[] = [
    { valor: 'resumen', etiqueta: 'Resumen', icono: BookOpen },
    { valor: 'codigo', etiqueta: 'Código', icono: Code2, contador: totalArchivos || detalle.ramas.length },
    { valor: 'despliegues', etiqueta: 'Despliegues', icono: Rocket, contador: detalle.despliegues.length },
    { valor: 'conversacion', etiqueta: 'Conversación', icono: MessageSquare, contador: detalle.mensajes.length },
    { valor: 'historial', etiqueta: 'Historial', icono: History, contador: detalle.eventos.length },
  ];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <Link to="/tickets" className="inline-flex items-center gap-1.5 self-start text-sm text-texto-2 hover:text-texto">
          <ArrowLeft className="size-4" />
          Tickets
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono text-texto-2">{resumen.clave}</span>
              {resumen.numeroExterno && (
                <span className="rounded-md bg-superficie-2 px-1.5 py-0.5 font-mono text-xs text-texto-2" title="Número de ticket externo">
                  {resumen.numeroExterno}
                </span>
              )}
              <InsigniaEstado estado={resumen.estado} />
              <Insignia>{etiquetaTipo[resumen.tipo]}</Insignia>
              <InsigniaPrioridad prioridad={resumen.prioridad} />
            </div>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
              {resumen.asunto}
              <BotonIcono icono={Pencil} etiqueta="Editar datos del ticket" tamano="sm" onClick={() => setEditando(true)} />
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BotonMarcador tipo="Ticket" id={detalle.resumen.id} />
            <BotonCronometro ticketId={detalle.resumen.id} />
            <AccionesTicket detalle={detalle} usuarios={usuarios} alCambiar={cargar} />
          </div>
        </div>
      </header>

      <LineaFlujo estado={resumen.estado} eventos={detalle.eventos} />

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-borde" role="tablist">
            {pestanas.map(({ valor, etiqueta, icono: IconoPestana, contador }) => {
              const activa = pestana === valor;
              return (
                <button
                  key={valor}
                  role="tab"
                  aria-selected={activa}
                  onClick={() => setParametros({ pestana: valor }, { replace: true })}
                  className={unirClases('relative flex h-10 shrink-0 items-center gap-2 px-3 text-sm', activa ? 'font-medium text-texto' : 'text-texto-2 hover:text-texto')}
                >
                  <IconoPestana className="size-4" />
                  {etiqueta}
                  {!!contador && <span className="rounded bg-superficie-2 px-1.5 text-xs tabular-nums text-texto-3">{contador}</span>}
                  {activa && <motion.span layoutId="pestana-ticket" className="absolute inset-x-0 -bottom-px h-0.5 bg-primario" />}
                </button>
              );
            })}
          </nav>

          <motion.div key={pestana} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
            {pestana === 'resumen' && <PestanaResumen detalle={detalle} alCambiar={cargar} />}
            {pestana === 'codigo' && <PestanaCodigo detalle={detalle} alCambiar={cargar} />}
            {pestana === 'despliegues' && <PestanaDespliegues despliegues={detalle.despliegues} />}
            {pestana === 'conversacion' && <PestanaConversacion detalle={detalle} alCambiar={cargar} />}
            {pestana === 'historial' && <PestanaHistorial eventos={detalle.eventos} />}
          </motion.div>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-20 xl:self-start">
          <PanelDetalles detalle={detalle} usuarios={usuarios} alCambiar={cargar} alNavegar={navegar} />
        </aside>
      </div>

      <ModalEditarTicket
        abierto={editando}
        detalle={detalle}
        alCerrar={() => setEditando(false)}
        alGuardar={async () => {
          setEditando(false);
          await cargar();
        }}
      />
    </div>
  );
}

function PanelDetalles({
  detalle,
  usuarios,
  alCambiar,
  alNavegar,
}: {
  detalle: TicketDetalleDto;
  usuarios: UsuarioAsignableDto[];
  alCambiar: () => Promise<void>;
  alNavegar: (ruta: string) => void;
}) {
  const { resumen } = detalle;
  const [asignando, setAsignando] = useState(false);
  const [vinculandoTarea, setVinculandoTarea] = useState(false);

  async function asignar(agenteId: string) {
    setAsignando(true);
    try {
      await apiTickets.asignar(resumen.id, agenteId || null);
      notificar.exito(agenteId ? 'Ticket asignado' : 'Asignación retirada');
      await alCambiar();
    } catch (errorAsignacion) {
      notificar.error('No se pudo asignar', errorAsignacion);
    } finally {
      setAsignando(false);
    }
  }

  async function desvincularTarea() {
    try {
      await apiTickets.vincularTarea(resumen.id, null);
      notificar.exito('Tarea desvinculada');
      await alCambiar();
    } catch (errorDesvinculacion) {
      notificar.error('No se pudo desvincular la tarea', errorDesvinculacion);
    }
  }

  /** El PUT reemplaza todo el ticket: se parte de los datos actuales y se cambia solo un campo. */
  async function guardarCampo(parcial: Partial<DatosTicket>, mensaje: string) {
    try {
      await apiTickets.actualizar(resumen.id, { ...datosDeDetalle(detalle), ...parcial });
      notificar.exito(mensaje, resumen.clave);
      await alCambiar();
    } catch (errorGuardado) {
      notificar.error('No se guardó el cambio', errorGuardado);
    }
  }

  return (
    <>
      <section className="rounded-xl border border-borde bg-superficie p-5 shadow-tarjeta">
        <h2 className="mb-4 text-sm font-semibold">Detalles</h2>
        <dl className="flex flex-col gap-3.5 text-sm">
          <Dato etiqueta="Proyectos">
            <ProyectosEditables detalle={detalle} alGuardar={(proyectoIds) => guardarCampo({ proyectoIds }, 'Proyectos actualizados')} />
          </Dato>
          <Dato etiqueta="Responsable">
            <select
              value={resumen.agenteAsignadoId ?? ''}
              disabled={asignando}
              onChange={(evento) => void asignar(evento.target.value)}
              className="-mx-2 w-[calc(100%+1rem)] rounded-md border border-transparent bg-transparent px-2 py-1 hover:border-borde focus:border-acento focus:outline-none"
            >
              <option value="">Sin asignar</option>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nombreCompleto}
                </option>
              ))}
            </select>
          </Dato>
          <Dato etiqueta="Solicitante">
            <p>{resumen.nombreSolicitante}</p>
            <a href={`mailto:${detalle.correoSolicitante}`} className="text-xs text-texto-3 hover:underline">
              {detalle.correoSolicitante}
            </a>
          </Dato>
          {(resumen.numeroExterno || detalle.idSeguimiento) && (
            <div className="grid grid-cols-2 gap-3">
              <Dato etiqueta="Nº de ticket">
                <p className="truncate font-mono text-[13px]">{resumen.numeroExterno ?? '—'}</p>
              </Dato>
              <Dato etiqueta="ID de seguimiento">
                <p className="truncate font-mono text-[13px]">{detalle.idSeguimiento ?? '—'}</p>
              </Dato>
            </div>
          )}
          <Dato etiqueta="Vencimiento">
            <InsigniaSla estadoSla={resumen.estadoSla} fechaLimite={resumen.fechaLimiteResolucion} />
            <div className="mt-1.5 flex items-center gap-1.5">
              <input
                type="date"
                aria-label="Fecha de vencimiento"
                value={aFechaInput(detalle.fechaVencimiento)}
                onChange={(evento) => void guardarCampo({ fechaVencimiento: deFechaInput(evento.target.value) }, evento.target.value ? 'Vencimiento actualizado' : 'Vencimiento quitado')}
                className="-mx-2 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm hover:border-borde focus:border-acento focus:outline-none"
              />
            </div>
            <p className="text-xs text-texto-3">
              {detalle.fechaVencimiento ? 'Fecha comprometida: vence al final de ese día.' : 'Sin fecha: el ticket no vence.'}
            </p>
          </Dato>
          <Dato etiqueta="Tiempo dedicado">
            <CampoTiempoDedicado horas={detalle.horasDedicadas} alGuardar={(horasDedicadas) => guardarCampo({ horasDedicadas }, 'Tiempo actualizado')} />
          </Dato>
          <Dato etiqueta="Primera respuesta">
            {detalle.fechaPrimeraRespuesta ? (
              <p className={unirClases(detalle.fechaLimitePrimeraRespuesta && detalle.fechaPrimeraRespuesta > detalle.fechaLimitePrimeraRespuesta && 'text-peligro')}>
                {formatearFechaHora(detalle.fechaPrimeraRespuesta)}
              </p>
            ) : (
              <p className="text-texto-3">
                Pendiente{detalle.fechaLimitePrimeraRespuesta && ` · límite ${formatearRelativo(detalle.fechaLimitePrimeraRespuesta)}`}
              </p>
            )}
          </Dato>
          <Dato etiqueta="Tarea vinculada">
            {detalle.tareaRelacionada ? (
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => alNavegar(`/tareas/${detalle.tareaRelacionada!.id}`)} className="min-w-0 flex-1 text-left hover:underline">
                  <span className="font-mono text-xs text-texto-3">{detalle.tareaRelacionada.clave}</span> {detalle.tareaRelacionada.titulo}
                </button>
                <button
                  onClick={() => void desvincularTarea()}
                  title="Desvincular tarea"
                  className="shrink-0 rounded p-1 text-texto-3 hover:bg-superficie-2 hover:text-peligro"
                >
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button onClick={() => setVinculandoTarea(true)} className="text-sm text-acento hover:underline">
                Vincular tarea…
              </button>
            )}
          </Dato>
          <Dato etiqueta="Cola">
            <p>{detalle.nombreCola}</p>
          </Dato>
          <Dato etiqueta="Creado">
            <Avatar nombre={detalle.nombreCreador} />
            <p className="mt-1 text-xs text-texto-3">{formatearFechaHora(resumen.fechaCreacion)}</p>
          </Dato>
          {detalle.fechaCierre && (
            <Dato etiqueta="Cerrado">
              <p>{formatearFechaHora(detalle.fechaCierre)}</p>
            </Dato>
          )}
        </dl>
      </section>

      <ModalVincularTarea
        abierto={vinculandoTarea}
        ticketId={resumen.id}
        alCerrar={() => setVinculandoTarea(false)}
        alVincular={async () => {
          setVinculandoTarea(false);
          await alCambiar();
        }}
      />
    </>
  );
}

function ModalVincularTarea({ abierto, ticketId, alCerrar, alVincular }: { abierto: boolean; ticketId: string; alCerrar: () => void; alVincular: () => Promise<void> }) {
  const [proyectos, setProyectos] = useState<{ id: string; nombre: string; clavePrefijo: string }[]>([]);
  const [proyectoId, setProyectoId] = useState('');
  const [tareas, setTareas] = useState<{ id: string; clave: string; titulo: string }[]>([]);
  const [tareaId, setTareaId] = useState('');
  const [cargandoTareas, setCargandoTareas] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setError(null);
    setTareaId('');
    apiProyectos
      .listar()
      .then((lista) => {
        setProyectos(lista);
        if (lista.length > 0) setProyectoId(lista[0].id);
      })
      .catch(() => setProyectos([]));
  }, [abierto]);

  useEffect(() => {
    if (!abierto || !proyectoId) {
      setTareas([]);
      return;
    }
    setCargandoTareas(true);
    setTareaId('');
    apiTareas
      .listarPorProyecto(proyectoId)
      .then(setTareas)
      .catch(() => setTareas([]))
      .finally(() => setCargandoTareas(false));
  }, [abierto, proyectoId]);

  async function vincular() {
    if (!tareaId) return;
    setEnviando(true);
    setError(null);
    try {
      await apiTickets.vincularTarea(ticketId, tareaId);
      notificar.exito('Tarea vinculada');
      await alVincular();
    } catch (errorVinculacion) {
      setError(obtenerMensajeError(errorVinculacion));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Vincular tarea"
      descripcion="Relaciona este ticket con una tarea existente."
      pie={
        <>
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton cargando={enviando} disabled={!tareaId} onClick={() => void vincular()}>
            Vincular
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Proyecto">
          <Selector value={proyectoId} onChange={(evento) => setProyectoId(evento.target.value)}>
            {proyectos.map((proyecto) => (
              <option key={proyecto.id} value={proyecto.id}>
                {proyecto.clavePrefijo} · {proyecto.nombre}
              </option>
            ))}
          </Selector>
        </Campo>
        <Campo etiqueta="Tarea">
          <Selector value={tareaId} onChange={(evento) => setTareaId(evento.target.value)} disabled={cargandoTareas || tareas.length === 0}>
            <option value="">{cargandoTareas ? 'Cargando…' : tareas.length === 0 ? 'Sin tareas en este proyecto' : 'Selecciona una tarea'}</option>
            {tareas.map((tarea) => (
              <option key={tarea.id} value={tarea.id}>
                {tarea.clave} · {tarea.titulo}
              </option>
            ))}
          </Selector>
        </Campo>
        <MensajeError mensaje={error} />
      </div>
    </Modal>
  );
}

/** Chips de los proyectos del ticket; "Editar" muestra el catálogo propio para activar o quitar (se guarda al instante). */
function ProyectosEditables({ detalle, alGuardar }: { detalle: TicketDetalleDto; alGuardar: (proyectoIds: string[]) => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  const [catalogo, setCatalogo] = useState<ProyectoSoporteDto[] | null>(null);
  const [guardando, setGuardando] = useState(false);
  const asignados = detalle.resumen.proyectos;

  useEffect(() => {
    if (editando && catalogo === null) apiProyectosSoporte.listar().then(setCatalogo).catch(() => setCatalogo([]));
  }, [editando, catalogo]);

  async function cambiar(ids: string[]) {
    // Los proyectos de otra persona (ticket compartido) no están en el catálogo propio: se conservan.
    const propios = new Set((catalogo ?? []).map((proyecto) => proyecto.id));
    const ajenos = asignados.filter((proyecto) => !propios.has(proyecto.id)).map((proyecto) => proyecto.id);
    setGuardando(true);
    try {
      await alGuardar([...ajenos, ...ids]);
    } finally {
      setGuardando(false);
    }
  }

  if (editando) {
    const propios = new Set((catalogo ?? []).map((proyecto) => proyecto.id));
    return (
      <div className="flex flex-col gap-2">
        <SelectorProyectos
          catalogo={catalogo}
          seleccionados={asignados.filter((proyecto) => propios.has(proyecto.id)).map((proyecto) => proyecto.id)}
          ajenos={catalogo === null ? [] : asignados.filter((proyecto) => !propios.has(proyecto.id))}
          deshabilitado={guardando}
          alCambiar={(ids) => void cambiar(ids)}
        />
        <button type="button" onClick={() => setEditando(false)} className="self-start text-xs font-medium text-acento hover:underline">
          Listo
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {asignados.map((proyecto) => (
        <ChipProyecto key={proyecto.id} proyecto={proyecto} />
      ))}
      <button type="button" onClick={() => setEditando(true)} className="text-xs text-acento hover:underline">
        {asignados.length === 0 ? 'Asignar proyectos…' : 'Editar'}
      </button>
    </div>
  );
}

/** Horas a mano con atajos para sumar. Se guarda al salir del campo o con Enter. */
function CampoTiempoDedicado({ horas, alGuardar }: { horas: number | null; alGuardar: (horas: number | null) => Promise<void> }) {
  const [texto, setTexto] = useState(horas?.toString().replace('.', ',') ?? '');

  useEffect(() => setTexto(horas?.toString().replace('.', ',') ?? ''), [horas]);

  function confirmar(valor = texto) {
    const nuevas = leerHoras(valor);
    if (nuevas === undefined) {
      notificar.aviso('Tiempo no válido', 'Usa horas entre 0 y 9999,99 (ej. 1,5).');
      setTexto(horas?.toString().replace('.', ',') ?? '');
      return;
    }
    if (nuevas !== horas) void alGuardar(nuevas);
  }

  function sumar(cantidad: number) {
    const total = Math.round(((horas ?? 0) + cantidad) * 100) / 100;
    setTexto(total.toString().replace('.', ','));
    void alGuardar(total);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="flex items-center gap-1">
        <input
          inputMode="decimal"
          aria-label="Horas dedicadas"
          value={texto}
          placeholder="0"
          onChange={(evento) => setTexto(evento.target.value)}
          onBlur={() => confirmar()}
          onKeyDown={(evento) => evento.key === 'Enter' && evento.currentTarget.blur()}
          className="-ml-2 w-16 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm tabular-nums hover:border-borde focus:border-acento focus:outline-none"
        />
        <span className="text-xs text-texto-3">h</span>
      </span>
      {[0.5, 1].map((cantidad) => (
        <button
          key={cantidad}
          type="button"
          onClick={() => sumar(cantidad)}
          className="rounded-md border border-borde px-1.5 py-0.5 text-xs tabular-nums text-texto-2 transition hover:border-borde-fuerte hover:bg-superficie-2 hover:text-texto"
        >
          +{cantidad.toString().replace('.', ',')} h
        </button>
      ))}
    </div>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="mb-1 text-xs font-medium text-texto-3">{etiqueta}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ModalEditarTicket({ abierto, detalle, alCerrar, alGuardar }: { abierto: boolean; detalle: TicketDetalleDto; alCerrar: () => void; alGuardar: () => Promise<void> }) {
  const [asunto, setAsunto] = useState('');
  const [tipo, setTipo] = useState<TipoTicket>('Ajuste');
  const [prioridad, setPrioridad] = useState<Prioridad>('Media');
  const [nombreSolicitante, setNombreSolicitante] = useState('');
  const [correoSolicitante, setCorreoSolicitante] = useState('');
  const [numeroExterno, setNumeroExterno] = useState('');
  const [idSeguimiento, setIdSeguimiento] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setAsunto(detalle.resumen.asunto);
    setTipo(detalle.resumen.tipo);
    setPrioridad(detalle.resumen.prioridad);
    setNombreSolicitante(detalle.resumen.nombreSolicitante);
    setCorreoSolicitante(detalle.correoSolicitante);
    setNumeroExterno(detalle.resumen.numeroExterno ?? '');
    setIdSeguimiento(detalle.idSeguimiento ?? '');
    setError(null);
  }, [abierto, detalle]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await apiTickets.actualizar(detalle.resumen.id, {
        ...datosDeDetalle(detalle),
        asunto: asunto.trim(),
        tipo,
        prioridad,
        nombreSolicitante: nombreSolicitante.trim(),
        correoSolicitante: correoSolicitante.trim(),
        numeroExterno: numeroExterno.trim() || null,
        idSeguimiento: idSeguimiento.trim() || null,
      });
      notificar.exito('Ticket actualizado', detalle.resumen.clave);
      await alGuardar();
    } catch (errorGuardado) {
      setError(obtenerMensajeError(errorGuardado));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Editar ${detalle.resumen.clave}`}
      descripcion="Si cambias la prioridad, el plazo de primera respuesta se recalcula desde la fecha de creación."
      pie={
        <>
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="formulario-editar-ticket" cargando={enviando}>
            Guardar
          </Boton>
        </>
      }
    >
      <form id="formulario-editar-ticket" onSubmit={enviar} className="flex flex-col gap-4">
        <Campo etiqueta="Asunto">
          <Entrada required maxLength={250} value={asunto} onChange={(evento) => setAsunto(evento.target.value)} />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Tipo">
            <Selector value={tipo} onChange={(evento) => setTipo(evento.target.value as TipoTicket)}>
              {tiposTicket.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {etiquetaTipo[opcion]}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Prioridad">
            <Selector value={prioridad} onChange={(evento) => setPrioridad(evento.target.value as Prioridad)}>
              {prioridades.map((opcion) => (
                <option key={opcion}>{opcion}</option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Solicitante">
            <Entrada required maxLength={150} value={nombreSolicitante} onChange={(evento) => setNombreSolicitante(evento.target.value)} />
          </Campo>
          <Campo etiqueta="Correo">
            <Entrada required type="email" maxLength={256} value={correoSolicitante} onChange={(evento) => setCorreoSolicitante(evento.target.value)} />
          </Campo>
          <Campo etiqueta="Nº de ticket externo">
            <Entrada maxLength={50} value={numeroExterno} onChange={(evento) => setNumeroExterno(evento.target.value)} placeholder="INC-55821" className="font-mono" />
          </Campo>
          <Campo etiqueta="ID de seguimiento">
            <Entrada maxLength={100} value={idSeguimiento} onChange={(evento) => setIdSeguimiento(evento.target.value)} placeholder="REQ-2024-118" className="font-mono" />
          </Campo>
        </div>
        <MensajeError mensaje={error} />
      </form>
    </Modal>
  );
}
