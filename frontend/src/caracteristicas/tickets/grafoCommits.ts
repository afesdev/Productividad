import type { CommitGrafoDto, RamaGrafoDto } from '../../servicios/tipos';

/**
 * Paleta categórica (orden fijo, nunca se cicla por rango): validada con el validador de dataviz sobre fondo claro.
 * Tres tonos quedan por debajo de 3:1 de contraste, así que cada rama lleva además su nombre escrito en la punta.
 */
export const coloresCarril = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

/** Tramo de línea dentro de una fila: "completa" cruza la fila; "superior" llega al nodo; "inferior" sale del nodo hacia un padre. */
export interface TramoGrafo {
  desde: number;
  hasta: number;
  tramo: 'completa' | 'superior' | 'inferior';
  color: number;
  /** El padre está fuera del historial traído: la línea se corta. */
  truncado?: boolean;
}

export interface FilaGrafo {
  commit: CommitGrafoDto;
  columna: number;
  color: number;
  esMerge: boolean;
  tramos: TramoGrafo[];
  /** Ramas cuya punta es este commit. */
  ramas: RamaGrafoDto[];
}

export interface DisposicionGrafo {
  filas: FilaGrafo[];
  carriles: number;
  /** Color del carril de cada rama (por su punta), para la leyenda. */
  colorRama: Map<string, number>;
}

/** Orden topológico (hijos antes que padres) y, entre los disponibles, el más reciente primero, como `git log --graph`. */
export function ordenarCommits(commits: CommitGrafoDto[]): CommitGrafoDto[] {
  const porSha = new Map(commits.map((commit) => [commit.sha, commit]));
  const hijosPendientes = new Map<string, number>();
  for (const commit of commits)
    for (const padre of commit.padres) if (porSha.has(padre)) hijosPendientes.set(padre, (hijosPendientes.get(padre) ?? 0) + 1);

  const listos = commits.filter((commit) => !hijosPendientes.get(commit.sha));
  const ordenados: CommitGrafoDto[] = [];
  while (listos.length > 0) {
    let indiceMasReciente = 0;
    for (let indice = 1; indice < listos.length; indice++) if (listos[indice].fecha > listos[indiceMasReciente].fecha) indiceMasReciente = indice;
    const [siguiente] = listos.splice(indiceMasReciente, 1);
    ordenados.push(siguiente);
    for (const padre of new Set(siguiente.padres)) {
      if (!porSha.has(padre)) continue;
      const restantes = (hijosPendientes.get(padre) ?? 1) - 1;
      hijosPendientes.set(padre, restantes);
      if (restantes === 0) listos.push(porSha.get(padre)!);
    }
  }
  return ordenados;
}

/**
 * Asigna un carril (columna) a cada commit. Cada carril "espera" el siguiente commit de su línea (primer padre);
 * los merges abren un carril hacia su segundo padre y, cuando dos carriles esperan el mismo commit, convergen en él.
 * La rama principal y la de desarrollo arrancan en los carriles 0 y 1 para conservar siempre su posición y color.
 */
export function disponerGrafo(commits: CommitGrafoDto[], ramas: RamaGrafoDto[]): DisposicionGrafo {
  const ordenados = ordenarCommits(commits);
  const conocidos = new Set(ordenados.map((commit) => commit.sha));
  const carriles: (string | null)[] = [];
  const colores: number[] = [];
  let siguienteColor = 0;
  let maximo = 0;

  const reservar = (sha: string) => {
    let indice = carriles.indexOf(null);
    if (indice < 0) {
      indice = carriles.length;
      carriles.push(null);
    }
    carriles[indice] = sha;
    colores[indice] = siguienteColor++ % coloresCarril.length;
    return indice;
  };

  const fijas = [ramas.find((rama) => rama.esPrincipal), ramas.find((rama) => rama.esDesarrollo)];
  for (const rama of fijas) if (rama && conocidos.has(rama.shaPunta) && !carriles.includes(rama.shaPunta)) reservar(rama.shaPunta);

  const ramasPorPunta = new Map<string, RamaGrafoDto[]>();
  for (const rama of ramas) ramasPorPunta.set(rama.shaPunta, [...(ramasPorPunta.get(rama.shaPunta) ?? []), rama]);

  const filas: FilaGrafo[] = [];
  for (const commit of ordenados) {
    const antes = [...carriles];
    const coloresAntes = [...colores];
    const entrantes = antes.flatMap((sha, indice) => (sha === commit.sha ? [indice] : []));
    const columna = entrantes.length > 0 ? entrantes[0] : reservar(commit.sha);
    const tramos: TramoGrafo[] = [];

    antes.forEach((sha, indice) => {
      if (!sha) return;
      tramos.push(sha === commit.sha
        ? { desde: indice, hasta: columna, tramo: 'superior', color: coloresAntes[indice] }
        : { desde: indice, hasta: indice, tramo: 'completa', color: coloresAntes[indice] });
    });
    for (const indice of entrantes) if (indice !== columna) carriles[indice] = null;

    const padres = [...new Set(commit.padres)].filter((padre) => conocidos.has(padre));
    if (padres.length === 0) {
      carriles[columna] = null;
      if (commit.padres.length > 0) tramos.push({ desde: columna, hasta: columna, tramo: 'inferior', color: colores[columna], truncado: true });
    } else {
      carriles[columna] = padres[0];
      tramos.push({ desde: columna, hasta: columna, tramo: 'inferior', color: colores[columna] });
      for (const padre of padres.slice(1)) {
        let destino = carriles.findIndex((sha, indice) => sha === padre && indice !== columna);
        if (destino < 0) destino = reservar(padre);
        tramos.push({ desde: columna, hasta: destino, tramo: 'inferior', color: colores[destino] });
      }
    }

    maximo = Math.max(maximo, carriles.length, antes.length);
    filas.push({ commit, columna, color: colores[columna], esMerge: commit.padres.length > 1, tramos, ramas: ramasPorPunta.get(commit.sha) ?? [] });
  }

  const colorRama = new Map<string, number>();
  for (const fila of filas) for (const rama of fila.ramas) colorRama.set(rama.nombre, fila.color);
  return { filas, carriles: Math.max(1, maximo), colorRama };
}
