import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type FormEvent } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Node as NodoProseMirror } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import { BloqueCodigo } from './BloqueCodigo';
import { Callout, Desplegable } from './BloquesDocumentacion';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Table, TableKit } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import { Markdown } from 'tiptap-markdown';
import { lowlight } from './resaltado';
import {
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  Bold,
  Code,
  Columns3,
  Italic,
  Link2,
  Loader2,
  Rows3,
  Sparkles,
  Strikethrough,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
  Unlink,
} from 'lucide-react';
import { apiArchivos, apiIa, type AccionTextoIA } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import type { DestinoAdjunto } from '../../servicios/tipos';
import { unirClases, type Icono } from '../ui/primitivos';
import { ComandosBarra } from './ComandosBarra';
import { repararMarkdown } from './repararMarkdown';
import { revisarPropuestaIA } from './RevisionIA';
import { registrarReglaTablaHtml, serializarTablaHtml, tieneCeldasCombinadas } from './tablaHtml';
import { WikiLinks, type OpcionesWikiLinks } from './WikiLinks';


/**
 * Markdown del editor. tiptap-markdown escapa los corchetes ("\[\[WEB-105\]\]"):
 * se revierte para que los WikiLinks se guarden tal cual y el backend los detecte.
 */
export function obtenerMarkdown(editor: Editor): string {
  return desescaparWikiLinks(almacenMarkdown(editor).getMarkdown());
}

type AlmacenMarkdown = { getMarkdown(): string; serializer: { serialize(contenido: unknown): string } };
const almacenMarkdown = (editor: Editor) => (editor.storage as unknown as { markdown: AlmacenMarkdown }).markdown;

const desescaparWikiLinks = (markdown: string) =>
  markdown.replace(/\\\[\\\[(.+?)\\\]\\\]/g, (_, interior: string) => `[[${interior.replace(/\\([\\`*_~[\]#+\-.!|<>])/g, '$1')}]]`);

export const etiquetasAccionIA: Record<AccionTextoIA, { etiqueta: string; cargando: string }> = {
  Mejorar: { etiqueta: 'Mejorar redacción', cargando: 'Mejorando la redacción…' },
  Corregir: { etiqueta: 'Corregir ortografía', cargando: 'Corrigiendo ortografía y tildes…' },
  Resumir: { etiqueta: 'Resumir', cargando: 'Resumiendo…' },
};

/**
 * Reescribe con IA la selección (o todo el documento), muestra el antes/después y, si se acepta, reemplaza el rango.
 * El editor queda bloqueado mientras responde y durante la revisión (el rango sigue siendo válido); Ctrl+Z deshace.
 */
export async function transformarConIA(editor: Editor, accion: AccionTextoIA, todoElDocumento = false): Promise<boolean> {
  const { from, to, empty } = editor.state.selection;
  const rango = todoElDocumento || empty ? { from: 0, to: editor.state.doc.content.size } : { from, to };
  const markdown = desescaparWikiLinks(almacenMarkdown(editor).serializer.serialize(editor.state.doc.slice(rango.from, rango.to).content)).trim();
  if (!markdown) {
    notificar.aviso('No hay texto', 'Escribe o selecciona algo para usar la IA.');
    return false;
  }

  const eraEditable = editor.isEditable;
  editor.setEditable(false, false);
  const peticion = apiIa.transformarTexto(accion, markdown);
  notificar.promesa(peticion, { cargando: etiquetasAccionIA[accion].cargando, exito: 'Propuesta lista para revisar', error: 'La IA no pudo procesar el texto' });
  try {
    const resultado = repararMarkdown(await peticion);
    const aplicar = await revisarPropuestaIA({ accion, titulo: etiquetasAccionIA[accion].etiqueta, original: markdown, resultado });
    editor.setEditable(eraEditable, false);
    if (!aplicar) return false;
    editor.chain().focus().insertContentAt(rango, resultado).run();
    notificar.exito('Cambios aplicados', 'Ctrl+Z para deshacer');
    return true;
  } catch {
    editor.setEditable(eraEditable, false);
    return false;
  }
}

/**
 * tiptap-markdown serializa la imagen como elemento en línea y no cierra el bloque: el siguiente quedaba pegado
 * ("![a](url)# Título") y al reabrir el título se volvía texto. Aquí la imagen es un bloque propio.
 */
const ImagenBloque = Image.extend({
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        serialize(estado: { write: (texto: string) => void; esc: (texto: string) => string; closeBlock: (nodo: unknown) => void }, nodo: { attrs: { src?: string; alt?: string; title?: string } }) {
          const { src = '', alt = '', title } = nodo.attrs;
          const titulo = title ? ` "${title.replace(/"/g, '\\"')}"` : '';
          estado.write(`![${estado.esc(alt)}](${src.replace(/[()]/g, '\\$&')}${titulo})`);
          estado.closeBlock(nodo);
        },
        parse: {},
      },
    };
  },
});

type EstadoSerializador = {
  out: string;
  write: (texto: string) => void;
  ensureNewLine: () => void;
  flushClose: (tamano?: number) => void;
  closeBlock: (nodo: unknown) => void;
  renderInline: (nodo: NodoPM) => void;
};
type NodoPM = {
  isTextblock: boolean;
  attrs: Record<string, unknown>;
  type: { name: string };
  forEach: (fn: (hijo: NodoPM) => void) => void;
  descendants: (fn: (hijo: NodoPM, posicion: number, padre: NodoPM | null) => boolean) => void;
};

/** Contenido de una celda en una sola línea: párrafos unidos con " · ", listas con "•" y "|" escapado. */
function textoCelda(estado: EstadoSerializador, celda: NodoPM): string {
  const partes: string[] = [];
  celda.descendants((hijo, _posicion, padre) => {
    if (!hijo.isTextblock) return true;
    const inicio = estado.out.length;
    estado.renderInline(hijo);
    let texto = estado.out.slice(inicio).replace(/\s*\n\s*/g, ' ').replace(/(?<!\\)\|/g, '\\|').trim();
    estado.out = estado.out.slice(0, inicio);
    if (padre && (padre.type.name === 'listItem' || padre.type.name === 'taskItem')) texto = `• ${texto}`;
    if (texto) partes.push(texto);
    return false;
  });
  return partes.reduce((unido, parte) => (unido ? `${unido}${parte.startsWith('•') ? ' ' : ' · '}${parte}` : parte), '');
}

/**
 * tiptap-markdown solo escribe tablas "simples" (fila de encabezado, un párrafo por celda); las de Word
 * (sin encabezado, varios párrafos o celdas combinadas) se guardaban como "[table]" y se perdían.
 * Aquí toda tabla se escribe como tabla GFM (la primera fila hace de encabezado), salvo las que tienen celdas
 * combinadas: GFM no las admite y se guardan como HTML (ver tablaHtml.ts).
 */
const TablaMarkdown = Table.extend({
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        serialize(estado: EstadoSerializador, tabla: NodoPM) {
          estado.flushClose(2);
          const nodoTabla = tabla as unknown as NodoProseMirror;
          if (tieneCeldasCombinadas(nodoTabla)) {
            estado.write(serializarTablaHtml(nodoTabla));
            estado.closeBlock(tabla);
            return;
          }
          const filas: string[][] = [];
          tabla.forEach((fila) => {
            const celdas: string[] = [];
            fila.forEach((celda) => {
              celdas.push(textoCelda(estado, celda));
              for (let extra = 1; extra < ((celda.attrs.colspan as number | undefined) ?? 1); extra++) celdas.push('');
            });
            filas.push(celdas);
          });
          const columnas = Math.max(1, ...filas.map((celdas) => celdas.length));
          filas.forEach((celdas, indice) => {
            while (celdas.length < columnas) celdas.push('');
            estado.write(`| ${celdas.map((celda) => celda || ' ').join(' | ')} |`);
            estado.ensureNewLine();
            if (indice === 0) {
              estado.write(`| ${Array(columnas).fill('---').join(' | ')} |`);
              estado.ensureNewLine();
            }
          });
          estado.closeBlock(tabla);
        },
        parse: { setup: registrarReglaTablaHtml },
      },
    };
  },
});

export interface ManejadorEditorRico {
  obtenerMarkdown: () => string;
  /** Reemplaza todo el contenido (restaurar versión) sin disparar alCambiar. */
  establecerMarkdown: (markdown: string) => void;
  enfocar: () => void;
}

interface PropiedadesEditorRico {
  contenidoInicial: string;
  /** Solo avisa que hubo cambios; el Markdown se pide con obtenerMarkdown (serializar en cada tecla es caro). */
  alCambiar: () => void;
  alListo?: (editor: Editor) => void;
  destinoAdjuntos?: DestinoAdjunto;
  editable?: boolean;
  wikiLinks: OpcionesWikiLinks;
  placeholder?: string;
}

/**
 * Editor estilo Notion sobre Tiptap. Guarda Markdown puro (tiptap-markdown):
 * "/" abre comandos, "[[" enlaza tareas/tickets/páginas, pega o suelta imágenes para subirlas a Firebase.
 */
export const EditorRico = forwardRef<ManejadorEditorRico, PropiedadesEditorRico>(function EditorRico(
  { contenidoInicial, alCambiar, alListo, destinoAdjuntos, editable = true, wikiLinks, placeholder = 'Escribe o pulsa "/" para comandos…' },
  referencia,
) {
  const [subidasPendientes, setSubidasPendientes] = useState(0);
  const selectorArchivos = useRef<HTMLInputElement>(null);
  // Las extensiones se crean una sola vez: las funciones se leen desde referencias para no quedar obsoletas.
  const alCambiarActual = useRef(alCambiar);
  alCambiarActual.current = alCambiar;
  const wikiLinksActual = useRef(wikiLinks);
  wikiLinksActual.current = wikiLinks;
  const destinoActual = useRef(destinoAdjuntos);
  destinoActual.current = destinoAdjuntos;
  const silenciarCambios = useRef(false);

  async function subirImagenes(archivos: File[], editorDestino: Editor, posicion?: number) {
    setSubidasPendientes((pendientes) => pendientes + archivos.length);
    for (const imagen of archivos) {
      try {
        const adjunto = await apiArchivos.subir(renombrarCaptura(imagen), destinoActual.current);
        const nodo = { type: 'image', attrs: { src: adjunto.urlDescarga, alt: adjunto.nombreArchivo } };
        if (posicion !== undefined) editorDestino.chain().focus().insertContentAt(posicion, nodo).run();
        else editorDestino.chain().focus().insertContent(nodo).run();
      } catch (errorSubida) {
        notificar.error('No se pudo subir la imagen', errorSubida);
      } finally {
        setSubidasPendientes((pendientes) => pendientes - 1);
      }
    }
  }

  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        underline: false, // Markdown no tiene subrayado.
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      BloqueCodigo.configure({ lowlight, defaultLanguage: null }),
      Callout,
      Desplegable,
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: false }),
      TablaMarkdown.configure({ resizable: false }),
      ImagenBloque.configure({ inline: false }),
      Placeholder.configure({
        placeholder: ({ node }) => (node.type.name === 'heading' ? `Título ${node.attrs.level as number}` : placeholder),
      }),
      CharacterCount,
      Markdown.configure({ html: false, tightLists: true, linkify: true, transformPastedText: true, transformCopiedText: true }),
      ComandosBarra.configure({ pedirImagen: () => selectorArchivos.current?.click() }),
      WikiLinks.configure({
        buscar: (termino) => wikiLinksActual.current.buscar(termino),
        alAbrir: (destino) => wikiLinksActual.current.alAbrir(destino),
      }),
    ],
    content: repararMarkdown(contenidoInicial),
    editorProps: {
      attributes: { class: 'editor-rico', spellcheck: 'true' },
      handlePaste: (_vista, evento) => {
        const imagenes = Array.from(evento.clipboardData?.files ?? []).filter((archivo) => archivo.type.startsWith('image/'));
        if (imagenes.length === 0 || !editorRef.current) return false;
        evento.preventDefault();
        void subirImagenes(imagenes, editorRef.current);
        return true;
      },
      handleDrop: (vista, evento, _corte, movido) => {
        if (movido) return false;
        const imagenes = Array.from(evento.dataTransfer?.files ?? []).filter((archivo) => archivo.type.startsWith('image/'));
        if (imagenes.length === 0 || !editorRef.current) return false;
        evento.preventDefault();
        const posicion = vista.posAtCoords({ left: evento.clientX, top: evento.clientY })?.pos;
        void subirImagenes(imagenes, editorRef.current, posicion);
        return true;
      },
    },
    onUpdate: () => {
      if (!silenciarCambios.current) alCambiarActual.current();
    },
  });

  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;

  useEffect(() => {
    if (editor) alListo?.(editor);
    // alListo solo interesa una vez por instancia de editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  useImperativeHandle(
    referencia,
    () => ({
      obtenerMarkdown: () => (editor ? obtenerMarkdown(editor) : contenidoInicial),
      establecerMarkdown: (markdown) => {
        if (!editor) return;
        silenciarCambios.current = true;
        editor.commands.setContent(repararMarkdown(markdown));
        silenciarCambios.current = false;
      },
      enfocar: () => editor?.commands.focus('end'),
    }),
    [editor, contenidoInicial],
  );

  function alElegirArchivos(evento: FormEvent<HTMLInputElement>) {
    const archivos = Array.from(evento.currentTarget.files ?? []).filter((archivo) => archivo.type.startsWith('image/'));
    evento.currentTarget.value = '';
    if (editor && archivos.length > 0) void subirImagenes(archivos, editor);
  }

  return (
    <div className="relative">
      {editor && editable && <MenuBurbuja editor={editor} />}
      {editor && editable && <MenuTabla editor={editor} />}
      <EditorContent editor={editor} />
      <input ref={selectorArchivos} type="file" accept="image/*" multiple hidden onChange={alElegirArchivos} />
      {subidasPendientes > 0 && (
        <span className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-borde bg-superficie px-3 py-1.5 text-xs text-acento shadow-flotante">
          <Loader2 className="size-3.5 animate-spin" />
          Subiendo {subidasPendientes} {subidasPendientes === 1 ? 'imagen' : 'imágenes'}
        </span>
      )}
    </div>
  );
});

/** Barra flotante sobre la selección: negrita, cursiva, tachado, código y enlace. */
function MenuBurbuja({ editor }: { editor: Editor }) {
  const [editandoEnlace, setEditandoEnlace] = useState(false);
  const [eligiendoIA, setEligiendoIA] = useState(false);

  useEffect(() => {
    const cerrarIA = () => setEligiendoIA(false);
    editor.on('selectionUpdate', cerrarIA);
    return () => {
      editor.off('selectionUpdate', cerrarIA);
    };
  }, [editor]);
  const [url, setUrl] = useState('');

  const estado = useEditorState({
    editor,
    selector: ({ editor: actual }) => ({
      negrita: actual.isActive('bold'),
      cursiva: actual.isActive('italic'),
      tachado: actual.isActive('strike'),
      codigo: actual.isActive('code'),
      enlace: actual.isActive('link'),
      urlEnlace: (actual.getAttributes('link').href as string | undefined) ?? '',
    }),
  });

  function aplicarEnlace(evento: FormEvent) {
    evento.preventDefault();
    const destino = url.trim();
    const cadena = editor.chain().focus().extendMarkRange('link');
    if (destino) cadena.setLink({ href: /^[a-z]+:/i.test(destino) ? destino : `https://${destino}` }).run();
    else cadena.unsetLink().run();
    setEditandoEnlace(false);
  }

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'top', offset: 8 }}
      shouldShow={({ editor: actual, state }) =>
        !state.selection.empty && !actual.isActive('codeBlock') && !actual.isActive('image') && actual.isEditable
      }
      className="flex items-center gap-0.5 rounded-xl border border-borde bg-superficie p-1 shadow-flotante"
    >
      {eligiendoIA ? (
        <div className="flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-0.5">
          <Sparkles className="mx-1 size-4 text-violet-500" />
          {(Object.keys(etiquetasAccionIA) as AccionTextoIA[]).map((accion) => (
            <button
              key={accion}
              type="button"
              onMouseDown={(evento) => evento.preventDefault()}
              onClick={() => {
                setEligiendoIA(false);
                void transformarConIA(editor, accion);
              }}
              className="h-7 rounded-md px-2 text-xs font-medium text-texto-2 transition-colors hover:bg-violet-50 hover:text-violet-700"
            >
              {etiquetasAccionIA[accion].etiqueta}
            </button>
          ))}
        </div>
      ) : editandoEnlace ? (
        <form onSubmit={aplicarEnlace} className="flex items-center gap-1">
          <input
            autoFocus
            value={url}
            onChange={(evento) => setUrl(evento.target.value)}
            onKeyDown={(evento) => evento.key === 'Escape' && setEditandoEnlace(false)}
            placeholder="https://…"
            aria-label="URL del enlace"
            className="h-7 w-56 rounded-md bg-superficie-2 px-2 text-xs focus:outline-none"
          />
          <button type="submit" className="h-7 rounded-md bg-primario px-2 text-xs font-medium text-sobre-primario">
            Aplicar
          </button>
        </form>
      ) : (
        <>
          <button
            type="button"
            title="Mejorar con IA"
            onMouseDown={(evento) => evento.preventDefault()}
            onClick={() => setEligiendoIA(true)}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-violet-600 transition-colors hover:bg-violet-50"
          >
            <Sparkles className="size-3.5" />
            IA
          </button>
          <span className="mx-0.5 h-5 w-px bg-borde" />
          <BotonBurbuja icono={Bold} etiqueta="Negrita (Ctrl+B)" activo={estado.negrita} alPulsar={() => editor.chain().focus().toggleBold().run()} />
          <BotonBurbuja icono={Italic} etiqueta="Cursiva (Ctrl+I)" activo={estado.cursiva} alPulsar={() => editor.chain().focus().toggleItalic().run()} />
          <BotonBurbuja icono={Strikethrough} etiqueta="Tachado" activo={estado.tachado} alPulsar={() => editor.chain().focus().toggleStrike().run()} />
          <BotonBurbuja icono={Code} etiqueta="Código (Ctrl+E)" activo={estado.codigo} alPulsar={() => editor.chain().focus().toggleCode().run()} />
          <span className="mx-0.5 h-5 w-px bg-borde" />
          <BotonBurbuja
            icono={Link2}
            etiqueta="Enlace"
            activo={estado.enlace}
            alPulsar={() => {
              setUrl(estado.urlEnlace);
              setEditandoEnlace(true);
            }}
          />
          {estado.enlace && <BotonBurbuja icono={Unlink} etiqueta="Quitar enlace" alPulsar={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()} />}
        </>
      )}
    </BubbleMenu>
  );
}

/** Tabla del DOM que contiene el cursor: la barra de tabla se ancla a ella y no a la selección. */
function tablaDelCursor(editor: Editor): HTMLElement | null {
  const { node } = editor.view.domAtPos(editor.state.selection.from);
  const elemento = node instanceof HTMLElement ? node : node.parentElement;
  return elemento?.closest<HTMLElement>('.tableWrapper, table') ?? null;
}

/** Barra bajo la tabla donde está el cursor: filas, columnas, combinar/separar celdas y borrar la tabla. */
function MenuTabla({ editor }: { editor: Editor }) {
  const cadena = () => editor.chain().focus();
  const celdas = useEditorState({
    editor,
    selector: ({ editor: actual }) => ({ combinar: actual.can().mergeCells(), separar: actual.can().splitCell() }),
  });
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="menuTabla"
      options={{ placement: 'bottom-start', offset: 6, flip: true }}
      getReferencedVirtualElement={() => {
        const tabla = tablaDelCursor(editor);
        return tabla ? { getBoundingClientRect: () => tabla.getBoundingClientRect(), getClientRects: () => tabla.getClientRects() } : null;
      }}
      shouldShow={({ editor: actual }) => actual.isEditable && actual.isActive('table')}
      className="flex items-center gap-0.5 rounded-xl border border-borde bg-superficie p-1 shadow-flotante"
    >
      <span className="flex items-center gap-1 px-1.5 text-xs font-medium text-texto-3">
        <Rows3 className="size-3.5" />
        Fila
      </span>
      <BotonBurbuja icono={BetweenHorizontalStart} etiqueta="Insertar fila arriba" alPulsar={() => cadena().addRowBefore().run()} />
      <BotonBurbuja icono={BetweenHorizontalEnd} etiqueta="Insertar fila abajo" alPulsar={() => cadena().addRowAfter().run()} />
      <BotonBurbuja icono={Trash2} etiqueta="Eliminar fila" peligroso alPulsar={() => cadena().deleteRow().run()} />
      <span className="mx-0.5 h-5 w-px bg-borde" />
      <span className="flex items-center gap-1 px-1.5 text-xs font-medium text-texto-3">
        <Columns3 className="size-3.5" />
        Columna
      </span>
      <BotonBurbuja icono={BetweenVerticalStart} etiqueta="Insertar columna a la izquierda" alPulsar={() => cadena().addColumnBefore().run()} />
      <BotonBurbuja icono={BetweenVerticalEnd} etiqueta="Insertar columna a la derecha" alPulsar={() => cadena().addColumnAfter().run()} />
      <BotonBurbuja icono={Trash2} etiqueta="Eliminar columna" peligroso alPulsar={() => cadena().deleteColumn().run()} />
      <span className="mx-0.5 h-5 w-px bg-borde" />
      <BotonBurbuja
        icono={TableCellsMerge}
        etiqueta={celdas.combinar ? 'Combinar celdas' : 'Combinar celdas (arrastra sobre varias celdas para seleccionarlas)'}
        deshabilitado={!celdas.combinar}
        alPulsar={() => cadena().mergeCells().run()}
      />
      <BotonBurbuja icono={TableCellsSplit} etiqueta="Separar celda" deshabilitado={!celdas.separar} alPulsar={() => cadena().splitCell().run()} />
      <span className="mx-0.5 h-5 w-px bg-borde" />
      <button
        type="button"
        onMouseDown={(evento) => evento.preventDefault()}
        onClick={() => cadena().deleteTable().run()}
        className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-texto-2 transition-colors hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 className="size-3.5" />
        Tabla
      </button>
    </BubbleMenu>
  );
}

function BotonBurbuja({
  icono: IconoBoton,
  etiqueta,
  activo,
  peligroso,
  deshabilitado,
  alPulsar,
}: {
  icono: Icono;
  etiqueta: string;
  activo?: boolean;
  peligroso?: boolean;
  deshabilitado?: boolean;
  alPulsar: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      aria-pressed={activo}
      disabled={deshabilitado}
      onMouseDown={(evento) => evento.preventDefault()}
      onClick={alPulsar}
      className={unirClases(
        'grid size-7 place-items-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-40',
        activo ? 'bg-superficie-3 text-texto' : peligroso ? 'text-texto-2 hover:bg-red-50 hover:text-red-700' : 'text-texto-2 hover:bg-superficie-2',
      )}
    >
      <IconoBoton className="size-4" />
    </button>
  );
}

/** Las capturas del portapapeles llegan como "image.png"; se les da un nombre con fecha. */
function renombrarCaptura(imagen: File): File {
  if (imagen.name && imagen.name !== 'image.png') return imagen;
  const extension = imagen.type.split('/')[1] ?? 'png';
  const marcaTiempo = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return new File([imagen], `captura-${marcaTiempo}.${extension}`, { type: imagen.type });
}
