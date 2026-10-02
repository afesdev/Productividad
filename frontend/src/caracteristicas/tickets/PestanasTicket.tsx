import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightLeft,
  BookOpen,
  CircleCheck,
  CircleX,
  FilePen,
  FileText,
  FlaskConical,
  GitBranch,
  GitPullRequest,
  Hourglass,
  Link2,
  ListChecks,
  Lock,
  MessageSquare,
  Pencil,
  PlusCircle,
  RefreshCw,
  Rocket,
  Send,
  Timer,
  UserCheck,
} from 'lucide-react';
import { apiTickets } from '../../servicios/api';
import { formatearFechaHora, formatearRelativo } from '../../servicios/formato';
import { rutaDeEntidad } from '../../servicios/rutas';
import { notificar } from '../../servicios/notificaciones';
import type { BacklinkDto, DespliegueTicketDto, EventoTicketDto, TicketDetalleDto, TipoEventoTicket } from '../../servicios/tipos';
import { EditorRico, type ManejadorEditorRico } from '../../componentes/editor/EditorRico';
import { usarWikiLinks } from '../../componentes/editor/usarWikiLinks';
import { VistaMarkdown } from '../../componentes/VistaMarkdown';
import { Avatar } from '../../componentes/ui/Avatar';
import { Boton, BotonIcono, Casilla, EstadoVacio, Insignia, unirClases, type Icono } from '../../componentes/ui/primitivos';
import { datosDeDetalle } from './presentacionTickets';

// ---------- Resumen: solicitud + documentación técnica ----------

export function PestanaResumen({ detalle, alCambiar }: { detalle: TicketDetalleDto; alCambiar: () => Promise<void> }) {
  const [backlinks, setBacklinks] = useState<BacklinkDto[]>([]);
  const ticketId = detalle.resumen.id;

  useEffect(() => {
    apiTickets.backlinks(ticketId).then(setBacklinks).catch(() => undefined);
  }, [ticketId, detalle.documentacionMarkdown, detalle.descripcionMarkdown]);

  return (
    <div className="flex flex-col gap-5">
      <BloqueMarkdown
        icono={FileText}
        titulo="Solicitud"
        ayuda="Lo que pide el solicitante."
        valor={detalle.descripcionMarkdown}
        ticketId={ticketId}
        vacio="Sin descripción."
        alGuardar={async (valor) => {
          await apiTickets.actualizar(ticketId, { ...datosDeDetalle(detalle), descripcionMarkdown: valor || null });
          await alCambiar();
        }}
      />
      <BloqueMarkdown
        icono={BookOpen}
        titulo="Documentación técnica"
        ayuda="Análisis, causa, solución aplicada, pasos de despliegue… Se incluye en el cuerpo del PR."
        valor={detalle.documentacionMarkdown}
        ticketId={ticketId}
        vacio="Documenta aquí el análisis y la solución: queda como registro permanente del cambio."
        plantilla={'## Análisis\n\n## Causa\n\n## Solución\n\n## Cómo probar\n\n## Notas de despliegue\n'}
        alGuardar={async (valor) => {
          await apiTickets.actualizarDocumentacion(ticketId, valor || null);
          await alCambiar();
        }}
      />
      {backlinks.length > 0 && (
        <section className="rounded-xl border border-borde bg-superficie p-5 shadow-tarjeta">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Link2 className="size-4 text-texto-3" />
            Referenciado en
          </h3>
          <ul className="flex flex-wrap gap-2">
            {backlinks.map((backlink) => (
              <li key={backlink.origenId}>
                <Link
                  to={rutaDeEntidad(backlink.tipoOrigen, backlink.origenId)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-borde px-2.5 py-1 text-sm hover:bg-superficie-2"
                >
                  {backlink.tipoOrigen === 'Documento' ? <FileText className="size-4 text-texto-3" /> : <ListChecks className="size-4 text-texto-3" />}
                  {backlink.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function BloqueMarkdown({
  icono: IconoBloque,
  titulo,
  ayuda,
  valor,
  ticketId,
  vacio,
  plantilla,
  alGuardar,
}: {
  icono: Icono;
  titulo: string;
  ayuda: string;
  valor: string | null;
  ticketId: string;
  vacio: string;
  plantilla?: string;
  alGuardar: (valor: string) => Promise<void>;
}) {
  const editor = useRef<ManejadorEditorRico>(null);
  const opcionesWikiLinks = usarWikiLinks(ticketId);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  function empezar() {
    if (!valor && plantilla) editor.current?.establecerMarkdown(plantilla);
    setEditando(true);
    requestAnimationFrame(() => editor.current?.enfocar());
  }

  function cancelar() {
    editor.current?.establecerMarkdown(valor ?? '');
    setEditando(false);
  }

  async function guardar() {
    const contenido = editor.current?.obtenerMarkdown().trim() ?? '';
    if (contenido === (valor ?? '').trim()) {
      setEditando(false);
      return;
    }
    setGuardando(true);
    try {
      await alGuardar(contenido);
      notificar.exito(`${titulo} guardada`);
      setEditando(false);
    } catch (errorGuardado) {
      notificar.error('No se pudo guardar', errorGuardado);
    } finally {
      setGuardando(false);
    }
  }

  const sinContenido = !valor && !editando;

  return (
    <section className="rounded-xl border border-borde bg-superficie p-5 shadow-tarjeta">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <IconoBloque className="size-4 text-texto-3" />
            {titulo}
          </h3>
          <p className="mt-0.5 text-xs text-texto-3">{ayuda}</p>
        </div>
        {!editando && <BotonIcono icono={Pencil} etiqueta={`Editar ${titulo.toLowerCase()}`} tamano="sm" onClick={empezar} />}
      </header>
      {sinContenido && (
        <button onClick={empezar} className="w-full rounded-lg border border-dashed border-borde-fuerte px-4 py-5 text-left text-sm text-texto-3 hover:bg-superficie-2">
          {vacio}
        </button>
      )}
      {/* Mismo editor visual para leer y editar: las imágenes se ven en su sitio y no cambia el formato al pasar de uno a otro. */}
      <div
        hidden={sinContenido}
        onDoubleClick={editando ? undefined : empezar}
        title={editando ? undefined : 'Doble clic para editar'}
        className={unirClases(
          'rounded-lg [&_.editor-rico]:text-[15px]',
          editando
            ? 'border border-acento px-4 py-3 ring-3 ring-acento/15 [&_.editor-rico]:min-h-[30vh] [&_.editor-rico]:pb-4'
            : '[&_.editor-rico]:min-h-0 [&_.editor-rico]:pb-0',
        )}
      >
        <EditorRico
          ref={editor}
          contenidoInicial={valor ?? ''}
          alCambiar={() => undefined}
          editable={editando}
          destinoAdjuntos={{ ticketId }}
          wikiLinks={opcionesWikiLinks}
          placeholder='Escribe… pega capturas con Ctrl+V, "/" para comandos, "[[" para enlazar'
        />
      </div>
      {editando && (
        <div className="mt-2 flex justify-end gap-2">
          <Boton variante="secundario" tamano="sm" onClick={cancelar}>
            Cancelar
          </Boton>
          <Boton tamano="sm" cargando={guardando} onClick={() => void guardar()}>
            Guardar
          </Boton>
        </div>
      )}
    </section>
  );
}

// ---------- Despliegues y pruebas ----------

export function PestanaDespliegues({ despliegues }: { despliegues: DespliegueTicketDto[] }) {
  if (despliegues.length === 0) {
    return (
      <EstadoVacio
        icono={Rocket}
        titulo="Sin despliegues registrados"
        descripcion="Cuando el PR esté en revisión, usa «Desplegado en Desarrollo» para pasar el ticket a pruebas."
      />
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {despliegues.map((despliegue) => {
        const produccion = despliegue.ambiente === 'Produccion';
        return (
          <li key={despliegue.id} className="rounded-xl border border-borde bg-superficie p-5 shadow-tarjeta">
            <div className="flex flex-wrap items-center gap-2">
              <span className={unirClases('grid size-8 place-items-center rounded-lg', produccion ? 'bg-exito-suave text-exito' : 'bg-aviso-suave text-aviso')}>
                {produccion ? <Rocket className="size-4" /> : <FlaskConical className="size-4" />}
              </span>
              <span className="font-medium">{produccion ? 'Producción' : 'Desarrollo'}</span>
              {despliegue.referencia && <span className="rounded bg-superficie-2 px-1.5 font-mono text-xs">{despliegue.referencia}</span>}
              <span className="ml-auto">
                {despliegue.resultado === 'Pendiente' && (
                  <Insignia tono="aviso" icono={Hourglass}>
                    Pruebas pendientes
                  </Insignia>
                )}
                {despliegue.resultado === 'Aprobado' && (
                  <Insignia tono="exito" icono={CircleCheck}>
                    {produccion ? 'En producción' : 'Aprobado'}
                  </Insignia>
                )}
                {despliegue.resultado === 'Rechazado' && (
                  <Insignia tono="peligro" icono={CircleX}>
                    Rechazado
                  </Insignia>
                )}
              </span>
            </div>
            <p className="mt-2 text-xs text-texto-3">
              Desplegado por {despliegue.nombreDesplegadoPor} · {formatearFechaHora(despliegue.fechaDespliegue)}
            </p>
            {despliegue.notas && <p className="mt-2 whitespace-pre-wrap text-sm text-texto-2">{despliegue.notas}</p>}
            {despliegue.fechaResultado && !produccion && (
              <div className={unirClases('mt-3 rounded-lg px-3 py-2 text-sm', despliegue.resultado === 'Rechazado' ? 'bg-peligro-suave' : 'bg-exito-suave')}>
                <p className="text-xs text-texto-2">
                  Evaluado por {despliegue.nombreEvaluadoPor} · {formatearFechaHora(despliegue.fechaResultado)}
                </p>
                {despliegue.notasResultado && <p className="mt-1 whitespace-pre-wrap">{despliegue.notasResultado}</p>}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ---------- Conversación y notas internas ----------

export function PestanaConversacion({ detalle, alCambiar }: { detalle: TicketDetalleDto; alCambiar: () => Promise<void> }) {
  const editor = useRef<ManejadorEditorRico>(null);
  const opcionesWikiLinks = usarWikiLinks(detalle.resumen.id);
  const [hayTexto, setHayTexto] = useState(false);
  const [esNotaInterna, setEsNotaInterna] = useState(true);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    const cuerpo = editor.current?.obtenerMarkdown().trim() ?? '';
    if (!cuerpo || enviando) return;
    setEnviando(true);
    try {
      await apiTickets.agregarMensaje(detalle.resumen.id, cuerpo, esNotaInterna);
      editor.current?.establecerMarkdown('');
      setHayTexto(false);
      await alCambiar();
    } catch (errorEnvio) {
      notificar.error('No se pudo enviar', errorEnvio);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {detalle.mensajes.length === 0 ? (
        <EstadoVacio icono={MessageSquare} titulo="Sin mensajes" descripcion="Registra respuestas al solicitante o notas internas del equipo." />
      ) : (
        <ol className="flex flex-col gap-3">
          {detalle.mensajes.map((mensaje) => (
            <li
              key={mensaje.id}
              className={unirClases('rounded-xl border p-4', mensaje.esNotaInterna ? 'border-aviso/30 bg-aviso-suave' : 'border-borde bg-superficie shadow-tarjeta')}
            >
              <div className="mb-2 flex items-center gap-2 text-xs text-texto-3">
                <Avatar nombre={mensaje.nombreRemitente} />
                {mensaje.esNotaInterna && (
                  <span className="inline-flex items-center gap-1 font-medium text-aviso">
                    <Lock className="size-3" />
                    Nota interna
                  </span>
                )}
                <span className="ml-auto" title={formatearFechaHora(mensaje.fechaCreacion)}>
                  {formatearRelativo(mensaje.fechaCreacion)}
                </span>
              </div>
              <VistaMarkdown contenido={mensaje.cuerpoMensaje} />
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-col gap-2">
        {/* Ctrl/⌘ + Enter envía. */}
        <div
          onKeyDown={(evento: KeyboardEvent) => {
            if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
              evento.preventDefault();
              void enviar();
            }
          }}
          className={unirClases(
            'rounded-xl border bg-superficie px-4 py-3 shadow-tarjeta transition focus-within:ring-3 [&_.editor-rico]:min-h-24 [&_.editor-rico]:pb-2 [&_.editor-rico]:text-[15px]',
            esNotaInterna ? 'border-aviso/30 focus-within:border-aviso/50 focus-within:ring-aviso/10' : 'border-borde focus-within:border-acento focus-within:ring-acento/15',
          )}
        >
          <EditorRico
            ref={editor}
            contenidoInicial=""
            alCambiar={() => setHayTexto(!!editor.current?.obtenerMarkdown().trim())}
            destinoAdjuntos={{ ticketId: detalle.resumen.id }}
            wikiLinks={opcionesWikiLinks}
            placeholder={esNotaInterna ? 'Nota interna para el equipo… (Ctrl+Enter envía)' : 'Respuesta al solicitante… (Ctrl+Enter envía)'}
          />
        </div>
        <div className="flex items-center justify-between">
          <Casilla etiqueta="Nota interna (no cuenta como respuesta al solicitante)" checked={esNotaInterna} onChange={(evento) => setEsNotaInterna(evento.target.checked)} />
          <Boton icono={Send} cargando={enviando} disabled={!hayTexto} onClick={() => void enviar()}>
            {esNotaInterna ? 'Agregar nota' : 'Registrar respuesta'}
          </Boton>
        </div>
      </div>
    </div>
  );
}

// ---------- Historial ----------

const iconoEvento: Record<TipoEventoTicket, Icono> = {
  Creado: PlusCircle,
  CambioEstado: ArrowRightLeft,
  Asignado: UserCheck,
  Editado: FilePen,
  RamaCreada: GitBranch,
  RamaVinculada: GitBranch,
  PullRequestCreado: GitPullRequest,
  Sincronizado: RefreshCw,
  Desplegado: Rocket,
  PruebasAprobadas: CircleCheck,
  PruebasRechazadas: CircleX,
  TareaVinculada: ListChecks,
  DocumentacionActualizada: BookOpen,
  TiempoRegistrado: Timer,
};

export function PestanaHistorial({ eventos }: { eventos: EventoTicketDto[] }) {
  return (
    <ol className="relative flex flex-col">
      {eventos.map((evento, indice) => {
        const IconoEvento = iconoEvento[evento.tipoEvento] ?? ArrowRightLeft;
        const esCambioEstado = evento.tipoEvento === 'CambioEstado' || evento.tipoEvento === 'Creado';
        return (
          <li key={evento.id} className="relative flex gap-4 pb-5">
            {indice < eventos.length - 1 && <span aria-hidden className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-borde" />}
            <span
              className={unirClases(
                'relative z-10 grid size-8 shrink-0 place-items-center rounded-full border',
                esCambioEstado ? 'border-primario bg-primario text-sobre-primario' : 'border-borde bg-superficie text-texto-2',
                evento.tipoEvento === 'PruebasRechazadas' && 'border-peligro bg-peligro-suave text-peligro',
                evento.tipoEvento === 'PruebasAprobadas' && 'border-exito bg-exito-suave text-exito',
              )}
            >
              <IconoEvento className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className={unirClases('text-sm', esCambioEstado && 'font-medium')}>{evento.descripcion}</p>
              <p className="mt-0.5 text-xs text-texto-3">
                {evento.nombreUsuario} · <span title={formatearFechaHora(evento.fechaEvento)}>{formatearRelativo(evento.fechaEvento)}</span>
              </p>
              {evento.comentario && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-superficie-2 px-3 py-2 text-sm text-texto-2">{evento.comentario}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
