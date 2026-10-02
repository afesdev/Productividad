import { forwardRef, type ButtonHTMLAttributes, type ComponentType, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AlertCircle, Loader2, type LucideProps } from 'lucide-react';

export const unirClases = (...clases: (string | false | null | undefined)[]) => clases.filter(Boolean).join(' ');

export type Icono = ComponentType<LucideProps>;

type VarianteBoton = 'primario' | 'secundario' | 'fantasma' | 'peligro';
type TamanoBoton = 'sm' | 'md';

const clasesVariante: Record<VarianteBoton, string> = {
  primario: 'bg-primario text-sobre-primario shadow-tarjeta hover:bg-primario/85 active:bg-primario/75',
  secundario: 'border border-borde bg-superficie text-texto shadow-tarjeta hover:bg-superficie-2',
  fantasma: 'text-texto-2 hover:bg-superficie-2 hover:text-texto',
  peligro: 'bg-peligro text-white shadow-tarjeta hover:bg-peligro/90',
};

const clasesTamano: Record<TamanoBoton, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-xs',
  md: 'h-9 gap-2 px-3.5 text-sm',
};

interface PropiedadesBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  icono?: Icono;
  cargando?: boolean;
}

export const Boton = forwardRef<HTMLButtonElement, PropiedadesBoton>(function Boton(
  { variante = 'primario', tamano = 'md', icono: IconoBoton, cargando, className, children, disabled, ...propiedades },
  referencia,
) {
  return (
    <button
      ref={referencia}
      disabled={disabled || cargando}
      className={unirClases(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        clasesVariante[variante],
        clasesTamano[tamano],
        className,
      )}
      {...propiedades}
    >
      {cargando ? <Loader2 className="size-4 animate-spin" /> : IconoBoton && <IconoBoton className="size-4" strokeWidth={2} />}
      {children}
    </button>
  );
});

/** Botón cuadrado solo con icono; `etiqueta` es obligatoria para lectores de pantalla y tooltip. */
export function BotonIcono({
  icono: IconoBoton,
  etiqueta,
  className,
  tamano = 'md',
  ...propiedades
}: ButtonHTMLAttributes<HTMLButtonElement> & { icono: Icono; etiqueta: string; tamano?: TamanoBoton }) {
  return (
    <button
      aria-label={etiqueta}
      title={etiqueta}
      className={unirClases(
        'inline-grid shrink-0 place-items-center rounded-lg text-texto-2 transition-colors hover:bg-superficie-2 hover:text-texto disabled:opacity-50',
        tamano === 'sm' ? 'size-7' : 'size-9',
        className,
      )}
      {...propiedades}
    >
      <IconoBoton className={tamano === 'sm' ? 'size-3.5' : 'size-4'} />
    </button>
  );
}

const clasesCampo =
  'w-full rounded-lg border border-borde bg-superficie px-3 text-sm text-texto shadow-tarjeta transition placeholder:text-texto-3 hover:border-borde-fuerte focus:border-acento focus:outline-none focus:ring-3 focus:ring-acento/15';

export const Entrada = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Entrada({ className, ...propiedades }, referencia) {
  return <input ref={referencia} className={unirClases(clasesCampo, 'h-9', className)} {...propiedades} />;
});

export const AreaTexto = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function AreaTexto({ className, ...propiedades }, referencia) {
  return <textarea ref={referencia} className={unirClases(clasesCampo, 'py-2', className)} {...propiedades} />;
});

export function Selector({ className, ...propiedades }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={unirClases(clasesCampo, 'h-9 pr-8', className)} {...propiedades} />;
}

export function Campo({ etiqueta, children, ayuda, className }: { etiqueta: string; children: ReactNode; ayuda?: string; className?: string }) {
  return (
    <label className={unirClases('flex flex-col gap-1.5', className)}>
      <span className="text-[13px] font-medium text-texto">{etiqueta}</span>
      {children}
      {ayuda && <span className="text-xs text-texto-3">{ayuda}</span>}
    </label>
  );
}

export function Casilla({ etiqueta, className, ...propiedades }: InputHTMLAttributes<HTMLInputElement> & { etiqueta: string }) {
  return (
    <label className={unirClases('inline-flex cursor-pointer items-center gap-2 text-sm text-texto', className)}>
      <input type="checkbox" className="size-4 rounded border-borde-fuerte accent-primario" {...propiedades} />
      {etiqueta}
    </label>
  );
}

export function Tarjeta({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={unirClases('rounded-xl border border-borde bg-superficie p-5 shadow-tarjeta', className)}>{children}</section>;
}

type TonoInsignia = 'neutro' | 'acento' | 'exito' | 'aviso' | 'peligro';

const clasesTono: Record<TonoInsignia, string> = {
  neutro: 'bg-superficie-2 text-texto-2',
  acento: 'bg-acento-suave text-acento',
  exito: 'bg-exito-suave text-exito',
  aviso: 'bg-aviso-suave text-aviso',
  peligro: 'bg-peligro-suave text-peligro',
};

export function Insignia({ children, tono = 'neutro', icono: IconoInsignia, className }: { children: ReactNode; tono?: TonoInsignia; icono?: Icono; className?: string }) {
  return (
    <span className={unirClases('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium', clasesTono[tono], className)}>
      {IconoInsignia && <IconoInsignia className="size-3" />}
      {children}
    </span>
  );
}

/** Error en línea: solo para validaciones dentro de formularios. Los resultados de acciones usan notificaciones. */
export function MensajeError({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-peligro-suave px-3 py-2 text-sm text-peligro">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {mensaje}
    </p>
  );
}

export function EncabezadoPagina({ titulo, descripcion, acciones }: { titulo: string; descripcion?: string; acciones?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descripcion && <p className="mt-1 text-sm text-texto-2">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  );
}

export function EstadoVacio({ icono: IconoVacio, titulo, descripcion, accion }: { icono?: Icono; titulo: string; descripcion?: string; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-borde-fuerte bg-superficie px-6 py-12 text-center">
      {IconoVacio && (
        <span className="grid size-11 place-items-center rounded-xl bg-superficie-2 text-texto-2">
          <IconoVacio className="size-5" />
        </span>
      )}
      <div>
        <p className="font-medium">{titulo}</p>
        {descripcion && <p className="mx-auto mt-1 max-w-sm text-sm text-texto-2">{descripcion}</p>}
      </div>
      {accion}
    </div>
  );
}

export function Esqueleto({ className }: { className?: string }) {
  return <span className={unirClases('block animate-pulse rounded-md bg-superficie-2', className)} />;
}
