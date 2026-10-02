import type { DiaDiarioDto, EntradaDiarioDto } from '../../servicios/tipos';
import { configuracionTipo, formatearFechaLarga, formatearHora } from './presentacionDiario';

/** Una entrada como línea Markdown: las tareas como casilla de Obsidian, el resto con su tipo en negrita. */
function entradaAMarkdown(entrada: EntradaDiarioDto): string {
  const hora = entrada.horaInicio ? `${formatearHora(entrada.horaInicio)}${entrada.horaFin ? `–${formatearHora(entrada.horaFin)}` : ''} ` : '';
  const vinculo = entrada.claveTarea ? ` → [[${entrada.claveTarea}]]` : '';
  const linea =
    entrada.tipo === 'Tarea'
      ? `- [${entrada.completada ? 'x' : ' '}] ${hora}${entrada.titulo}${vinculo}`
      : `- ${hora}**${configuracionTipo[entrada.tipo].etiqueta}:** ${entrada.titulo}${vinculo}`;
  // El detalle va sangrado bajo la entrada para que Obsidian lo muestre dentro del mismo punto.
  const detalle = entrada.detalleMarkdown ? `\n${entrada.detalleMarkdown.split('\n').map((renglon) => `    ${renglon}`).join('\n')}` : '';
  return linea + detalle;
}

function cuerpoDelDia(dia: DiaDiarioDto, nivelTitulo: '#' | '##'): string {
  const partes = [`${nivelTitulo} ${formatearFechaLarga(dia.fecha)}`, ''];
  if (dia.entradas.length > 0) partes.push(`${nivelTitulo}# Línea de tiempo`, ...dia.entradas.map(entradaAMarkdown), '');
  if (dia.contenidoMarkdown.trim()) {
    // Los títulos de la nota bajan un nivel para quedar dentro del día.
    const nota = nivelTitulo === '##' ? dia.contenidoMarkdown.replace(/^(#{1,5}) /gm, '#$1 ') : dia.contenidoMarkdown;
    partes.push(`${nivelTitulo}# Nota`, nota.trim(), '');
  }
  return partes.join('\n');
}

/** Nota diaria con frontmatter YAML, lista para la carpeta de notas diarias de Obsidian (AAAA-MM-DD.md). */
export function diaAMarkdown(dia: DiaDiarioDto): string {
  const frontmatter = ['---', `fecha: ${dia.fecha}`, dia.animo ? `animo: ${dia.animo}` : null, dia.energia ? `energia: ${dia.energia}` : null, 'tags: [diario]', '---', '']
    .filter((linea) => linea !== null)
    .join('\n');
  return frontmatter + cuerpoDelDia(dia, '#');
}

/** Varios días en un solo archivo (semana o mes), del más antiguo al más reciente. */
export function periodoAMarkdown(dias: DiaDiarioDto[], titulo: string): string {
  const encabezado = `# Diario · ${titulo}\n\n`;
  if (dias.length === 0) return `${encabezado}_Sin registros en el periodo._\n`;
  return encabezado + dias.map((dia) => cuerpoDelDia(dia, '##')).join('\n---\n\n');
}

/** Descarga texto como archivo .md desde el navegador. */
export function descargarMarkdown(nombreArchivo: string, contenido: string) {
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob([contenido], { type: 'text/markdown;charset=utf-8' }));
  enlace.download = nombreArchivo.endsWith('.md') ? nombreArchivo : `${nombreArchivo}.md`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}
