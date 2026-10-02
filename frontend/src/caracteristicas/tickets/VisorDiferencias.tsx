import { useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { apiTickets } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import { lenguajeDeArchivo, resaltarLinea } from '../../componentes/editor/resaltado';
import { unirClases } from '../../componentes/ui/primitivos';

type TipoLinea = 'agregada' | 'eliminada' | 'contexto' | 'bloque';

interface LineaDiferencia {
  tipo: TipoLinea;
  texto: string;
  numeroAnterior: number | null;
  numeroNuevo: number | null;
}

/**
 * Interpreta un "unified diff" de GitHub: los encabezados @@ -a,b +c,d @@ fijan la numeración
 * y cada línea empieza con '+', '-' o ' '.
 */
export function interpretarParche(parche: string): LineaDiferencia[] {
  const lineas: LineaDiferencia[] = [];
  let numeroAnterior = 0;
  let numeroNuevo = 0;

  for (const linea of parche.split('\n')) {
    const encabezado = linea.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/);
    if (encabezado) {
      numeroAnterior = Number(encabezado[1]);
      numeroNuevo = Number(encabezado[2]);
      lineas.push({ tipo: 'bloque', texto: linea, numeroAnterior: null, numeroNuevo: null });
    } else if (linea.startsWith('+')) {
      lineas.push({ tipo: 'agregada', texto: linea.slice(1), numeroAnterior: null, numeroNuevo: numeroNuevo++ });
    } else if (linea.startsWith('-')) {
      lineas.push({ tipo: 'eliminada', texto: linea.slice(1), numeroAnterior: numeroAnterior++, numeroNuevo: null });
    } else if (linea.startsWith('\\')) {
      // "\ No newline at end of file": informativo, no es una línea del archivo.
      continue;
    } else {
      lineas.push({ tipo: 'contexto', texto: linea.slice(1), numeroAnterior: numeroAnterior++, numeroNuevo: numeroNuevo++ });
    }
  }

  return lineas;
}

const clasesFila: Record<TipoLinea, string> = {
  agregada: 'bg-exito-suave',
  eliminada: 'bg-peligro-suave',
  contexto: '',
  bloque: 'bg-acento-suave text-acento',
};

const signo: Record<TipoLinea, string> = { agregada: '+', eliminada: '−', contexto: ' ', bloque: '' };

/** Diferencia de un archivo, cargada bajo demanda desde el registro guardado en la última sincronización. */
export function VisorDiferencias({ archivoId, rutaArchivo, urlComparacion }: { archivoId: string; rutaArchivo: string; urlComparacion: string }) {
  const [parche, setParche] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    apiTickets
      .diferenciaArchivo(archivoId)
      .then((diferencia) => setParche(diferencia.parche))
      .catch((errorCarga) => {
        notificar.error('No se pudo cargar la diferencia', errorCarga);
        setParche(null);
      });
  }, [archivoId]);

  if (parche === undefined) {
    return (
      <div className="flex items-center gap-2 px-5 py-4 text-xs text-texto-3">
        <Loader2 className="size-3.5 animate-spin" />
        Cargando diferencia…
      </div>
    );
  }

  return <TablaDiferencias parche={parche} rutaArchivo={rutaArchivo} urlGitHub={urlComparacion} />;
}

/** Dibuja un parche unificado con numeración y resaltado de sintaxis; sin parche, ofrece verlo en GitHub. */
export function TablaDiferencias({ parche, rutaArchivo, urlGitHub }: { parche: string | null; rutaArchivo: string; urlGitHub: string }) {
  if (!parche) {
    return (
      <p className="flex items-center gap-2 px-5 py-4 text-xs text-texto-3">
        GitHub no entrega la diferencia de este archivo (binario o demasiado grande).
        <a href={urlGitHub} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-acento hover:underline">
          Ver en GitHub
          <ExternalLink className="size-3" />
        </a>
      </p>
    );
  }

  const lineas = interpretarParche(parche);
  const lenguaje = lenguajeDeArchivo(rutaArchivo);

  return (
    <div className="codigo-resaltado max-h-[32rem] overflow-auto border-t border-borde bg-superficie">
      <table className="w-full border-collapse font-mono text-xs leading-5">
        <tbody>
          {lineas.map((linea, indice) => (
            <tr key={indice} className={clasesFila[linea.tipo]}>
              {linea.tipo === 'bloque' ? (
                <td colSpan={4} className="px-4 py-1 text-[11px]">
                  {linea.texto}
                </td>
              ) : (
                <>
                  <td className="w-12 select-none border-r border-borde px-2 text-right text-texto-3">{linea.numeroAnterior ?? ''}</td>
                  <td className="w-12 select-none border-r border-borde px-2 text-right text-texto-3">{linea.numeroNuevo ?? ''}</td>
                  <td
                    className={unirClases(
                      'w-5 select-none text-center',
                      linea.tipo === 'agregada' && 'text-exito',
                      linea.tipo === 'eliminada' && 'text-peligro',
                    )}
                  >
                    {signo[linea.tipo]}
                  </td>
                  <td className="whitespace-pre pr-4 text-texto">{linea.texto ? resaltarLinea(linea.texto, lenguaje) : ' '}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
