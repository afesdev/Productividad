import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FolderGit2, GitBranch, GitFork, Pencil, Plus } from 'lucide-react';
import { apiProyectosSoporte, apiRepositorios, type DatosRepositorio } from '../servicios/api';
import { obtenerMensajeError } from '../servicios/clienteApi';
import { notificar } from '../servicios/notificaciones';
import type { ProyectoSoporteDto, RepositorioDto } from '../servicios/tipos';
import { Modal } from '../componentes/ui/Modal';
import { Boton, BotonIcono, Campo, Casilla, EncabezadoPagina, EstadoVacio, Entrada, Esqueleto, Insignia, MensajeError, Selector } from '../componentes/ui/primitivos';

export function PaginaRepositorios() {
  const [repositorios, setRepositorios] = useState<RepositorioDto[] | null>(null);
  const [edicion, setEdicion] = useState<RepositorioDto | 'nuevo' | null>(null);

  const recargar = useCallback(async () => {
    try {
      setRepositorios(await apiRepositorios.listar(true));
    } catch (errorCarga) {
      notificar.error('No se pudieron cargar los repositorios', errorCarga);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return (
    <>
      <Link to="/tickets" className="mb-3 inline-flex items-center gap-1.5 text-sm text-texto-2 hover:text-texto">
        <ArrowLeft className="size-4" />
        Tickets
      </Link>
      <EncabezadoPagina
        titulo="Repositorios de GitHub"
        descripcion="Repositorios donde se detectan las ramas y PRs de los tickets (solo lectura). Se valida en GitHub que existan el repositorio y sus ramas."
        acciones={
          <Boton icono={Plus} onClick={() => setEdicion('nuevo')}>
            Agregar repositorio
          </Boton>
        }
      />

      {repositorios === null ? (
        <Esqueleto className="h-32 rounded-xl" />
      ) : repositorios.length === 0 ? (
        <EstadoVacio
          icono={FolderGit2}
          titulo="Sin repositorios"
          descripcion="Registra el repositorio de tu aplicación para detectar las ramas y PRs de cada ticket."
          accion={
            <Boton icono={Plus} onClick={() => setEdicion('nuevo')}>
              Agregar repositorio
            </Boton>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {repositorios.map((repositorio) => (
            <section key={repositorio.id} className="rounded-xl border border-borde bg-superficie p-5 shadow-tarjeta">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    {repositorio.nombre}
                    {!repositorio.estaActivo && <Insignia>Inactivo</Insignia>}
                    {repositorio.nombreProyecto && <Insignia tono="acento">{repositorio.nombreProyecto}</Insignia>}
                  </p>
                  <a href={repositorio.urlWeb} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-texto-3 hover:text-texto hover:underline">
                    {repositorio.nombreCompleto}
                    <ExternalLink className="size-3" />
                  </a>
                </div>
                <BotonIcono icono={Pencil} etiqueta={`Editar ${repositorio.nombre}`} tamano="sm" onClick={() => setEdicion(repositorio)} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-texto-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-superficie-2 px-2 py-1 font-mono">
                  <GitBranch className="size-3" />
                  {repositorio.ramaPrincipal}
                </span>
                <span className="text-texto-3">ramas desde · PR hacia</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-superficie-2 px-2 py-1 font-mono">
                  <GitBranch className="size-3" />
                  {repositorio.ramaDesarrollo}
                </span>
                {repositorio.estaActivo && (
                  <Link
                    to={`/tickets/repositorios/${repositorio.id}/grafo`}
                    className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100"
                  >
                    <GitFork className="size-3.5" />
                    Ver grafo
                  </Link>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <ModalRepositorio
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

function ModalRepositorio({ edicion, alCerrar, alGuardar }: { edicion: RepositorioDto | 'nuevo' | null; alCerrar: () => void; alGuardar: () => Promise<void> }) {
  const [datos, setDatos] = useState<DatosRepositorio>({ nombre: '', propietario: '', nombreRepositorio: '', ramaPrincipal: '', ramaDesarrollo: 'Desarrollo', estaActivo: true, proyectoSoporteId: null });
  const [proyectos, setProyectos] = useState<ProyectoSoporteDto[]>([]);
  const [urlPegada, setUrlPegada] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (edicion === null) return;
    setError(null);
    setUrlPegada('');
    apiProyectosSoporte.listar().then(setProyectos).catch(() => undefined);
    setDatos(
      edicion === 'nuevo'
        ? { nombre: '', propietario: '', nombreRepositorio: '', ramaPrincipal: '', ramaDesarrollo: 'Desarrollo', estaActivo: true, proyectoSoporteId: null }
        : { ...edicion },
    );
  }, [edicion]);

  const actualizar = (cambios: Partial<DatosRepositorio>) => setDatos((actuales) => ({ ...actuales, ...cambios }));

  /** Acepta pegar la URL del repositorio (https://github.com/empresa/app) y extrae dueño y nombre. */
  function alPegarUrl(valor: string) {
    setUrlPegada(valor);
    const coincidencia = valor.match(/github\.com[/:]([^/]+)\/([^/.\s]+)/i);
    if (coincidencia) actualizar({ propietario: coincidencia[1], nombreRepositorio: coincidencia[2], nombre: datos.nombre || coincidencia[2] });
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const cuerpo = { ...datos, ramaPrincipal: datos.ramaPrincipal?.trim() || null };
      if (edicion === 'nuevo') await apiRepositorios.crear(cuerpo);
      else if (edicion) await apiRepositorios.actualizar(edicion.id, cuerpo);
      notificar.exito('Repositorio guardado', `${datos.propietario}/${datos.nombreRepositorio}`);
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
      titulo={edicion === 'nuevo' ? 'Agregar repositorio' : 'Editar repositorio'}
      pie={
        <>
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="formulario-repositorio" cargando={enviando}>
            Verificar y guardar
          </Boton>
        </>
      }
    >
      <form id="formulario-repositorio" onSubmit={enviar} className="flex flex-col gap-4">
        {edicion === 'nuevo' && (
          <Campo etiqueta="URL del repositorio (opcional)" ayuda="Pega la URL de GitHub y se completan dueño y nombre.">
            <Entrada value={urlPegada} onChange={(evento) => alPegarUrl(evento.target.value)} placeholder="https://github.com/empresa/aplicacion" />
          </Campo>
        )}
        <Campo etiqueta="Proyecto" ayuda="Las ramas de este repositorio se marcan con su proyecto al detectarlas.">
          <Selector value={datos.proyectoSoporteId ?? ''} onChange={(evento) => actualizar({ proyectoSoporteId: evento.target.value || null })}>
            <option value="">Sin proyecto</option>
            {proyectos.map((proyecto) => (
              <option key={proyecto.id} value={proyecto.id}>
                {proyecto.nombre}
              </option>
            ))}
          </Selector>
        </Campo>
        <Campo etiqueta="Nombre visible">
          <Entrada required maxLength={100} value={datos.nombre} onChange={(evento) => actualizar({ nombre: evento.target.value })} placeholder="API Facturación" />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Dueño (usuario u organización)">
            <Entrada required value={datos.propietario} onChange={(evento) => actualizar({ propietario: evento.target.value.trim() })} placeholder="empresa" className="font-mono" />
          </Campo>
          <Campo etiqueta="Repositorio">
            <Entrada required value={datos.nombreRepositorio} onChange={(evento) => actualizar({ nombreRepositorio: evento.target.value.trim() })} placeholder="aplicacion" className="font-mono" />
          </Campo>
          <Campo etiqueta="Rama principal" ayuda="Vacía = la rama por defecto en GitHub.">
            <Entrada value={datos.ramaPrincipal ?? ''} onChange={(evento) => actualizar({ ramaPrincipal: evento.target.value.trim() })} placeholder="main" className="font-mono" />
          </Campo>
          <Campo etiqueta="Rama de desarrollo" ayuda="Destino de los PR para probar.">
            <Entrada required value={datos.ramaDesarrollo} onChange={(evento) => actualizar({ ramaDesarrollo: evento.target.value.trim() })} className="font-mono" />
          </Campo>
        </div>
        {edicion !== 'nuevo' && <Casilla etiqueta="Activo (se busca al detectar ramas)" checked={datos.estaActivo} onChange={(evento) => actualizar({ estaActivo: evento.target.checked })} />}
        <MensajeError mensaje={error} />
      </form>
    </Modal>
  );
}
