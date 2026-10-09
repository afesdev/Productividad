import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImageOff, X } from 'lucide-react';
import { apiTrello } from '../../servicios/api';
import { registrarCapaEsc } from '../../componentes/ui/Modal';
import { Esqueleto, unirClases } from '../../componentes/ui/primitivos';

/**
 * Imágenes subidas a Trello: se descargan a través de la API (Trello exige autenticación) y se muestran como blob.
 * Las URL de objeto se reutilizan durante la sesión para no volver a pedir la misma imagen.
 */
const urlsPorAdjunto = new Map<string, Promise<string>>();
const MaximoEnMemoria = 150;

function obtenerUrl(idTarjeta: string, idAdjunto: string): Promise<string> {
  let url = urlsPorAdjunto.get(idAdjunto);
  if (!url) {
    // Tope sencillo: se descarta la más antigua y se libera su memoria.
    if (urlsPorAdjunto.size >= MaximoEnMemoria) {
      const [primera, promesa] = urlsPorAdjunto.entries().next().value!;
      urlsPorAdjunto.delete(primera);
      void promesa.then(URL.revokeObjectURL).catch(() => undefined);
    }
    url = apiTrello.imagenAdjunto(idTarjeta, idAdjunto).then((blob) => URL.createObjectURL(blob));
    url.catch(() => urlsPorAdjunto.delete(idAdjunto));
    urlsPorAdjunto.set(idAdjunto, url);
  }
  return url;
}

/** Enlace de descarga de un adjunto de Trello: https://trello.com/1/cards/{tarjeta}/attachments/{adjunto}/download/… */
const patronAdjunto = /^https:\/\/trello\.com\/1\/cards\/([0-9a-f]{24})\/attachments\/([0-9a-f]{24})\/download\//i;

export function referenciaAdjunto(src: string): { idTarjeta: string; idAdjunto: string } | null {
  const coincidencia = patronAdjunto.exec(src);
  return coincidencia ? { idTarjeta: coincidencia[1], idAdjunto: coincidencia[2] } : null;
}

export function ImagenTrello({
  idTarjeta,
  idAdjunto,
  alt,
  className,
  alAmpliar,
}: {
  idTarjeta: string;
  idAdjunto: string;
  alt: string;
  className?: string;
  /** Al pulsar la imagen, con su URL ya cargada (para el visor). */
  alAmpliar?: (url: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    setUrl(null);
    setError(false);
    obtenerUrl(idTarjeta, idAdjunto)
      .then((cargada) => vigente && setUrl(cargada))
      .catch(() => vigente && setError(true));
    return () => {
      vigente = false;
    };
  }, [idTarjeta, idAdjunto]);

  if (error)
    return (
      <span className={unirClases('grid place-items-center bg-superficie-2 text-texto-3', className)} title="No se pudo cargar la imagen">
        <ImageOff className="size-5" />
      </span>
    );
  if (!url) return <Esqueleto className={unirClases('rounded-none', className)} />;
  const imagen = <img src={url} alt={alt} className={unirClases('object-cover', className)} draggable={false} />;
  return alAmpliar ? (
    <button type="button" onClick={() => alAmpliar(url)} className="block w-full cursor-zoom-in overflow-hidden" aria-label={`Ampliar ${alt}`}>
      {imagen}
    </button>
  ) : (
    imagen
  );
}

/** Visor a pantalla completa: Esc o clic fuera para cerrar. */
export function VisorImagen({ url, alt, alCerrar }: { url: string | null; alt?: string; alCerrar: () => void }) {
  useEffect(() => (url ? registrarCapaEsc(alCerrar) : undefined), [url, alCerrar]);

  if (!url) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-center bg-zinc-950/85 p-6" onClick={alCerrar} role="dialog" aria-label="Imagen ampliada">
      <img src={url} alt={alt ?? ''} className="max-h-full max-w-full rounded-lg object-contain shadow-flotante" onClick={(evento) => evento.stopPropagation()} />
      <button type="button" onClick={alCerrar} aria-label="Cerrar" className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25">
        <X className="size-5" />
      </button>
    </div>,
    document.body,
  );
}
