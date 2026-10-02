import { unirClases } from './primitivos';

export function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0]!.toUpperCase())
    .join('');
}

export function Avatar({ nombre, conNombre = true, tamano = 'sm' }: { nombre: string; conNombre?: boolean; tamano?: 'sm' | 'md' }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className={unirClases(
          'grid shrink-0 place-items-center rounded-full bg-zinc-800 font-semibold text-white',
          tamano === 'sm' ? 'size-6 text-[10px]' : 'size-8 text-xs',
        )}
      >
        {iniciales(nombre)}
      </span>
      {conNombre && <span className="truncate text-sm">{nombre}</span>}
    </span>
  );
}
