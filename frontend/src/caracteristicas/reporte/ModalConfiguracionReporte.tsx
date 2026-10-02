import { useEffect, useState, type FormEvent } from 'react';
import { Archive, ArchiveRestore, Check, Plus, Trash2 } from 'lucide-react';
import { apiProyectos, apiReporte } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import type { ProyectoDto, TableroReporteDto } from '../../servicios/tipos';
import { Modal } from '../../componentes/ui/Modal';
import { Boton, BotonIcono, Campo, Entrada, Insignia, unirClases } from '../../componentes/ui/primitivos';
import { usarConfirmacion } from '../../componentes/ui/DialogoConfirmacion';
import { recargarTableros, usarTablerosReporte } from './tablerosReporte';

/** Catálogo de tableros de Trello y nombre del ejecutor que va en el Excel. */
export function ModalConfiguracionReporte({
  abierto,
  alCerrar,
  ejecutor,
  alCambiarEjecutor,
}: {
  abierto: boolean;
  alCerrar: () => void;
  ejecutor: string;
  alCambiarEjecutor: (nombre: string) => void;
}) {
  const tableros = usarTablerosReporte();
  const [proyectos, setProyectos] = useState<ProyectoDto[]>([]);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [proyectoNuevo, setProyectoNuevo] = useState('');
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    apiProyectos.listar().then(setProyectos).catch(() => setProyectos([]));
    void recargarTableros().catch(() => undefined);
  }, [abierto]);

  async function crear(evento: FormEvent) {
    evento.preventDefault();
    if (!nombreNuevo.trim()) return;
    setCreando(true);
    try {
      await apiReporte.crearTablero({ nombre: nombreNuevo.trim(), proyectoId: proyectoNuevo || null });
      setNombreNuevo('');
      setProyectoNuevo('');
      await recargarTableros();
    } catch (error) {
      notificar.error('No se pudo crear el tablero', error);
    } finally {
      setCreando(false);
    }
  }

  return (
    <Modal abierto={abierto} alCerrar={alCerrar} titulo="Configurar reporte" ancho="lg" pie={<Boton onClick={alCerrar}>Listo</Boton>}>
      <div className="flex flex-col gap-6 pb-2">
        <Campo etiqueta="Ejecutor de la tarea" ayuda="Tu nombre tal como va en la columna EJECUTOR DE LA TAREA.">
          <Entrada value={ejecutor} maxLength={150} onChange={(evento) => alCambiarEjecutor(evento.target.value)} />
        </Campo>

        <section className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-semibold">Tableros de Trello</h3>
            <p className="text-xs text-texto-2">
              Asociar un proyecto es opcional: las actividades con una tarea de ese proyecto lo sugieren solas.
            </p>
          </div>

          <form onSubmit={crear} className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-borde-fuerte p-3">
            <Campo etiqueta="Nuevo tablero" className="min-w-48 flex-1">
              <Entrada value={nombreNuevo} maxLength={150} placeholder="Sygnus Cremil" onChange={(evento) => setNombreNuevo(evento.target.value)} />
            </Campo>
            <SelectorProyecto proyectos={proyectos} valor={proyectoNuevo} alCambiar={setProyectoNuevo} />
            <Boton type="submit" icono={Plus} cargando={creando} disabled={!nombreNuevo.trim()}>
              Añadir
            </Boton>
          </form>

          {tableros && tableros.length > 0 && (
            <ul className="flex flex-col divide-y divide-borde rounded-xl border border-borde">
              {tableros.map((tablero) => (
                <FilaTablero key={tablero.id} tablero={tablero} proyectos={proyectos} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}

function SelectorProyecto({ proyectos, valor, alCambiar }: { proyectos: ProyectoDto[]; valor: string; alCambiar: (id: string) => void }) {
  return (
    <select
      value={valor}
      onChange={(evento) => alCambiar(evento.target.value)}
      aria-label="Proyecto asociado"
      className="h-9 max-w-48 rounded-lg border border-borde bg-superficie px-2 text-sm shadow-tarjeta focus:border-acento focus:outline-none"
    >
      <option value="">Sin proyecto</option>
      {proyectos.map((proyecto) => (
        <option key={proyecto.id} value={proyecto.id}>
          {proyecto.nombre}
        </option>
      ))}
    </select>
  );
}

function FilaTablero({ tablero, proyectos }: { tablero: TableroReporteDto; proyectos: ProyectoDto[] }) {
  const confirmar = usarConfirmacion();
  const [nombre, setNombre] = useState(tablero.nombre);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => setNombre(tablero.nombre), [tablero.nombre]);

  async function guardar(cambios: Partial<{ nombre: string; proyectoId: string | null; estaArchivado: boolean }>) {
    setGuardando(true);
    try {
      await apiReporte.actualizarTablero(tablero.id, {
        nombre: cambios.nombre ?? tablero.nombre,
        proyectoId: cambios.proyectoId !== undefined ? cambios.proyectoId : tablero.proyectoId,
        estaArchivado: cambios.estaArchivado ?? tablero.estaArchivado,
      });
      await recargarTableros();
    } catch (error) {
      notificar.error('No se pudo guardar el tablero', error);
      setNombre(tablero.nombre);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    const aceptado = await confirmar({ titulo: 'Eliminar tablero', descripcion: `Se eliminará "${tablero.nombre}".`, textoConfirmar: 'Eliminar', peligrosa: true });
    if (!aceptado) return;
    try {
      await apiReporte.eliminarTablero(tablero.id);
      await recargarTableros();
    } catch (error) {
      notificar.error('No se pudo eliminar', error);
    }
  }

  const nombreCambiado = nombre.trim() && nombre.trim() !== tablero.nombre;

  return (
    <li className={unirClases('flex flex-wrap items-center gap-2 px-3 py-2', tablero.estaArchivado && 'bg-superficie-2/60')}>
      <input
        value={nombre}
        maxLength={150}
        onChange={(evento) => setNombre(evento.target.value)}
        onBlur={() => nombreCambiado && void guardar({ nombre: nombre.trim() })}
        onKeyDown={(evento) => evento.key === 'Enter' && evento.currentTarget.blur()}
        aria-label="Nombre del tablero"
        className={unirClases('h-8 min-w-40 flex-1 rounded-md bg-transparent px-2 text-sm hover:bg-superficie-2 focus:bg-superficie-2 focus:outline-none', tablero.estaArchivado && 'text-texto-3')}
      />
      {nombreCambiado && <Check className="size-4 text-texto-3" aria-label="Pulsa Enter para guardar" />}
      <SelectorProyecto proyectos={proyectos} valor={tablero.proyectoId ?? ''} alCambiar={(id) => void guardar({ proyectoId: id || null })} />
      <Insignia tono="neutro">{tablero.actividades} act.</Insignia>
      {tablero.estaArchivado && <Insignia tono="aviso">Archivado</Insignia>}
      <BotonIcono
        icono={tablero.estaArchivado ? ArchiveRestore : Archive}
        etiqueta={tablero.estaArchivado ? 'Restaurar' : 'Archivar (deja de ofrecerse al registrar)'}
        tamano="sm"
        disabled={guardando}
        onClick={() => void guardar({ estaArchivado: !tablero.estaArchivado })}
      />
      {tablero.actividades === 0 && <BotonIcono icono={Trash2} etiqueta="Eliminar" tamano="sm" onClick={() => void eliminar()} className="hover:text-peligro" />}
    </li>
  );
}
