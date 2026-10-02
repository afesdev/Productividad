import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, ExternalLink, GitBranch, GitCommitHorizontal, GitMerge, LifeBuoy, Loader2, TriangleAlert, X } from 'lucide-react';
import { apiRepositorios } from '../../servicios/api';
import { formatearFechaHora, formatearRelativo } from '../../servicios/formato';
import type { ArchivoCommitDto, DetalleCommitDto, RamaGrafoDto } from '../../servicios/tipos';
import { BotonIcono, unirClases } from '../../componentes/ui/primitivos';
import { BotonCopiar, configuracionCambio } from './PestanaCodigo';
import { TablaDiferencias } from './VisorDiferencias';

/**
 * Detalle de un commit del grafo: mensaje completo, autor, padres, totales y archivos con su diferencia.
 * Se consulta a GitHub al abrirlo (no se guarda). Esc cierra.
 */
export function PanelCommit({
  repositorioId,
  sha,
  ramas,
  shasEnGrafo,
  alElegirCommit,
  alCerrar,
}: {
  repositorioId: string;
  sha: string | null;
  ramas: RamaGrafoDto[];
  shasEnGrafo: Set<string>;
  alElegirCommit: (sha: string) => void;
  alCerrar: () => void;
}) {
  const [detalle, setDetalle] = useState<DetalleCommitDto | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!sha) return;
    let vigente = true;
    setDetalle(null);
    setError(false);
    apiRepositorios
      .commit(repositorioId, sha)
      .then((respuesta) => vigente && setDetalle(respuesta))
      .catch(() => vigente && setError(true));
    return () => {
      vigente = false;
    };
  }, [repositorioId, sha]);

  useEffect(() => {
    if (!sha) return;
    const alPresionar = (evento: KeyboardEvent) => evento.key === 'Escape' && alCerrar();
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [sha, alCerrar]);

  const [titulo, ...cuerpo] = (detalle?.mensaje ?? '').split('\n');
  const descripcion = cuerpo.join('\n').trim();

  return createPortal(
    <AnimatePresence>
      {sha && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div className="absolute inset-0 bg-zinc-950/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={alCerrar} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Detalle del commit"
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 48, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="relative flex h-full w-full max-w-3xl flex-col bg-superficie shadow-flotante"
          >
            <header className="flex items-start justify-between gap-3 border-b border-borde px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600">
                  {detalle && detalle.padres.length > 1 ? <GitMerge className="size-4" /> : <GitCommitHorizontal className="size-4" />}
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold leading-snug tracking-tight">{detalle ? titulo : 'Cargando commit…'}</h2>
                  <p className="mt-0.5 flex items-center gap-1 font-mono text-xs text-texto-3">
                    {sha.slice(0, 7)}
                    <BotonCopiar texto={sha} etiqueta="Copiar SHA completo" />
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {detalle && (
                  <a
                    href={detalle.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-texto-2 transition-colors hover:bg-superficie-2 hover:text-texto"
                  >
                    <ExternalLink className="size-4" />
                    GitHub
                  </a>
                )}
                <BotonIcono icono={X} etiqueta="Cerrar (Esc)" onClick={alCerrar} />
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {error ? (
                <p className="flex items-center gap-2 px-5 py-8 text-sm text-peligro">
                  <TriangleAlert className="size-4" />
                  No se pudo cargar el commit desde GitHub.
                </p>
              ) : !detalle ? (
                <div className="flex items-center gap-2 px-5 py-8 text-sm text-texto-3">
                  <Loader2 className="size-4 animate-spin" />
                  Consultando GitHub…
                </div>
              ) : (
                <div className="flex flex-col gap-5 px-5 py-5">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                    <dt className="text-texto-3">Autor</dt>
                    <dd className="font-medium">{detalle.autor}</dd>
                    <dt className="text-texto-3">Fecha</dt>
                    <dd>
                      {formatearFechaHora(detalle.fecha)} <span className="text-texto-3">· {formatearRelativo(detalle.fecha)}</span>
                    </dd>
                    <dt className="text-texto-3">{detalle.padres.length > 1 ? 'Padres (merge)' : 'Padre'}</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {detalle.padres.length === 0 && <span className="text-texto-3">Commit inicial</span>}
                      {detalle.padres.map((padre) =>
                        shasEnGrafo.has(padre) ? (
                          <button
                            key={padre}
                            type="button"
                            onClick={() => alElegirCommit(padre)}
                            className="rounded-md bg-superficie-2 px-1.5 py-0.5 font-mono text-xs text-texto-2 transition-colors hover:bg-superficie-3 hover:text-texto"
                            title="Ver este commit"
                          >
                            {padre.slice(0, 7)}
                          </button>
                        ) : (
                          <span key={padre} className="rounded-md bg-superficie-2 px-1.5 py-0.5 font-mono text-xs text-texto-3" title="Fuera del historial mostrado">
                            {padre.slice(0, 7)}
                          </span>
                        ),
                      )}
                    </dd>
                    {ramas.length > 0 && (
                      <>
                        <dt className="text-texto-3">Punta de</dt>
                        <dd className="flex flex-wrap gap-1.5">
                          {ramas.map((rama) => (
                            <span key={rama.nombre} className="inline-flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 rounded-md border border-borde px-1.5 py-0.5 font-mono text-xs">
                                <GitBranch className="size-3 text-texto-3" />
                                {rama.nombre}
                              </span>
                              {rama.ticketId && (
                                <Link
                                  to={`/tickets/${rama.ticketId}`}
                                  className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-1.5 py-0.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
                                >
                                  <LifeBuoy className="size-3" />
                                  {rama.claveTicket}
                                </Link>
                              )}
                            </span>
                          ))}
                        </dd>
                      </>
                    )}
                  </dl>

                  {descripcion && <p className="whitespace-pre-wrap rounded-xl border border-borde bg-fondo px-4 py-3 text-sm leading-relaxed text-texto-2">{descripcion}</p>}

                  <section className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-sm font-semibold">
                        {detalle.archivos.length} {detalle.archivos.length === 1 ? 'archivo cambiado' : 'archivos cambiados'}
                      </h3>
                      <span className="font-mono text-xs tabular-nums">
                        <span className="text-exito">+{detalle.lineasAgregadas}</span> <span className="text-peligro">−{detalle.lineasEliminadas}</span>
                      </span>
                    </div>
                    {detalle.archivosTruncados && (
                      <p className="text-xs text-aviso">GitHub muestra como máximo 300 archivos por commit; el resto está en GitHub.</p>
                    )}
                    <ul className="overflow-hidden rounded-xl border border-borde">
                      {detalle.archivos.map((archivo) => (
                        <ArchivoCommit key={archivo.ruta} archivo={archivo} urlCommit={detalle.url} abiertoInicial={detalle.archivos.length <= 3} />
                      ))}
                    </ul>
                  </section>
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function ArchivoCommit({ archivo, urlCommit, abiertoInicial }: { archivo: ArchivoCommitDto; urlCommit: string; abiertoInicial: boolean }) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const { icono: IconoCambio, clase, etiqueta } = configuracionCambio[archivo.tipoCambio];
  return (
    <li className="border-b border-borde last:border-0">
      <button
        type="button"
        onClick={() => setAbierto((actual) => !actual)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-fondo"
      >
        <ChevronRight className={unirClases('size-3.5 shrink-0 text-texto-3 transition-transform', abierto && 'rotate-90')} />
        <IconoCambio className={unirClases('size-4 shrink-0', clase)} aria-label={etiqueta} />
        <span className="min-w-0 flex-1 truncate font-mono text-xs" title={archivo.rutaAnterior ? `${archivo.rutaAnterior} → ${archivo.ruta}` : archivo.ruta}>
          {archivo.rutaAnterior && <span className="text-texto-3">{archivo.rutaAnterior} → </span>}
          {archivo.ruta}
        </span>
        <span className="shrink-0 font-mono text-xs tabular-nums">
          <span className="text-exito">+{archivo.lineasAgregadas}</span> <span className="text-peligro">−{archivo.lineasEliminadas}</span>
        </span>
      </button>
      {abierto && <TablaDiferencias parche={archivo.parche} rutaArchivo={archivo.ruta} urlGitHub={urlCommit} />}
    </li>
  );
}
