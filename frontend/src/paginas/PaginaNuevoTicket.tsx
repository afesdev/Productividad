import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bug, CalendarClock, CircleEllipsis, ClipboardCheck, FolderKanban, Hash, LifeBuoy, Sparkles, UserRound, Wrench } from 'lucide-react';
import { usarSesion } from '../caracteristicas/autenticacion/ContextoSesion';
import { deFechaInput, etiquetaTipo, leerHoras, prioridades, tiposTicket } from '../caracteristicas/tickets/presentacionTickets';
import { apiProyectosSoporte, apiTickets } from '../servicios/api';
import { SelectorProyectos } from '../caracteristicas/tickets/ProyectosTicket';
import { obtenerMensajeError } from '../servicios/clienteApi';
import { notificar } from '../servicios/notificaciones';
import type { Prioridad, ProyectoSoporteDto, TipoTicket, UsuarioAsignableDto } from '../servicios/tipos';
import { EditorRico, type ManejadorEditorRico } from '../componentes/editor/EditorRico';
import { usarWikiLinks } from '../componentes/editor/usarWikiLinks';
import { Campo, Entrada, MensajeError, Selector, unirClases, type Icono } from '../componentes/ui/primitivos';
import { VistaFormulario } from '../componentes/ui/VistaFormulario';

const iconosTipo: Record<TipoTicket, Icono> = {
  Ajuste: Wrench,
  NuevoDesarrollo: Sparkles,
  Incidencia: Bug,
  Auditoria: ClipboardCheck,
  Soporte: LifeBuoy,
  Otro: CircleEllipsis,
};

/** Tono pastel de cada prioridad (clases literales para Tailwind). */
const tonoPrioridad: Record<Prioridad, { activo: string; punto: string }> = {
  Baja: { activo: 'border-zinc-300 bg-zinc-100 text-zinc-800', punto: 'bg-zinc-400' },
  Media: { activo: 'border-sky-200 bg-sky-50 text-sky-900', punto: 'bg-sky-400' },
  Alta: { activo: 'border-amber-200 bg-amber-50 text-amber-900', punto: 'bg-amber-400' },
  Urgente: { activo: 'border-rose-200 bg-rose-50 text-rose-900', punto: 'bg-rose-400' },
};

/**
 * Vista completa: la solicitud (asunto + descripción con imágenes) es la protagonista;
 * clasificación, solicitante, referencias externas y planificación van en el panel lateral.
 */
export function PaginaNuevoTicket() {
  const navegar = useNavigate();
  const { usuario } = usarSesion();
  const editorDescripcion = useRef<ManejadorEditorRico>(null);
  const opcionesWikiLinks = usarWikiLinks();
  const [usuarios, setUsuarios] = useState<UsuarioAsignableDto[]>([]);
  const [asunto, setAsunto] = useState('');
  const [tipo, setTipo] = useState<TipoTicket>('Ajuste');
  const [prioridad, setPrioridad] = useState<Prioridad>('Media');
  const [nombreSolicitante, setNombreSolicitante] = useState('');
  const [correoSolicitante, setCorreoSolicitante] = useState('');
  const [agenteAsignadoId, setAgenteAsignadoId] = useState(usuario?.id ?? '');
  const [numeroExterno, setNumeroExterno] = useState('');
  const [idSeguimiento, setIdSeguimiento] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [horasDedicadas, setHorasDedicadas] = useState('');
  const [catalogoProyectos, setCatalogoProyectos] = useState<ProyectoSoporteDto[] | null>(null);
  const [proyectoIds, setProyectoIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    apiTickets.usuariosAsignables().then(setUsuarios).catch(() => undefined);
    apiProyectosSoporte.listar().then(setCatalogoProyectos).catch(() => setCatalogoProyectos([]));
  }, []);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    const horas = leerHoras(horasDedicadas);
    if (horas === undefined) {
      setError('El tiempo dedicado debe ser un número de horas entre 0 y 9999,99.');
      return;
    }

    setEnviando(true);
    try {
      const id = await apiTickets.crear({
        asunto: asunto.trim(),
        tipo,
        prioridad,
        nombreSolicitante: nombreSolicitante.trim(),
        correoSolicitante: correoSolicitante.trim(),
        descripcionMarkdown: editorDescripcion.current?.obtenerMarkdown().trim() || null,
        agenteAsignadoId: agenteAsignadoId || null,
        numeroExterno: numeroExterno.trim() || null,
        idSeguimiento: idSeguimiento.trim() || null,
        horasDedicadas: horas,
        fechaVencimiento: deFechaInput(fechaVencimiento),
        proyectoIds,
      });
      notificar.exito('Ticket creado', asunto.trim());
      navegar(`/tickets/${id}`, { replace: true });
    } catch (errorCreacion) {
      setError(obtenerMensajeError(errorCreacion));
    } finally {
      setEnviando(false);
    }
  }

  const panelLateral = (
    <>
      <Grupo icono={FolderKanban} titulo="Proyectos">
        <SelectorProyectos catalogo={catalogoProyectos} seleccionados={proyectoIds} alCambiar={setProyectoIds} />
      </Grupo>

      <Grupo icono={CalendarClock} titulo="Prioridad y plazo">
        <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label="Prioridad">
          {prioridades.map((opcion) => (
            <button
              key={opcion}
              type="button"
              role="radio"
              aria-checked={prioridad === opcion}
              onClick={() => setPrioridad(opcion)}
              className={unirClases(
                'flex flex-col items-center gap-1 rounded-lg border py-2 text-xs font-medium transition',
                prioridad === opcion ? tonoPrioridad[opcion].activo : 'border-borde text-texto-2 hover:bg-superficie-2',
              )}
            >
              <span className={unirClases('size-2 rounded-full', tonoPrioridad[opcion].punto)} />
              {opcion}
            </button>
          ))}
        </div>
        <Campo
          etiqueta="Fecha de vencimiento"
          ayuda={fechaVencimiento ? 'El semáforo de vencimiento se mide contra esta fecha.' : 'Vacía: el ticket no vence.'}
        >
          <Entrada type="date" value={fechaVencimiento} onChange={(evento) => setFechaVencimiento(evento.target.value)} />
        </Campo>
        <Campo etiqueta="Tiempo dedicado (horas)" ayuda="Puedes ir sumándolo desde el ticket.">
          <Entrada inputMode="decimal" value={horasDedicadas} onChange={(evento) => setHorasDedicadas(evento.target.value)} placeholder="0" />
        </Campo>
        <Campo etiqueta="Asignar a">
          <Selector value={agenteAsignadoId} onChange={(evento) => setAgenteAsignadoId(evento.target.value)}>
            <option value="">Sin asignar</option>
            {usuarios.map((opcion) => (
              <option key={opcion.id} value={opcion.id}>
                {opcion.nombreCompleto}
                {opcion.id === usuario?.id ? ' (yo)' : ''}
              </option>
            ))}
          </Selector>
        </Campo>
      </Grupo>

      <Grupo icono={UserRound} titulo="Solicitante">
        <Campo etiqueta="Nombre">
          <Entrada required maxLength={150} value={nombreSolicitante} onChange={(evento) => setNombreSolicitante(evento.target.value)} placeholder="Quien pide" />
        </Campo>
        <Campo etiqueta="Correo">
          <Entrada required type="email" maxLength={256} value={correoSolicitante} onChange={(evento) => setCorreoSolicitante(evento.target.value)} placeholder="persona@empresa.com" />
        </Campo>
      </Grupo>

      <Grupo icono={Hash} titulo="Referencias externas">
        <Campo etiqueta="Nº de ticket">
          <Entrada maxLength={50} value={numeroExterno} onChange={(evento) => setNumeroExterno(evento.target.value)} placeholder="INC-55821" className="font-mono" />
        </Campo>
        <Campo etiqueta="ID de seguimiento">
          <Entrada maxLength={100} value={idSeguimiento} onChange={(evento) => setIdSeguimiento(evento.target.value)} placeholder="REQ-2024-118" className="font-mono" />
        </Campo>
      </Grupo>
    </>
  );

  return (
    <VistaFormulario
      titulo="Nuevo ticket"
      descripcion="Describe la solicitud; clasificación, solicitante y plazos van a la derecha."
      alVolver={() => navegar(-1)}
      alEnviar={enviar}
      textoEnviar="Crear ticket"
      enviando={enviando}
      lateral={panelLateral}
    >
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo de ticket">
        {tiposTicket.map((opcion) => {
          const IconoTipo = iconosTipo[opcion];
          const activo = tipo === opcion;
          return (
            <button
              key={opcion}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => setTipo(opcion)}
              className={unirClases(
                'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition',
                activo ? 'border-violet-200 bg-violet-50 text-violet-900' : 'border-borde text-texto-2 hover:bg-superficie-2 hover:text-texto',
              )}
            >
              <IconoTipo className={unirClases('size-3.5', activo ? 'text-violet-500' : 'text-texto-3')} />
              {etiquetaTipo[opcion]}
            </button>
          );
        })}
      </div>

      <input
        required
        autoFocus
        aria-label="Asunto"
        maxLength={250}
        value={asunto}
        onChange={(evento) => setAsunto(evento.target.value)}
        onKeyDown={(evento) => {
          // Enter pasa a la descripción en lugar de enviar el formulario.
          if (evento.key === 'Enter') {
            evento.preventDefault();
            editorDescripcion.current?.enfocar();
          }
        }}
        placeholder="Asunto: el reporte de facturas no calcula el IVA"
        className="w-full bg-transparent text-2xl font-semibold tracking-tight placeholder:text-texto-3 focus:outline-none"
      />

      <div className="border-t border-borde pt-5 [&_.editor-rico]:min-h-[30vh] [&_.editor-rico]:pb-6 lg:[&_.editor-rico]:min-h-[50vh]">
        <EditorRico
          ref={editorDescripcion}
          contenidoInicial=""
          alCambiar={() => undefined}
          wikiLinks={opcionesWikiLinks}
          placeholder='¿Qué se pide? Pasos para reproducir, resultado esperado… pega capturas con Ctrl+V, "/" para comandos'
        />
      </div>

      <MensajeError mensaje={error} />
    </VistaFormulario>
  );
}

function Grupo({ icono: IconoGrupo, titulo, children }: { icono: Icono; titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-borde pb-4 last:border-b-0 last:pb-0">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <IconoGrupo className="size-4 text-texto-3" />
        {titulo}
      </h2>
      {children}
    </section>
  );
}
