import { configuracionPaso, tiposPaso, type ConexionFlujo, type PasoFlujo, type TipoPaso } from './modelo';

/*
 * Sintaxis de texto de un flujo (la misma que genera la IA):
 *
 *   usuario: Pulsa "Generar certificado"
 *   vista: Elige las fechas | CertificadoConsultas.aspx
 *   validacion: ¿Fechas válidas? | Fin - Inicio <= 6 meses
 *     [No] error: Muestra "Rango inválido"
 *     [Sí] api: Genera el certificado | POST /api/certificados
 *       sp: Consulta los registros | sp_GenerarCertificado
 *   fin
 *
 * - "tipo: Título | técnico". El técnico es opcional. "fin" e "inicio" pueden ir solos.
 * - Más sangría = rama del paso anterior; [Etiqueta] pone texto en la flecha. Una línea con [Etiqueta] a la misma
 *   sangría que otra rama abre una rama hermana ("[]" la abre sin texto).
 * - Al volver a una sangría menor, el paso se conecta con el final de todas las ramas abiertas (las que no
 *   terminaron en error o fin).
 * - "-> Título" salta a un paso existente (también hacia adelante). "#" o "//" al inicio son comentarios.
 */

export interface ErrorSintaxis {
  linea: number;
  mensaje: string;
}

export interface ResultadoSintaxis {
  nodos: Omit<PasoFlujo, 'x' | 'y'>[];
  conexiones: ConexionFlujo[];
  errores: ErrorSintaxis[];
}

const tipoPorPalabra = new Map<string, TipoPaso>(tiposPaso.flatMap((tipo) => configuracionPaso[tipo].palabras.map((palabra) => [palabra, tipo] as const)));

interface Marco {
  sangria: number;
  /** Paso del que nacen las ramas de este marco (null en el nivel raíz). */
  origen: string | null;
  /** Pasos de los que sale la siguiente flecha. */
  frontera: string[];
  /** Finales de ramas hermanas ya cerradas. */
  cerrados: string[];
  /** Último paso creado en este marco (de él nacen las ramas más profundas). */
  ultimo: string | null;
}

const normalizar = (texto: string) => texto.trim().toLowerCase();

export function interpretarTexto(texto: string): ResultadoSintaxis {
  const nodos: ResultadoSintaxis['nodos'] = [];
  const conexiones: ConexionFlujo[] = [];
  const errores: ErrorSintaxis[] = [];
  const saltos: { desde: string[]; titulo: string; etiqueta: string | null; linea: number }[] = [];
  const pila: Marco[] = [];
  let secuencia = 0;

  const conectar = (desde: string[], hacia: string, etiqueta: string | null) => {
    for (const origen of desde) conexiones.push({ id: `c${conexiones.length + 1}`, origen, destino: hacia, etiqueta });
  };

  texto.split(/\r?\n/).forEach((lineaCruda, indice) => {
    const numero = indice + 1;
    const linea = lineaCruda.replace(/\t/g, '  ');
    const contenido = linea.trim();
    if (!contenido || contenido.startsWith('#') || contenido.startsWith('//')) return;
    const sangria = linea.length - linea.trimStart().length;

    // Etiqueta de la flecha: [Sí], [No], [] …
    let resto = contenido;
    let etiqueta: string | null = null;
    let tieneEtiqueta = false;
    const conEtiqueta = resto.match(/^\[([^\]]*)\]\s*/);
    if (conEtiqueta) {
      tieneEtiqueta = true;
      etiqueta = conEtiqueta[1].trim() || null;
      resto = resto.slice(conEtiqueta[0].length);
    }

    // Ubicar el marco según la sangría.
    if (pila.length === 0) pila.push({ sangria, origen: null, frontera: [], cerrados: [], ultimo: null });
    while (pila.length > 0 && pila[pila.length - 1].sangria > sangria) {
      const cerrado = pila.pop()!;
      const finales = [...cerrado.cerrados, ...cerrado.frontera];
      if (pila.length === 0) pila.push({ sangria, origen: null, frontera: finales, cerrados: [], ultimo: null });
      else pila[pila.length - 1].frontera = finales;
    }
    let marco = pila[pila.length - 1];
    if (sangria > marco.sangria) {
      if (marco.ultimo === null) {
        errores.push({ linea: numero, mensaje: 'Rama sin paso anterior: quita la sangría.' });
      } else {
        pila.push({ sangria, origen: marco.ultimo, frontera: [marco.ultimo], cerrados: [], ultimo: null });
        marco = pila[pila.length - 1];
      }
    } else if (tieneEtiqueta && marco.origen !== null && marco.ultimo !== null) {
      // Rama hermana: se guarda el final de la anterior y se vuelve a salir del paso de origen.
      marco.cerrados.push(...marco.frontera);
      marco.frontera = [marco.origen];
    }

    // Salto a un paso existente.
    if (resto.startsWith('->')) {
      const titulo = resto.slice(2).trim();
      if (!titulo) errores.push({ linea: numero, mensaje: 'Falta el título del paso al que saltar.' });
      else saltos.push({ desde: [...marco.frontera], titulo, etiqueta, linea: numero });
      marco.frontera = [];
      return;
    }

    // Paso: "tipo: Título | técnico" o "fin"/"inicio" solos.
    let tipo: TipoPaso;
    let cuerpo: string;
    const dosPuntos = resto.indexOf(':');
    const palabra = normalizar(dosPuntos >= 0 ? resto.slice(0, dosPuntos) : resto);
    if (dosPuntos >= 0 && tipoPorPalabra.has(palabra)) {
      tipo = tipoPorPalabra.get(palabra)!;
      cuerpo = resto.slice(dosPuntos + 1);
    } else if (dosPuntos < 0 && tipoPorPalabra.has(palabra) && (tipoPorPalabra.get(palabra) === 'fin' || tipoPorPalabra.get(palabra) === 'inicio')) {
      tipo = tipoPorPalabra.get(palabra)!;
      cuerpo = '';
    } else {
      tipo = 'proceso';
      cuerpo = resto;
      if (dosPuntos >= 0 && dosPuntos < 20 && !/\s/.test(resto.slice(0, dosPuntos).trim()))
        errores.push({ linea: numero, mensaje: `Tipo desconocido "${resto.slice(0, dosPuntos).trim()}": se usó "proceso".` });
    }
    const separador = cuerpo.indexOf(' | ');
    const titulo = (separador >= 0 ? cuerpo.slice(0, separador) : cuerpo.replace(/\s\|$/, '')).trim() || configuracionPaso[tipo].etiqueta;
    const tecnico = separador >= 0 ? cuerpo.slice(separador + 3).trim() || null : null;

    const id = `n${++secuencia}`;
    nodos.push({ id, tipo, titulo, tecnico });
    conectar(marco.frontera, id, etiqueta);
    marco.frontera = configuracionPaso[tipo].terminal ? [] : [id];
    marco.ultimo = id;
  });

  for (const salto of saltos) {
    const destino = nodos.find((nodo) => normalizar(nodo.titulo) === normalizar(salto.titulo));
    if (!destino) errores.push({ linea: salto.linea, mensaje: `No hay ningún paso titulado "${salto.titulo}".` });
    else conectar(salto.desde, destino.id, salto.etiqueta);
  }

  return { nodos, conexiones, errores };
}

/**
 * Escribe el diagrama en la sintaxis de texto (para editarlo como texto). Recorre desde los pasos sin entrada; un paso
 * ya escrito se referencia con "-> Título". Una salida única sin etiqueta sigue en la misma sangría; las demás van como ramas.
 */
export function aTexto(nodos: Pick<PasoFlujo, 'id' | 'tipo' | 'titulo' | 'tecnico' | 'x' | 'y'>[], conexiones: ConexionFlujo[]): string {
  const porId = new Map(nodos.map((nodo) => [nodo.id, nodo]));
  const entradas = new Map<string, number>();
  const salidas = new Map<string, ConexionFlujo[]>();
  for (const conexion of conexiones) {
    if (!porId.has(conexion.origen) || !porId.has(conexion.destino)) continue;
    entradas.set(conexion.destino, (entradas.get(conexion.destino) ?? 0) + 1);
    salidas.set(conexion.origen, [...(salidas.get(conexion.origen) ?? []), conexion]);
  }
  const posicion = (id: string) => porId.get(id)!;
  const ordenar = (a: { x: number; y: number }, b: { x: number; y: number }) => a.y - b.y || a.x - b.x;

  const lineas: string[] = [];
  const escritos = new Set<string>();

  const escribir = (id: string, sangria: number, etiqueta: string | null | undefined, rama: boolean) => {
    const nodo = posicion(id);
    const prefijo = `${' '.repeat(sangria)}${rama ? `[${etiqueta ?? ''}] ` : ''}`;
    if (escritos.has(id)) {
      lineas.push(`${prefijo}-> ${nodo.titulo}`);
      return;
    }
    escritos.add(id);
    const palabra = configuracionPaso[nodo.tipo].palabras[0];
    const soloPalabra = (nodo.tipo === 'fin' || nodo.tipo === 'inicio') && nodo.titulo === configuracionPaso[nodo.tipo].etiqueta && !nodo.tecnico;
    lineas.push(soloPalabra ? `${prefijo}${palabra}` : `${prefijo}${palabra}: ${nodo.titulo}${nodo.tecnico ? ` | ${nodo.tecnico}` : ''}`);

    const siguientes = [...(salidas.get(id) ?? [])].sort((a, b) => ordenar(posicion(a.destino), posicion(b.destino)));
    if (siguientes.length === 1 && !siguientes[0].etiqueta) {
      escribir(siguientes[0].destino, sangria, null, false);
      return;
    }
    for (const conexion of siguientes) escribir(conexion.destino, sangria + 2, conexion.etiqueta, true);
  };

  const raices = nodos.filter((nodo) => !entradas.get(nodo.id)).sort(ordenar);
  for (const raiz of raices.length > 0 ? raices : [...nodos].sort(ordenar).slice(0, 1)) {
    if (!escritos.has(raiz.id)) {
      if (lineas.length > 0) lineas.push('');
      escribir(raiz.id, 0, null, false);
    }
  }
  // Ciclos sin raíz o pasos sueltos que quedaron sin escribir.
  for (const nodo of [...nodos].sort(ordenar)) {
    if (!escritos.has(nodo.id)) {
      lineas.push('');
      escribir(nodo.id, 0, null, false);
    }
  }
  return lineas.join('\n');
}

export const ejemploSintaxis = `usuario: Pulsa "Generar certificado"
vista: Elige el rango de fechas | CertificadoConsultas.aspx
validacion: ¿Fechas válidas? | Fin - Inicio <= 6 meses
  [No] error: Muestra "Rango inválido"
  [Sí] api: Genera el certificado | POST /api/certificados
    sp: Consulta los registros | sp_GenerarCertificado
    validacion: ¿Hay registros?
      [No] error: "Sin consultas en el periodo"
      [Sí] salida: Descarga el PDF del certificado
fin`;
