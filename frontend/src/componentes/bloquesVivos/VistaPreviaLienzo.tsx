import { useEffect, useRef, useState } from 'react';
import { exportToSvg } from '@excalidraw/excalidraw';

/** Imagen estática (SVG) de un lienzo de Excalidraw, generada en el navegador a partir de la escena guardada. */
export default function VistaPreviaLienzo({ contenidoJson, oscuro }: { contenidoJson: string; oscuro: boolean }) {
  const destino = useRef<HTMLDivElement>(null);
  const [vacio, setVacio] = useState(false);

  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const escena = JSON.parse(contenidoJson) as { elements?: unknown[]; appState?: Record<string, unknown>; files?: Record<string, unknown> };
        const elementos = (escena.elements ?? []).filter((elemento) => !(elemento as { isDeleted?: boolean }).isDeleted);
        if (elementos.length === 0) {
          setVacio(true);
          return;
        }
        const svg = await exportToSvg({
          elements: elementos as never,
          appState: { ...(escena.appState ?? {}), exportBackground: false, exportWithDarkMode: oscuro } as never,
          files: (escena.files ?? {}) as never,
          exportPadding: 16,
        });
        if (!vigente || !destino.current) return;
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.style.width = '100%';
        svg.style.height = '100%';
        destino.current.replaceChildren(svg);
      } catch {
        if (vigente) setVacio(true);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [contenidoJson, oscuro]);

  if (vacio) return <p className="grid h-full place-items-center text-sm text-texto-3">El lienzo está vacío.</p>;
  return <div ref={destino} className="h-full w-full [&_svg]:mx-auto" />;
}
