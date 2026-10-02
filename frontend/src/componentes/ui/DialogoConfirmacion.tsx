import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Modal } from './Modal';
import { Boton } from './primitivos';

interface OpcionesConfirmacion {
  titulo: string;
  descripcion?: string;
  textoConfirmar?: string;
  /** Acción destructiva: botón rojo e icono de advertencia. */
  peligrosa?: boolean;
}

type FuncionConfirmar = (opciones: OpcionesConfirmacion) => Promise<boolean>;

const ContextoConfirmacion = createContext<FuncionConfirmar | null>(null);

/** Reemplaza window.confirm por un modal propio: `if (await confirmar({...})) ...` */
export function ProveedorConfirmacion({ children }: { children: ReactNode }) {
  const [opciones, setOpciones] = useState<OpcionesConfirmacion | null>(null);
  const resolverPendiente = useRef<(respuesta: boolean) => void>();

  const confirmar = useCallback<FuncionConfirmar>(
    (nuevasOpciones) =>
      new Promise<boolean>((resolver) => {
        resolverPendiente.current = resolver;
        setOpciones(nuevasOpciones);
      }),
    [],
  );

  const responder = useCallback((respuesta: boolean) => {
    resolverPendiente.current?.(respuesta);
    resolverPendiente.current = undefined;
    setOpciones(null);
  }, []);

  const cancelar = useCallback(() => responder(false), [responder]);

  return (
    <ContextoConfirmacion.Provider value={confirmar}>
      {children}
      <Modal
        abierto={opciones !== null}
        alCerrar={cancelar}
        titulo={opciones?.titulo ?? ''}
        ancho="sm"
        pie={
          <>
            <Boton variante="secundario" onClick={cancelar}>
              Cancelar
            </Boton>
            <Boton variante={opciones?.peligrosa ? 'peligro' : 'primario'} onClick={() => responder(true)} autoFocus>
              {opciones?.textoConfirmar ?? 'Confirmar'}
            </Boton>
          </>
        }
      >
        <div className="flex gap-3">
          {opciones?.peligrosa && (
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-peligro-suave text-peligro">
              <TriangleAlert className="size-4" />
            </span>
          )}
          {opciones?.descripcion && <p className="text-sm leading-relaxed text-texto-2">{opciones.descripcion}</p>}
        </div>
      </Modal>
    </ContextoConfirmacion.Provider>
  );
}

export function usarConfirmacion(): FuncionConfirmar {
  const confirmar = useContext(ContextoConfirmacion);
  if (!confirmar) throw new Error('usarConfirmacion debe usarse dentro de ProveedorConfirmacion');
  return confirmar;
}
