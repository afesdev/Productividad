/**
 * Navegación de la SPA desde componentes que se dibujan fuera del árbol del router (p. ej. los bloques vivos que el
 * editor monta con su propia raíz de React). DisposicionPrincipal registra el navegador de react-router.
 */
let navegador: ((ruta: string) => void) | null = null;

export function registrarNavegador(navegar: ((ruta: string) => void) | null) {
  navegador = navegar;
}

export function navegarA(ruta: string) {
  if (navegador) navegador(ruta);
  else window.location.assign(ruta);
}
