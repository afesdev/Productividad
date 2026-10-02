import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, Folder, Trash2 } from 'lucide-react';
import { apiDocumentos } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import type { CarpetaDocumentoDto, ColorPaleta, EtiquetaConConteoDto } from '../../servicios/tipos';
import { Modal } from '../../componentes/ui/Modal';
import { usarConfirmacion } from '../../componentes/ui/DialogoConfirmacion';
import { Boton, Campo, Entrada, Selector, unirClases } from '../../componentes/ui/primitivos';
import { coloresPaleta, paleta } from './paleta';

function SelectorColor({ valor, alCambiar, permitirNinguno }: { valor: ColorPaleta | null; alCambiar: (color: ColorPaleta | null) => void; permitirNinguno?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-2">
      {permitirNinguno && (
        <button
          type="button"
          role="radio"
          aria-checked={valor === null}
          title="Sin color"
          onClick={() => alCambiar(null)}
          className={unirClases('grid size-7 place-items-center rounded-full border border-borde-fuerte bg-superficie', valor === null && 'ring-2 ring-acento ring-offset-2')}
        >
          {valor === null && <Check className="size-3.5 text-texto-2" />}
        </button>
      )}
      {coloresPaleta.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={valor === color}
          title={paleta[color].nombre}
          onClick={() => alCambiar(color)}
          className={unirClases('grid size-7 place-items-center rounded-full', paleta[color].punto, valor === color && 'ring-2 ring-acento ring-offset-2')}
        >
          {valor === color && <Check className="size-3.5 text-white" />}
        </button>
      ))}
    </div>
  );
}

/** Ids de una carpeta y todas sus descendientes (no se puede mover una carpeta dentro de sí misma). */
export function idsConDescendientes(carpetas: CarpetaDocumentoDto[], raizId: string): Set<string> {
  const resultado = new Set([raizId]);
  let agregado = true;
  while (agregado) {
    agregado = false;
    for (const carpeta of carpetas) {
      if (carpeta.carpetaPadreId && resultado.has(carpeta.carpetaPadreId) && !resultado.has(carpeta.id)) {
        resultado.add(carpeta.id);
        agregado = true;
      }
    }
  }
  return resultado;
}

/** "Proyecto / Backend / API" para los selectores de carpeta. */
export function rutaCarpeta(carpetas: CarpetaDocumentoDto[], id: string): string {
  const porId = new Map(carpetas.map((carpeta) => [carpeta.id, carpeta]));
  const partes: string[] = [];
  let actual = porId.get(id);
  while (actual && partes.length < 20) {
    partes.unshift(actual.nombre);
    actual = actual.carpetaPadreId ? porId.get(actual.carpetaPadreId) : undefined;
  }
  return partes.join(' / ');
}

function OpcionesCarpetas({ carpetas, excluir }: { carpetas: CarpetaDocumentoDto[]; excluir?: Set<string> }) {
  const ordenadas = useMemo(
    () =>
      carpetas
        .filter((carpeta) => !excluir?.has(carpeta.id))
        .map((carpeta) => ({ id: carpeta.id, ruta: rutaCarpeta(carpetas, carpeta.id) }))
        .sort((a, b) => a.ruta.localeCompare(b.ruta, 'es')),
    [carpetas, excluir],
  );
  return (
    <>
      {ordenadas.map((carpeta) => (
        <option key={carpeta.id} value={carpeta.id}>
          {carpeta.ruta}
        </option>
      ))}
    </>
  );
}

export interface EstadoModalCarpeta {
  carpeta: CarpetaDocumentoDto | null;
  carpetaPadreId: string | null;
}

export function ModalCarpeta({
  estado,
  carpetas,
  alCerrar,
  alGuardar,
}: {
  estado: EstadoModalCarpeta | null;
  carpetas: CarpetaDocumentoDto[];
  alCerrar: () => void;
  alGuardar: () => void;
}) {
  const confirmar = usarConfirmacion();
  const [nombre, setNombre] = useState('');
  const [carpetaPadreId, setCarpetaPadreId] = useState('');
  const [color, setColor] = useState<ColorPaleta | null>(null);
  const [guardando, setGuardando] = useState(false);
  const carpeta = estado?.carpeta ?? null;

  useEffect(() => {
    if (!estado) return;
    setNombre(estado.carpeta?.nombre ?? '');
    setCarpetaPadreId(estado.carpeta?.carpetaPadreId ?? estado.carpetaPadreId ?? '');
    setColor(estado.carpeta?.color ?? null);
  }, [estado]);

  const excluidas = useMemo(() => (carpeta ? idsConDescendientes(carpetas, carpeta.id) : undefined), [carpetas, carpeta]);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    try {
      await apiDocumentos.guardarCarpeta(carpeta?.id ?? null, { nombre: nombre.trim(), carpetaPadreId: carpetaPadreId || null, color });
      notificar.exito(carpeta ? 'Carpeta actualizada' : 'Carpeta creada', nombre.trim());
      alGuardar();
      alCerrar();
    } catch (errorGuardado) {
      notificar.error('No se pudo guardar la carpeta', errorGuardado);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!carpeta) return;
    const aceptado = await confirmar({
      titulo: `¿Eliminar la carpeta "${carpeta.nombre}"?`,
      descripcion: 'Sus documentos y subcarpetas no se borran: suben un nivel.',
      textoConfirmar: 'Eliminar carpeta',
      peligrosa: true,
    });
    if (!aceptado) return;
    try {
      await apiDocumentos.eliminarCarpeta(carpeta.id);
      notificar.exito('Carpeta eliminada', carpeta.nombre);
      alGuardar();
      alCerrar();
    } catch (errorEliminado) {
      notificar.error('No se pudo eliminar la carpeta', errorEliminado);
    }
  }

  return (
    <Modal
      abierto={estado !== null}
      alCerrar={alCerrar}
      titulo={carpeta ? 'Editar carpeta' : 'Nueva carpeta'}
      ancho="sm"
      pie={
        <>
          {carpeta && (
            <Boton variante="fantasma" icono={Trash2} onClick={() => void eliminar()} className="mr-auto text-peligro hover:text-peligro">
              Eliminar
            </Boton>
          )}
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="formulario-carpeta" cargando={guardando} disabled={!nombre.trim()}>
            Guardar
          </Boton>
        </>
      }
    >
      <form id="formulario-carpeta" onSubmit={(evento) => void guardar(evento)} className="flex flex-col gap-4">
        <Campo etiqueta="Nombre">
          <Entrada value={nombre} maxLength={100} onChange={(evento) => setNombre(evento.target.value)} placeholder="Arquitectura, Guías, Clientes…" />
        </Campo>
        <Campo etiqueta="Dentro de">
          <Selector value={carpetaPadreId} onChange={(evento) => setCarpetaPadreId(evento.target.value)}>
            <option value="">Raíz</option>
            <OpcionesCarpetas carpetas={carpetas} excluir={excluidas} />
          </Selector>
        </Campo>
        <Campo etiqueta="Color">
          <SelectorColor valor={color} alCambiar={setColor} permitirNinguno />
        </Campo>
      </form>
    </Modal>
  );
}

export function ModalEtiqueta({
  etiqueta,
  abierto,
  alCerrar,
  alGuardar,
}: {
  /** null = nueva etiqueta. */
  etiqueta: EtiquetaConConteoDto | null;
  abierto: boolean;
  alCerrar: () => void;
  alGuardar: () => void;
}) {
  const confirmar = usarConfirmacion();
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState<ColorPaleta>('azul');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setNombre(etiqueta?.nombre ?? '');
    setColor(etiqueta?.color ?? 'azul');
  }, [abierto, etiqueta]);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    try {
      await apiDocumentos.guardarEtiqueta(etiqueta?.id ?? null, { nombre: nombre.trim(), color });
      notificar.exito(etiqueta ? 'Etiqueta actualizada' : 'Etiqueta creada', `#${nombre.trim().replace(/^#/, '')}`);
      alGuardar();
      alCerrar();
    } catch (errorGuardado) {
      notificar.error('No se pudo guardar la etiqueta', errorGuardado);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!etiqueta) return;
    const aceptado = await confirmar({
      titulo: `¿Eliminar #${etiqueta.nombre}?`,
      descripcion: `Se quitará de ${etiqueta.totalDocumentos} documento(s). Los documentos no se borran.`,
      textoConfirmar: 'Eliminar etiqueta',
      peligrosa: true,
    });
    if (!aceptado) return;
    try {
      await apiDocumentos.eliminarEtiqueta(etiqueta.id);
      notificar.exito('Etiqueta eliminada', `#${etiqueta.nombre}`);
      alGuardar();
      alCerrar();
    } catch (errorEliminado) {
      notificar.error('No se pudo eliminar la etiqueta', errorEliminado);
    }
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={etiqueta ? 'Editar etiqueta' : 'Nueva etiqueta'}
      ancho="sm"
      pie={
        <>
          {etiqueta && (
            <Boton variante="fantasma" icono={Trash2} onClick={() => void eliminar()} className="mr-auto text-peligro hover:text-peligro">
              Eliminar
            </Boton>
          )}
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="formulario-etiqueta" cargando={guardando} disabled={!nombre.trim()}>
            Guardar
          </Boton>
        </>
      }
    >
      <form id="formulario-etiqueta" onSubmit={(evento) => void guardar(evento)} className="flex flex-col gap-4">
        <Campo etiqueta="Nombre">
          <Entrada value={nombre} maxLength={50} onChange={(evento) => setNombre(evento.target.value)} placeholder="backend, cliente-x, borrador…" />
        </Campo>
        <Campo etiqueta="Color">
          <SelectorColor valor={color} alCambiar={(nuevo) => nuevo && setColor(nuevo)} />
        </Campo>
        <div>
          <span className="text-xs text-texto-3">Vista previa</span>
          <div className="mt-1.5">
            <span className={unirClases('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', paleta[color].suave)}>
              #{nombre.trim().replace(/^#/, '') || 'etiqueta'}
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function ModalMoverDocumento({
  abierto,
  carpetas,
  carpetaActualId,
  alCerrar,
  alMover,
}: {
  abierto: boolean;
  carpetas: CarpetaDocumentoDto[];
  carpetaActualId: string | null;
  alCerrar: () => void;
  alMover: (carpetaId: string | null) => Promise<void>;
}) {
  const [destino, setDestino] = useState('');
  const [moviendo, setMoviendo] = useState(false);

  useEffect(() => {
    if (abierto) setDestino(carpetaActualId ?? '');
  }, [abierto, carpetaActualId]);

  async function mover(evento: FormEvent) {
    evento.preventDefault();
    setMoviendo(true);
    try {
      await alMover(destino || null);
      alCerrar();
    } finally {
      setMoviendo(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Mover a carpeta"
      descripcion="Las subpáginas se mueven con el documento. Si era subpágina, pasa a ser página principal."
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="formulario-mover" icono={Folder} cargando={moviendo} disabled={(destino || null) === carpetaActualId}>
            Mover
          </Boton>
        </>
      }
    >
      <form id="formulario-mover" onSubmit={(evento) => void mover(evento)}>
        <Campo etiqueta="Carpeta de destino">
          <Selector value={destino} onChange={(evento) => setDestino(evento.target.value)}>
            <option value="">Sin carpeta (raíz)</option>
            <OpcionesCarpetas carpetas={carpetas} />
          </Selector>
        </Campo>
      </form>
    </Modal>
  );
}
