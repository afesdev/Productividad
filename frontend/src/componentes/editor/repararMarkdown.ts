/** Separa en su propio bloque lo que quedó pegado a una imagen en documentos guardados antes de la corrección del serializador. */
export function repararMarkdown(markdown: string): string {
  return markdown.replace(/^(!\[[^\]\n]*\]\([^)\n]*\))(?=\S)/gm, '$1\n\n');
}
