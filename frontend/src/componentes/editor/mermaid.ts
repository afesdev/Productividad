type Mermaid = (typeof import('mermaid'))['default'];

// Mermaid pesa ~1 MB: se descarga la primera vez que se muestra un diagrama.
let cargaMermaid: Promise<Mermaid> | null = null;
let contadorDiagramas = 0;

/** Diagramas en pantalla y su código, para repintarlos al cambiar el tema. */
const dibujados = new Map<HTMLElement, string>();
let observandoTema = false;

function observarTema() {
  if (observandoTema) return;
  observandoTema = true;
  let oscuroAnterior = document.documentElement.classList.contains('oscuro');
  new MutationObserver(() => {
    const oscuro = document.documentElement.classList.contains('oscuro');
    if (oscuro === oscuroAnterior) return;
    oscuroAnterior = oscuro;
    for (const [destino, codigo] of dibujados) {
      if (destino.isConnected) void dibujarMermaid(destino, codigo);
      else dibujados.delete(destino);
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

/** Dibuja el diagrama en `destino` (o el error de sintaxis) con el tema actual. */
export async function dibujarMermaid(destino: HTMLElement, codigo: string) {
  if (!codigo.trim()) {
    destino.replaceChildren();
    dibujados.delete(destino);
    return;
  }
  dibujados.set(destino, codigo);
  observarTema();
  const mermaid = await (cargaMermaid ??= import('mermaid').then((modulo) => modulo.default));
  mermaid.initialize({
    startOnLoad: false,
    // "strict" sanea el SVG (sin scripts ni HTML en etiquetas): se puede insertar con innerHTML.
    securityLevel: 'strict',
    theme: document.documentElement.classList.contains('oscuro') ? 'dark' : 'default',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  });
  const id = `diagrama-mermaid-${++contadorDiagramas}`;
  try {
    const { svg } = await mermaid.render(id, codigo);
    // Si el código cambió mientras se dibujaba, gana el dibujo más reciente.
    if (dibujados.get(destino) !== codigo) return;
    destino.innerHTML = svg;
    destino.classList.remove('con-error');
  } catch (error) {
    if (dibujados.get(destino) !== codigo) return;
    destino.textContent = `El diagrama tiene un error: ${error instanceof Error ? error.message.split('\n')[0] : 'sintaxis no válida'}`;
    destino.classList.add('con-error');
    // Mermaid deja un nodo temporal en <body> cuando falla.
    document.getElementById(`d${id}`)?.remove();
  }
}

export function olvidarDiagrama(destino: HTMLElement) {
  dibujados.delete(destino);
}
