import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiTiempo, type DestinoTiempo } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import type { RegistroTiempoDto } from '../../servicios/tipos';
import { formatearDuracion } from './presentacionTiempo';

interface ValorCronometro {
  activo: RegistroTiempoDto | null;
  ocupado: boolean;
  /** Cambia cada vez que se inicia, detiene o edita tiempo: las vistas que muestran horas recargan con él. */
  version: number;
  iniciar: (destino: DestinoTiempo) => Promise<void>;
  detener: () => Promise<void>;
  /** Avisar de cambios hechos fuera del cronómetro (registro manual, edición, borrado). */
  notificarCambio: () => void;
}

const ContextoCronometro = createContext<ValorCronometro | null>(null);

/** Estado del cronómetro compartido por la barra superior, tareas, tickets y la página de Tiempo. */
export function ProveedorCronometro({ children }: { children: ReactNode }) {
  const [activo, setActivo] = useState<RegistroTiempoDto | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [version, setVersion] = useState(0);

  const cargar = useCallback(() => {
    apiTiempo.activo().then(setActivo).catch(() => undefined);
  }, []);

  // Al abrir y al volver a la pestaña (pudo detenerse desde otra ventana).
  useEffect(() => {
    cargar();
    const alVolver = () => document.visibilityState === 'visible' && cargar();
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [cargar]);

  const iniciar = useCallback(async (destino: DestinoTiempo) => {
    setOcupado(true);
    try {
      const anterior = activo;
      const nuevo = await apiTiempo.iniciar(destino);
      setActivo(nuevo);
      setVersion((actual) => actual + 1);
      notificar.exito('Cronómetro en marcha', anterior ? `${nuevo.titulo} · se detuvo "${anterior.titulo}"` : nuevo.titulo);
    } catch (errorInicio) {
      notificar.error('No se pudo iniciar el cronómetro', errorInicio);
    } finally {
      setOcupado(false);
    }
  }, [activo]);

  const detener = useCallback(async () => {
    setOcupado(true);
    try {
      const detenido = await apiTiempo.detener();
      setActivo(null);
      setVersion((actual) => actual + 1);
      if (detenido) notificar.exito(`Registrado ${formatearDuracion(detenido.minutos)}`, detenido.titulo);
    } catch (errorDetencion) {
      notificar.error('No se pudo detener el cronómetro', errorDetencion);
    } finally {
      setOcupado(false);
    }
  }, []);

  const notificarCambio = useCallback(() => {
    setVersion((actual) => actual + 1);
    cargar();
  }, [cargar]);

  const valor = useMemo(() => ({ activo, ocupado, version, iniciar, detener, notificarCambio }), [activo, ocupado, version, iniciar, detener, notificarCambio]);
  return <ContextoCronometro.Provider value={valor}>{children}</ContextoCronometro.Provider>;
}

export function usarCronometro(): ValorCronometro {
  const valor = useContext(ContextoCronometro);
  if (!valor) throw new Error('usarCronometro debe usarse dentro de ProveedorCronometro.');
  return valor;
}

/** Segundos transcurridos desde un instante, actualizados cada segundo. */
export function usarSegundosDesde(fechaIso: string | null): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!fechaIso) return;
    const intervalo = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(intervalo);
  }, [fechaIso]);
  return fechaIso ? Math.max(0, Math.floor((ahora - new Date(fechaIso).getTime()) / 1000)) : 0;
}
