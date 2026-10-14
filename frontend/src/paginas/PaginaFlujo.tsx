import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { AlertCircle, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { apiFlujos } from '../servicios/api';
import { obtenerMensajeError } from '../servicios/clienteApi';
import { notificar } from '../servicios/notificaciones';
import type { FlujoDetalleDto } from '../servicios/tipos';
import { unirClases } from '../componentes/ui/primitivos';
import { EditorFlujo, type EstadoGuardadoFlujo } from '../caracteristicas/flujos/EditorFlujo';
import { BotonConexiones } from '../caracteristicas/grafo/ComponentesGrafo';
import { BotonFijar } from '../caracteristicas/referencia/PanelReferencia';
import { invalidarSistemas, usarSistemas } from '../componentes/bloquesVivos/sistemas';

const textoEstado: Record<EstadoGuardadoFlujo, string> = {
  guardado: 'Guardado',
  pendiente: 'Sin guardar',
  guardando: 'Guardando…',
  error: 'Error al guardar',
};

/** Editor a pantalla completa de un flujo (React Flow y ELK solo se descargan al abrir esta página). */
export function PaginaFlujo() {
  const { id } = useParams();
  // Desde un bloque vivo: "Recorrer" abre el flujo ya en modo recorrido.
  const [parametros] = useSearchParams();
  const recorrerAlAbrir = parametros.get('recorrer') === '1';
  const navegar = useNavigate();
  const [flujo, setFlujo] = useState<FlujoDetalleDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoGuardadoFlujo>('guardado');
  const [titulo, setTitulo] = useState('');
  const [sistema, setSistema] = useState('');
  // Sugerencias unificadas: sistemas de otros flujos y proyectos de soporte de los tickets.
  const sistemas = usarSistemas()?.nombres ?? [];
  const guardados = useRef({ titulo: '', sistema: '' });

  useEffect(() => {
    if (!id) return;
    let vigente = true;
    setFlujo(null);
    apiFlujos
      .obtener(id)
      .then((datos) => {
        if (!vigente) return;
        setFlujo(datos);
        setTitulo(datos.titulo);
        setSistema(datos.sistema ?? '');
        guardados.current = { titulo: datos.titulo, sistema: datos.sistema ?? '' };
      })
      .catch((errorCarga) => vigente && setError(obtenerMensajeError(errorCarga)));
    return () => {
      vigente = false;
    };
  }, [id]);

  const guardarDatos = useCallback(async () => {
    if (!flujo) return;
    const tituloLimpio = titulo.trim();
    if (!tituloLimpio) {
      setTitulo(guardados.current.titulo);
      return;
    }
    if (tituloLimpio === guardados.current.titulo && sistema.trim() === guardados.current.sistema) return;
    try {
      await apiFlujos.actualizarDatos(flujo.id, { titulo: tituloLimpio, sistema: sistema.trim() || null, descripcion: flujo.descripcion });
      guardados.current = { titulo: tituloLimpio, sistema: sistema.trim() };
      invalidarSistemas();
      setTitulo(tituloLimpio);
    } catch (errorGuardado) {
      notificar.error('No se pudo guardar', errorGuardado);
      setTitulo(guardados.current.titulo);
      setSistema(guardados.current.sistema);
    }
  }, [flujo, titulo, sistema]);

  if (error) {
    return (
      <div className="grid flex-1 place-items-center p-8 text-center">
        <div>
          <p className="text-sm text-texto-2">{error}</p>
          <button onClick={() => navegar('/flujos')} className="mt-3 text-sm font-medium text-violet-600 hover:underline">
            Volver a Flujos
          </button>
        </div>
      </div>
    );
  }

  const IconoEstado = estado === 'guardando' ? Loader2 : estado === 'error' ? AlertCircle : estado === 'pendiente' ? null : Check;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-borde bg-superficie px-3">
        <button
          onClick={() => navegar('/flujos')}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-texto-2 transition hover:bg-superficie-2 hover:text-texto"
          aria-label="Volver a Flujos"
        >
          <ArrowLeft className="size-4" />
        </button>
        <input
          value={titulo}
          onChange={(evento) => setTitulo(evento.target.value)}
          onBlur={() => void guardarDatos()}
          onKeyDown={(evento) => evento.key === 'Enter' && evento.currentTarget.blur()}
          maxLength={200}
          aria-label="Título del flujo"
          className="min-w-0 flex-1 rounded-md bg-transparent px-1.5 py-1 text-sm font-semibold outline-none transition focus:bg-fondo"
          placeholder="Flujo sin título"
        />
        <input
          value={sistema}
          onChange={(evento) => setSistema(evento.target.value)}
          onBlur={() => void guardarDatos()}
          onKeyDown={(evento) => evento.key === 'Enter' && evento.currentTarget.blur()}
          list="sistemas-flujo"
          maxLength={100}
          aria-label="Sistema"
          placeholder="Sistema"
          className="hidden h-8 w-40 rounded-lg border border-borde bg-fondo px-2 text-xs outline-none transition focus:border-acento sm:block"
        />
        <datalist id="sistemas-flujo">
          {sistemas.map((opcion) => (
            <option key={opcion} value={opcion} />
          ))}
        </datalist>
        {flujo && <BotonFijar tipo="Flujo" id={flujo.id} titulo={flujo.titulo} />}
        {flujo && <BotonConexiones tipo="Flujo" id={flujo.id} />}
        <span className={unirClases('flex w-28 shrink-0 items-center justify-end gap-1.5 text-xs', estado === 'error' ? 'text-peligro' : 'text-texto-3')} aria-live="polite">
          {IconoEstado ? <IconoEstado className={unirClases('size-3.5', estado === 'guardando' && 'animate-spin')} /> : <span className="size-1.5 rounded-full bg-aviso" />}
          {textoEstado[estado]}
        </span>
      </header>

      {flujo ? (
        <ReactFlowProvider>
          <EditorFlujo flujoId={flujo.id} titulo={titulo} contenidoInicial={flujo.contenidoJson} alCambiarEstado={setEstado} recorrerAlAbrir={recorrerAlAbrir} />
        </ReactFlowProvider>
      ) : (
        <div className="grid flex-1 place-items-center text-sm text-texto-3">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}
    </div>
  );
}
