import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FileDiff,
  FileMinus2,
  FilePen,
  FilePlus2,
  GitBranch,
  GitCommitHorizontal,
  GitCompareArrows,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  Link2,
  Loader2,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Terminal,
  TriangleAlert,
  Unlink,
} from 'lucide-react';
import { apiRepositorios, apiTickets } from '../../servicios/api';
import { obtenerMensajeError } from '../../servicios/clienteApi';
import { formatearRelativo } from '../../servicios/formato';
import { notificar } from '../../servicios/notificaciones';
import type { ArchivoModificadoDto, DeteccionRamasDto, RamaTicketDto, RepositorioDto, TicketDetalleDto, TipoCambioArchivo } from '../../servicios/tipos';
import { usarConfirmacion } from '../../componentes/ui/DialogoConfirmacion';
import { Modal } from '../../componentes/ui/Modal';
import { Boton, BotonIcono, Campo, EstadoVacio, Entrada, Insignia, MensajeError, Selector, unirClases, type Icono } from '../../componentes/ui/primitivos';
import { referenciaRama } from './presentacionTickets';
import { VisorDiferencias } from './VisorDiferencias';

export function PestanaCodigo({ detalle, alCambiar }: { detalle: TicketDetalleDto; alCambiar: () => Promise<void> }) {
  const [modalRama, setModalRama] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-start gap-2 text-sm text-texto-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-exito" />
          <span>
            GitHub en <strong className="font-medium text-texto">solo lectura</strong>: crea ramas y PRs por tu cuenta; aquí se detectan si el nombre de la rama incluye{' '}
            <code className="rounded bg-superficie-2 px-1 font-mono text-xs">{referenciaRama(detalle.resumen)}</code>
            {!detalle.resumen.numeroExterno && ' (añade el Nº de ticket externo para usar la convención Ticket1468)'}.
          </span>
        </p>
        <Boton icono={ScanSearch} onClick={() => setModalRama(true)}>
          Detectar ramas
        </Boton>
      </div>

      {detalle.ramas.length === 0 ? (
        <EstadoVacio
          icono={GitBranch}
          titulo="Sin ramas vinculadas"
          descripcion={`Crea la rama en git con ${referenciaRama(detalle.resumen)} en el nombre, súbela (git push) y detéctala aquí.`}
          accion={
            <Boton icono={ScanSearch} onClick={() => setModalRama(true)}>
              Detectar ramas
            </Boton>
          }
        />
      ) : (
        detalle.ramas.map((rama) => <TarjetaRama key={rama.id} rama={rama} alCambiar={alCambiar} />)
      )}

      <ModalDetectarRamas
        abierto={modalRama}
        detalle={detalle}
        alCerrar={() => setModalRama(false)}
        alVincular={async () => {
          setModalRama(false);
          await alCambiar();
        }}
      />
    </div>
  );
}

const configuracionPr: Record<string, { etiqueta: string; tono: 'acento' | 'exito' | 'neutro'; icono: Icono }> = {
  Abierto: { etiqueta: 'Abierto', tono: 'acento', icono: GitPullRequest },
  Fusionado: { etiqueta: 'Fusionado', tono: 'exito', icono: GitMerge },
  Cerrado: { etiqueta: 'Cerrado', tono: 'neutro', icono: GitPullRequestClosed },
};

function TarjetaRama({ rama, alCambiar }: { rama: RamaTicketDto; alCambiar: () => Promise<void> }) {
  const confirmar = usarConfirmacion();
  const [sincronizando, setSincronizando] = useState(false);
  const [verCommits, setVerCommits] = useState(false);
  const pr = rama.pullRequestEstado ? configuracionPr[rama.pullRequestEstado] : null;

  async function sincronizar() {
    setSincronizando(true);
    try {
      await notificar.promesa(apiTickets.sincronizar(rama.id), {
        cargando: 'Consultando GitHub…',
        exito: 'Cambios sincronizados',
        error: 'No se pudo sincronizar',
      });
      await alCambiar();
    } catch {
      // Ya notificado.
    } finally {
      setSincronizando(false);
    }
  }

  async function desvincular() {
    const confirmado = await confirmar({
      titulo: 'Desvincular rama',
      descripcion: `${rama.nombreRama} dejará de aparecer en el ticket junto con su registro de archivos. La rama NO se borra en GitHub.`,
      textoConfirmar: 'Desvincular',
      peligrosa: true,
    });
    if (!confirmado) return;
    try {
      await apiTickets.desvincularRama(rama.id);
      notificar.exito('Rama desvinculada', rama.nombreRama);
      await alCambiar();
    } catch (errorAccion) {
      notificar.error('No se pudo desvincular', errorAccion);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-borde bg-superficie shadow-tarjeta">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-borde px-5 py-4">
        <div className="min-w-0">
          <a href={rama.urlRepositorio} target="_blank" rel="noreferrer" className="text-xs text-texto-3 hover:text-texto hover:underline">
            {rama.nombreRepositorio}
          </a>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <GitBranch className="size-4 text-texto-3" />
            <span className="font-mono text-sm font-medium">{rama.nombreRama}</span>
            <BotonCopiar texto={rama.nombreRama} etiqueta="Copiar nombre de la rama" />
          </div>
          <p className="mt-1 text-xs text-texto-3">
            comparada con <span className="font-mono">{rama.ramaBase}</span> · PR {rama.pullRequestNumero ? 'hacia' : 'esperado hacia'} <span className="font-mono">{rama.ramaDestino}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {pr && rama.pullRequestUrl ? (
            <a href={rama.pullRequestUrl} target="_blank" rel="noreferrer">
              <Insignia tono={pr.tono} icono={pr.icono} className="hover:underline">
                PR #{rama.pullRequestNumero} {pr.etiqueta}
              </Insignia>
            </a>
          ) : (
            <span title="Abre el PR en GitHub y pulsa Sincronizar: se detecta solo.">
              <Insignia tono="neutro" icono={GitPullRequest}>
                Sin PR
              </Insignia>
            </span>
          )}
          <Boton tamano="sm" variante="secundario" icono={RefreshCw} cargando={sincronizando} onClick={() => void sincronizar()}>
            Sincronizar
          </Boton>
          <a href={rama.urlComparacion} target="_blank" rel="noreferrer" title="Ver diferencias en GitHub" className="grid size-8 place-items-center rounded-lg text-texto-2 hover:bg-superficie-2 hover:text-texto">
            <GitCompareArrows className="size-4" />
          </a>
          <BotonIcono icono={Unlink} etiqueta="Desvincular rama" tamano="sm" onClick={() => void desvincular()} className="hover:text-peligro" />
        </div>
      </header>

      <div className="grid gap-px bg-borde sm:grid-cols-4">
        <Metrica etiqueta="Commits" valor={rama.totalCommits} />
        <Metrica etiqueta="Archivos" valor={rama.totalArchivos} />
        <Metrica etiqueta="Líneas agregadas" valor={`+${rama.lineasAgregadas}`} clase="text-exito" />
        <Metrica etiqueta="Líneas eliminadas" valor={`−${rama.lineasEliminadas}`} clase="text-peligro" />
      </div>

      <ComandosGit rama={rama} />

      {rama.fechaUltimaSincronizacion === null ? (
        <p className="px-5 py-6 text-center text-sm text-texto-3">Pulsa «Sincronizar» para traer de GitHub los archivos modificados y los commits.</p>
      ) : (
        <>
          <ListaArchivos archivos={rama.archivos} urlComparacion={rama.urlComparacion} />
          {rama.commits.length > 0 && (
            <div className="border-t border-borde">
              <button onClick={() => setVerCommits((actual) => !actual)} className="flex w-full items-center gap-2 px-5 py-3 text-left text-sm font-medium hover:bg-fondo">
                <GitCommitHorizontal className="size-4 text-texto-3" />
                Commits ({rama.commits.length})
                <ChevronDown className={unirClases('ml-auto size-4 text-texto-3 transition', verCommits && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {verCommits && (
                  <motion.ul initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    {rama.commits.map((commit) => (
                      <li key={commit.sha} className="flex items-baseline gap-3 border-t border-borde px-5 py-2.5 text-sm">
                        <a href={commit.url} target="_blank" rel="noreferrer" className="shrink-0 font-mono text-xs text-acento hover:underline">
                          {commit.shaCorto}
                        </a>
                        <span className="min-w-0 flex-1 truncate">{commit.mensaje.split('\n')[0]}</span>
                        <span className="shrink-0 text-xs text-texto-3">
                          {commit.autor} · {formatearRelativo(commit.fechaCommit)}
                        </span>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )}
          <p className="border-t border-borde px-5 py-2 text-right text-xs text-texto-3">Sincronizado {formatearRelativo(rama.fechaUltimaSincronizacion)}</p>
        </>
      )}
    </section>
  );
}

function Metrica({ etiqueta, valor, clase }: { etiqueta: string; valor: number | string; clase?: string }) {
  return (
    <div className="bg-superficie px-5 py-3">
      <p className="text-xs text-texto-3">{etiqueta}</p>
      <p className={unirClases('text-lg font-semibold tabular-nums', clase)}>{valor}</p>
    </div>
  );
}

/** Comandos para trabajar la rama en local, listos para copiar. */
function ComandosGit({ rama }: { rama: RamaTicketDto }) {
  const comandos = `git fetch origin && git switch ${rama.nombreRama}`;
  return (
    <div className="flex items-center gap-3 border-t border-borde bg-fondo px-5 py-2.5">
      <Terminal className="size-4 shrink-0 text-texto-3" />
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-texto-2">{comandos}</code>
      <BotonCopiar texto={comandos} etiqueta="Copiar comandos" />
    </div>
  );
}

export const configuracionCambio: Record<TipoCambioArchivo, { icono: Icono; clase: string; etiqueta: string }> = {
  Agregado: { icono: FilePlus2, clase: 'text-exito', etiqueta: 'Agregado' },
  Modificado: { icono: FilePen, clase: 'text-aviso', etiqueta: 'Modificado' },
  Eliminado: { icono: FileMinus2, clase: 'text-peligro', etiqueta: 'Eliminado' },
  Renombrado: { icono: FileDiff, clase: 'text-acento', etiqueta: 'Renombrado' },
};

function ListaArchivos({ archivos, urlComparacion }: { archivos: ArchivoModificadoDto[]; urlComparacion: string }) {
  const [filtro, setFiltro] = useState('');
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());

  const alternar = (id: string) =>
    setAbiertos((actuales) => {
      const siguientes = new Set(actuales);
      if (siguientes.has(id)) siguientes.delete(id);
      else siguientes.add(id);
      return siguientes;
    });
  if (archivos.length === 0) return <p className="border-t border-borde px-5 py-6 text-center text-sm text-texto-3">La rama aún no tiene cambios respecto a la rama principal.</p>;

  const maximoCambios = Math.max(1, ...archivos.map((archivo) => archivo.lineasAgregadas + archivo.lineasEliminadas));
  const visibles = filtro ? archivos.filter((archivo) => archivo.rutaArchivo.toLowerCase().includes(filtro.toLowerCase())) : archivos;
  const conteoPorTipo = archivos.reduce<Record<string, number>>((conteo, archivo) => ({ ...conteo, [archivo.tipoCambio]: (conteo[archivo.tipoCambio] ?? 0) + 1 }), {});

  return (
    <div className="border-t border-borde">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <span className="flex flex-wrap gap-3 text-xs text-texto-2">
          {(Object.keys(configuracionCambio) as TipoCambioArchivo[])
            .filter((tipo) => conteoPorTipo[tipo])
            .map((tipo) => {
              const { icono: IconoCambio, clase, etiqueta } = configuracionCambio[tipo];
              return (
                <span key={tipo} className="inline-flex items-center gap-1">
                  <IconoCambio className={unirClases('size-3.5', clase)} />
                  {conteoPorTipo[tipo]} {etiqueta.toLowerCase()}
                  {conteoPorTipo[tipo] === 1 ? '' : 's'}
                </span>
              );
            })}
        </span>
        <span className="flex items-center gap-2">
          {archivos.some((archivo) => archivo.tieneParche) && (
            <button
              onClick={() => setAbiertos(abiertos.size > 0 ? new Set() : new Set(visibles.filter((archivo) => archivo.tieneParche).map((archivo) => archivo.id)))}
              className="text-xs text-texto-2 hover:text-texto hover:underline"
            >
              {abiertos.size > 0 ? 'Contraer todo' : 'Ver todas las diferencias'}
            </button>
          )}
          {archivos.length > 8 && <Entrada value={filtro} onChange={(evento) => setFiltro(evento.target.value)} placeholder="Filtrar archivos…" className="h-8 w-56 text-xs" />}
        </span>
      </div>
      {!archivos.some((archivo) => archivo.tieneParche) && (
        <p className="border-t border-borde bg-fondo px-5 py-2 text-xs text-texto-3">Sincroniza de nuevo para guardar las diferencias línea por línea de cada archivo.</p>
      )}
      <ul>
        {visibles.map((archivo) => {
          const { icono: IconoCambio, clase, etiqueta } = configuracionCambio[archivo.tipoCambio];
          const separador = archivo.rutaArchivo.lastIndexOf('/');
          const carpeta = separador >= 0 ? archivo.rutaArchivo.slice(0, separador + 1) : '';
          const nombre = archivo.rutaArchivo.slice(separador + 1);
          const total = archivo.lineasAgregadas + archivo.lineasEliminadas;
          const abierto = abiertos.has(archivo.id);
          return (
            <li key={archivo.id} className="border-t border-borde first:border-t-0">
            <button
              type="button"
              onClick={() => alternar(archivo.id)}
              aria-expanded={abierto}
              className={unirClases('flex w-full items-center gap-3 px-5 py-2 text-left text-sm hover:bg-fondo', abierto && 'bg-fondo')}
            >
              <ChevronRight className={unirClases('size-3.5 shrink-0 text-texto-3 transition', abierto && 'rotate-90')} />
              <IconoCambio className={unirClases('size-4 shrink-0', clase)} aria-label={etiqueta} />
              <span className="min-w-0 flex-1 truncate font-mono text-xs" title={archivo.rutaAnterior ? `${archivo.rutaAnterior} → ${archivo.rutaArchivo}` : archivo.rutaArchivo}>
                <span className="text-texto-3">{carpeta}</span>
                <span className="font-medium text-texto">{nombre}</span>
                {archivo.rutaAnterior && <span className="text-texto-3"> (antes {archivo.rutaAnterior})</span>}
              </span>
              <span className="w-24 shrink-0 text-right font-mono text-xs tabular-nums">
                <span className="text-exito">+{archivo.lineasAgregadas}</span> <span className="text-peligro">−{archivo.lineasEliminadas}</span>
              </span>
              <span className="flex h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-superficie-2" aria-hidden>
                <span className="bg-exito" style={{ width: `${(archivo.lineasAgregadas / maximoCambios) * 100}%` }} />
                <span className="bg-peligro" style={{ width: `${(archivo.lineasEliminadas / maximoCambios) * 100}%` }} />
                {total === 0 && <span className="w-full bg-borde-fuerte" />}
              </span>
            </button>
            {abierto && <VisorDiferencias archivoId={archivo.id} rutaArchivo={archivo.rutaArchivo} urlComparacion={urlComparacion} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function BotonCopiar({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <BotonIcono
      icono={copiado ? Check : Copy}
      etiqueta={etiqueta}
      tamano="sm"
      onClick={() => {
        void navigator.clipboard.writeText(texto).then(() => {
          setCopiado(true);
          window.setTimeout(() => setCopiado(false), 1500);
        });
      }}
    />
  );
}

/**
 * Busca en los repositorios registrados las ramas cuyo nombre contiene la clave del ticket (creadas fuera de la app)
 * y permite vincularlas. Si la rama no sigue la convención, se vincula por nombre exacto.
 */
function ModalDetectarRamas({ abierto, detalle, alCerrar, alVincular }: { abierto: boolean; detalle: TicketDetalleDto; alCerrar: () => void; alVincular: () => Promise<void> }) {
  const [deteccion, setDeteccion] = useState<DeteccionRamasDto | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [repositorios, setRepositorios] = useState<RepositorioDto[] | null>(null);
  const [repositorioId, setRepositorioId] = useState('');
  const [nombreRama, setNombreRama] = useState('');
  const [vinculando, setVinculando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function detectar() {
    setBuscando(true);
    setError(null);
    try {
      setDeteccion(await apiTickets.detectarRamas(detalle.resumen.id));
    } catch (errorDeteccion) {
      setError(obtenerMensajeError(errorDeteccion));
    } finally {
      setBuscando(false);
    }
  }

  useEffect(() => {
    if (!abierto) return;
    setDeteccion(null);
    setNombreRama('');
    void detectar();
    apiRepositorios
      .listar()
      .then((lista) => {
        setRepositorios(lista);
        setRepositorioId((actual) => actual || lista[0]?.id || '');
      })
      .catch((errorCarga) => setError(obtenerMensajeError(errorCarga)));
    // Solo al abrir el modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  async function vincular(idRepositorio: string, rama: string) {
    setVinculando(`${idRepositorio}:${rama}`);
    setError(null);
    try {
      await apiTickets.vincularRama(detalle.resumen.id, idRepositorio, rama);
      notificar.exito('Rama vinculada', rama);
      await alVincular();
    } catch (errorVinculo) {
      setError(obtenerMensajeError(errorVinculo));
    } finally {
      setVinculando(null);
    }
  }

  function vincularManual(evento: FormEvent) {
    evento.preventDefault();
    if (repositorioId && nombreRama.trim()) void vincular(repositorioId, nombreRama.trim());
  }

  const repositorioManual = repositorios?.find((opcion) => opcion.id === repositorioId);
  const comandoCrear = deteccion ? `git switch -c ${deteccion.nombreSugerido} && git push -u origin ${deteccion.nombreSugerido}` : '';

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Ramas del ticket"
      ancho="lg"
      descripcion={`Se buscan ramas con ${referenciaRama(detalle.resumen)} en el nombre en tus repositorios. Al vincular, el ticket pasa a desarrollo.`}
      pie={
        <Boton variante="secundario" onClick={alCerrar}>
          Cerrar
        </Boton>
      }
    >
      {repositorios?.length === 0 ? (
        <div className="flex flex-col items-start gap-3 text-sm text-texto-2">
          <p>Aún no hay repositorios registrados.</p>
          <Link to="/tickets/repositorios" className="font-medium text-texto underline underline-offset-4">
            Registrar un repositorio
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Detectadas en GitHub</h3>
              <Boton variante="fantasma" tamano="sm" icono={RefreshCw} cargando={buscando} onClick={() => void detectar()}>
                Buscar de nuevo
              </Boton>
            </div>
            {deteccion === null ? (
              <p className="flex items-center gap-2 py-3 text-sm text-texto-3">
                <Loader2 className="size-4 animate-spin" />
                Buscando ramas con {referenciaRama(detalle.resumen)}…
              </p>
            ) : deteccion.ramas.length === 0 ? (
              <p className="rounded-lg border border-dashed border-borde-fuerte px-3 py-3 text-sm text-texto-3">
                Ninguna rama nueva contiene {deteccion.claves.join(' ni ')}. Créala y súbela; luego pulsa «Buscar de nuevo».
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-borde overflow-hidden rounded-lg border border-borde">
                {deteccion.ramas.map((rama) => (
                  <li key={`${rama.repositorioId}:${rama.nombreRama}`} className="flex items-start gap-3 px-3 py-2.5">
                    <GitBranch className="mt-0.5 size-4 shrink-0 text-texto-3" />
                    <span className="min-w-0 flex-1">
                      <span className="block break-all font-mono text-sm leading-snug">{rama.nombreRama}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-texto-3">
                        <span className="break-all">{rama.nombreCompleto}</span>
                        {rama.nombreProyecto && (
                          <span className={unirClases('rounded px-1', rama.esDeProyectoDelTicket ? 'bg-violet-50 text-violet-800' : 'bg-superficie-2 text-texto-2')}>
                            {rama.nombreProyecto}
                          </span>
                        )}
                      </span>
                    </span>
                    <Boton
                      tamano="sm"
                      icono={Link2}
                      cargando={vinculando === `${rama.repositorioId}:${rama.nombreRama}`}
                      onClick={() => void vincular(rama.repositorioId, rama.nombreRama)}
                    >
                      Vincular
                    </Boton>
                  </li>
                ))}
              </ul>
            )}
            {deteccion?.avisos.map((aviso) => (
              <p key={aviso} className="flex items-start gap-2 text-xs text-aviso">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                {aviso}
              </p>
            ))}
          </section>

          {deteccion && (
            <section className="flex flex-col gap-2 rounded-lg bg-fondo p-3">
              <h3 className="text-xs font-medium text-texto-2">Nombre sugerido para crear la rama</h3>
              <div className="flex items-start gap-2">
                <code className="min-w-0 flex-1 break-all pt-1 font-mono text-xs">{deteccion.nombreSugerido}</code>
                <BotonCopiar texto={deteccion.nombreSugerido} etiqueta="Copiar nombre" />
              </div>
              <div className="flex items-start gap-2 border-t border-borde pt-2">
                <Terminal className="mt-1 size-3.5 shrink-0 text-texto-3" />
                <code className="min-w-0 flex-1 break-all pt-1 font-mono text-xs text-texto-2">{comandoCrear}</code>
                <BotonCopiar texto={comandoCrear} etiqueta="Copiar comandos" />
              </div>
            </section>
          )}

          <form onSubmit={vincularManual} className="flex flex-col gap-3 border-t border-borde pt-4">
            <div>
              <h3 className="text-sm font-medium">Vincular por nombre exacto</h3>
              <p className="text-xs text-texto-3">Para ramas que no llevan {referenciaRama(detalle.resumen)} en el nombre.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Repositorio">
                <Selector value={repositorioId} onChange={(evento) => setRepositorioId(evento.target.value)}>
                  {repositorios?.map((opcion) => (
                    <option key={opcion.id} value={opcion.id}>
                      {opcion.nombre} · {opcion.nombreCompleto}
                    </option>
                  ))}
                </Selector>
              </Campo>
              <Campo etiqueta="Rama">
                <Entrada value={nombreRama} onChange={(evento) => setNombreRama(evento.target.value.replace(/\s/g, '-'))} placeholder="feature/mi-rama" className="font-mono" />
              </Campo>
            </div>
            <div className="flex items-center justify-between gap-3">
              {repositorioManual ? (
                <a href={repositorioManual.urlWeb} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-texto-3 hover:text-texto hover:underline">
                  Abrir en GitHub
                  <ExternalLink className="size-3" />
                </a>
              ) : (
                <span />
              )}
              <Boton
                type="submit"
                variante="secundario"
                icono={Link2}
                disabled={!repositorioId || !nombreRama.trim()}
                cargando={vinculando === `${repositorioId}:${nombreRama.trim()}`}
              >
                Vincular
              </Boton>
            </div>
          </form>

          <MensajeError mensaje={error} />
        </div>
      )}
    </Modal>
  );
}
