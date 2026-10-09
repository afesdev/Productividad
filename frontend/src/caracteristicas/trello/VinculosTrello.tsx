import { useEffect, useRef, useState } from 'react';
import { Columns3, ExternalLink, Link2, Loader2, Plus, Search, X } from 'lucide-react';
import { apiTrello } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import type { TarjetaAsignadaTrelloDto, VinculoTrelloDto } from '../../servicios/tipos';
import { Modal } from '../../componentes/ui/Modal';
import { Boton, BotonIcono, unirClases } from '../../componentes/ui/primitivos';
import { ModalTarjetaTrello } from './ModalTarjetaTrello';
import { trelloConectado } from './conexionTrello';
import { InsigniaVencimiento, estiloFondoTablero } from './presentacionTrello';

// ---------- Vínculos de una tarea o un ticket ----------

/**
 * Tarjetas de Trello vinculadas a una tarea o a un ticket. Sin cuenta de Trello conectada no se muestra nada.
 * La lista usa los datos guardados al vincular; al abrir una tarjeta se leen los de Trello al día.
 */
export function VinculosTrello({ tareaId, ticketId, className }: { tareaId?: string; ticketId?: string; className?: string }) {
  const [conectado, setConectado] = useState(false);
  const [vinculos, setVinculos] = useState<VinculoTrelloDto[] | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setVinculos(null);
    void trelloConectado().then((hayConexion) => {
      if (!vigente) return;
      setConectado(hayConexion);
      if (!hayConexion) return;
      apiTrello
        .vinculos(tareaId ? { tareaId } : { ticketId })
        .then((lista) => vigente && setVinculos(lista))
        .catch(() => vigente && setVinculos([]));
    });
    return () => {
      vigente = false;
    };
  }, [tareaId, ticketId]);

  if (!conectado) return null;

  async function vincular(tarjeta: TarjetaAsignadaTrelloDto) {
    setEligiendo(false);
    try {
      const vinculo = await apiTrello.vincular(tarjeta.tarjeta.id, tareaId ? { tareaId } : { ticketId });
      setVinculos((actual) => [...(actual ?? []), vinculo]);
      notificar.exito('Tarjeta vinculada', vinculo.nombreTarjeta);
    } catch (error) {
      notificar.error('No se pudo vincular la tarjeta', error);
    }
  }

  async function desvincular(vinculo: VinculoTrelloDto) {
    try {
      await apiTrello.desvincular(vinculo.id);
      setVinculos((actual) => actual?.filter((otro) => otro.id !== vinculo.id) ?? null);
      notificar.info('Tarjeta desvinculada', vinculo.nombreTarjeta);
    } catch (error) {
      notificar.error('No se pudo desvincular', error);
    }
  }

  return (
    <section className={unirClases('flex flex-col gap-2', className)}>
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Columns3 className="size-4 text-texto-3" />
        Trello
        <Boton variante="fantasma" tamano="sm" icono={Plus} className="ml-auto" onClick={() => setEligiendo(true)}>
          Vincular tarjeta
        </Boton>
      </h3>
      {vinculos === null ? (
        <Loader2 className="size-4 animate-spin text-texto-3" />
      ) : vinculos.length === 0 ? (
        <p className="text-sm text-texto-3">Sin tarjetas vinculadas.</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {vinculos.map((vinculo) => (
            <li key={vinculo.id} className="group flex items-center gap-1 rounded-md hover:bg-superficie-2">
              <button type="button" onClick={() => setAbierta(vinculo.idTarjeta)} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm">
                <Columns3 className="size-4 shrink-0 text-sky-500" />
                <span className="min-w-0 truncate">{vinculo.nombreTarjeta}</span>
                <span className="shrink-0 truncate text-xs text-texto-3">{vinculo.nombreTablero}</span>
              </button>
              <a href={vinculo.urlTarjeta} target="_blank" rel="noreferrer" aria-label="Abrir en Trello" className="grid size-7 place-items-center rounded-md text-texto-3 opacity-0 hover:text-texto group-hover:opacity-100 focus:opacity-100">
                <ExternalLink className="size-3.5" />
              </a>
              <BotonIcono icono={X} etiqueta="Desvincular" tamano="sm" className="opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => void desvincular(vinculo)} />
            </li>
          ))}
        </ul>
      )}
      <ModalSelectorTarjetaTrello abierto={eligiendo} alCerrar={() => setEligiendo(false)} alElegir={(tarjeta) => void vincular(tarjeta)} />
      <ModalTarjetaTrello idTarjeta={abierta} alCerrar={() => setAbierta(null)} />
    </section>
  );
}

// ---------- Selector de tarjeta ----------

/** Sin texto muestra tus tarjetas pendientes; con texto busca en Trello. Acepta pegar el enlace de una tarjeta. */
export function ModalSelectorTarjetaTrello({ abierto, alCerrar, alElegir }: { abierto: boolean; alCerrar: () => void; alElegir: (tarjeta: TarjetaAsignadaTrelloDto) => void }) {
  const [texto, setTexto] = useState('');
  const [mias, setMias] = useState<TarjetaAsignadaTrelloDto[] | null>(null);
  const [resultados, setResultados] = useState<TarjetaAsignadaTrelloDto[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!abierto) return;
    setTexto('');
    setResultados(null);
    window.setTimeout(() => entrada.current?.focus(), 50);
    apiTrello
      .misTarjetas()
      .then((tarjetas) => setMias(tarjetas.filter((asignada) => !asignada.tarjeta.vencimientoCompletado)))
      .catch(() => setMias([]));
  }, [abierto]);

  // Búsqueda con espera de 350 ms; cada tecla cancela la petición anterior.
  useEffect(() => {
    const consulta = texto.trim();
    if (consulta.length < 2) {
      setResultados(null);
      setBuscando(false);
      return;
    }
    const controlador = new AbortController();
    setBuscando(true);
    const temporizador = window.setTimeout(() => {
      apiTrello
        .buscar(consulta, controlador.signal)
        .then((tarjetas) => setResultados(tarjetas))
        .catch((error) => {
          if (controlador.signal.aborted) return;
          setResultados([]);
          notificar.error('No se pudo buscar en Trello', error);
        })
        .finally(() => !controlador.signal.aborted && setBuscando(false));
    }, 350);
    return () => {
      window.clearTimeout(temporizador);
      controlador.abort();
    };
  }, [texto]);

  const lista = resultados ?? mias;

  return (
    <Modal abierto={abierto} alCerrar={alCerrar} titulo="Vincular tarjeta de Trello" descripcion="Busca por nombre o pega el enlace de la tarjeta." ancho="lg">
      <div className="flex flex-col gap-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-3" />
          <input
            ref={entrada}
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Buscar tarjetas o pegar https://trello.com/c/…"
            aria-label="Buscar tarjetas de Trello"
            className="h-10 w-full rounded-lg border border-borde bg-superficie pl-9 pr-9 text-sm placeholder:text-texto-3 focus:border-acento focus:outline-none"
          />
          {buscando && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-texto-3" />}
        </label>
        <p className="text-[11px] font-medium uppercase tracking-wider text-texto-3">{resultados ? 'Resultados' : 'Tus tarjetas pendientes'}</p>
        {lista === null ? (
          <Loader2 className="mx-auto size-5 animate-spin text-texto-3" />
        ) : lista.length === 0 ? (
          <p className="py-6 text-center text-sm text-texto-3">{resultados ? 'Ninguna tarjeta coincide.' : 'No tienes tarjetas pendientes asignadas. Escribe para buscar en todos tus tableros.'}</p>
        ) : (
          <ul className="-mx-2 flex max-h-[50vh] flex-col overflow-y-auto">
            {lista.map(({ tarjeta, nombreTablero, nombreLista, colorFondoTablero }) => (
              <li key={tarjeta.id}>
                <button
                  type="button"
                  onClick={() => alElegir({ tarjeta, nombreTablero, nombreLista, colorFondoTablero })}
                  className="flex w-full min-w-0 items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-superficie-2"
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={estiloFondoTablero({ colorFondo: colorFondoTablero })} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{tarjeta.nombre}</span>
                    <span className="block truncate text-xs text-texto-3">
                      {nombreTablero}
                      {nombreLista && ` · ${nombreLista}`}
                    </span>
                  </span>
                  {tarjeta.vencimiento && <InsigniaVencimiento vencimiento={tarjeta.vencimiento} completado={tarjeta.vencimientoCompletado} className="shrink-0" />}
                  <Link2 className="size-4 shrink-0 text-texto-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
