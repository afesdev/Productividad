import { useEffect, useMemo, useState } from 'react';
import { Check, ClipboardCopy } from 'lucide-react';
import { apiSnippets } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import type { SnippetDto } from '../../servicios/tipos';
import { resaltarLinea } from '../../componentes/editor/resaltado';
import { Boton, unirClases } from '../../componentes/ui/primitivos';
import { aplicarVariables, guardarValores, leerValores, lenguajeResaltado, variablesDe } from './utilidadesSnippets';

/**
 * Código resaltado con sus variables {{…}} para rellenar y el botón de copiar (o la acción que se pase, como
 * "Insertar" en el editor). Lo usan la página de snippets, el panel de referencia y el selector del editor.
 */
export function VistaSnippet({
  snippet,
  compacto = false,
  textoAccion = 'Copiar',
  alUsar,
}: {
  snippet: SnippetDto;
  compacto?: boolean;
  textoAccion?: string;
  /** Si se pasa, el botón la llama con el contenido ya sustituido en vez de copiar al portapapeles. */
  alUsar?: (contenido: string) => void;
}) {
  const variables = useMemo(() => variablesDe(snippet.contenido), [snippet.contenido]);
  const [valores, setValores] = useState<Record<string, string>>(() => leerValores(snippet.id));
  const [copiado, setCopiado] = useState(false);

  useEffect(() => setValores(leerValores(snippet.id)), [snippet.id]);

  const final = aplicarVariables(snippet.contenido, valores);
  const faltan = variables.filter((variable) => !valores[variable]?.trim());

  async function usar() {
    guardarValores(snippet.id, valores);
    void apiSnippets.registrarUso(snippet.id);
    if (alUsar) {
      alUsar(final);
      return;
    }
    try {
      await navigator.clipboard.writeText(final);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1500);
      if (faltan.length) notificar.aviso('Copiado con variables vacías', faltan.map((variable) => `{{${variable}}}`).join(', '));
    } catch {
      notificar.error('No se pudo copiar', 'El navegador bloqueó el portapapeles.');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <pre
        className={unirClases(
          'codigo-resaltado overflow-auto rounded-lg border border-borde bg-superficie-2 px-3 py-2.5 font-mono text-[12.5px] leading-relaxed',
          compacto ? 'max-h-48' : 'max-h-[28rem]',
        )}
      >
        <code>{resaltarLinea(final, lenguajeResaltado(snippet.lenguaje))}</code>
      </pre>

      {variables.length > 0 && (
        <div className={unirClases('grid gap-2', compacto ? 'grid-cols-1' : 'sm:grid-cols-2')}>
          {variables.map((variable) => (
            <label key={variable} className="flex items-center gap-2 text-xs">
              <span className="w-28 shrink-0 truncate font-mono text-texto-2" title={variable}>
                {variable}
              </span>
              <input
                value={valores[variable] ?? ''}
                onChange={(evento) => setValores((actual) => ({ ...actual, [variable]: evento.target.value }))}
                onKeyDown={(evento) => evento.key === 'Enter' && void usar()}
                placeholder={`{{${variable}}}`}
                className="h-8 min-w-0 flex-1 rounded-md border border-borde bg-superficie px-2 font-mono text-xs focus:border-acento focus:outline-none"
              />
            </label>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        {faltan.length > 0 && <span className="text-[11px] text-texto-3">{faltan.length === 1 ? 'Falta 1 variable' : `Faltan ${faltan.length} variables`}</span>}
        <Boton tamano="sm" icono={copiado ? Check : ClipboardCopy} onClick={() => void usar()}>
          {copiado ? 'Copiado' : textoAccion}
        </Boton>
      </div>
    </div>
  );
}
