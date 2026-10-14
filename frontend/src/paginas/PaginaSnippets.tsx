import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Braces, Code2, Copy, ListFilter, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { apiSnippets, type DatosSnippet } from '../servicios/api';
import { formatearRelativo } from '../servicios/formato';
import { notificar } from '../servicios/notificaciones';
import type { EtiquetaDto, SnippetDto } from '../servicios/tipos';
import { Boton, BotonIcono, Campo, EncabezadoPagina, Entrada, EstadoVacio, Esqueleto, Selector, unirClases } from '../componentes/ui/primitivos';
import { usarConfirmacion } from '../componentes/ui/DialogoConfirmacion';
import { ChipEtiqueta, SelectorEtiquetas } from '../caracteristicas/documentos/SelectorEtiquetas';
import { recargarCatalogoEtiquetas, usarCatalogoEtiquetas } from '../caracteristicas/documentos/catalogoEtiquetas';
import { VistaSnippet } from '../caracteristicas/snippets/VistaSnippet';
import { etiquetaLenguaje, lenguajesSnippet, variablesDe } from '../caracteristicas/snippets/utilidadesSnippets';

type Modo = { tipo: 'ver' } | { tipo: 'nuevo'; base?: SnippetDto } | { tipo: 'editar'; snippet: SnippetDto };

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Biblioteca de snippets: consultas, comandos y fragmentos reutilizables con variables {{nombre}}. La lista se filtra
 * en el navegador (son pocos y así la búsqueda es instantánea); /snippets?snippet=id abre uno.
 */
export function PaginaSnippets() {
  const confirmar = usarConfirmacion();
  const catalogo = usarCatalogoEtiquetas();
  const [parametros, setParametros] = useSearchParams();
  const seleccionadoId = parametros.get('snippet');
  const [snippets, setSnippets] = useState<SnippetDto[] | null>(null);
  const [texto, setTexto] = useState('');
  const [lenguaje, setLenguaje] = useState('');
  const [etiquetaId, setEtiquetaId] = useState('');
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [modo, setModo] = useState<Modo>({ tipo: 'ver' });

  useEffect(() => {
    apiSnippets
      .listar()
      .then(setSnippets)
      .catch((error) => {
        notificar.error('No se pudieron cargar los snippets', error);
        setSnippets([]);
      });
  }, []);

  const visibles = useMemo(() => {
    const consulta = normalizar(texto.trim());
    return (snippets ?? []).filter(
      (snippet) =>
        (!lenguaje || snippet.lenguaje === lenguaje) &&
        (!etiquetaId || snippet.etiquetas.some((etiqueta) => etiqueta.id === etiquetaId)) &&
        (!soloFavoritos || snippet.esFavorito) &&
        (!consulta || normalizar(`${snippet.titulo} ${snippet.descripcion ?? ''} ${snippet.contenido} ${snippet.etiquetas.map((etiqueta) => etiqueta.nombre).join(' ')}`).includes(consulta)),
    );
  }, [snippets, texto, lenguaje, etiquetaId, soloFavoritos]);

  const lenguajesUsados = useMemo(() => [...new Set((snippets ?? []).map((snippet) => snippet.lenguaje))].sort(), [snippets]);
  const etiquetasUsadas = useMemo(() => {
    const porId = new Map<string, EtiquetaDto>();
    for (const snippet of snippets ?? []) for (const etiqueta of snippet.etiquetas) porId.set(etiqueta.id, etiqueta);
    return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [snippets]);

  const seleccionado = snippets?.find((snippet) => snippet.id === seleccionadoId) ?? (seleccionadoId ? null : visibles[0] ?? null);

  function seleccionar(id: string | null) {
    setModo({ tipo: 'ver' });
    setParametros(id ? { snippet: id } : {}, { replace: true });
  }

  function reemplazar(snippet: SnippetDto) {
    setSnippets((actuales) => {
      const lista = actuales ?? [];
      return lista.some((otro) => otro.id === snippet.id) ? lista.map((otro) => (otro.id === snippet.id ? snippet : otro)) : [snippet, ...lista];
    });
  }

  async function guardar(datos: DatosSnippet) {
    try {
      const guardado = modo.tipo === 'editar' ? await apiSnippets.actualizar(modo.snippet.id, datos) : await apiSnippets.crear(datos);
      reemplazar(guardado);
      notificar.exito(modo.tipo === 'editar' ? 'Snippet guardado' : 'Snippet creado', guardado.titulo);
      seleccionar(guardado.id);
    } catch (error) {
      notificar.error('No se pudo guardar', error);
    }
  }

  async function alternarFavorito(snippet: SnippetDto) {
    try {
      const esFavorito = await apiSnippets.alternarFavorito(snippet.id);
      reemplazar({ ...snippet, esFavorito });
    } catch (error) {
      notificar.error('No se pudo marcar', error);
    }
  }

  async function eliminar(snippet: SnippetDto) {
    const aceptado = await confirmar({ titulo: `¿Eliminar "${snippet.titulo}"?`, descripcion: 'No se puede deshacer.', textoConfirmar: 'Eliminar', peligrosa: true });
    if (!aceptado) return;
    try {
      await apiSnippets.eliminar(snippet.id);
      setSnippets((actuales) => actuales?.filter((otro) => otro.id !== snippet.id) ?? null);
      seleccionar(null);
      notificar.exito('Snippet eliminado', snippet.titulo);
    } catch (error) {
      notificar.error('No se pudo eliminar', error);
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Snippets"
        descripcion="Consultas, comandos y fragmentos que reutilizas. Usa {{variable}} para los valores que cambian."
        acciones={
          <Boton icono={Plus} onClick={() => setModo({ tipo: 'nuevo' })}>
            Nuevo snippet
          </Boton>
        }
      />

      {snippets === null ? (
        <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <Esqueleto className="h-96 rounded-xl" />
          <Esqueleto className="h-96 rounded-xl" />
        </div>
      ) : snippets.length === 0 && modo.tipo === 'ver' ? (
        <EstadoVacio
          icono={Braces}
          titulo="Aún no tienes snippets"
          descripcion="Guarda aquí la consulta SQL que siempre buscas, el comando para reiniciar un servicio o cualquier fragmento que repitas."
          accion={
            <Boton icono={Plus} onClick={() => setModo({ tipo: 'nuevo' })}>
              Crear el primero
            </Boton>
          }
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
          {/* ---------- Lista ---------- */}
          <section className="flex flex-col gap-2 rounded-xl border border-borde bg-superficie p-3 shadow-tarjeta lg:sticky lg:top-20">
            <label className="relative">
              <ListFilter className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-texto-3" />
              <input
                value={texto}
                onChange={(evento) => setTexto(evento.target.value)}
                placeholder="Buscar en título o contenido…"
                aria-label="Buscar snippets"
                className="h-9 w-full rounded-lg border border-borde bg-superficie pl-8 pr-3 text-sm placeholder:text-texto-3 focus:border-acento focus:outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-1">
              <Chip activo={!lenguaje && !soloFavoritos} alPulsar={() => {
                  setLenguaje('');
                  setSoloFavoritos(false);
                }}>
                Todos
              </Chip>
              <Chip activo={soloFavoritos} alPulsar={() => setSoloFavoritos((actual) => !actual)}>
                <Star className="size-3" /> Favoritos
              </Chip>
              {lenguajesUsados.map((valor) => (
                <Chip key={valor} activo={lenguaje === valor} alPulsar={() => setLenguaje((actual) => (actual === valor ? '' : valor))}>
                  {etiquetaLenguaje(valor)}
                </Chip>
              ))}
            </div>
            {etiquetasUsadas.length > 0 && (
              <Selector value={etiquetaId} onChange={(evento) => setEtiquetaId(evento.target.value)} aria-label="Filtrar por etiqueta" className="h-8 text-sm">
                <option value="">Todas las etiquetas</option>
                {etiquetasUsadas.map((etiqueta) => (
                  <option key={etiqueta.id} value={etiqueta.id}>
                    #{etiqueta.nombre}
                  </option>
                ))}
              </Selector>
            )}
            <ul className="-mx-1 flex max-h-[calc(100vh-20rem)] flex-col overflow-y-auto">
              {visibles.map((snippet) => (
                <li key={snippet.id}>
                  <button
                    type="button"
                    onClick={() => seleccionar(snippet.id)}
                    className={unirClases(
                      'flex w-full min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                      seleccionado?.id === snippet.id && modo.tipo === 'ver' ? 'bg-violet-50 text-violet-950' : 'hover:bg-superficie-2',
                    )}
                  >
                    <Code2 className="size-4 shrink-0 text-texto-3" />
                    <span className="min-w-0 flex-1 truncate font-medium">{snippet.titulo}</span>
                    {snippet.esFavorito && <Star className="size-3.5 shrink-0 fill-amber-300 text-amber-400" aria-label="Favorito" />}
                    <span className="shrink-0 rounded bg-superficie-2 px-1.5 text-[10px] font-medium uppercase text-texto-2">{etiquetaLenguaje(snippet.lenguaje)}</span>
                  </button>
                </li>
              ))}
              {visibles.length === 0 && <li className="px-2 py-6 text-center text-sm text-texto-3">Nada coincide.</li>}
            </ul>
          </section>

          {/* ---------- Detalle o formulario ---------- */}
          <section className="min-w-0 rounded-xl border border-borde bg-superficie p-5 shadow-tarjeta">
            {modo.tipo !== 'ver' ? (
              <FormularioSnippet
                key={modo.tipo === 'editar' ? modo.snippet.id : 'nuevo'}
                inicial={modo.tipo === 'editar' ? modo.snippet : modo.base}
                editando={modo.tipo === 'editar'}
                catalogo={catalogo}
                alGuardar={guardar}
                alCancelar={() => setModo({ tipo: 'ver' })}
              />
            ) : seleccionado ? (
              <div className="flex flex-col gap-4">
                <header className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold">{seleccionado.titulo}</h2>
                    <p className="mt-0.5 text-xs text-texto-3">
                      {etiquetaLenguaje(seleccionado.lenguaje)} · usado {seleccionado.usos === 1 ? '1 vez' : `${seleccionado.usos} veces`}
                      {seleccionado.fechaUltimoUso && ` · último uso ${formatearRelativo(seleccionado.fechaUltimoUso)}`}
                    </p>
                  </div>
                  <BotonIcono
                    icono={Star}
                    etiqueta={seleccionado.esFavorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
                    className={seleccionado.esFavorito ? 'text-amber-400 [&_svg]:fill-amber-300' : undefined}
                    onClick={() => void alternarFavorito(seleccionado)}
                  />
                  <BotonIcono icono={Copy} etiqueta="Duplicar" onClick={() => setModo({ tipo: 'nuevo', base: { ...seleccionado, titulo: `${seleccionado.titulo} (copia)` } })} />
                  <BotonIcono icono={Pencil} etiqueta="Editar" onClick={() => setModo({ tipo: 'editar', snippet: seleccionado })} />
                  <BotonIcono icono={Trash2} etiqueta="Eliminar" className="hover:text-peligro" onClick={() => void eliminar(seleccionado)} />
                </header>
                {seleccionado.descripcion && <p className="whitespace-pre-line text-sm text-texto-2">{seleccionado.descripcion}</p>}
                {seleccionado.etiquetas.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {seleccionado.etiquetas.map((etiqueta) => (
                      <ChipEtiqueta key={etiqueta.id} etiqueta={etiqueta} />
                    ))}
                  </div>
                )}
                <VistaSnippet snippet={seleccionado} />
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-texto-3">Elige un snippet de la lista.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function Chip({ activo, alPulsar, children }: { activo: boolean; alPulsar: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-pressed={activo}
      className={unirClases(
        'inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs font-medium transition-colors',
        activo ? 'border-violet-300 bg-violet-50 text-violet-800' : 'border-borde text-texto-2 hover:bg-superficie-2',
      )}
    >
      {children}
    </button>
  );
}

// ---------- Formulario ----------

function FormularioSnippet({
  inicial,
  editando,
  catalogo,
  alGuardar,
  alCancelar,
}: {
  inicial?: SnippetDto;
  editando: boolean;
  catalogo: ReturnType<typeof usarCatalogoEtiquetas>;
  alGuardar: (datos: DatosSnippet) => Promise<void>;
  alCancelar: () => void;
}) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '');
  const [lenguaje, setLenguaje] = useState(inicial?.lenguaje ?? 'sql');
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '');
  const [contenido, setContenido] = useState(inicial?.contenido ?? '');
  const [etiquetas, setEtiquetas] = useState<EtiquetaDto[]>(inicial?.etiquetas ?? []);
  const [guardando, setGuardando] = useState(false);
  const variables = variablesDe(contenido);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!titulo.trim() || !contenido.trim()) return;
    setGuardando(true);
    await alGuardar({ titulo: titulo.trim(), lenguaje, descripcion: descripcion.trim() || null, contenido, etiquetaIds: etiquetas.map((etiqueta) => etiqueta.id) });
    setGuardando(false);
  }

  /** Tab inserta dos espacios en vez de saltar de campo (es código). */
  function alPresionarTecla(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key !== 'Tab' || evento.shiftKey) return;
    evento.preventDefault();
    const campo = evento.currentTarget;
    const { selectionStart, selectionEnd } = campo;
    setContenido(`${contenido.slice(0, selectionStart)}  ${contenido.slice(selectionEnd)}`);
    requestAnimationFrame(() => campo.setSelectionRange(selectionStart + 2, selectionStart + 2));
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{editando ? 'Editar snippet' : 'Nuevo snippet'}</h2>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Campo etiqueta="Título">
          <Entrada required autoFocus maxLength={200} value={titulo} onChange={(evento) => setTitulo(evento.target.value)} placeholder="Pagos de un cliente" />
        </Campo>
        <Campo etiqueta="Lenguaje">
          <Selector value={lenguaje} onChange={(evento) => setLenguaje(evento.target.value)}>
            {lenguajesSnippet.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </Selector>
        </Campo>
      </div>
      <Campo etiqueta="Contenido" ayuda={variables.length ? `Variables: ${variables.map((variable) => `{{${variable}}}`).join(', ')}` : 'Escribe {{nombre}} para los valores que cambian cada vez.'}>
        <textarea
          required
          value={contenido}
          maxLength={50_000}
          onChange={(evento) => setContenido(evento.target.value)}
          onKeyDown={alPresionarTecla}
          spellCheck={false}
          rows={12}
          placeholder={'SELECT *\n  FROM Pagos\n WHERE ClienteId = {{clienteId}}'}
          className="min-h-48 resize-y rounded-lg border border-borde bg-superficie-2 px-3 py-2.5 font-mono text-[12.5px] leading-relaxed focus:border-acento focus:outline-none"
        />
      </Campo>
      <Campo etiqueta="Descripción (opcional)">
        <Entrada maxLength={1000} value={descripcion} onChange={(evento) => setDescripcion(evento.target.value)} placeholder="Para qué sirve o cuándo usarlo" />
      </Campo>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">Etiquetas</span>
        <SelectorEtiquetas
          asignar={async (ids) => {
            // Aún sin guardar: se resuelven contra el catálogo (recargándolo si se acaba de crear una).
            let disponibles = catalogo;
            if (ids.some((id) => !disponibles.some((etiqueta) => etiqueta.id === id))) disponibles = await recargarCatalogoEtiquetas();
            const elegidas = ids.flatMap((id) => disponibles.filter((etiqueta) => etiqueta.id === id).map(({ id: idEtiqueta, nombre, color }) => ({ id: idEtiqueta, nombre, color })));
            setEtiquetas(elegidas);
            return elegidas;
          }}
          asignadas={etiquetas}
          disponibles={catalogo}
          alCambiar={() => undefined}
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-borde pt-4">
        <Boton variante="secundario" onClick={alCancelar}>
          Cancelar
        </Boton>
        <Boton type="submit" cargando={guardando} disabled={!titulo.trim() || !contenido.trim()}>
          Guardar
        </Boton>
      </div>
    </form>
  );
}
