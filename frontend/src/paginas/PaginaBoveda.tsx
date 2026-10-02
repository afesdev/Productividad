import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Copy, Eye, EyeOff, KeyRound, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { apiBoveda } from '../servicios/api';
import { obtenerMensajeError } from '../servicios/clienteApi';
import { notificar } from '../servicios/notificaciones';
import type { EntornoBoveda, SecretoResumenDto } from '../servicios/tipos';
import { usarConfirmacion } from '../componentes/ui/DialogoConfirmacion';
import { Modal } from '../componentes/ui/Modal';
import { Boton, BotonIcono, Campo, EncabezadoPagina, EstadoVacio, Entrada, Esqueleto, Insignia, MensajeError, Selector } from '../componentes/ui/primitivos';

const entornos: { valor: EntornoBoveda; etiqueta: string }[] = [
  { valor: 'Desarrollo', etiqueta: 'Desarrollo' },
  { valor: 'Pruebas', etiqueta: 'Pruebas' },
  { valor: 'Produccion', etiqueta: 'Producción' },
  { valor: 'Local', etiqueta: 'Local' },
];
const etiquetaEntorno = Object.fromEntries(entornos.map((entorno) => [entorno.valor, entorno.etiqueta])) as Record<EntornoBoveda, string>;
const SEGUNDOS_VISIBLE = 30;

export function PaginaBoveda() {
  const [secretos, setSecretos] = useState<SecretoResumenDto[] | null>(null);
  const [filtroEntorno, setFiltroEntorno] = useState<EntornoBoveda | ''>('');
  const [modalAbierto, setModalAbierto] = useState(false);

  const recargar = useCallback(async () => {
    try {
      setSecretos(await apiBoveda.listar(undefined, filtroEntorno || undefined));
    } catch (errorCarga) {
      notificar.error('No se pudo cargar la bóveda', errorCarga);
    }
  }, [filtroEntorno]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const alCerrarModal = useCallback(() => setModalAbierto(false), []);
  const alGuardarSecreto = useCallback(async () => {
    setModalAbierto(false);
    await recargar();
  }, [recargar]);

  return (
    <>
      <EncabezadoPagina
        titulo="Bóveda de secretos"
        descripcion="Variables de entorno cifradas con AES-256-GCM. Los valores solo se descifran al revelarlos."
        acciones={
          <>
            <Selector aria-label="Filtrar por entorno" value={filtroEntorno} onChange={(evento) => setFiltroEntorno(evento.target.value as EntornoBoveda | '')} className="w-44">
              <option value="">Todos los entornos</option>
              {entornos.map((entorno) => (
                <option key={entorno.valor} value={entorno.valor}>
                  {entorno.etiqueta}
                </option>
              ))}
            </Selector>
            <Boton icono={Plus} onClick={() => setModalAbierto(true)}>
              Nuevo secreto
            </Boton>
          </>
        }
      />

      {secretos === null ? (
        <div className="flex flex-col gap-2">
          <Esqueleto className="h-14 rounded-xl" />
          <Esqueleto className="h-14 rounded-xl" />
        </div>
      ) : secretos.length === 0 ? (
        <EstadoVacio
          icono={ShieldCheck}
          titulo="La bóveda está vacía"
          descripcion="Guarda tu primera variable, por ejemplo DATABASE_URL."
          accion={
            <Boton icono={Plus} onClick={() => setModalAbierto(true)}>
              Nuevo secreto
            </Boton>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-borde bg-superficie shadow-tarjeta">
          <table className="w-full text-sm">
            <thead className="border-b border-borde bg-fondo text-left text-xs font-medium text-texto-2">
              <tr>
                <th className="px-5 py-3 font-medium">Clave</th>
                <th className="px-5 py-3 font-medium">Entorno</th>
                <th className="px-5 py-3 font-medium">Valor</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {secretos.map((secreto) => (
                  <FilaSecreto key={secreto.id} secreto={secreto} alEliminar={recargar} />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      <ModalSecreto
        abierto={modalAbierto}
        alCerrar={alCerrarModal}
        alGuardar={alGuardarSecreto}
      />
    </>
  );
}

function FilaSecreto({ secreto, alEliminar }: { secreto: SecretoResumenDto; alEliminar: () => Promise<void> }) {
  const confirmar = usarConfirmacion();
  const [valor, setValor] = useState<string | null>(null);
  const temporizador = useRef<number>();

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  async function alternarVisibilidad() {
    if (valor !== null) {
      setValor(null);
      return;
    }
    try {
      const revelado = await apiBoveda.revelar(secreto.id);
      setValor(revelado.valor);
      // El valor se oculta solo para no dejarlo expuesto en pantalla.
      temporizador.current = window.setTimeout(() => setValor(null), SEGUNDOS_VISIBLE * 1000);
    } catch (errorRevelado) {
      notificar.error('No se pudo revelar el secreto', errorRevelado);
    }
  }

  async function copiar() {
    try {
      const revelado = valor ?? (await apiBoveda.revelar(secreto.id)).valor;
      await navigator.clipboard.writeText(revelado);
      notificar.exito('Copiado al portapapeles', secreto.nombreClave);
    } catch (errorCopia) {
      notificar.error('No se pudo copiar', errorCopia);
    }
  }

  async function eliminar() {
    const confirmado = await confirmar({
      titulo: 'Eliminar secreto',
      descripcion: `${secreto.nombreClave} (${etiquetaEntorno[secreto.entorno]}) se eliminará definitivamente. Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligrosa: true,
    });
    if (!confirmado) return;
    try {
      await apiBoveda.eliminar(secreto.id);
      notificar.exito('Secreto eliminado', secreto.nombreClave);
      await alEliminar();
    } catch (errorEliminacion) {
      notificar.error('No se pudo eliminar', errorEliminacion);
    }
  }

  return (
    <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-borde last:border-0 hover:bg-fondo">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-superficie-2 text-texto-2">
            <KeyRound className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono text-[13px] font-medium">{secreto.nombreClave}</p>
            {secreto.descripcion && <p className="truncate text-xs text-texto-3">{secreto.descripcion}</p>}
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <Insignia tono={secreto.entorno === 'Produccion' ? 'peligro' : secreto.entorno === 'Pruebas' ? 'aviso' : 'neutro'}>{etiquetaEntorno[secreto.entorno]}</Insignia>
      </td>
      <td className="max-w-xs px-5 py-3 font-mono text-xs">
        {valor !== null ? <span className="break-all text-texto">{valor}</span> : <span className="tracking-widest text-texto-3">••••••••••••</span>}
      </td>
      <td className="whitespace-nowrap px-5 py-3 text-right">
        <BotonIcono icono={valor !== null ? EyeOff : Eye} etiqueta={valor !== null ? 'Ocultar' : 'Revelar'} onClick={() => void alternarVisibilidad()} />
        <BotonIcono icono={Copy} etiqueta="Copiar" onClick={() => void copiar()} />
        <BotonIcono icono={Trash2} etiqueta="Eliminar" onClick={() => void eliminar()} className="hover:text-peligro" />
      </td>
    </motion.tr>
  );
}

function ModalSecreto({ abierto, alCerrar, alGuardar }: { abierto: boolean; alCerrar: () => void; alGuardar: () => Promise<void> }) {
  const [nombreClave, setNombreClave] = useState('');
  const [valor, setValor] = useState('');
  const [entorno, setEntorno] = useState<EntornoBoveda>('Desarrollo');
  const [descripcion, setDescripcion] = useState('');
  const [valorVisible, setValorVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cerrar = useCallback(() => {
    setError(null);
    setValor('');
    alCerrar();
  }, [alCerrar]);

  const handleNombreClaveChange = useCallback((evento: React.ChangeEvent<HTMLInputElement>) => setNombreClave(evento.target.value), []);
  const handleValorChange = useCallback((evento: React.ChangeEvent<HTMLInputElement>) => setValor(evento.target.value), []);
  const handleDescripcionChange = useCallback((evento: React.ChangeEvent<HTMLInputElement>) => setDescripcion(evento.target.value), []);
  const handleEntornoChange = useCallback((evento: React.ChangeEvent<HTMLSelectElement>) => setEntorno(evento.target.value as EntornoBoveda), []);

  const enviar = useCallback(async (evento: FormEvent) => {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await apiBoveda.guardar({ nombreClave, valor, entorno, descripcion: descripcion || undefined });
      notificar.exito('Secreto guardado', `${nombreClave} · ${etiquetaEntorno[entorno]}`);
      setNombreClave('');
      setValor('');
      setDescripcion('');
      await alGuardar();
    } catch (errorGuardado) {
      setError(obtenerMensajeError(errorGuardado));
    } finally {
      setEnviando(false);
    }
  }, [nombreClave, valor, entorno, descripcion, alGuardar]);

  return (
    <Modal
      abierto={abierto}
      alCerrar={cerrar}
      titulo="Nuevo secreto"
      descripcion="Si la clave ya existe en ese entorno, su valor se reemplaza."
      pie={
        <>
          <Boton variante="secundario" onClick={cerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="formulario-secreto" cargando={enviando}>
            Guardar secreto
          </Boton>
        </>
      }
    >
      <form id="formulario-secreto" onSubmit={enviar} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <Campo etiqueta="Clave">
            <Entrada
              required
              pattern="[A-Za-z_][A-Za-z0-9_.\-]*"
              title="Letras, números, guion bajo, punto o guion; no puede empezar con número"
              value={nombreClave}
              onChange={handleNombreClaveChange}
              placeholder="DATABASE_URL"
              className="font-mono"
            />
          </Campo>
          <Campo etiqueta="Entorno">
            <Selector value={entorno} onChange={handleEntornoChange}>
              {entornos.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.etiqueta}
                </option>
              ))}
            </Selector>
          </Campo>
        </div>
        <Campo etiqueta="Valor">
          <div className="relative">
            <Entrada
              required
              type={valorVisible ? 'text' : 'password'}
              autoComplete="off"
              value={valor}
              onChange={handleValorChange}
              className="pr-10 font-mono"
            />
            <BotonIcono
              type="button"
              icono={valorVisible ? EyeOff : Eye}
              etiqueta={valorVisible ? 'Ocultar valor' : 'Mostrar valor'}
              tamano="sm"
              onClick={() => setValorVisible((actual) => !actual)}
              className="absolute right-1 top-1"
            />
          </div>
        </Campo>
        <Campo etiqueta="Descripción (opcional)">
          <Entrada value={descripcion} maxLength={250} onChange={handleDescripcionChange} placeholder="Cadena de conexión principal" />
        </Campo>
        <MensajeError mensaje={error} />
      </form>
    </Modal>
  );
}
