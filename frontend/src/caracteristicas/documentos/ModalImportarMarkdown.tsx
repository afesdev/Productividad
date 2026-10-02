import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Check, FileText, FileUp, Loader2, Upload, X } from 'lucide-react';
import { apiDocumentos } from '../../servicios/api';
import { obtenerMensajeError } from '../../servicios/clienteApi';
import { notificar } from '../../servicios/notificaciones';
import type { CarpetaDocumentoDto } from '../../servicios/tipos';
import { Modal } from '../../componentes/ui/Modal';
import { Boton, BotonIcono, Campo, Entrada, Selector, unirClases } from '../../componentes/ui/primitivos';
import { rutaCarpeta } from './ModalesOrganizacion';

const TamanoMaximoBytes = 2 * 1024 * 1024;
const ExtensionesValidas = /\.(md|markdown|mdown|txt)$/i;

interface ArchivoImportado {
  clave: string;
  nombreArchivo: string;
  titulo: string;
  contenido: string;
  /** Contenido original (para volver a interpretarlo si cambia el modo del frontmatter). */
  original: string;
  estado: 'pendiente' | 'importando' | 'listo' | 'error';
  error?: string;
  documentoId?: string;
}

/** Qué hacer con el encabezado YAML (frontmatter) de las notas de Obsidian. */
export type ModoFrontmatter = 'tabla' | 'quitar' | 'texto';

/**
 * Lee el frontmatter YAML sencillo de Obsidian: `clave: valor`, listas con `- elemento` y listas en línea `[a, b]`.
 * Lo que no entiende (mapas anidados) lo conserva como texto.
 */
export function leerFrontmatter(yaml: string): [string, string][] {
  const propiedades: [string, string[]][] = [];
  for (const linea of yaml.split('\n')) {
    const elemento = linea.match(/^\s+-\s*(.*)$/);
    if (elemento && propiedades.length > 0) {
      propiedades[propiedades.length - 1][1].push(limpiarValor(elemento[1]));
      continue;
    }
    const par = linea.match(/^([^\s:#][^:]*):\s*(.*)$/);
    if (!par) continue;
    const valor = par[2].trim();
    const lista = valor.match(/^\[(.*)\]$/);
    propiedades.push([par[1].trim(), lista ? lista[1].split(',').map(limpiarValor).filter(Boolean) : valor ? [limpiarValor(valor)] : []]);
  }
  return propiedades.map(([clave, valores]) => [clave, valores.filter(Boolean).join(', ')]);
}

const limpiarValor = (valor: string) => valor.trim().replace(/^["']|["']$/g, '');

/** "fecha_creacion" → "Fecha creacion" */
const humanizar = (clave: string) => {
  const texto = clave.replace(/[_-]+/g, ' ').trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

/** Propiedades como tabla Markdown (se ve como tabla en el editor de documentos). */
function tablaDePropiedades(propiedades: [string, string][]): string {
  const celda = (texto: string) => (texto || '—').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  return ['| Propiedad | Valor |', '| --- | --- |', ...propiedades.map(([clave, valor]) => `| ${celda(humanizar(clave))} | ${celda(valor)} |`)].join('\n');
}

/**
 * Título y cuerpo de un .md: el título es el nombre del archivo (editable antes de importar) y el frontmatter
 * se convierte en tabla de propiedades, se quita o se deja tal cual según `modo`.
 */
export function interpretarMarkdown(texto: string, nombreArchivo: string, modo: ModoFrontmatter): { titulo: string; contenido: string } {
  let cuerpo = texto.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  // Tolera líneas vacías antes del primer "---" y espacios tras los delimitadores.
  const frontmatter = cuerpo.match(/^\s*---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (frontmatter && modo !== 'texto') {
    const resto = cuerpo.slice(frontmatter[0].length).replace(/^\n+/, '');
    const propiedades = leerFrontmatter(frontmatter[1]);
    cuerpo = modo === 'tabla' && propiedades.length > 0 ? `${tablaDePropiedades(propiedades)}\n\n${resto}` : resto;
  }

  // Solo "_" pasa a espacio: los guiones son habituales en fechas (2026-09-24.md) y nombres.
  const titulo = nombreArchivo.replace(ExtensionesValidas, '').replace(/_+/g, ' ').trim();
  return { titulo: (titulo || 'Sin título').slice(0, 200), contenido: cuerpo };
}

/** Importa archivos Markdown (de Obsidian, GitHub, etc.) como documentos, en la carpeta elegida. */
export function ModalImportarMarkdown({
  abierto,
  carpetas,
  carpetaInicialId,
  alCerrar,
  alImportar,
}: {
  abierto: boolean;
  carpetas: CarpetaDocumentoDto[];
  carpetaInicialId: string | null;
  alCerrar: () => void;
  alImportar: () => void;
}) {
  const navegar = useNavigate();
  const selector = useRef<HTMLInputElement>(null);
  const [archivos, setArchivos] = useState<ArchivoImportado[]>([]);
  const [carpetaId, setCarpetaId] = useState('');
  const [modoFrontmatter, setModoFrontmatter] = useState<ModoFrontmatter>('tabla');
  const [arrastrando, setArrastrando] = useState(false);
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setArchivos([]);
    setCarpetaId(carpetaInicialId ?? '');
    setImportando(false);
  }, [abierto, carpetaInicialId]);

  // Cambiar la opción vuelve a interpretar los archivos aún no importados.
  useEffect(() => {
    setArchivos((actuales) =>
      actuales.map((archivo) =>
        // El título no se toca: puede haberlo editado el usuario.
        archivo.estado === 'pendiente' ? { ...archivo, contenido: interpretarMarkdown(archivo.original, archivo.nombreArchivo, modoFrontmatter).contenido } : archivo,
      ),
    );
  }, [modoFrontmatter]);

  async function agregar(lista: FileList | File[]) {
    const nuevos: ArchivoImportado[] = [];
    const rechazados: string[] = [];
    for (const archivo of Array.from(lista)) {
      if (!ExtensionesValidas.test(archivo.name)) {
        rechazados.push(`${archivo.name} (no es .md)`);
        continue;
      }
      if (archivo.size > TamanoMaximoBytes) {
        rechazados.push(`${archivo.name} (más de 2 MB)`);
        continue;
      }
      const original = await archivo.text();
      nuevos.push({
        clave: `${archivo.name}-${archivo.size}-${archivo.lastModified}`,
        nombreArchivo: archivo.name,
        original,
        estado: 'pendiente',
        ...interpretarMarkdown(original, archivo.name, modoFrontmatter),
      });
    }
    if (rechazados.length > 0) notificar.aviso('Algunos archivos no se añadieron', rechazados.join(' · '));
    setArchivos((actuales) => [...actuales, ...nuevos.filter((nuevo) => !actuales.some((actual) => actual.clave === nuevo.clave))]);
  }

  function alSoltar(evento: DragEvent) {
    evento.preventDefault();
    setArrastrando(false);
    if (evento.dataTransfer.files.length > 0) void agregar(evento.dataTransfer.files);
  }

  const actualizar = (clave: string, cambios: Partial<ArchivoImportado>) =>
    setArchivos((actuales) => actuales.map((archivo) => (archivo.clave === clave ? { ...archivo, ...cambios } : archivo)));

  async function importar() {
    setImportando(true);
    const pendientes = archivos.filter((archivo) => archivo.estado === 'pendiente' || archivo.estado === 'error');
    let creados = 0;
    let ultimoId: string | undefined;
    // En orden: la numeración de rutas y los enlaces [[…]] entre archivos del lote se resuelven de forma estable.
    for (const archivo of pendientes) {
      actualizar(archivo.clave, { estado: 'importando', error: undefined });
      try {
        ultimoId = await apiDocumentos.crear({ titulo: archivo.titulo.trim() || 'Sin título', contenidoMarkdown: archivo.contenido, carpetaDocumentoId: carpetaId || null });
        actualizar(archivo.clave, { estado: 'listo', documentoId: ultimoId });
        creados += 1;
      } catch (errorImportacion) {
        actualizar(archivo.clave, { estado: 'error', error: obtenerMensajeError(errorImportacion) });
      }
    }
    setImportando(false);
    if (creados === 0) return;

    alImportar();
    notificar.exito(creados === 1 ? 'Documento importado' : `${creados} documentos importados`);
    if (creados === pendientes.length) {
      alCerrar();
      if (creados === 1 && ultimoId) navegar(`/documentos/${ultimoId}`);
      else if (carpetaId) navegar(`/documentos?carpeta=${carpetaId}`);
      else navegar('/documentos');
    }
  }

  const porImportar = archivos.filter((archivo) => archivo.estado === 'pendiente' || archivo.estado === 'error').length;
  const carpetasOrdenadas = [...carpetas].sort((a, b) => rutaCarpeta(carpetas, a.id).localeCompare(rutaCarpeta(carpetas, b.id), 'es'));

  return (
    <Modal
      abierto={abierto}
      alCerrar={importando ? () => undefined : alCerrar}
      titulo="Importar Markdown"
      descripcion="Sube notas .md (de Obsidian, GitHub, VS Code…). Cada archivo se convierte en un documento."
      pie={
        <>
          <Boton variante="secundario" onClick={alCerrar} disabled={importando}>
            Cerrar
          </Boton>
          <Boton icono={Upload} cargando={importando} disabled={porImportar === 0} onClick={() => void importar()}>
            {porImportar > 1 ? `Importar ${porImportar} archivos` : 'Importar'}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => selector.current?.click()}
          onDragOver={(evento) => {
            evento.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={alSoltar}
          className={unirClases(
            'flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition',
            arrastrando ? 'border-emerald-300 bg-emerald-50' : 'border-borde-fuerte bg-fondo hover:border-emerald-200 hover:bg-emerald-50/50',
          )}
        >
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
            <FileUp className="size-5" />
          </span>
          <span className="text-sm font-medium">Arrastra tus archivos .md aquí</span>
          <span className="text-xs text-texto-3">o haz clic para elegirlos · varios a la vez · máx. 2 MB cada uno</span>
        </button>
        <input
          ref={selector}
          type="file"
          accept=".md,.markdown,.mdown,.txt,text/markdown"
          multiple
          hidden
          onChange={(evento) => {
            if (evento.target.files) void agregar(evento.target.files);
            evento.target.value = '';
          }}
        />

        {archivos.length > 0 && (
          <ul className="flex max-h-64 flex-col divide-y divide-borde overflow-y-auto rounded-xl border border-borde">
            {archivos.map((archivo) => (
              <li key={archivo.clave} className="flex items-center gap-2 px-3 py-2">
                <span className="grid size-6 shrink-0 place-items-center">
                  {archivo.estado === 'importando' ? (
                    <Loader2 className="size-4 animate-spin text-texto-3" />
                  ) : archivo.estado === 'listo' ? (
                    <Check className="size-4 text-exito" />
                  ) : archivo.estado === 'error' ? (
                    <AlertCircle className="size-4 text-peligro" />
                  ) : (
                    <FileText className="size-4 text-texto-3" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <Entrada
                    value={archivo.titulo}
                    maxLength={200}
                    disabled={archivo.estado === 'listo' || archivo.estado === 'importando'}
                    onChange={(evento) => actualizar(archivo.clave, { titulo: evento.target.value })}
                    aria-label={`Título para ${archivo.nombreArchivo}`}
                    className="h-8 text-sm"
                  />
                  <span className={unirClases('mt-0.5 block truncate text-[11px]', archivo.estado === 'error' ? 'text-peligro' : 'text-texto-3')}>
                    {archivo.estado === 'error' ? archivo.error : `${archivo.nombreArchivo} · ${(archivo.contenido.length / 1024).toFixed(1)} KB`}
                  </span>
                </span>
                {archivo.estado !== 'listo' && archivo.estado !== 'importando' && (
                  <BotonIcono
                    icono={X}
                    etiqueta={`Quitar ${archivo.nombreArchivo}`}
                    tamano="sm"
                    onClick={() => setArchivos((actuales) => actuales.filter((actual) => actual.clave !== archivo.clave))}
                  />
                )}
              </li>
            ))}
          </ul>
        )}

        <Campo etiqueta="Carpeta de destino">
          <Selector value={carpetaId} onChange={(evento) => setCarpetaId(evento.target.value)} disabled={importando}>
            <option value="">Sin carpeta</option>
            {carpetasOrdenadas.map((carpeta) => (
              <option key={carpeta.id} value={carpeta.id}>
                {rutaCarpeta(carpetas, carpeta.id)}
              </option>
            ))}
          </Selector>
        </Campo>

        <Campo etiqueta="Propiedades de Obsidian (encabezado YAML)">
          <Selector value={modoFrontmatter} onChange={(evento) => setModoFrontmatter(evento.target.value as ModoFrontmatter)} disabled={importando}>
            <option value="tabla">Convertir en tabla de propiedades al inicio</option>
            <option value="quitar">Quitar</option>
            <option value="texto">Dejar como texto</option>
          </Selector>
        </Campo>
        <p className="-mt-2 text-xs leading-relaxed text-texto-3">
          El título es el nombre del archivo (puedes cambiarlo en la lista). Los enlaces <code className="rounded bg-superficie-2 px-1 font-mono">[[…]]</code> se conservan; las imágenes con ruta local no se suben (pégalas luego en el documento).
        </p>
      </div>
    </Modal>
  );
}
