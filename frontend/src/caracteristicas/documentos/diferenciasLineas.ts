export type TipoLineaDiferencia = 'igual' | 'agregada' | 'eliminada';

export interface LineaDiferencia {
  tipo: TipoLineaDiferencia;
  texto: string;
}

export type BloqueDiferencia = { tipo: 'lineas'; lineas: LineaDiferencia[] } | { tipo: 'omitidas'; cantidad: number };

/** Por encima de este tamaño de tabla LCS se compara solo por prefijo/sufijo común (evita congelar la pestaña). */
const LimiteCeldas = 4_000_000;

/** Diferencia línea a línea (LCS) entre dos textos Markdown. */
export function diferenciarLineas(antes: string, despues: string): LineaDiferencia[] {
  const a = antes.split('\n');
  const b = despues.split('\n');

  // Recorta prefijo y sufijo comunes: casi todas las ediciones son locales.
  let inicio = 0;
  while (inicio < a.length && inicio < b.length && a[inicio] === b[inicio]) inicio++;
  let finA = a.length;
  let finB = b.length;
  while (finA > inicio && finB > inicio && a[finA - 1] === b[finB - 1]) {
    finA--;
    finB--;
  }

  const prefijo = a.slice(0, inicio).map((texto): LineaDiferencia => ({ tipo: 'igual', texto }));
  const sufijo = a.slice(finA).map((texto): LineaDiferencia => ({ tipo: 'igual', texto }));
  const medioA = a.slice(inicio, finA);
  const medioB = b.slice(inicio, finB);

  if (medioA.length * medioB.length > LimiteCeldas) {
    return [
      ...prefijo,
      ...medioA.map((texto): LineaDiferencia => ({ tipo: 'eliminada', texto })),
      ...medioB.map((texto): LineaDiferencia => ({ tipo: 'agregada', texto })),
      ...sufijo,
    ];
  }

  const n = medioA.length;
  const m = medioB.length;
  // tabla[i][j] = LCS de medioA[i..] y medioB[j..]
  const tabla = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      tabla[i][j] = medioA[i] === medioB[j] ? tabla[i + 1][j + 1] + 1 : Math.max(tabla[i + 1][j], tabla[i][j + 1]);
    }
  }

  const medio: LineaDiferencia[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (medioA[i] === medioB[j]) {
      medio.push({ tipo: 'igual', texto: medioA[i] });
      i++;
      j++;
    } else if (tabla[i + 1][j] >= tabla[i][j + 1]) {
      medio.push({ tipo: 'eliminada', texto: medioA[i++] });
    } else {
      medio.push({ tipo: 'agregada', texto: medioB[j++] });
    }
  }
  while (i < n) medio.push({ tipo: 'eliminada', texto: medioA[i++] });
  while (j < m) medio.push({ tipo: 'agregada', texto: medioB[j++] });

  return [...prefijo, ...medio, ...sufijo];
}

/** Agrupa las líneas iguales lejanas a un cambio en bloques "N líneas sin cambios". */
export function agruparDiferencias(lineas: LineaDiferencia[], contexto = 3): BloqueDiferencia[] {
  const visibles = new Array<boolean>(lineas.length).fill(false);
  lineas.forEach((linea, indice) => {
    if (linea.tipo === 'igual') return;
    for (let k = Math.max(0, indice - contexto); k <= Math.min(lineas.length - 1, indice + contexto); k++) visibles[k] = true;
  });

  const bloques: BloqueDiferencia[] = [];
  lineas.forEach((linea, indice) => {
    const ultimo = bloques[bloques.length - 1];
    if (visibles[indice]) {
      if (ultimo?.tipo === 'lineas') ultimo.lineas.push(linea);
      else bloques.push({ tipo: 'lineas', lineas: [linea] });
    } else if (ultimo?.tipo === 'omitidas') {
      ultimo.cantidad++;
    } else {
      bloques.push({ tipo: 'omitidas', cantidad: 1 });
    }
  });
  return bloques;
}
