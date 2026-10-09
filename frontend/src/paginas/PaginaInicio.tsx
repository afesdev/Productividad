import { useEffect, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, GripVertical, Plus, RotateCcw, Settings2, X } from 'lucide-react';
import { apiPreferencias } from '../servicios/api';
import { notificar } from '../servicios/notificaciones';
import { Boton, BotonIcono, Esqueleto, unirClases } from '../componentes/ui/primitivos';
import { usarSesion } from '../caracteristicas/autenticacion/ContextoSesion';
import {
  catalogoWidgets,
  ClavePreferenciaInicio,
  configuracionPorDefecto,
  idsWidget,
  normalizarConfiguracion,
  type ConfiguracionInicio,
  type IdWidget,
} from '../caracteristicas/inicio/configuracionInicio';
import { ContenidoWidget, enlaceWidget } from '../caracteristicas/inicio/Widgets';

const formatoFecha = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });

function saludo(hora: number) {
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Página de entrada: widgets de todos los módulos, configurables y guardados en el servidor (igual en cualquier equipo). */
export function PaginaInicio() {
  const { usuario } = usarSesion();
  const [configuracion, setConfiguracion] = useState<ConfiguracionInicio | null>(null);
  const [borrador, setBorrador] = useState<ConfiguracionInicio | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [arrastrando, setArrastrando] = useState<IdWidget | null>(null);

  useEffect(() => {
    apiPreferencias
      .obtener<ConfiguracionInicio>(ClavePreferenciaInicio)
      .then((guardada) => setConfiguracion(guardada ? normalizarConfiguracion(guardada) : configuracionPorDefecto()))
      .catch(() => setConfiguracion(configuracionPorDefecto()));
  }, []);

  const editando = borrador !== null;
  const visible = borrador ?? configuracion;
  const ocultos = visible ? idsWidget.filter((id) => !visible.widgets.some((widget) => widget.id === id)) : [];

  async function guardar() {
    if (!borrador) return;
    setGuardando(true);
    try {
      await apiPreferencias.guardar(ClavePreferenciaInicio, borrador);
      setConfiguracion(borrador);
      setBorrador(null);
      notificar.exito('Inicio guardado', 'Se verá igual en cualquier equipo.');
    } catch (error) {
      notificar.error('No se pudo guardar', error);
    } finally {
      setGuardando(false);
    }
  }

  const cambiarBorrador = (cambio: (actual: ConfiguracionInicio) => ConfiguracionInicio) => setBorrador((actual) => (actual ? cambio(actual) : actual));

  function soltarSobre(destino: IdWidget) {
    if (!arrastrando || arrastrando === destino) return;
    cambiarBorrador((actual) => {
      const widgets = [...actual.widgets];
      const origen = widgets.findIndex((widget) => widget.id === arrastrando);
      const indiceDestino = widgets.findIndex((widget) => widget.id === destino);
      const [movido] = widgets.splice(origen, 1);
      widgets.splice(indiceDestino, 0, movido);
      return { ...actual, widgets };
    });
  }

  const ahora = new Date();
  const nombre = usuario?.nombreCompleto?.split(' ')[0] ?? '';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {saludo(ahora.getHours())}
            {nombre && `, ${nombre}`}
          </h1>
          <p className="mt-1 text-sm capitalize text-texto-2">{formatoFecha.format(ahora)}</p>
        </div>
        {configuracion &&
          (editando ? (
            <div className="flex flex-wrap items-center gap-2">
              <Boton variante="fantasma" tamano="sm" icono={RotateCcw} onClick={() => setBorrador(configuracionPorDefecto())}>
                Restablecer
              </Boton>
              <Boton variante="secundario" tamano="sm" onClick={() => setBorrador(null)} disabled={guardando}>
                Cancelar
              </Boton>
              <Boton tamano="sm" icono={Check} cargando={guardando} onClick={() => void guardar()}>
                Listo
              </Boton>
            </div>
          ) : (
            <Boton variante="secundario" tamano="sm" icono={Settings2} onClick={() => setBorrador(configuracion)}>
              Personalizar
            </Boton>
          ))}
      </header>

      {editando && (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-violet-300 bg-violet-50/50 p-3">
          <p className="text-xs text-violet-900">Arrastra los widgets por ⋮⋮ para ordenarlos, cambia su ancho o quítalos. Añade los que quieras:</p>
          {ocultos.length === 0 ? (
            <p className="text-xs text-texto-3">Ya están todos en la página.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {ocultos.map((id) => {
                const { titulo, icono: Icono } = catalogoWidgets[id];
                return (
                  <button
                    key={id}
                    type="button"
                    title={catalogoWidgets[id].descripcion}
                    onClick={() => cambiarBorrador((actual) => ({ ...actual, widgets: [...actual.widgets, { id, ancho: catalogoWidgets[id].ancho }] }))}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-superficie px-2.5 text-xs font-medium text-violet-800 transition-colors hover:bg-violet-100"
                  >
                    <Plus className="size-3.5" />
                    <Icono className="size-3.5" />
                    {titulo}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!visible ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, indice) => (
            <Esqueleto key={indice} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : visible.widgets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-borde-fuerte px-6 py-12 text-center text-sm text-texto-2">
          No hay widgets. Pulsa <strong>Personalizar</strong> para añadir algunos.
        </div>
      ) : (
        <div className="grid grid-flow-dense gap-4 lg:grid-cols-2">
          {visible.widgets.map((widget) => {
            const { titulo, icono: Icono } = catalogoWidgets[widget.id];
            const enlace = enlaceWidget[widget.id];
            return (
              <section
                key={widget.id}
                draggable={editando}
                onDragStart={(evento: DragEvent) => {
                  setArrastrando(widget.id);
                  evento.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(evento) => editando && evento.preventDefault()}
                onDrop={(evento) => {
                  evento.preventDefault();
                  soltarSobre(widget.id);
                }}
                onDragEnd={() => setArrastrando(null)}
                className={unirClases(
                  'flex min-w-0 flex-col gap-3 rounded-2xl border border-borde bg-superficie p-4 shadow-tarjeta transition',
                  widget.ancho === 2 && 'lg:col-span-2',
                  editando && 'cursor-grab ring-1 ring-violet-200',
                  arrastrando === widget.id && 'opacity-40',
                )}
              >
                <div className="flex items-center gap-2">
                  {editando && <GripVertical className="size-4 shrink-0 text-texto-3" aria-hidden />}
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600">
                    <Icono className="size-4" />
                  </span>
                  <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{titulo}</h2>
                  {editando ? (
                    <>
                      <div className="hidden rounded-lg bg-superficie-2 p-0.5 text-xs lg:inline-flex" role="group" aria-label="Ancho">
                        {([1, 2] as const).map((ancho) => (
                          <button
                            key={ancho}
                            type="button"
                            aria-pressed={widget.ancho === ancho}
                            onClick={() =>
                              cambiarBorrador((actual) => ({
                                ...actual,
                                widgets: actual.widgets.map((existente) => (existente.id === widget.id ? { ...existente, ancho } : existente)),
                              }))
                            }
                            className={unirClases('h-6 rounded-md px-2 font-medium', widget.ancho === ancho ? 'bg-superficie text-texto shadow-tarjeta' : 'text-texto-2')}
                          >
                            {ancho === 1 ? 'Normal' : 'Ancho'}
                          </button>
                        ))}
                      </div>
                      <BotonIcono
                        icono={X}
                        etiqueta="Quitar widget"
                        tamano="sm"
                        onClick={() => cambiarBorrador((actual) => ({ ...actual, widgets: actual.widgets.filter((existente) => existente.id !== widget.id) }))}
                      />
                    </>
                  ) : (
                    enlace && (
                      <Link to={enlace} className="shrink-0 text-xs font-medium text-texto-3 transition-colors hover:text-violet-700">
                        Ver todo →
                      </Link>
                    )
                  )}
                </div>
                {/* En modo edición los widgets no se cargan: solo se ordenan. */}
                {editando ? (
                  <p className="text-xs text-texto-3">{catalogoWidgets[widget.id].descripcion}</p>
                ) : (
                  <div className="min-w-0">
                    <ContenidoWidget id={widget.id} />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
