import { lazy, Suspense, useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { Code2, ExternalLink, Loader2, Play, Settings2, TriangleAlert } from 'lucide-react';
import { apiDocumentos, apiFlujos, apiLienzos, apiProyectos, apiTareas, apiTickets } from '../../servicios/api';
import { formatearRelativo } from '../../servicios/formato';
import { navegarA } from '../../servicios/navegacion';
import type {
  DocumentoResumenDto,
  EstadoTarea,
  FlujoDetalleDto,
  FlujoResumenDto,
  LienzoDetalleDto,
  TareaResumenDto,
  TicketResumenDto,
  TipoTicket,
  VistaTickets,
} from '../../servicios/tipos';
import { InsigniaEstado, InsigniaPrioridad } from '../../caracteristicas/tickets/presentacionTickets';
import { Insignia, unirClases } from '../ui/primitivos';
import { configuracionBloque, leerConfiguracion, leerLimite, normalizarNombre, type ConfiguracionBloque, type TipoBloqueVivo } from './formato';
import { usarSistemas } from './sistemas';

const MiniFlujo = lazy(() => import('./MiniFlujo'));
const VistaPreviaLienzo = lazy(() => import('./VistaPreviaLienzo'));

export const alturasFlujo: Record<string, number> = { pequeño: 260, mediano: 380, grande: 540 };

export const etiquetaEstadoTarea: Record<EstadoTarea, string> = { Pendiente: 'Pendiente', EnProgreso: 'En progreso', Completada: 'Completada', Cancelada: 'Cancelada' };

const esOscuro = () => document.documentElement.classList.contains('oscuro');

interface PropiedadesBloque {
  tipo: TipoBloqueVivo;
  /** Texto del bloque ("clave: valor" por línea). */
  contenido: string;
  /** Solo en el editor (y si es editable): reabre el selector para cambiar lo incrustado. */
  alConfigurar?: () => void;
  /** Solo en el editor: muestra u oculta el código del bloque. */
  alVerCodigo?: () => void;
}

/** Contenido de otro módulo incrustado en un documento, siempre actualizado. */
export function BloqueVivo({ tipo, contenido, alConfigurar, alVerCodigo }: PropiedadesBloque) {
  const configuracion = leerConfiguracion(contenido);
  const props = { configuracion, alConfigurar, alVerCodigo };
  switch (tipo) {
    case 'flujo':
      return <BloqueFlujo {...props} />;
    case 'lienzo':
      return <BloqueLienzo {...props} />;
    case 'tickets':
      return <BloqueTickets {...props} />;
    case 'tareas':
      return <BloqueTareas {...props} />;
    case 'documentos':
      return <BloqueDocumentos {...props} />;
    case 'flujos':
      return <BloqueFlujos {...props} />;
  }
}

interface PropiedadesTipo {
  configuracion: ConfiguracionBloque;
  alConfigurar?: () => void;
  alVerCodigo?: () => void;
}

// ---------- Piezas comunes ----------

/** Enlace de la SPA que funciona también fuera del router (el editor monta los bloques en su propia raíz). */
function Enlace({ a, children, className, title }: { a: string; children: ReactNode; className?: string; title?: string }) {
  return (
    <a
      href={a}
      title={title}
      className={className}
      onClick={(evento: MouseEvent) => {
        if (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.button !== 0) return;
        evento.preventDefault();
        navegarA(a);
      }}
    >
      {children}
    </a>
  );
}

const claseBotonCabecera =
  'inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-texto-2 transition-colors hover:bg-superficie-2 hover:text-texto';

function Marco({
  tipo,
  titulo,
  subtitulo,
  acciones,
  alConfigurar,
  alVerCodigo,
  children,
}: {
  tipo: TipoBloqueVivo;
  titulo: ReactNode;
  subtitulo?: ReactNode;
  acciones?: ReactNode;
  alConfigurar?: () => void;
  alVerCodigo?: () => void;
  children: ReactNode;
}) {
  const Icono = configuracionBloque[tipo].icono;
  return (
    <div className="bloque-vivo not-prose my-3 overflow-hidden rounded-xl border border-borde bg-superficie shadow-tarjeta" contentEditable={false}>
      <div className="flex flex-wrap items-center gap-2 border-b border-borde bg-fondo px-3 py-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-violet-100 text-violet-600">
          <Icono className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-texto">{titulo}</p>
          {subtitulo && <p className="truncate text-xs text-texto-3">{subtitulo}</p>}
        </div>
        <div className="flex items-center gap-0.5">
          {acciones}
          {alVerCodigo && (
            <button type="button" onClick={alVerCodigo} className={claseBotonCabecera} title="Ver o editar el código del bloque">
              <Code2 className="size-3.5" />
            </button>
          )}
          {alConfigurar && (
            <button type="button" onClick={alConfigurar} className={claseBotonCabecera} title="Cambiar lo incrustado">
              <Settings2 className="size-3.5" />
              Configurar
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function Cargando({ alto = 96 }: { alto?: number }) {
  return (
    <div className="grid place-items-center text-texto-3" style={{ height: alto }}>
      <Loader2 className="size-5 animate-spin" />
    </div>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 px-4 py-4 text-sm text-texto-2">
      <TriangleAlert className="size-4 shrink-0 text-amber-500" />
      <span>{children}</span>
    </p>
  );
}

const Vacio = ({ children }: { children: ReactNode }) => <p className="px-4 py-5 text-center text-sm text-texto-3">{children}</p>;

function Pie({ a, children }: { a: string; children: ReactNode }) {
  return (
    <div className="border-t border-borde px-3 py-1.5 text-right">
      <Enlace a={a} className="text-xs font-medium text-violet-700 hover:underline">
        {children}
      </Enlace>
    </div>
  );
}

/** Carga asíncrona con estado de error; `clave` decide cuándo volver a pedir. */
function usarCarga<T>(cargar: () => Promise<T>, clave: string): { datos: T | null; error: boolean } {
  const [estado, setEstado] = useState<{ datos: T | null; error: boolean }>({ datos: null, error: false });
  useEffect(() => {
    let vigente = true;
    setEstado({ datos: null, error: false });
    cargar()
      .then((datos) => vigente && setEstado({ datos, error: false }))
      .catch(() => vigente && setEstado({ datos: null, error: true }));
    return () => {
      vigente = false;
    };
    // `cargar` se recrea en cada render; `clave` resume sus dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  return estado;
}

// ---------- Flujo ----------

function BloqueFlujo({ configuracion, alConfigurar, alVerCodigo }: PropiedadesTipo) {
  const id = configuracion.id ?? '';
  const alto = alturasFlujo[configuracion.alto ?? ''] ?? alturasFlujo.mediano;
  const { datos: flujo, error } = usarCarga<FlujoDetalleDto | null>(() => (id ? apiFlujos.obtener(id) : Promise.resolve(null)), id);
  const sistemas = usarSistemas();
  const proyecto = sistemas?.proyectoDe(flujo?.sistema);

  return (
    <Marco
      tipo="flujo"
      titulo={flujo?.titulo ?? configuracion.titulo ?? 'Flujo'}
      subtitulo={
        flujo?.sistema ? (
          <>
            {flujo.sistema}
            {proyecto && proyecto.ticketsAbiertos > 0 && (
              <>
                {' · '}
                <Enlace a={`/tickets?vista=Abiertos&proyecto=${proyecto.id}`} className="text-violet-700 hover:underline">
                  {proyecto.ticketsAbiertos} {proyecto.ticketsAbiertos === 1 ? 'ticket abierto' : 'tickets abiertos'}
                </Enlace>
              </>
            )}
          </>
        ) : undefined
      }
      acciones={
        flujo && (
          <>
            <Enlace a={`/flujos/${flujo.id}?recorrer=1`} className={unirClases(claseBotonCabecera, 'text-emerald-700 hover:bg-emerald-50')} title="Recorrer paso a paso">
              <Play className="size-3.5" />
              Recorrer
            </Enlace>
            <Enlace a={`/flujos/${flujo.id}`} className={claseBotonCabecera} title="Abrir el flujo">
              <ExternalLink className="size-3.5" />
            </Enlace>
          </>
        )
      }
      alConfigurar={alConfigurar}
      alVerCodigo={alVerCodigo}
    >
      {!id ? (
        <Aviso>Falta el flujo: pulsa Configurar para elegirlo.</Aviso>
      ) : error ? (
        <Aviso>No se encontró el flujo{configuracion.titulo ? ` «${configuracion.titulo}»` : ''}: puede que se haya eliminado.</Aviso>
      ) : !flujo ? (
        <Cargando alto={alto} />
      ) : (
        <div style={{ height: alto }}>
          <Suspense fallback={<Cargando alto={alto} />}>
            <MiniFlujo contenidoJson={flujo.contenidoJson} oscuro={esOscuro()} />
          </Suspense>
        </div>
      )}
    </Marco>
  );
}

// ---------- Lienzo ----------

function BloqueLienzo({ configuracion, alConfigurar, alVerCodigo }: PropiedadesTipo) {
  const id = configuracion.id ?? '';
  const { datos: lienzo, error } = usarCarga<LienzoDetalleDto | null>(() => (id ? apiLienzos.obtener(id) : Promise.resolve(null)), id);
  return (
    <Marco
      tipo="lienzo"
      titulo={lienzo?.titulo ?? configuracion.titulo ?? 'Lienzo'}
      subtitulo={lienzo ? `Editado ${formatearRelativo(lienzo.fechaActualizacion)}` : undefined}
      acciones={
        lienzo && (
          <Enlace a={`/lienzos/${lienzo.id}`} className={claseBotonCabecera} title="Abrir el lienzo">
            <ExternalLink className="size-3.5" />
            Abrir
          </Enlace>
        )
      }
      alConfigurar={alConfigurar}
      alVerCodigo={alVerCodigo}
    >
      {!id ? (
        <Aviso>Falta el lienzo: pulsa Configurar para elegirlo.</Aviso>
      ) : error ? (
        <Aviso>No se encontró el lienzo{configuracion.titulo ? ` «${configuracion.titulo}»` : ''}: puede que se haya eliminado.</Aviso>
      ) : !lienzo ? (
        <Cargando alto={240} />
      ) : (
        <Enlace a={`/lienzos/${lienzo.id}`} className="block h-72 bg-superficie p-3 transition-opacity hover:opacity-90" title="Abrir el lienzo">
          <Suspense fallback={<Cargando alto={240} />}>
            <VistaPreviaLienzo contenidoJson={lienzo.contenidoJson} oscuro={esOscuro()} />
          </Suspense>
        </Enlace>
      )}
    </Marco>
  );
}

// ---------- Tickets ----------

export const vistasTicket: Record<VistaTickets, string> = {
  MisAbiertos: 'Mis abiertos',
  Abiertos: 'Abiertos',
  SinAsignar: 'Sin asignar',
  EnPruebas: 'En pruebas',
  Cerrados: 'Cerrados',
  Todos: 'Todos',
};

function BloqueTickets({ configuracion, alConfigurar, alVerCodigo }: PropiedadesTipo) {
  const vista = (configuracion.vista && configuracion.vista in vistasTicket ? configuracion.vista : 'Abiertos') as VistaTickets;
  const tipo = (configuracion.tipo as TipoTicket | undefined) || undefined;
  const limite = leerLimite(configuracion);
  const sistemas = usarSistemas();
  const proyecto = sistemas?.proyectoDe(configuracion.sistema) ?? null;
  const sinProyecto = !!configuracion.sistema && sistemas !== null && !proyecto;
  const listo = sistemas !== null && !sinProyecto;

  const { datos: tickets, error } = usarCarga<TicketResumenDto[]>(async () => {
    if (!listo) return [];
    // La etiqueta se guarda por nombre (legible en el Markdown) y se resuelve contra el catálogo compartido.
    let etiquetaId: string | undefined;
    if (configuracion.etiqueta) {
      const etiqueta = (await apiDocumentos.estructura()).etiquetas.find(
        (existente) => normalizarNombre(existente.nombre) === normalizarNombre(configuracion.etiqueta!.replace(/^#/, '')),
      );
      if (!etiqueta) throw new Error('Etiqueta no encontrada');
      etiquetaId = etiqueta.id;
    }
    return apiTickets.listar(vista, configuracion.texto, tipo, proyecto?.id, etiquetaId);
  }, `${listo}|${vista}|${configuracion.texto ?? ''}|${tipo ?? ''}|${proyecto?.id ?? ''}|${configuracion.etiqueta ?? ''}`);
  const filtros = [vistasTicket[vista], configuracion.sistema, configuracion.etiqueta && `#${configuracion.etiqueta.replace(/^#/, '')}`, tipo, configuracion.texto && `"${configuracion.texto}"`]
    .filter(Boolean)
    .join(' · ');
  const rutaTodos = `/tickets?vista=${vista}${proyecto ? `&proyecto=${proyecto.id}` : ''}`;

  return (
    <Marco tipo="tickets" titulo={configuracion.titulo ?? 'Tickets'} subtitulo={filtros} alConfigurar={alConfigurar} alVerCodigo={alVerCodigo}>
      {sinProyecto ? (
        <Aviso>«{configuracion.sistema}» no tiene proyecto de soporte, así que no hay tickets que filtrar. Créalo en Tickets → Proyectos con ese nombre.</Aviso>
      ) : error ? (
        <Aviso>{configuracion.etiqueta ? `No se pudieron cargar los tickets (¿existe la etiqueta «${configuracion.etiqueta}»?).` : 'No se pudieron cargar los tickets.'}</Aviso>
      ) : !tickets || !listo ? (
        <Cargando />
      ) : tickets.length === 0 ? (
        <Vacio>No hay tickets con estos filtros.</Vacio>
      ) : (
        <>
          <ul className="divide-y divide-borde">
            {tickets.slice(0, limite).map((ticket) => (
              <li key={ticket.id}>
                <Enlace a={`/tickets/${ticket.id}`} className="flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-superficie-2">
                  <span className="w-20 shrink-0 font-mono text-xs text-texto-3">{ticket.clave}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-texto">{ticket.asunto}</span>
                  <span className="hidden shrink-0 sm:inline-flex">
                    <InsigniaPrioridad prioridad={ticket.prioridad} />
                  </span>
                  <InsigniaEstado estado={ticket.estado} />
                  <span className="hidden w-24 shrink-0 text-right text-xs text-texto-3 md:inline">{formatearRelativo(ticket.fechaActualizacion)}</span>
                </Enlace>
              </li>
            ))}
          </ul>
          <Pie a={rutaTodos}>{tickets.length > limite ? `Ver los ${tickets.length} en Tickets →` : 'Abrir en Tickets →'}</Pie>
        </>
      )}
    </Marco>
  );
}

// ---------- Tareas ----------

export const estadosTarea: EstadoTarea[] = ['Pendiente', 'EnProgreso', 'Completada', 'Cancelada'];

function BloqueTareas({ configuracion, alConfigurar, alVerCodigo }: PropiedadesTipo) {
  const clave = configuracion.proyecto ?? '';
  const estados = (configuracion.estados ?? 'Pendiente, EnProgreso')
    .split(',')
    .map((estado) => estado.trim())
    .filter((estado): estado is EstadoTarea => (estadosTarea as string[]).includes(estado));
  const limite = leerLimite(configuracion);
  const { datos, error } = usarCarga<{ nombre: string; tareas: TareaResumenDto[] } | null>(async () => {
    if (!clave) return null;
    const proyecto = (await apiProyectos.listar()).find((existente) => normalizarNombre(existente.clavePrefijo) === normalizarNombre(clave));
    if (!proyecto) throw new Error('Proyecto no encontrado');
    return { nombre: proyecto.nombre, tareas: await apiTareas.listarPorProyecto(proyecto.id) };
  }, clave);

  const tareas = (datos?.tareas ?? [])
    .filter((tarea) => estados.length === 0 || estados.includes(tarea.estado))
    .filter((tarea) => !configuracion.etiqueta || tarea.etiquetas.some((etiqueta) => normalizarNombre(etiqueta.nombre) === normalizarNombre(configuracion.etiqueta!.replace(/^#/, ''))))
    // Primero lo que vence antes; sin fecha al final.
    .sort((a, b) => (a.fechaVencimiento ?? '9999').localeCompare(b.fechaVencimiento ?? '9999') || a.indiceOrden - b.indiceOrden);
  const ahora = new Date();

  return (
    <Marco
      tipo="tareas"
      titulo={configuracion.titulo ?? (datos ? `Tareas de ${datos.nombre}` : 'Tareas')}
      subtitulo={[clave, configuracion.etiqueta && `#${configuracion.etiqueta.replace(/^#/, '')}`, estados.map((estado) => etiquetaEstadoTarea[estado]).join(', ')].filter(Boolean).join(' · ')}
      alConfigurar={alConfigurar}
      alVerCodigo={alVerCodigo}
    >
      {!clave ? (
        <Aviso>Falta el proyecto: pulsa Configurar para elegirlo.</Aviso>
      ) : error ? (
        <Aviso>No se encontró el proyecto «{clave}».</Aviso>
      ) : !datos ? (
        <Cargando />
      ) : tareas.length === 0 ? (
        <Vacio>No hay tareas con estos estados.</Vacio>
      ) : (
        <>
          <ul className="divide-y divide-borde">
            {tareas.slice(0, limite).map((tarea) => {
              const vencida = tarea.fechaVencimiento && new Date(tarea.fechaVencimiento) < ahora && tarea.estado !== 'Completada';
              return (
                <li key={tarea.id}>
                  <Enlace a={`/tareas?tarea=${tarea.id}`} className="flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-superficie-2">
                    <span className="w-20 shrink-0 font-mono text-xs text-texto-3">
                      {tarea.clavePrefijoProyecto}-{tarea.numeroTarea}
                    </span>
                    <span className={unirClases('min-w-0 flex-1 truncate font-medium', tarea.estado === 'Completada' ? 'text-texto-3 line-through' : 'text-texto')}>
                      {tarea.titulo}
                    </span>
                    <Insignia tono={tarea.estado === 'Completada' ? 'exito' : tarea.estado === 'EnProgreso' ? 'acento' : 'neutro'}>{etiquetaEstadoTarea[tarea.estado]}</Insignia>
                    {tarea.fechaVencimiento && (
                      <span className={unirClases('hidden w-24 shrink-0 text-right text-xs md:inline', vencida ? 'font-medium text-rose-600' : 'text-texto-3')}>
                        {new Date(tarea.fechaVencimiento).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </Enlace>
                </li>
              );
            })}
          </ul>
          <Pie a="/tareas">{tareas.length > limite ? `Ver las ${tareas.length} en Tareas →` : 'Abrir en Tareas →'}</Pie>
        </>
      )}
    </Marco>
  );
}

// ---------- Documentos ----------

function BloqueDocumentos({ configuracion, alConfigurar, alVerCodigo }: PropiedadesTipo) {
  const limite = leerLimite(configuracion);
  const clave = `${configuracion.etiqueta ?? ''}|${configuracion.carpeta ?? ''}`;
  const { datos, error } = usarCarga<{ documentos: DocumentoResumenDto[]; problema: string | null }>(async () => {
    const estructura = await apiDocumentos.estructura();
    const etiqueta = configuracion.etiqueta ? estructura.etiquetas.find((existente) => normalizarNombre(existente.nombre) === normalizarNombre(configuracion.etiqueta!)) : null;
    const carpeta = configuracion.carpeta ? estructura.carpetas.find((existente) => normalizarNombre(existente.nombre) === normalizarNombre(configuracion.carpeta!)) : null;
    if (configuracion.etiqueta && !etiqueta) return { documentos: [], problema: `No existe la etiqueta «${configuracion.etiqueta}».` };
    if (configuracion.carpeta && !carpeta) return { documentos: [], problema: `No existe la carpeta «${configuracion.carpeta}».` };
    const documentos = await apiDocumentos.listar({ etiquetaId: etiqueta?.id, carpetaDocumentoId: carpeta?.id });
    return { documentos: [...documentos].sort((a, b) => b.fechaActualizacion.localeCompare(a.fechaActualizacion)), problema: null };
  }, clave);

  const filtros = [configuracion.etiqueta && `#${configuracion.etiqueta}`, configuracion.carpeta && `📁 ${configuracion.carpeta}`].filter(Boolean).join(' · ');

  return (
    <Marco tipo="documentos" titulo={configuracion.titulo ?? 'Documentos'} subtitulo={filtros || 'Recientes'} alConfigurar={alConfigurar} alVerCodigo={alVerCodigo}>
      {error ? (
        <Aviso>No se pudieron cargar los documentos.</Aviso>
      ) : !datos ? (
        <Cargando />
      ) : datos.problema ? (
        <Aviso>{datos.problema}</Aviso>
      ) : datos.documentos.length === 0 ? (
        <Vacio>No hay documentos con estos filtros.</Vacio>
      ) : (
        <ul className="divide-y divide-borde">
          {datos.documentos.slice(0, limite).map((documento) => (
            <li key={documento.id}>
              <Enlace a={`/documentos/${documento.id}`} className="flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-superficie-2">
                <span className="w-5 shrink-0 text-center">{documento.icono ?? '📄'}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-texto">{documento.titulo || 'Sin título'}</span>
                <span className="hidden shrink-0 gap-1 sm:flex">
                  {documento.etiquetas.slice(0, 3).map((etiqueta) => (
                    <Insignia key={etiqueta.id} tono="neutro">
                      {etiqueta.nombre}
                    </Insignia>
                  ))}
                </span>
                <span className="hidden w-24 shrink-0 text-right text-xs text-texto-3 md:inline">{formatearRelativo(documento.fechaActualizacion)}</span>
              </Enlace>
            </li>
          ))}
        </ul>
      )}
    </Marco>
  );
}

// ---------- Flujos de un sistema ----------

function BloqueFlujos({ configuracion, alConfigurar, alVerCodigo }: PropiedadesTipo) {
  const sistema = configuracion.sistema ?? '';
  const limite = leerLimite(configuracion);
  const sistemas = usarSistemas();
  const proyecto = sistemas?.proyectoDe(sistema) ?? null;

  const { datos: flujos, error } = usarCarga<FlujoResumenDto[]>(
    async () => (await apiFlujos.listar()).filter((flujo) => !sistema || normalizarNombre(flujo.sistema ?? '') === normalizarNombre(sistema)),
    sistema,
  );
  // Unificación por nombre: si el sistema es también un proyecto de soporte, se muestran sus tickets abiertos.
  const { datos: tickets } = usarCarga<TicketResumenDto[]>(
    () => (proyecto ? apiTickets.listar('Abiertos', undefined, undefined, proyecto.id) : Promise.resolve([])),
    proyecto?.id ?? '',
  );

  return (
    <Marco
      tipo="flujos"
      titulo={configuracion.titulo ?? (sistema ? `Flujos de ${sistema}` : 'Flujos')}
      subtitulo={flujos ? `${flujos.length} ${flujos.length === 1 ? 'flujo' : 'flujos'}` : undefined}
      alConfigurar={alConfigurar}
      alVerCodigo={alVerCodigo}
    >
      {error ? (
        <Aviso>No se pudieron cargar los flujos.</Aviso>
      ) : !flujos ? (
        <Cargando />
      ) : flujos.length === 0 ? (
        <Vacio>{sistema ? `Aún no hay flujos del sistema «${sistema}».` : 'Aún no hay flujos.'}</Vacio>
      ) : (
        <ul className="divide-y divide-borde">
          {flujos.slice(0, limite).map((flujo) => (
            <li key={flujo.id} className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-superficie-2">
              <Enlace a={`/flujos/${flujo.id}`} className="min-w-0 flex-1">
                <span className="block truncate font-medium text-texto">{flujo.titulo}</span>
                <span className="block text-xs text-texto-3">
                  {flujo.pasos} pasos · {formatearRelativo(flujo.fechaActualizacion)}
                </span>
              </Enlace>
              <Enlace a={`/flujos/${flujo.id}?recorrer=1`} className={unirClases(claseBotonCabecera, 'text-emerald-700 hover:bg-emerald-50')} title="Recorrer paso a paso">
                <Play className="size-3.5" />
              </Enlace>
            </li>
          ))}
        </ul>
      )}

      {proyecto && tickets && tickets.length > 0 && (
        <div className="border-t border-borde bg-fondo/60">
          <p className="px-3 pt-2 text-[11px] font-medium uppercase tracking-wider text-texto-3">Tickets abiertos de {proyecto.nombre}</p>
          <ul>
            {tickets.slice(0, 5).map((ticket) => (
              <li key={ticket.id}>
                <Enlace a={`/tickets/${ticket.id}`} className="flex items-center gap-3 px-3 py-1.5 text-sm transition-colors hover:bg-superficie-2">
                  <span className="w-20 shrink-0 font-mono text-xs text-texto-3">{ticket.clave}</span>
                  <span className="min-w-0 flex-1 truncate text-texto">{ticket.asunto}</span>
                  <InsigniaEstado estado={ticket.estado} />
                </Enlace>
              </li>
            ))}
          </ul>
          <Pie a={`/tickets?vista=Abiertos&proyecto=${proyecto.id}`}>{tickets.length > 5 ? `Ver los ${tickets.length} tickets →` : 'Abrir en Tickets →'}</Pie>
        </div>
      )}
    </Marco>
  );
}
