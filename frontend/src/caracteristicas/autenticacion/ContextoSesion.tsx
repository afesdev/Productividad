import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { apiAutenticacion } from '../../servicios/api';
import { almacenSesion } from '../../servicios/almacenSesion';
import { refrescarSesion } from '../../servicios/clienteApi';
import { detenerConexion } from '../../servicios/conexionSignalR';
import type { RespuestaSesion, UsuarioDto } from '../../servicios/tipos';

export interface DatosRegistro {
  correo: string;
  nombreUsuario: string;
  nombreCompleto: string;
  contrasena: string;
}

interface ValorContextoSesion {
  usuario: UsuarioDto | null;
  cargando: boolean;
  /** `identificador`: correo o nombre de usuario. */
  iniciarSesion: (identificador: string, contrasena: string) => Promise<void>;
  registrar: (registro: DatosRegistro) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const ContextoSesion = createContext<ValorContextoSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioDto | null>(almacenSesion.obtener().usuario);
  const [cargando, setCargando] = useState(true);

  useEffect(() => almacenSesion.suscribir((estado) => setUsuario(estado.usuario)), []);

  // Al abrir la app se intenta recuperar la sesión con la cookie de refresco.
  useEffect(() => {
    refrescarSesion().finally(() => setCargando(false));
  }, []);

  const aplicarSesion = (sesion: RespuestaSesion) => almacenSesion.establecer(sesion.tokenAcceso, sesion.usuario);

  const iniciarSesion = useCallback(async (identificador: string, contrasena: string) => {
    aplicarSesion(await apiAutenticacion.iniciarSesion(identificador, contrasena));
  }, []);

  const registrar = useCallback(async (registro: DatosRegistro) => {
    aplicarSesion(await apiAutenticacion.registrar(registro));
  }, []);

  const cerrarSesion = useCallback(async () => {
    await apiAutenticacion.cerrarSesion().catch(() => undefined);
    await detenerConexion();
    almacenSesion.limpiar();
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, iniciarSesion, registrar, cerrarSesion }),
    [usuario, cargando, iniciarSesion, registrar, cerrarSesion],
  );

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function usarSesion(): ValorContextoSesion {
  const contexto = useContext(ContextoSesion);
  if (!contexto) throw new Error('usarSesion debe usarse dentro de ProveedorSesion');
  return contexto;
}

export function RutaProtegida({ children }: { children: ReactNode }) {
  const { usuario, cargando } = usarSesion();
  const ubicacion = useLocation();

  if (cargando)
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-5 animate-spin text-texto-3" aria-label="Cargando sesión" />
      </div>
    );
  if (!usuario) return <Navigate to="/iniciar-sesion" replace state={{ desde: ubicacion.pathname }} />;
  return <>{children}</>;
}
