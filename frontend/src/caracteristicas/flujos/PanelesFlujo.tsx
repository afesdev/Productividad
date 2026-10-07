import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { AlertTriangle, ChevronDown, CornerDownLeft, FileText, Sparkles, Trash2, X } from 'lucide-react';
import { apiFlujos } from '../../servicios/api';
import { notificar } from '../../servicios/notificaciones';
import { Modal } from '../../componentes/ui/Modal';
import { AreaTexto, Boton, BotonIcono, Campo, Entrada, unirClases } from '../../componentes/ui/primitivos';
import { configuracionPaso, tiposPaso, type TipoPaso } from './modelo';
import { ejemploSintaxis, interpretarTexto } from './sintaxis';
import type { DatosPaso } from './NodoPaso';

const claseLateral = 'flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-borde bg-superficie p-4 sin-barra-scroll';

// ---------- Detalle del paso ----------

export function PanelPaso({
  datos,
  alCambiar,
  alEliminar,
  alCerrar,
}: {
  datos: DatosPaso;
  alCambiar: (cambios: Partial<DatosPaso>) => void;
  alEliminar: () => void;
  alCerrar: () => void;
}) {
  const configuracion = configuracionPaso[datos.tipo];
  const Icono = configuracion.icono;
  return (
    <aside className={claseLateral} aria-label="Detalle del paso">
      <div className="flex items-center justify-between gap-2">
        <span className={unirClases('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold', configuracion.insignia)}>
          <Icono className="size-3.5" />
          {configuracion.etiqueta}
        </span>
        <BotonIcono icono={X} etiqueta="Cerrar" tamano="sm" onClick={alCerrar} />
      </div>

      <Campo etiqueta="Tipo">
        <select
          value={datos.tipo}
          onChange={(evento) => alCambiar({ tipo: evento.target.value as TipoPaso })}
          className="h-9 w-full rounded-lg border border-borde bg-superficie px-2 text-sm shadow-tarjeta focus:border-acento focus:outline-none"
        >
          {tiposPaso.map((tipo) => (
            <option key={tipo} value={tipo}>
              {configuracionPaso[tipo].etiqueta}
            </option>
          ))}
        </select>
      </Campo>
      <Campo etiqueta="Qué pasa (funcional)">
        <AreaTexto rows={2} maxLength={200} value={datos.titulo} onChange={(evento) => alCambiar({ titulo: evento.target.value })} />
      </Campo>
      {configuracion.campoTecnico && (
        <Campo etiqueta={`${configuracion.campoTecnico} (técnico)`}>
          <Entrada
            value={datos.tecnico ?? ''}
            maxLength={300}
            onChange={(evento) => alCambiar({ tecnico: evento.target.value })}
            className="font-mono text-[13px]"
            placeholder={datos.tipo === 'sp' ? 'sp_GenerarCertificado' : datos.tipo === 'api' ? 'POST /api/certificados' : datos.tipo === 'vista' ? 'Certificados/Consultas.aspx' : ''}
          />
        </Campo>
      )}
      <Campo etiqueta="Notas" ayuda="Parámetros, tablas, reglas, casos especiales… (Markdown)">
        <AreaTexto rows={8} maxLength={8000} value={datos.descripcion ?? ''} onChange={(evento) => alCambiar({ descripcion: evento.target.value })} className="font-mono text-[13px]" />
      </Campo>

      <Boton variante="fantasma" tamano="sm" icono={Trash2} onClick={alEliminar} className="mt-auto self-start text-peligro hover:bg-peligro-suave hover:text-peligro">
        Eliminar paso
      </Boton>
    </aside>
  );
}

// ---------- Detalle de la conexión ----------

export function PanelConexion({
  etiqueta,
  alCambiar,
  alEliminar,
  alCerrar,
}: {
  etiqueta: string;
  alCambiar: (etiqueta: string) => void;
  alEliminar: () => void;
  alCerrar: () => void;
}) {
  return (
    <aside className={claseLateral} aria-label="Detalle de la conexión">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Conexión</h3>
        <BotonIcono icono={X} etiqueta="Cerrar" tamano="sm" onClick={alCerrar} />
      </div>
      <Campo etiqueta="Texto de la flecha">
        <Entrada value={etiqueta} maxLength={60} onChange={(evento) => alCambiar(evento.target.value)} placeholder="Sí, No, Éxito, Error…" />
      </Campo>
      <div className="flex flex-wrap gap-1.5">
        {['Sí', 'No', 'Éxito', 'Error'].map((opcion) => (
          <button
            key={opcion}
            type="button"
            onClick={() => alCambiar(opcion)}
            className="h-7 rounded-full border border-borde px-2.5 text-xs font-medium text-texto-2 transition-colors hover:bg-superficie-2"
          >
            {opcion}
          </button>
        ))}
      </div>
      <Boton variante="fantasma" tamano="sm" icono={Trash2} onClick={alEliminar} className="mt-auto self-start text-peligro hover:bg-peligro-suave hover:text-peligro">
        Eliminar conexión
      </Boton>
    </aside>
  );
}

// ---------- Editar como texto ----------

export function PanelTexto({
  textoInicial,
  alAplicar,
  alCerrar,
}: {
  textoInicial: string;
  alAplicar: (texto: string) => void;
  alCerrar: () => void;
}) {
  const [texto, setTexto] = useState(textoInicial);
  const [ayuda, setAyuda] = useState(!textoInicial.trim());
  useEffect(() => setTexto(textoInicial), [textoInicial]);

  const resultado = useMemo(() => interpretarTexto(texto), [texto]);
  const cambio = texto !== textoInicial;

  function alPresionar(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
      evento.preventDefault();
      if (resultado.nodos.length > 0) alAplicar(texto);
    }
    // Tab inserta sangría (las ramas dependen de ella) en lugar de salir del campo.
    if (evento.key === 'Tab') {
      evento.preventDefault();
      const area = evento.currentTarget;
      const { selectionStart, selectionEnd } = area;
      const nuevo = `${texto.slice(0, selectionStart)}  ${texto.slice(selectionEnd)}`;
      setTexto(nuevo);
      requestAnimationFrame(() => area.setSelectionRange(selectionStart + 2, selectionStart + 2));
    }
  }

  return (
    <aside className={unirClases(claseLateral, 'w-[26rem]')} aria-label="Flujo como texto">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <FileText className="size-4 text-texto-3" />
          Flujo como texto
        </h3>
        <BotonIcono icono={X} etiqueta="Cerrar" tamano="sm" onClick={alCerrar} />
      </div>

      <button type="button" onClick={() => setAyuda(!ayuda)} className="flex items-center gap-1 self-start text-xs font-medium text-violet-700 hover:underline">
        <ChevronDown className={unirClases('size-3.5 transition-transform', !ayuda && '-rotate-90')} />
        Cómo se escribe
      </button>
      {ayuda && (
        <div className="flex flex-col gap-2 rounded-lg bg-superficie-2 p-3 text-xs leading-relaxed text-texto-2">
          <p>
            Una línea por paso: <code className="font-mono text-texto">tipo: Qué pasa | dato técnico</code>. El dato técnico es opcional.
          </p>
          <p>
            Tipos:{' '}
            {tiposPaso.map((tipo, indice) => (
              <span key={tipo}>
                <code className="font-mono text-texto">{configuracionPaso[tipo].palabras[0]}</code>
                {indice < tiposPaso.length - 1 ? ', ' : ''}
              </span>
            ))}
            . <code className="font-mono text-texto">fin</code> e <code className="font-mono text-texto">inicio</code> pueden ir solos.
          </p>
          <p>
            Ramas: 2 espacios más de sangría y <code className="font-mono text-texto">[Sí]</code>, <code className="font-mono text-texto">[No]</code>… al inicio. Al volver a la sangría
            anterior, el paso une las ramas abiertas. <code className="font-mono text-texto">-&gt; Título</code> salta a un paso existente.
          </p>
          <button type="button" onClick={() => setTexto(ejemploSintaxis)} className="self-start font-medium text-violet-700 hover:underline">
            Ver un ejemplo
          </button>
        </div>
      )}

      <textarea
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        onKeyDown={alPresionar}
        spellCheck={false}
        placeholder={ejemploSintaxis}
        aria-label="Pasos del flujo"
        className="min-h-80 flex-1 resize-none rounded-lg border border-borde bg-fondo p-3 font-mono text-[12.5px] leading-relaxed text-texto shadow-tarjeta placeholder:text-texto-3/60 focus:border-acento focus:outline-none focus:ring-3 focus:ring-acento/15"
      />

      {resultado.errores.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
          {resultado.errores.slice(0, 6).map((error) => (
            <li key={`${error.linea}-${error.mensaje}`} className="flex gap-1.5">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Línea {error.linea}: {error.mensaje}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-texto-3">
          {resultado.nodos.length} pasos · {resultado.conexiones.length} conexiones
        </span>
        <Boton tamano="sm" icono={CornerDownLeft} disabled={resultado.nodos.length === 0 || !cambio} onClick={() => alAplicar(texto)} title="Ctrl + Enter">
          Aplicar al diagrama
        </Boton>
      </div>
    </aside>
  );
}

// ---------- Generar con IA ----------

export function ModalGenerarIA({ abierto, alCerrar, alGenerar }: { abierto: boolean; alCerrar: () => void; alGenerar: (texto: string) => void }) {
  const [descripcion, setDescripcion] = useState('');
  const [generando, setGenerando] = useState(false);

  async function generar() {
    if (!descripcion.trim() || generando) return;
    setGenerando(true);
    try {
      const texto = await apiFlujos.generarConIA(descripcion.trim());
      const { nodos } = interpretarTexto(texto);
      if (nodos.length === 0) {
        notificar.aviso('La IA no devolvió pasos', 'Describe el proceso con más detalle.');
        return;
      }
      alGenerar(texto);
      setDescripcion('');
    } catch (error) {
      notificar.error('No se pudo generar el flujo', error);
    } finally {
      setGenerando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={() => !generando && alCerrar()}
      titulo="Describir el proceso con IA"
      ancho="lg"
      pie={
        <>
          <Boton variante="secundario" onClick={alCerrar} disabled={generando}>
            Cancelar
          </Boton>
          <Boton icono={Sparkles} cargando={generando} disabled={!descripcion.trim()} onClick={() => void generar()}>
            {generando ? 'Generando…' : 'Generar flujo'}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-3 pb-2">
        <p className="text-sm text-texto-2">
          Cuéntalo con tus palabras: qué hace el usuario, qué pantallas intervienen, qué se valida y qué procedimientos o servicios se llaman. Verás el resultado como
          texto antes de aplicarlo al diagrama.
        </p>
        <AreaTexto
          autoFocus
          rows={10}
          maxLength={12000}
          value={descripcion}
          onChange={(evento) => setDescripcion(evento.target.value)}
          onKeyDown={(evento) => evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey) && void generar()}
          placeholder="El usuario entra a CertificadoConsultas.aspx, elige un rango de fechas y pulsa Generar. Se valida que el rango no supere 6 meses; si no, se muestra un error. Luego se llama a POST /api/certificados, que ejecuta sp_GenerarCertificado…"
        />
        <p className="text-xs text-texto-3">La descripción se envía al proveedor de IA configurado en la API (hoy Gemini).</p>
      </div>
    </Modal>
  );
}
