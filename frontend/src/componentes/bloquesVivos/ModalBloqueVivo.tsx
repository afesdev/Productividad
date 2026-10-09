import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, Search } from 'lucide-react';
import { apiDocumentos, apiFlujos, apiLienzos, apiProyectos } from '../../servicios/api';
import { formatearRelativo } from '../../servicios/formato';
import type { EstructuraDocumentosDto, FlujoResumenDto, LienzoResumenDto, ProyectoDto, TipoTicket } from '../../servicios/tipos';
import { etiquetaTipo, tiposTicket } from '../../caracteristicas/tickets/presentacionTickets';
import { Modal } from '../ui/Modal';
import { Boton, Campo, Entrada, Selector, unirClases } from '../ui/primitivos';
import { alturasFlujo, estadosTarea, etiquetaEstadoTarea, vistasTicket } from './BloqueVivo';
import { configuracionBloque, escribirConfiguracion, leerConfiguracion, type ConfiguracionBloque, type TipoBloqueVivo } from './formato';
import { usarSistemas } from './sistemas';
import { usarCatalogoEtiquetas } from '../../caracteristicas/documentos/catalogoEtiquetas';

type Solicitud = (tipo: TipoBloqueVivo, contenidoActual?: string) => Promise<string | null>;

// Lo registra ProveedorBloquesVivos: los comandos "/" del editor no son componentes de React.
let solicitar: Solicitud | null = null;

/** Abre el selector del bloque y resuelve con el contenido a guardar, o null si se cancela. */
export const solicitarBloqueVivo: Solicitud = (tipo, contenidoActual) => (solicitar ? solicitar(tipo, contenidoActual) : Promise.resolve(null));

export function ProveedorBloquesVivos() {
  const [peticion, setPeticion] = useState<{ tipo: TipoBloqueVivo; configuracion: ConfiguracionBloque } | null>(null);
  const resolver = useRef<(contenido: string | null) => void>();

  useEffect(() => {
    solicitar = (tipo, contenidoActual) =>
      new Promise((resolverPromesa) => {
        resolver.current?.(null);
        resolver.current = resolverPromesa;
        setPeticion({ tipo, configuracion: leerConfiguracion(contenidoActual ?? '') });
      });
    return () => {
      solicitar = null;
    };
  }, []);

  function responder(configuracion: ConfiguracionBloque | null) {
    resolver.current?.(configuracion ? escribirConfiguracion(configuracion) : null);
    resolver.current = undefined;
    setPeticion(null);
  }

  return (
    <ModalBloque
      key={peticion ? `${peticion.tipo}-${JSON.stringify(peticion.configuracion)}` : 'cerrado'}
      peticion={peticion}
      alCancelar={() => responder(null)}
      alAceptar={(configuracion) => responder(configuracion)}
    />
  );
}

function ModalBloque({
  peticion,
  alCancelar,
  alAceptar,
}: {
  peticion: { tipo: TipoBloqueVivo; configuracion: ConfiguracionBloque } | null;
  alCancelar: () => void;
  alAceptar: (configuracion: ConfiguracionBloque) => void;
}) {
  const [configuracion, setConfiguracion] = useState<ConfiguracionBloque>(peticion?.configuracion ?? {});
  const tipo = peticion?.tipo;
  const cambiar = (cambios: ConfiguracionBloque) => setConfiguracion((actual) => ({ ...actual, ...cambios }));
  const valido = tipo === 'flujo' || tipo === 'lienzo' ? !!configuracion.id : tipo === 'tareas' ? !!configuracion.proyecto : true;

  return (
    <Modal
      abierto={peticion !== null}
      alCerrar={alCancelar}
      titulo={tipo ? `Incrustar: ${configuracionBloque[tipo].etiqueta}` : ''}
      descripcion={tipo ? configuracionBloque[tipo].descripcion : undefined}
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={alCancelar}>
            Cancelar
          </Boton>
          <Boton icono={Check} disabled={!valido} onClick={() => alAceptar(configuracion)}>
            {peticion?.configuracion && Object.keys(peticion.configuracion).length > 0 ? 'Guardar' : 'Insertar'}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        {tipo === 'flujo' && <SelectorFlujo configuracion={configuracion} alCambiar={cambiar} />}
        {tipo === 'lienzo' && <SelectorLienzo configuracion={configuracion} alCambiar={cambiar} />}
        {tipo === 'tickets' && <OpcionesTickets configuracion={configuracion} alCambiar={cambiar} />}
        {tipo === 'tareas' && <OpcionesTareas configuracion={configuracion} alCambiar={cambiar} />}
        {tipo === 'documentos' && <OpcionesDocumentos configuracion={configuracion} alCambiar={cambiar} />}
        {tipo === 'flujos' && <OpcionesFlujos configuracion={configuracion} alCambiar={cambiar} />}
        {tipo && tipo !== 'flujo' && tipo !== 'lienzo' && (
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <Campo etiqueta="Título del bloque" ayuda="Opcional.">
              <Entrada value={configuracion.titulo ?? ''} maxLength={120} onChange={(evento) => cambiar({ titulo: evento.target.value })} />
            </Campo>
            <Campo etiqueta="Máximo de filas">
              <Entrada type="number" min={1} max={50} value={configuracion.limite ?? '10'} onChange={(evento) => cambiar({ limite: evento.target.value })} />
            </Campo>
          </div>
        )}
      </div>
    </Modal>
  );
}

interface PropiedadesOpciones {
  configuracion: ConfiguracionBloque;
  alCambiar: (cambios: ConfiguracionBloque) => void;
}

/** Lista con buscador para elegir un elemento (flujo o lienzo). */
function ListaElegible<T extends { id: string; titulo: string }>({
  elementos,
  seleccionado,
  alElegir,
  detalle,
}: {
  elementos: T[] | null;
  seleccionado: string | undefined;
  alElegir: (elemento: T) => void;
  detalle: (elemento: T) => ReactNode;
}) {
  const [busqueda, setBusqueda] = useState('');
  const filtrados = useMemo(
    () => (elementos ?? []).filter((elemento) => elemento.titulo.toLowerCase().includes(busqueda.trim().toLowerCase())),
    [elementos, busqueda],
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-3" />
        <Entrada autoFocus value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar…" className="h-9 pl-9" />
      </div>
      <ul className="max-h-72 overflow-y-auto rounded-lg border border-borde">
        {elementos === null ? (
          <li className="px-3 py-4 text-center text-sm text-texto-3">Cargando…</li>
        ) : filtrados.length === 0 ? (
          <li className="px-3 py-4 text-center text-sm text-texto-3">Sin resultados.</li>
        ) : (
          filtrados.map((elemento) => (
            <li key={elemento.id}>
              <button
                type="button"
                onClick={() => alElegir(elemento)}
                className={unirClases(
                  'flex w-full items-center gap-2 border-b border-borde px-3 py-2 text-left text-sm last:border-b-0 transition-colors',
                  seleccionado === elemento.id ? 'bg-violet-50 text-violet-900' : 'hover:bg-superficie-2',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{elemento.titulo}</span>
                  <span className="block truncate text-xs text-texto-3">{detalle(elemento)}</span>
                </span>
                {seleccionado === elemento.id && <Check className="size-4 shrink-0 text-violet-600" />}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function SelectorFlujo({ configuracion, alCambiar }: PropiedadesOpciones) {
  const [flujos, setFlujos] = useState<FlujoResumenDto[] | null>(null);
  useEffect(() => {
    apiFlujos.listar().then(setFlujos).catch(() => setFlujos([]));
  }, []);
  return (
    <>
      <ListaElegible
        elementos={flujos}
        seleccionado={configuracion.id}
        alElegir={(flujo) => alCambiar({ id: flujo.id, titulo: flujo.titulo })}
        detalle={(flujo) => [flujo.sistema, `${flujo.pasos} pasos`, `editado ${formatearRelativo(flujo.fechaActualizacion)}`].filter(Boolean).join(' · ')}
      />
      <Campo etiqueta="Altura">
        <Selector value={configuracion.alto ?? 'mediano'} onChange={(evento) => alCambiar({ alto: evento.target.value })}>
          {Object.keys(alturasFlujo).map((alto) => (
            <option key={alto} value={alto}>
              {alto[0].toUpperCase() + alto.slice(1)}
            </option>
          ))}
        </Selector>
      </Campo>
    </>
  );
}

function SelectorLienzo({ configuracion, alCambiar }: PropiedadesOpciones) {
  const [lienzos, setLienzos] = useState<LienzoResumenDto[] | null>(null);
  useEffect(() => {
    apiLienzos.listar().then(setLienzos).catch(() => setLienzos([]));
  }, []);
  return (
    <ListaElegible
      elementos={lienzos}
      seleccionado={configuracion.id}
      alElegir={(lienzo) => alCambiar({ id: lienzo.id, titulo: lienzo.titulo })}
      detalle={(lienzo) => `Editado ${formatearRelativo(lienzo.fechaActualizacion)}`}
    />
  );
}

/** Selector de sistema unificado (proyectos de soporte + sistemas de flujos). */
function SelectorSistema({ valor, alCambiar, ayuda }: { valor: string | undefined; alCambiar: (sistema: string) => void; ayuda?: string }) {
  const sistemas = usarSistemas();
  return (
    <Campo etiqueta="Sistema" ayuda={ayuda}>
      <Selector value={valor ?? ''} onChange={(evento) => alCambiar(evento.target.value)}>
        <option value="">Todos</option>
        {sistemas?.nombres.map((nombre) => (
          <option key={nombre} value={nombre}>
            {nombre}
            {sistemas.proyectoDe(nombre) ? '' : ' (solo flujos)'}
          </option>
        ))}
        {valor && sistemas && !sistemas.nombres.some((nombre) => nombre.toLowerCase() === valor.toLowerCase()) && <option value={valor}>{valor}</option>}
      </Selector>
    </Campo>
  );
}

/** Etiqueta del catálogo compartido (documentos, tickets y tareas); se guarda por nombre. */
function SelectorEtiqueta({ valor, alCambiar }: { valor: string | undefined; alCambiar: (etiqueta: string) => void }) {
  const etiquetas = usarCatalogoEtiquetas();
  return (
    <Campo etiqueta="Etiqueta">
      <Selector value={valor ?? ''} onChange={(evento) => alCambiar(evento.target.value)}>
        <option value="">Cualquiera</option>
        {etiquetas.map((etiqueta) => (
          <option key={etiqueta.id} value={etiqueta.nombre}>
            #{etiqueta.nombre}
          </option>
        ))}
        {valor && !etiquetas.some((etiqueta) => etiqueta.nombre === valor) && <option value={valor}>#{valor}</option>}
      </Selector>
    </Campo>
  );
}

function OpcionesTickets({ configuracion, alCambiar }: PropiedadesOpciones) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectorEtiqueta valor={configuracion.etiqueta} alCambiar={(etiqueta) => alCambiar({ etiqueta })} />
      <Campo etiqueta="Vista">
        <Selector value={configuracion.vista ?? 'Abiertos'} onChange={(evento) => alCambiar({ vista: evento.target.value })}>
          {Object.entries(vistasTicket).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </Selector>
      </Campo>
      <SelectorSistema valor={configuracion.sistema} alCambiar={(sistema) => alCambiar({ sistema })} ayuda="Proyecto de soporte con ese nombre." />
      <Campo etiqueta="Tipo">
        <Selector value={configuracion.tipo ?? ''} onChange={(evento) => alCambiar({ tipo: evento.target.value })}>
          <option value="">Todos</option>
          {tiposTicket.map((tipo: TipoTicket) => (
            <option key={tipo} value={tipo}>
              {etiquetaTipo[tipo]}
            </option>
          ))}
        </Selector>
      </Campo>
      <Campo etiqueta="Contiene el texto">
        <Entrada value={configuracion.texto ?? ''} maxLength={100} onChange={(evento) => alCambiar({ texto: evento.target.value })} placeholder="Asunto o número" />
      </Campo>
    </div>
  );
}

function OpcionesTareas({ configuracion, alCambiar }: PropiedadesOpciones) {
  const [proyectos, setProyectos] = useState<ProyectoDto[]>([]);
  useEffect(() => {
    apiProyectos.listar().then(setProyectos).catch(() => setProyectos([]));
  }, []);
  const estados = (configuracion.estados ?? 'Pendiente, EnProgreso').split(',').map((estado) => estado.trim());
  const alternar = (estado: string) =>
    alCambiar({ estados: (estados.includes(estado) ? estados.filter((actual) => actual !== estado) : [...estados, estado]).filter(Boolean).join(', ') });
  return (
    <>
      <Campo etiqueta="Proyecto">
        <Selector autoFocus value={configuracion.proyecto ?? ''} onChange={(evento) => alCambiar({ proyecto: evento.target.value })}>
          <option value="">Elige un proyecto…</option>
          {proyectos.map((proyecto) => (
            <option key={proyecto.id} value={proyecto.clavePrefijo}>
              {proyecto.nombre} ({proyecto.clavePrefijo})
            </option>
          ))}
        </Selector>
      </Campo>
      <SelectorEtiqueta valor={configuracion.etiqueta} alCambiar={(etiqueta) => alCambiar({ etiqueta })} />
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">Estados</span>
        <div className="flex flex-wrap gap-1.5">
          {estadosTarea.map((estado) => (
            <button
              key={estado}
              type="button"
              aria-pressed={estados.includes(estado)}
              onClick={() => alternar(estado)}
              className={unirClases(
                'h-7 rounded-full border px-2.5 text-xs font-medium transition-colors',
                estados.includes(estado) ? 'border-violet-300 bg-violet-50 text-violet-800' : 'border-borde text-texto-2 hover:bg-superficie-2',
              )}
            >
              {etiquetaEstadoTarea[estado]}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function OpcionesDocumentos({ configuracion, alCambiar }: PropiedadesOpciones) {
  const [estructura, setEstructura] = useState<EstructuraDocumentosDto | null>(null);
  useEffect(() => {
    apiDocumentos.estructura().then(setEstructura).catch(() => setEstructura(null));
  }, []);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Campo etiqueta="Etiqueta">
        <Selector value={configuracion.etiqueta ?? ''} onChange={(evento) => alCambiar({ etiqueta: evento.target.value })}>
          <option value="">Cualquiera</option>
          {estructura?.etiquetas.map((etiqueta) => (
            <option key={etiqueta.id} value={etiqueta.nombre}>
              {etiqueta.nombre} ({etiqueta.totalDocumentos})
            </option>
          ))}
        </Selector>
      </Campo>
      <Campo etiqueta="Carpeta">
        <Selector value={configuracion.carpeta ?? ''} onChange={(evento) => alCambiar({ carpeta: evento.target.value })}>
          <option value="">Cualquiera</option>
          {estructura?.carpetas.map((carpeta) => (
            <option key={carpeta.id} value={carpeta.nombre}>
              {carpeta.nombre} ({carpeta.totalDocumentos})
            </option>
          ))}
        </Selector>
      </Campo>
    </div>
  );
}

function OpcionesFlujos({ configuracion, alCambiar }: PropiedadesOpciones) {
  return (
    <SelectorSistema
      valor={configuracion.sistema}
      alCambiar={(sistema) => alCambiar({ sistema })}
      ayuda="Si también es un proyecto de soporte, el bloque muestra sus tickets abiertos."
    />
  );
}
