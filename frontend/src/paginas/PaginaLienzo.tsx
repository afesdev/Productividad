import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CloudOff, Loader2, Save } from 'lucide-react';
import { apiLienzos } from '../servicios/api';
import { obtenerMensajeError } from '../servicios/clienteApi';
import { notificar } from '../servicios/notificaciones';
import type { LienzoDetalleDto } from '../servicios/tipos';
import { EditorLienzo, type EstadoGuardado } from '../caracteristicas/lienzos/EditorLienzo';
import { Boton, unirClases } from '../componentes/ui/primitivos';

const textoEstado: Record<EstadoGuardado, string> = {
  guardado: 'Guardado',
  guardando: 'Guardando…',
  sinCambios: 'Todo guardado',
  error: 'Error al guardar',
};

function IndicadorGuardado({ estado }: { estado: EstadoGuardado }) {
  const Icono = estado === 'guardando' ? Loader2 : estado === 'error' ? CloudOff : Check;
  return (
    <span className={unirClases('flex items-center gap-1.5 text-xs', estado === 'error' ? 'text-peligro' : 'text-texto-3')}>
      <Icono className={unirClases('size-3.5', estado === 'guardando' && 'animate-spin')} />
      {textoEstado[estado]}
    </span>
  );
}

export function PaginaLienzo() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [lienzo, setLienzo] = useState<LienzoDetalleDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardado>('sinCambios');
  const [titulo, setTitulo] = useState('');
  const tituloGuardado = useRef('');
  const guardarLienzo = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!id) return;
    let vigente = true;
    setLienzo(null);
    setError(null);
    apiLienzos
      .obtener(id)
      .then((datos) => {
        if (!vigente) return;
        setLienzo(datos);
        setTitulo(datos.titulo);
        tituloGuardado.current = datos.titulo;
      })
      .catch((error) => vigente && setError(obtenerMensajeError(error)));
    return () => {
      vigente = false;
    };
  }, [id]);

  const guardarTitulo = useCallback(async () => {
    if (!id) return;
    const limpio = titulo.trim();
    if (!limpio || limpio === tituloGuardado.current) {
      setTitulo(tituloGuardado.current);
      return;
    }
    try {
      await apiLienzos.renombrar(id, limpio);
      tituloGuardado.current = limpio;
      setTitulo(limpio);
    } catch (error) {
      notificar.error('No se pudo renombrar', error);
      setTitulo(tituloGuardado.current);
    }
  }, [id, titulo]);

  if (error) {
    return (
      <div className="grid flex-1 place-items-center p-8 text-center">
        <div>
          <p className="text-sm text-texto-2">{error}</p>
          <button onClick={() => navegar('/lienzos')} className="mt-3 text-sm font-medium text-violet-600 hover:underline">
            Volver a Lienzos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-borde bg-superficie px-3">
        <button
          onClick={() => navegar('/lienzos')}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-texto-2 transition hover:bg-superficie-2 hover:text-texto"
          aria-label="Volver a Lienzos"
        >
          <ArrowLeft className="size-4" />
        </button>
        <input
          value={titulo}
          onChange={(evento) => setTitulo(evento.target.value)}
          onBlur={guardarTitulo}
          onKeyDown={(evento) => evento.key === 'Enter' && evento.currentTarget.blur()}
          className="min-w-0 flex-1 rounded-md bg-transparent px-1.5 py-1 text-sm font-medium outline-none transition focus:bg-fondo"
          placeholder="Lienzo sin título"
        />
        <IndicadorGuardado estado={estadoGuardado} />
        <Boton tamano="sm" icono={Save} onClick={() => guardarLienzo.current?.()}>
          Guardar
        </Boton>
      </header>
      <div className="relative min-h-0 flex-1">
        {lienzo && (
          <EditorLienzo
            lienzoId={lienzo.id}
            contenidoInicial={lienzo.contenidoJson}
            alCambiarEstado={setEstadoGuardado}
            alRegistrarGuardado={(fn) => (guardarLienzo.current = fn)}
          />
        )}
      </div>
    </div>
  );
}
