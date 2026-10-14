import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiPreferencias } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';

/** Lo que se puede fijar en el panel de referencia. */
export type TipoFijado = 'Documento' | 'Tarea' | 'Ticket' | 'Flujo' | 'TarjetaTrello';

export interface ElementoFijado {
  tipo: TipoFijado;
  id: string;
  /** Título guardado al fijar: se muestra sin pedir nada al servidor. */
  titulo: string;
}

export type PestanaReferencia = 'fijados' | 'notas' | 'snippets';

const pestanasValidas: PestanaReferencia[] = ['fijados', 'notas', 'snippets'];

interface ValorContexto {
  abierto: boolean;
  pestana: PestanaReferencia;
  fijados: ElementoFijado[];
  notas: string;
  /** Estado del guardado de las notas (se guardan solas al dejar de escribir). */
  guardandoNotas: 'guardado' | 'pendiente' | 'guardando' | 'error';
  alternar: () => void;
  abrir: (pestana?: PestanaReferencia) => void;
  cerrar: () => void;
  cambiarPestana: (pestana: PestanaReferencia) => void;
  estaFijado: (tipo: TipoFijado, id: string) => boolean;
  alternarFijado: (elemento: ElementoFijado) => void;
  quitarFijado: (tipo: TipoFijado, id: string) => void;
  moverFijado: (tipo: TipoFijado, id: string, desplazamiento: -1 | 1) => void;
  cambiarNotas: (texto: string) => void;
}

const Contexto = createContext<ValorContexto | null>(null);

const ClaveFijados = 'referencia.fijados';
const ClaveNotas = 'referencia.notas';
const ClaveAbierto = 'referencia.abierto';
const ClavePestana = 'referencia.pestana';
export const MaximoFijados = 12;
/** Las preferencias admiten 50.000 caracteres de JSON; se deja margen para el escapado. */
export const MaximoNotas = 40_000;

/**
 * Panel de referencia (cajón lateral): elementos fijados y notas rápidas, guardados en el servidor como preferencias
 * del usuario. Que esté abierto y la pestaña elegida se recuerdan en el navegador.
 */
export function ProveedorPanelReferencia({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(() => leerLocal(ClaveAbierto) === '1');
  const [pestana, setPestana] = useState<PestanaReferencia>(() => {
    const guardada = leerLocal(ClavePestana) as PestanaReferencia | null;
    return guardada && pestanasValidas.includes(guardada) ? guardada : 'fijados';
  });
  const [fijados, setFijados] = useState<ElementoFijado[]>([]);
  const [notas, setNotas] = useState('');
  const [guardandoNotas, setGuardandoNotas] = useState<ValorContexto['guardandoNotas']>('guardado');
  const temporizadorNotas = useRef<number | null>(null);
  const notasPendientes = useRef<string | null>(null);

  useEffect(() => {
    apiPreferencias
      .obtener<ElementoFijado[]>(ClaveFijados)
      .then((guardados) => Array.isArray(guardados) && setFijados(guardados.filter(esFijadoValido).slice(0, MaximoFijados)))
      .catch(() => undefined);
    apiPreferencias
      .obtener<{ texto: string }>(ClaveNotas)
      .then((guardadas) => typeof guardadas?.texto === 'string' && setNotas(guardadas.texto))
      .catch(() => undefined);
  }, []);

  useEffect(() => guardarLocal(ClaveAbierto, abierto ? '1' : '0'), [abierto]);
  useEffect(() => guardarLocal(ClavePestana, pestana), [pestana]);

  const guardarFijados = useCallback((siguientes: ElementoFijado[]) => {
    setFijados(siguientes);
    apiPreferencias.guardar(ClaveFijados, siguientes).catch((error) => notificar.error('No se guardaron los fijados', error));
  }, []);

  const guardarNotasAhora = useCallback(async () => {
    if (temporizadorNotas.current) window.clearTimeout(temporizadorNotas.current);
    temporizadorNotas.current = null;
    const texto = notasPendientes.current;
    if (texto === null) return;
    notasPendientes.current = null;
    setGuardandoNotas('guardando');
    try {
      await apiPreferencias.guardar(ClaveNotas, { texto });
      // Si se siguió escribiendo mientras se guardaba, queda pendiente.
      setGuardandoNotas(notasPendientes.current === null ? 'guardado' : 'pendiente');
    } catch {
      notasPendientes.current ??= texto;
      setGuardandoNotas('error');
    }
  }, []);

  const cambiarNotas = useCallback(
    (texto: string) => {
      const recortado = texto.slice(0, MaximoNotas);
      setNotas(recortado);
      notasPendientes.current = recortado;
      setGuardandoNotas('pendiente');
      if (temporizadorNotas.current) window.clearTimeout(temporizadorNotas.current);
      temporizadorNotas.current = window.setTimeout(() => void guardarNotasAhora(), 800);
    },
    [guardarNotasAhora],
  );

  // Al ocultar la pestaña del navegador se guarda lo pendiente (puede que no se vuelva).
  useEffect(() => {
    const alOcultar = () => document.visibilityState === 'hidden' && void guardarNotasAhora();
    document.addEventListener('visibilitychange', alOcultar);
    return () => document.removeEventListener('visibilitychange', alOcultar);
  }, [guardarNotasAhora]);

  const valor = useMemo<ValorContexto>(() => {
    const estaFijado = (tipo: TipoFijado, id: string) => fijados.some((elemento) => elemento.tipo === tipo && elemento.id === id);
    return {
      abierto,
      pestana,
      fijados,
      notas,
      guardandoNotas,
      alternar: () => setAbierto((actual) => !actual),
      abrir: (nueva) => {
        if (nueva) setPestana(nueva);
        setAbierto(true);
      },
      cerrar: () => {
        void guardarNotasAhora();
        setAbierto(false);
      },
      cambiarPestana: setPestana,
      estaFijado,
      alternarFijado: (elemento) => {
        if (estaFijado(elemento.tipo, elemento.id)) {
          guardarFijados(fijados.filter((otro) => !(otro.tipo === elemento.tipo && otro.id === elemento.id)));
          return;
        }
        if (fijados.length >= MaximoFijados) {
          notificar.aviso('Panel lleno', `Puedes fijar hasta ${MaximoFijados} elementos. Quita alguno primero.`);
          return;
        }
        // Lo nuevo arriba; al fijar se abre el panel para que se vea dónde quedó.
        guardarFijados([{ ...elemento, titulo: elemento.titulo.slice(0, 200) }, ...fijados]);
        setPestana('fijados');
        setAbierto(true);
      },
      quitarFijado: (tipo, id) => guardarFijados(fijados.filter((otro) => !(otro.tipo === tipo && otro.id === id))),
      moverFijado: (tipo, id, desplazamiento) => {
        const indice = fijados.findIndex((otro) => otro.tipo === tipo && otro.id === id);
        const destino = indice + desplazamiento;
        if (indice < 0 || destino < 0 || destino >= fijados.length) return;
        const siguientes = [...fijados];
        [siguientes[indice], siguientes[destino]] = [siguientes[destino], siguientes[indice]];
        guardarFijados(siguientes);
      },
      cambiarNotas,
    };
  }, [abierto, pestana, fijados, notas, guardandoNotas, guardarFijados, guardarNotasAhora, cambiarNotas]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usarPanelReferencia(): ValorContexto {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('usarPanelReferencia debe usarse dentro de ProveedorPanelReferencia');
  return valor;
}

const tiposValidos: TipoFijado[] = ['Documento', 'Tarea', 'Ticket', 'Flujo', 'TarjetaTrello'];

function esFijadoValido(valor: unknown): valor is ElementoFijado {
  const elemento = valor as Partial<ElementoFijado> | null;
  return !!elemento && tiposValidos.includes(elemento.tipo as TipoFijado) && typeof elemento.id === 'string' && typeof elemento.titulo === 'string';
}

function leerLocal(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function guardarLocal(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // Preferencia visual: sin almacenamiento solo dura la sesión.
  }
}
