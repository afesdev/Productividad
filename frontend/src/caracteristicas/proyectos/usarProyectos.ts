import { useCallback, useEffect, useMemo, useState } from 'react';
import { usarSesion } from '../autenticacion/ContextoSesion';
import { apiProyectos } from '../../servicios/api';
import type { ProyectoDto } from '../../servicios/tipos';

/** La preferencia se guarda por usuario: varios usuarios pueden compartir el mismo navegador. */
const claveProyectoSeleccionado = (usuarioId: string | undefined) => `productividad.proyectoSeleccionado.${usuarioId ?? 'anonimo'}`;

function leerSeleccionGuardada(usuarioId: string | undefined): string | null {
  try {
    return localStorage.getItem(claveProyectoSeleccionado(usuarioId));
  } catch {
    return null;
  }
}

/**
 * Lista de proyectos del usuario + proyecto activo (recordado en el navegador como preferencia, no como dato crítico).
 * El proyecto activo solo se expone cuando está confirmado en la lista: así nunca se consulta ni se escucha
 * por SignalR un Id guardado que ya no existe o que pertenece a otra cuenta.
 */
export function usarProyectos() {
  const { usuario } = usarSesion();
  const usuarioId = usuario?.id;
  const [proyectos, setProyectos] = useState<ProyectoDto[]>([]);
  const [seleccion, setSeleccion] = useState<string | null>(() => leerSeleccionGuardada(usuarioId));
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      setProyectos(await apiProyectos.listar());
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    try {
      // Clave anterior, compartida entre cuentas: se descarta.
      localStorage.removeItem('productividad.proyectoSeleccionado');
    } catch {
      // Sin almacenamiento: nada que limpiar.
    }
    setSeleccion(leerSeleccionGuardada(usuarioId));
    void recargar();
  }, [usuarioId, recargar]);

  const proyectoId = useMemo(() => {
    if (cargando && proyectos.length === 0) return null;
    return seleccion && proyectos.some((proyecto) => proyecto.id === seleccion) ? seleccion : (proyectos[0]?.id ?? null);
  }, [cargando, proyectos, seleccion]);

  const setProyectoId = useCallback(
    (id: string) => {
      setSeleccion(id);
      try {
        localStorage.setItem(claveProyectoSeleccionado(usuarioId), id);
      } catch {
        // Sin almacenamiento disponible: la selección solo dura la sesión.
      }
    },
    [usuarioId],
  );

  return { proyectos, proyectoId, setProyectoId, cargando, recargar };
}
