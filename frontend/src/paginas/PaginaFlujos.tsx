import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Search, Trash2, Workflow, Plus } from 'lucide-react';
import { apiFlujos } from '../servicios/api';
import { notificar } from '../servicios/notificaciones';
import { formatearRelativo } from '../servicios/formato';
import type { FlujoResumenDto } from '../servicios/tipos';
import { Boton, Campo, EncabezadoPagina, Entrada, EstadoVacio, Esqueleto } from '../componentes/ui/primitivos';
import { Modal } from '../componentes/ui/Modal';
import { usarConfirmacion } from '../componentes/ui/DialogoConfirmacion';
import { MenuAcciones } from '../caracteristicas/documentos/MenuAcciones';
import { invalidarSistemas, usarSistemas } from '../componentes/bloquesVivos/sistemas';

const SinSistema = 'Sin sistema';

export function PaginaFlujos() {
  const navegar = useNavigate();
  const confirmar = usarConfirmacion();
  const [flujos, setFlujos] = useState<FlujoResumenDto[] | null>(null);
  const [busqueda, setBusqueda] = useState('');
  // Sugerencias unificadas: sistemas de otros flujos y proyectos de soporte de los tickets (mismo nombre = mismo sistema).
  const sistemas = usarSistemas()?.nombres ?? [];
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState({ titulo: '', sistema: '' });
  const [guardando, setGuardando] = useState(false);

  // La búsqueda llega al texto de los pasos (SP, vistas, endpoints), así que se hace en el servidor.
  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      apiFlujos
        .listar(busqueda.trim())
        .then(setFlujos)
        .catch((error) => {
          notificar.error('No se pudieron cargar los flujos', error);
          setFlujos([]);
        });
    }, busqueda ? 300 : 0);
    return () => window.clearTimeout(temporizador);
  }, [busqueda]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, FlujoResumenDto[]>();
    for (const flujo of flujos ?? []) {
      const clave = flujo.sistema ?? SinSistema;
      mapa.set(clave, [...(mapa.get(clave) ?? []), flujo]);
    }
    return [...mapa.entries()].sort(([a], [b]) => (a === SinSistema ? 1 : b === SinSistema ? -1 : a.localeCompare(b)));
  }, [flujos]);

  async function crear() {
    if (!nuevo.titulo.trim()) return;
    setGuardando(true);
    try {
      const id = await apiFlujos.crear({ titulo: nuevo.titulo.trim(), sistema: nuevo.sistema.trim() || null, descripcion: null });
      invalidarSistemas();
      navegar(`/flujos/${id}`);
    } catch (error) {
      notificar.error('No se pudo crear el flujo', error);
      setGuardando(false);
    }
  }

  async function duplicar(flujo: FlujoResumenDto) {
    try {
      const id = await apiFlujos.duplicar(flujo.id);
      navegar(`/flujos/${id}`);
    } catch (error) {
      notificar.error('No se pudo duplicar', error);
    }
  }

  async function eliminar(flujo: FlujoResumenDto) {
    const aceptado = await confirmar({ titulo: `¿Eliminar "${flujo.titulo}"?`, descripcion: 'Se borra el flujo con todos sus pasos.', textoConfirmar: 'Eliminar', peligrosa: true });
    if (!aceptado) return;
    try {
      await apiFlujos.eliminar(flujo.id);
      setFlujos((actuales) => actuales?.filter((existente) => existente.id !== flujo.id) ?? null);
      notificar.exito('Flujo eliminado');
    } catch (error) {
      notificar.error('No se pudo eliminar', error);
    }
  }

  function abrirCrear() {
    setNuevo({ titulo: '', sistema: '' });
    setCreando(true);
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Flujos"
        descripcion="Cómo funciona cada proceso: lo que hace el usuario, vistas, validaciones y procedimientos."
        acciones={
          <Boton icono={Plus} onClick={abrirCrear}>
            Nuevo flujo
          </Boton>
        }
      />

      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-3" />
        <Entrada value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar por título, sistema, SP, vista, endpoint…" className="h-9 pl-9" />
      </div>

      {flujos === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, indice) => (
            <Esqueleto key={indice} className="h-32" />
          ))}
        </div>
      ) : flujos.length === 0 ? (
        busqueda ? (
          <EstadoVacio icono={Search} titulo="Sin resultados" descripcion={`Ningún flujo contiene "${busqueda}".`} />
        ) : (
          <EstadoVacio
            icono={Workflow}
            titulo="Aún no hay flujos"
            descripcion="Documenta un proceso escribiendo sus pasos como texto, describiéndolo para que la IA lo arme o dibujándolo."
            accion={
              <Boton icono={Plus} onClick={abrirCrear}>
                Nuevo flujo
              </Boton>
            }
          />
        )
      ) : (
        <div className="flex flex-col gap-8">
          {grupos.map(([sistema, delSistema]) => (
            <section key={sistema} className="flex flex-col gap-3">
              <h2 className="text-xs font-medium uppercase tracking-wider text-texto-3">
                {sistema} <span className="tabular-nums">· {delSistema.length}</span>
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {delSistema.map((flujo) => (
                  <article key={flujo.id} className="group relative flex flex-col gap-2 rounded-xl border border-borde bg-superficie p-4 shadow-tarjeta transition hover:border-violet-200">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-500">
                        <Workflow className="size-4" />
                      </span>
                      <button type="button" onClick={() => navegar(`/flujos/${flujo.id}`)} className="min-w-0 flex-1 text-left">
                        <p className="line-clamp-2 text-sm font-semibold group-hover:text-violet-800">{flujo.titulo}</p>
                        {flujo.descripcion && <p className="mt-0.5 line-clamp-2 text-xs text-texto-2">{flujo.descripcion}</p>}
                      </button>
                      <MenuAcciones
                        acciones={[
                          { etiqueta: 'Duplicar', icono: Copy, alPulsar: () => void duplicar(flujo) },
                          { etiqueta: 'Eliminar', icono: Trash2, alPulsar: () => void eliminar(flujo), peligrosa: true, separadorAntes: true },
                        ]}
                      />
                    </div>
                    <p className="mt-auto text-xs text-texto-3">
                      {flujo.pasos} {flujo.pasos === 1 ? 'paso' : 'pasos'} · Editado {formatearRelativo(flujo.fechaActualizacion)}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal
        abierto={creando}
        alCerrar={() => setCreando(false)}
        titulo="Nuevo flujo"
        ancho="sm"
        pie={
          <>
            <Boton variante="secundario" onClick={() => setCreando(false)}>
              Cancelar
            </Boton>
            <Boton onClick={() => void crear()} cargando={guardando} disabled={!nuevo.titulo.trim()}>
              Crear
            </Boton>
          </>
        }
      >
        <div className="flex flex-col gap-3 pb-2">
          <Campo etiqueta="Nombre del proceso">
            <Entrada
              autoFocus
              value={nuevo.titulo}
              maxLength={200}
              placeholder="Generar certificado de consultas"
              onChange={(evento) => setNuevo({ ...nuevo, titulo: evento.target.value })}
              onKeyDown={(evento) => evento.key === 'Enter' && void crear()}
            />
          </Campo>
          <Campo etiqueta="Sistema" ayuda="Opcional. Agrupa los flujos en la lista.">
            <Entrada value={nuevo.sistema} maxLength={100} list="sistemas-nuevo-flujo" placeholder="Cremil" onChange={(evento) => setNuevo({ ...nuevo, sistema: evento.target.value })} />
          </Campo>
          <datalist id="sistemas-nuevo-flujo">
            {sistemas.map((opcion) => (
              <option key={opcion} value={opcion} />
            ))}
          </datalist>
        </div>
      </Modal>
    </>
  );
}
