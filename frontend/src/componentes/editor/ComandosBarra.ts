import { Extension, type Editor, type Range } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import {
  CheckSquare,
  ChevronsDownUp,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Info,
  Lightbulb,
  Link2,
  List,
  ListOrdered,
  Minus,
  OctagonAlert,
  Pilcrow,
  Quote,
  Table2,
  TriangleAlert,
  Workflow,
} from 'lucide-react';
import type { ElementoSugerencia } from './ListaSugerencias';
import { crearRenderizadorSugerencias } from './renderizadorSugerencias';

interface Comando extends ElementoSugerencia {
  palabrasClave: string[];
  ejecutar: (editor: Editor, rango: Range) => void;
}

export interface OpcionesComandosBarra {
  /** Abre el selector de archivos para insertar una imagen. */
  pedirImagen: () => void;
}

function crearComandos(opciones: OpcionesComandosBarra): Comando[] {
  return [
    { id: 'texto', titulo: 'Texto', descripcion: 'Párrafo normal', icono: Pilcrow, grupo: 'Básicos', palabrasClave: ['parrafo', 'texto'],
      ejecutar: (editor, rango) => editor.chain().focus().deleteRange(rango).setParagraph().run() },
    { id: 'h1', titulo: 'Título 1', descripcion: 'Encabezado grande', icono: Heading1, grupo: 'Básicos', palabrasClave: ['titulo', 'h1', 'encabezado'],
      ejecutar: (editor, rango) => editor.chain().focus().deleteRange(rango).setHeading({ level: 1 }).run() },
    { id: 'h2', titulo: 'Título 2', descripcion: 'Encabezado de sección', icono: Heading2, grupo: 'Básicos', palabrasClave: ['titulo', 'h2', 'seccion'],
      ejecutar: (editor, rango) => editor.chain().focus().deleteRange(rango).setHeading({ level: 2 }).run() },
    { id: 'h3', titulo: 'Título 3', descripcion: 'Subsección', icono: Heading3, grupo: 'Básicos', palabrasClave: ['titulo', 'h3', 'subtitulo'],
      ejecutar: (editor, rango) => editor.chain().focus().deleteRange(rango).setHeading({ level: 3 }).run() },
    { id: 'lista', titulo: 'Lista', descripcion: 'Lista con viñetas', icono: List, grupo: 'Listas', palabrasClave: ['lista', 'vinetas', 'ul'],
      ejecutar: (editor, rango) => editor.chain().focus().deleteRange(rango).toggleBulletList().run() },
    { id: 'numerada', titulo: 'Lista numerada', descripcion: '1, 2, 3…', icono: ListOrdered, grupo: 'Listas', palabrasClave: ['numerada', 'ordenada', 'ol'],
      ejecutar: (editor, rango) => editor.chain().focus().deleteRange(rango).toggleOrderedList().run() },
    { id: 'tareas', titulo: 'Lista de tareas', descripcion: 'Casillas para marcar', icono: CheckSquare, grupo: 'Listas', palabrasClave: ['tareas', 'check', 'todo', 'pendientes'],
      ejecutar: (editor, rango) => editor.chain().focus().deleteRange(rango).toggleTaskList().run() },
    { id: 'codigo', titulo: 'Bloque de código', descripcion: 'Con resaltado de sintaxis', icono: Code2, grupo: 'Bloques', palabrasClave: ['codigo', 'code', 'snippet'],
      ejecutar: (editor, rango) => editor.chain().focus().deleteRange(rango).toggleCodeBlock().run() },
    { id: 'cita', titulo: 'Cita', descripcion: 'Texto destacado', icono: Quote, grupo: 'Bloques', palabrasClave: ['cita', 'quote', 'nota'],
      ejecutar: (editor, rango) => editor.chain().focus().deleteRange(rango).toggleBlockquote().run() },
    { id: 'tabla', titulo: 'Tabla', descripcion: '3 × 3 con encabezado', icono: Table2, grupo: 'Bloques', palabrasClave: ['tabla', 'table'],
      ejecutar: (editor, rango) => editor.chain().focus().deleteRange(rango).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { id: 'nota', titulo: 'Nota', descripcion: 'Caja informativa azul', icono: Info, grupo: 'Documentación', palabrasClave: ['nota', 'info', 'callout', 'aviso'],
      ejecutar: (editor, rango) => editor.chain().focus().deleteRange(rango).wrapIn('callout', { tipo: 'nota' }).run() },
    { id: 'consejo', titulo: 'Consejo', descripcion: 'Buena práctica o truco', icono: Lightbulb, grupo: 'Documentación', palabrasClave: ['consejo', 'tip', 'truco', 'callout'],
      ejecutar: (editor, rango) => editor.chain().focus().deleteRange(rango).wrapIn('callout', { tipo: 'tip' }).run() },
    { id: 'advertencia', titulo: 'Advertencia', descripcion: 'Precaución antes de seguir', icono: TriangleAlert, grupo: 'Documentación', palabrasClave: ['advertencia', 'warning', 'cuidado', 'callout'],
      ejecutar: (editor, rango) => editor.chain().focus().deleteRange(rango).wrapIn('callout', { tipo: 'advertencia' }).run() },
    { id: 'peligro', titulo: 'Peligro', descripcion: 'Acción destructiva o irreversible', icono: OctagonAlert, grupo: 'Documentación', palabrasClave: ['peligro', 'danger', 'critico', 'callout'],
      ejecutar: (editor, rango) => editor.chain().focus().deleteRange(rango).wrapIn('callout', { tipo: 'peligro' }).run() },
    { id: 'desplegable', titulo: 'Desplegable', descripcion: 'Sección que se abre y cierra', icono: ChevronsDownUp, grupo: 'Documentación', palabrasClave: ['desplegable', 'toggle', 'detalles', 'plegable'],
      ejecutar: (editor, rango) => editor.chain().focus().deleteRange(rango).wrapIn('desplegable', { titulo: '' }).run() },
    { id: 'diagrama', titulo: 'Diagrama', descripcion: 'Flujo, secuencia o ER con Mermaid', icono: Workflow, grupo: 'Documentación', palabrasClave: ['diagrama', 'mermaid', 'flujo', 'secuencia'],
      ejecutar: (editor, rango) =>
        editor
          .chain()
          .focus()
          .deleteRange(rango)
          .insertContent({
            type: 'codeBlock',
            attrs: { language: 'mermaid' },
            content: [{ type: 'text', text: 'flowchart LR\n  A[Solicitud] --> B{¿Aprobada?}\n  B -- Sí --> C[Desplegar]\n  B -- No --> D[Corregir]' }],
          })
          .run() },
    { id: 'separador', titulo: 'Separador', descripcion: 'Línea horizontal', icono: Minus, grupo: 'Bloques', palabrasClave: ['separador', 'linea', 'hr'],
      ejecutar: (editor, rango) => editor.chain().focus().deleteRange(rango).setHorizontalRule().run() },
    { id: 'imagen', titulo: 'Imagen', descripcion: 'Subir desde tu equipo', icono: ImagePlus, grupo: 'Insertar', palabrasClave: ['imagen', 'foto', 'captura'],
      ejecutar: (editor, rango) => {
        editor.chain().focus().deleteRange(rango).run();
        opciones.pedirImagen();
      } },
    { id: 'enlace', titulo: 'Enlazar página o tarea', descripcion: 'Escribe [[ y busca', icono: Link2, grupo: 'Insertar', palabrasClave: ['enlace', 'wikilink', 'link', 'referencia'],
      ejecutar: (editor, rango) => editor.chain().focus().deleteRange(rango).insertContent('[[').run() },
  ];
}

const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Menú de comandos estilo Notion: escribe "/" al inicio o después de un espacio. */
export const ComandosBarra = Extension.create<OpcionesComandosBarra>({
  name: 'comandosBarra',

  addOptions() {
    return { pedirImagen: () => undefined };
  },

  addProseMirrorPlugins() {
    const comandos = crearComandos(this.options);
    return [
      Suggestion<Comando>({
        editor: this.editor,
        pluginKey: new PluginKey('comandosBarra'),
        char: '/',
        startOfLine: false,
        allow: ({ state, range }) => !state.doc.resolve(range.from).parent.type.spec.code,
        items: ({ query }) => {
          const busqueda = normalizar(query);
          return comandos.filter((comando) => !busqueda || normalizar(comando.titulo).includes(busqueda) || comando.palabrasClave.some((palabra) => palabra.startsWith(busqueda)));
        },
        command: ({ editor, range, props }) => props.ejecutar(editor, range),
        render: crearRenderizadorSugerencias<Comando>('Sin comandos con ese nombre'),
      }),
    ];
  },
});
