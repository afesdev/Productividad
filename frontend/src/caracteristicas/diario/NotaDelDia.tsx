import { useEffect, useRef, useState } from 'react';
import { AlertCircle, BatteryMedium, Check, Heart, Loader2, Sparkles } from 'lucide-react';
import { apiDiario, type AccionTextoIA } from '../../servicios/api';
import type { DiaDiarioDto } from '../../servicios/tipos';
import { useEditorState, type Editor } from '@tiptap/react';
import { EditorRico, obtenerMarkdown, transformarConIA, type ManejadorEditorRico } from '../../componentes/editor/EditorRico';
import { usarWikiLinks } from '../../componentes/editor/usarWikiLinks';
import { unirClases, type Icono } from '../../componentes/ui/primitivos';
import { accionesIADiario, plantillaNotaDiaria } from './presentacionDiario';

const EsperaAutoguardadoMs = 1200;

type EstadoGuardado = 'guardado' | 'pendiente' | 'guardando' | 'error';

/**
 * Nota libre del día (editor visual con [[enlaces]] e imágenes) + ánimo y energía.
 * Se autoguarda; un día nuevo empieza con la plantilla y solo se guarda si se edita.
 * Montar con key={fecha}: al cambiar de día se guarda lo pendiente del anterior.
 */
export function NotaDelDia({ dia, alGuardar }: { dia: DiaDiarioDto; alGuardar: (registroId: string) => void }) {
  const editor = useRef<ManejadorEditorRico>(null);
  // Al desmontar, React ya limpió la ref imperativa; la instancia sigue viva (se destruye en un setTimeout).
  const instanciaEditor = useRef<Editor | null>(null);
  const [editorListo, setEditorListo] = useState<Editor | null>(null);
  const opcionesWikiLinks = usarWikiLinks(dia.registroId ?? undefined);
  const [animo, setAnimo] = useState(dia.animo);
  const [energia, setEnergia] = useState(dia.energia);
  const [estado, setEstado] = useState<EstadoGuardado>('guardado');
  const valores = useRef({ animo: dia.animo, energia: dia.energia });
  const hayCambios = useRef(false);
  const temporizador = useRef<number>();

  async function guardar() {
    window.clearTimeout(temporizador.current);
    if (!hayCambios.current) return;
    hayCambios.current = false;
    setEstado('guardando');
    try {
      const registroId = await apiDiario.guardarNota(dia.fecha, {
        contenidoMarkdown:
          editor.current?.obtenerMarkdown() ??
          (instanciaEditor.current && !instanciaEditor.current.isDestroyed ? obtenerMarkdown(instanciaEditor.current) : dia.contenidoMarkdown),
        animo: valores.current.animo,
        energia: valores.current.energia,
      });
      alGuardar(registroId);
      setEstado(hayCambios.current ? 'pendiente' : 'guardado');
    } catch {
      hayCambios.current = true;
      setEstado('error');
    }
  }

  const guardarActual = useRef(guardar);
  guardarActual.current = guardar;

  function marcarCambio(inmediato = false) {
    hayCambios.current = true;
    setEstado('pendiente');
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => void guardarActual.current(), inmediato ? 0 : EsperaAutoguardadoMs);
  }

  // Al cambiar de día o salir, se guarda lo pendiente.
  useEffect(
    () => () => {
      window.clearTimeout(temporizador.current);
      if (hayCambios.current) void guardarActual.current();
    },
    [],
  );

  function elegir(campo: 'animo' | 'energia', valor: number) {
    const nuevo = valores.current[campo] === valor ? null : valor;
    valores.current = { ...valores.current, [campo]: nuevo };
    if (campo === 'animo') setAnimo(nuevo);
    else setEnergia(nuevo);
    marcarCambio(true);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Nota del día</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Escala icono={Heart} etiqueta="Ánimo" valor={animo} tono="bg-rose-300" alElegir={(valor) => elegir('animo', valor)} />
          <Escala icono={BatteryMedium} etiqueta="Energía" valor={energia} tono="bg-amber-300" alElegir={(valor) => elegir('energia', valor)} />
          <IndicadorGuardado estado={estado} alReintentar={() => void guardar()} />
        </div>
      </div>
      <div className="rounded-2xl border border-borde bg-superficie px-6 py-5 sm:px-8 [&_.editor-rico]:min-h-[60vh] [&_.editor-rico]:pb-10">
        {editorListo && <BarraIA editor={editorListo} />}
        <EditorRico
          ref={editor}
          contenidoInicial={dia.contenidoMarkdown || plantillaNotaDiaria}
          alCambiar={() => marcarCambio()}
          alListo={(instancia) => {
            instanciaEditor.current = instancia;
            setEditorListo(instancia);
          }}
          destinoAdjuntos={dia.registroId ? { registroDiarioId: dia.registroId } : undefined}
          wikiLinks={opcionesWikiLinks}
          placeholder='Escribe libremente… "[[" enlaza tareas, tickets y páginas; pega capturas con Ctrl+V'
        />
      </div>
    </section>
  );
}

/** Botones de IA siempre visibles: sin selección actúan sobre toda la nota; con selección, solo sobre ese fragmento. */
function BarraIA({ editor }: { editor: Editor }) {
  const [procesando, setProcesando] = useState<AccionTextoIA | null>(null);
  const conSeleccion = useEditorState({ editor, selector: ({ editor: actual }) => !actual.state.selection.empty });

  async function usar(accion: AccionTextoIA) {
    if (procesando) return;
    setProcesando(accion);
    try {
      await transformarConIA(editor, accion);
    } finally {
      setProcesando(null);
    }
  }

  return (
    <div className="-mx-2 mb-3 flex flex-wrap items-center gap-2 border-b border-borde px-2 pb-3">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700">
        <Sparkles className="size-3.5" />
        IA
      </span>
      {accionesIADiario.map(({ accion, etiqueta, icono: IconoAccion }) => (
        <button
          key={accion}
          type="button"
          disabled={procesando !== null}
          onMouseDown={(evento) => evento.preventDefault()}
          onClick={() => void usar(accion)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-60"
        >
          {procesando === accion ? <Loader2 className="size-3.5 animate-spin" /> : <IconoAccion className="size-3.5" />}
          {etiqueta}
        </button>
      ))}
      <span className="text-xs text-texto-3">{conSeleccion ? 'Solo el texto seleccionado' : 'Toda la nota · selecciona un fragmento para limitarlo'}</span>
    </div>
  );
}

/** Cinco puntos; pulsar el valor actual lo borra. */
function Escala({ icono: IconoEscala, etiqueta, valor, tono, alElegir }: { icono: Icono; etiqueta: string; valor: number | null; tono: string; alElegir: (valor: number) => void }) {
  return (
    <span className="flex items-center gap-1.5" role="radiogroup" aria-label={etiqueta}>
      <IconoEscala className="size-3.5 text-texto-3" aria-hidden />
      <span className="text-xs text-texto-3">{etiqueta}</span>
      {[1, 2, 3, 4, 5].map((nivel) => (
        <button
          key={nivel}
          type="button"
          role="radio"
          aria-checked={valor === nivel}
          aria-label={`${etiqueta} ${nivel} de 5`}
          onClick={() => alElegir(nivel)}
          className={unirClases('size-3 rounded-full transition hover:scale-125', valor !== null && nivel <= valor ? tono : 'bg-superficie-3')}
        />
      ))}
    </span>
  );
}

function IndicadorGuardado({ estado, alReintentar }: { estado: EstadoGuardado; alReintentar: () => void }) {
  if (estado === 'error') {
    return (
      <button type="button" onClick={alReintentar} className="inline-flex items-center gap-1 text-xs text-peligro hover:underline">
        <AlertCircle className="size-3.5" />
        Error · reintentar
      </button>
    );
  }
  return (
    <span className="inline-flex w-24 items-center gap-1 text-xs text-texto-3" aria-live="polite">
      {estado === 'guardando' ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          Guardando…
        </>
      ) : estado === 'pendiente' ? (
        <>
          <span className="size-1.5 rounded-full bg-aviso" />
          Sin guardar
        </>
      ) : (
        <>
          <Check className="size-3.5" />
          Guardado
        </>
      )}
    </span>
  );
}
