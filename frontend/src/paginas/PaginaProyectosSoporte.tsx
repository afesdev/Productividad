import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FolderGit2, FolderKanban, LifeBuoy, Pencil, Plus, Trash2 } from 'lucide-react';
import { apiProyectosSoporte, type DatosProyectoSoporte } from '../servicios/api';
import { obtenerMensajeError } from '../servicios/clienteApi';
import { notificar } from '../servicios/notificaciones';
import type { ColorPaleta, ProyectoSoporteDto } from '../servicios/tipos';
import { coloresPaleta, paleta } from '../caracteristicas/documentos/paleta';
import { usarConfirmacion } from '../componentes/ui/DialogoConfirmacion';
import { Modal } from '../componentes/ui/Modal';
import { AreaTexto, Boton, BotonIcono, Campo, Casilla, EncabezadoPagina, EstadoVacio, Entrada, Esqueleto, MensajeError, unirClases } from '../componentes/ui/primitivos';

/** Catálogo de proyectos (categorías) de los tickets: nombre, color pastel, descripción y sus repositorios. */
export function PaginaProyectosSoporte() {
  const confirmar = usarConfirmacion();
  const [proyectos, setProyectos] = useState<ProyectoSoporteDto[] | null>(null);
  const [edicion, setEdicion] = useState<ProyectoSoporteDto | 'nuevo' | null>(null);

  const recargar = useCallback(async () => {
    try {
      setProyectos(await apiProyectosSoporte.listar(true));
    } catch (errorCarga) {
      notificar.error('No se pudieron cargar los proyectos', errorCarga);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  async function eliminar(proyecto: ProyectoSoporteDto) {
    const confirmado = await confirmar({
      titulo: `Eliminar "${proyecto.nombre}"`,
      descripcion: `Se quitará de ${proyecto.totalTickets === 1 ? '1 ticket' : `${proyecto.totalTickets} tickets`} y sus repositorios quedarán sin proyecto. Los tickets y repositorios no se borran.`,
      textoConfirmar: 'Eliminar proyecto',
      peligrosa: true,
    });
    if (!confirmado) return;
    try {
      await apiProyectosSoporte.eliminar(proyecto.id);
      notificar.exito('Proyecto eliminado', proyecto.nombre);
      await recargar();
    } catch (errorEliminacion) {
      notificar.error('No se pudo eliminar', errorEliminacion);
    }
  }

  return (
    <>
      <Link to="/tickets" className="mb-3 inline-flex items-center gap-1.5 text-sm text-texto-2 hover:text-texto">
        <ArrowLeft className="size-4" />
        Tickets
      </Link>
      <EncabezadoPagina
        titulo="Proyectos"
        descripcion="Categorías para clasificar los tickets. Un ticket puede afectar a varios proyectos y cada proyecto agrupa sus repositorios."
        acciones={
          <Boton icono={Plus} onClick={() => setEdicion('nuevo')}>
            Nuevo proyecto
          </Boton>
        }
      />

      {proyectos === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((indice) => (
            <Esqueleto key={indice} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : proyectos.length === 0 ? (
        <EstadoVacio
          icono={FolderKanban}
          titulo="Sin proyectos"
          descripcion="Crea un proyecto por aplicación o sistema (Portal web, API, App móvil…) y asígnalos a los tickets."
          accion={
            <Boton icono={Plus} onClick={() => setEdicion('nuevo')}>
              Nuevo proyecto
            </Boton>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {proyectos.map((proyecto) => {
            const tono = paleta[proyecto.color] ?? paleta.violeta;
            return (
              <li
                key={proyecto.id}
                className={unirClases('group flex flex-col overflow-hidden rounded-2xl border border-borde bg-superficie transition hover:border-borde-fuerte', !proyecto.estaActivo && 'opacity-60')}
              >
                <div className={unirClases('flex items-start justify-between gap-3 bg-gradient-to-br px-5 pb-4 pt-5', tono.portada)}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-superficie/80 shadow-tarjeta">
                      <FolderKanban className={unirClases('size-5', tono.icono)} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold">{proyecto.nombre}</h2>
                      {!proyecto.estaActivo && <p className="text-xs text-texto-2">Inactivo</p>}
                    </div>
                  </div>
                  <span className="flex rounded-lg bg-superficie/80 opacity-0 shadow-tarjeta transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <BotonIcono icono={Pencil} etiqueta={`Editar ${proyecto.nombre}`} tamano="sm" onClick={() => setEdicion(proyecto)} />
                    <BotonIcono icono={Trash2} etiqueta={`Eliminar ${proyecto.nombre}`} tamano="sm" className="hover:text-peligro" onClick={() => void eliminar(proyecto)} />
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-3 px-5 py-4">
                  {proyecto.descripcion && <p className="line-clamp-2 text-sm text-texto-2">{proyecto.descripcion}</p>}
                  <Link to={`/tickets?vista=Todos&proyecto=${proyecto.id}`} className="inline-flex items-center gap-1.5 self-start text-sm hover:underline">
                    <LifeBuoy className="size-4 text-texto-3" />
                    <span className="font-medium tabular-nums">{proyecto.ticketsAbiertos}</span>
                    <span className="text-texto-2">abiertos</span>
                    <span className="text-texto-3">· {proyecto.totalTickets} en total</span>
                  </Link>
                  <div className="mt-auto flex flex-wrap gap-1.5 border-t border-borde pt-3">
                    {proyecto.repositorios.length === 0 ? (
                      <Link to="/tickets/repositorios" className="text-xs text-texto-3 hover:text-texto-2 hover:underline">
                        Sin repositorios · asígnalos desde Repositorios
                      </Link>
                    ) : (
                      proyecto.repositorios.map((repositorio) => (
                        <span key={repositorio.id} title={repositorio.nombreCompleto} className="inline-flex items-center gap-1 rounded-md bg-superficie-2 px-1.5 py-0.5 font-mono text-[11px] text-texto-2">
                          <FolderGit2 className="size-3" />
                          {repositorio.nombre}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ModalProyecto
        edicion={edicion}
        alCerrar={() => setEdicion(null)}
        alGuardar={async () => {
          setEdicion(null);
          await recargar();
        }}
      />
    </>
  );
}

function ModalProyecto({ edicion, alCerrar, alGuardar }: { edicion: ProyectoSoporteDto | 'nuevo' | null; alCerrar: () => void; alGuardar: () => Promise<void> }) {
  const [datos, setDatos] = useState<DatosProyectoSoporte>({ nombre: '', descripcion: '', color: 'violeta', estaActivo: true });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!edicion) return;
    setError(null);
    setDatos(
      edicion === 'nuevo'
        ? { nombre: '', descripcion: '', color: 'violeta', estaActivo: true }
        : { nombre: edicion.nombre, descripcion: edicion.descripcion ?? '', color: edicion.color, estaActivo: edicion.estaActivo },
    );
  }, [edicion]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const cuerpo = { ...datos, nombre: datos.nombre.trim(), descripcion: datos.descripcion?.trim() || null };
      if (edicion === 'nuevo') await apiProyectosSoporte.crear(cuerpo);
      else if (edicion) await apiProyectosSoporte.actualizar(edicion.id, cuerpo);
      notificar.exito('Proyecto guardado', cuerpo.nombre);
      await alGuardar();
    } catch (errorGuardado) {
      setError(obtenerMensajeError(errorGuardado));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      abierto={edicion !== null}
      alCerrar={alCerrar}
      titulo={edicion === 'nuevo' ? 'Nuevo proyecto' : 'Editar proyecto'}
      pie={
        <>
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="formulario-proyecto" cargando={enviando}>
            Guardar
          </Boton>
        </>
      }
    >
      <form id="formulario-proyecto" onSubmit={enviar} className="flex flex-col gap-4">
        <Campo etiqueta="Nombre">
          <Entrada required autoFocus maxLength={100} value={datos.nombre} onChange={(evento) => setDatos({ ...datos, nombre: evento.target.value })} placeholder="Portal de clientes" />
        </Campo>
        <Campo etiqueta="Color">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
            {coloresPaleta.map((color: ColorPaleta) => (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={datos.color === color}
                aria-label={paleta[color].nombre}
                title={paleta[color].nombre}
                onClick={() => setDatos({ ...datos, color })}
                className={unirClases(
                  'grid size-8 place-items-center rounded-full bg-gradient-to-br ring-offset-2 transition',
                  paleta[color].portada,
                  datos.color === color ? 'ring-2 ring-texto-2' : 'hover:ring-1 hover:ring-borde-fuerte',
                )}
              >
                <span className={unirClases('size-3 rounded-full', paleta[color].punto)} />
              </button>
            ))}
          </div>
        </Campo>
        <Campo etiqueta="Descripción (opcional)">
          <AreaTexto maxLength={500} rows={3} value={datos.descripcion ?? ''} onChange={(evento) => setDatos({ ...datos, descripcion: evento.target.value })} placeholder="Qué abarca: módulos, cliente, responsables…" />
        </Campo>
        {edicion !== 'nuevo' && (
          <Casilla etiqueta="Activo (aparece al crear y clasificar tickets)" checked={datos.estaActivo} onChange={(evento) => setDatos({ ...datos, estaActivo: evento.target.checked })} />
        )}
        <MensajeError mensaje={error} />
      </form>
    </Modal>
  );
}
