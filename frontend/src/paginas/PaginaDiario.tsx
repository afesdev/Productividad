import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Columns3, Download, FileSpreadsheet, Layers, Loader2, NotebookPen, Search, X } from 'lucide-react';
import { apiDiario } from '../servicios/api';
import { notificar } from '../servicios/notificaciones';
import type { DiaDiarioDto, EntradaExploradaDto, ResumenDiaDiarioDto, TipoEntradaDiario } from '../servicios/tipos';
import { CalendarioMes } from '../caracteristicas/diario/CalendarioMes';
import { BarraCaptura, ListaEntradas, TarjetaEntrada, type ManejadorCaptura } from '../caracteristicas/diario/EntradasDelDia';
import { NotaDelDia } from '../caracteristicas/diario/NotaDelDia';
import { PanelActividad } from '../caracteristicas/diario/PanelActividad';
import { BotonMarcador } from '../caracteristicas/marcadores/ContextoMarcadores';
import { VistaRevision, type PeriodoRevision } from '../caracteristicas/diario/VistaRevision';
import { VistaSemana } from '../caracteristicas/diario/VistaSemana';
import { descargarMarkdown, diaAMarkdown } from '../caracteristicas/diario/exportarDiario';
import { configuracionTipo, deIso, esFechaIso, formatearFechaCorta, formatearFechaLarga, hoyIso, sumarDias, tiposEntrada } from '../caracteristicas/diario/presentacionDiario';
import { BotonPlegarPanel } from '../componentes/ui/BotonPlegarPanel';
import { Boton, BotonIcono, Entrada, Esqueleto, EstadoVacio, unirClases } from '../componentes/ui/primitivos';

/**
 * Diario: /diario (hoy) · /diario/AAAA-MM-DD · /diario?vista=explorar&tipo=Decision&q=… · /diario?vista=revision&periodo=semana&fecha=…
 * Panel lateral con calendario del mes y accesos a Explorar; al centro el día (captura rápida, línea de tiempo y nota).
 */
export function PaginaDiario() {
  const { fecha: fechaRuta } = useParams();
  const [parametros, setParametros] = useSearchParams();
  const navegar = useNavigate();
  const explorando = parametros.get('vista') === 'explorar';
  const revisando = parametros.get('vista') === 'revision';
  const enSemana = parametros.get('vista') === 'semana';
  const periodoRevision: PeriodoRevision = parametros.get('periodo') === 'mes' ? 'mes' : 'semana';
  const fechaRevision = esFechaIso(parametros.get('fecha') ?? undefined) ? parametros.get('fecha')! : hoyIso();
  const fecha = esFechaIso(fechaRuta) ? fechaRuta : hoyIso();
  const [mesVisible, setMesVisible] = useState(() => ({ anio: deIso(fecha).getFullYear(), mes: deIso(fecha).getMonth() + 1 }));
  const [resumenes, setResumenes] = useState<ResumenDiaDiarioDto[]>([]);
  const [panelAbierto, setPanelAbierto] = useState(false);
  // Pantallas grandes: el panel del calendario se puede ocultar para escribir con más espacio (se recuerda).
  const [calendarioOculto, setCalendarioOculto] = useState(() => leerCalendarioOculto());
  const riel = calendarioOculto;

  function alternarCalendario() {
    setCalendarioOculto((actual) => {
      try {
        localStorage.setItem(ClaveCalendarioOculto, actual ? '0' : '1');
      } catch {
        // Preferencia visual: sin almacenamiento solo dura la sesión.
      }
      return !actual;
    });
  }

  const cargarMes = useCallback(async () => {
    try {
      setResumenes(await apiDiario.mes(mesVisible.anio, mesVisible.mes));
    } catch (errorCarga) {
      notificar.error('No se pudo cargar el calendario', errorCarga);
    }
  }, [mesVisible]);

  useEffect(() => {
    void cargarMes();
  }, [cargarMes]);

  // El calendario sigue al día abierto.
  useEffect(() => {
    const dia = deIso(fecha);
    setMesVisible((actual) => (actual.anio === dia.getFullYear() && actual.mes === dia.getMonth() + 1 ? actual : { anio: dia.getFullYear(), mes: dia.getMonth() + 1 }));
  }, [fecha]);

  useEffect(() => setPanelAbierto(false), [fecha, parametros]);

  if (fechaRuta && !esFechaIso(fechaRuta)) return <Navigate to="/diario" replace />;

  const irA = (destino: string) => navegar(destino === hoyIso() ? '/diario' : `/diario/${destino}`);
  const tipoExplorado = parametros.get('tipo') as TipoEntradaDiario | null;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-1 flex-col lg:flex-row">
      {panelAbierto && <div className="fixed inset-0 z-40 bg-zinc-950/20 lg:hidden" onClick={() => setPanelAbierto(false)} />}

      <div className="relative lg:sticky lg:top-14 lg:z-20 lg:h-[calc(100vh-3.5rem)] lg:shrink-0">
        <aside
          aria-label="Calendario del diario"
          className={unirClases(
            'sin-barra-scroll flex flex-col gap-6 overflow-y-auto bg-lateral px-3 py-5 transition-[width]',
            'lg:h-full lg:border-r lg:border-borde',
            // Recogido: riel de iconos (solo en pantallas grandes; en móvil el panel es un cajón completo).
            riel ? 'lg:w-16 lg:px-2' : 'lg:w-72',
            panelAbierto ? 'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-80 max-lg:max-w-[85vw] max-lg:shadow-flotante' : 'max-lg:hidden',
          )}
        >
          {riel && (
            <button
              type="button"
              onClick={() => irA(hoyIso())}
              title="Diario de hoy"
              aria-label="Diario de hoy"
              className="mx-auto hidden size-9 place-items-center rounded-xl bg-orange-100 text-orange-500 transition hover:bg-orange-200 lg:grid"
            >
              <NotebookPen className="size-4" />
            </button>
          )}
          <div className={unirClases('flex items-center justify-between px-1', riel && 'lg:hidden')}>
            <span className="flex items-center gap-2 text-sm font-semibold">
              <NotebookPen className="size-4 text-orange-400" />
              Diario
            </span>
            <span className="flex items-center gap-1">
              <Boton variante="secundario" tamano="sm" onClick={() => irA(hoyIso())}>
                Hoy
              </Boton>
              <BotonIcono icono={X} etiqueta="Cerrar panel" className="lg:hidden" onClick={() => setPanelAbierto(false)} />
            </span>
          </div>

          <div className={unirClases(riel && 'lg:hidden')}>
          <CalendarioMes
            anio={mesVisible.anio}
            mes={mesVisible.mes}
            resumenes={resumenes}
            seleccionada={explorando || revisando || enSemana ? null : fecha}
            alElegirDia={irA}
            alCambiarMes={(anio, mes) => setMesVisible({ anio, mes })}
          />
          </div>

          <nav aria-label="Revisión" className="flex flex-col gap-0.5">
            <p className={unirClases('px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3', riel && 'lg:hidden')}>Revisión</p>
            <EnlaceExplorar
              compacto={riel}
              activo={enSemana}
              icono={<Columns3 className="size-3.5" />}
              recuadro="bg-orange-100 text-orange-500"
              texto="Vista semanal"
              destino={`/diario?vista=semana&fecha=${fecha}`}
            />
            <EnlaceExplorar
              compacto={riel}
              activo={revisando && periodoRevision === 'semana'}
              icono={<CalendarRange className="size-3.5" />}
              recuadro="bg-orange-100 text-orange-500"
              texto="Semana"
              destino="/diario?vista=revision&periodo=semana"
            />
            <EnlaceExplorar
              compacto={riel}
              activo={revisando && periodoRevision === 'mes'}
              icono={<CalendarDays className="size-3.5" />}
              recuadro="bg-orange-100 text-orange-500"
              texto="Mes"
              destino="/diario?vista=revision&periodo=mes"
            />
          </nav>

          <nav aria-label="Explorar" className="flex flex-col gap-0.5">
            <p className={unirClases('px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3', riel && 'lg:hidden')}>Explorar</p>
            <EnlaceExplorar compacto={riel} activo={explorando && !tipoExplorado} icono={<Layers className="size-3.5" />} recuadro="bg-violet-100 text-violet-500" texto="Todas las entradas" destino="/diario?vista=explorar" />
            {tiposEntrada.map((tipo) => {
              const { icono: IconoTipo, plural, recuadro } = configuracionTipo[tipo];
              return (
                <EnlaceExplorar
                  key={tipo}
                  compacto={riel}
                  activo={explorando && tipoExplorado === tipo}
                  icono={<IconoTipo className="size-3.5" />}
                  recuadro={recuadro}
                  texto={plural}
                  destino={`/diario?vista=explorar&tipo=${tipo}`}
                />
              );
            })}
          </nav>
        </aside>
        <div className="hidden lg:block">
          <BotonPlegarPanel plegado={riel} alAlternar={alternarCalendario} etiqueta="panel del diario" className="top-5" />
        </div>
      </div>

      <section className="min-w-0 flex-1 bg-superficie px-4 pb-16 pt-4 md:px-8 lg:px-12">
        <button
          type="button"
          onClick={() => setPanelAbierto(true)}
          className="mb-3 inline-flex h-9 items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 text-sm font-medium text-orange-900 transition hover:bg-orange-100 lg:hidden"
        >
          <CalendarDays className="size-4" />
          Calendario
        </button>

        {enSemana ? (
          <VistaSemana fecha={fechaRevision} alCambiar={(fechaNueva) => setParametros({ vista: 'semana', fecha: fechaNueva }, { replace: true })} />
        ) : revisando ? (
          <VistaRevision
            periodo={periodoRevision}
            fecha={fechaRevision}
            alCambiar={(periodo, fechaNueva) => setParametros({ vista: 'revision', periodo, fecha: fechaNueva }, { replace: true })}
          />
        ) : explorando ? (
          <VistaExplorar tipo={tipoExplorado} texto={parametros.get('q') ?? ''} alBuscar={(texto) => {
            const siguientes = new URLSearchParams(parametros);
            if (texto) siguientes.set('q', texto);
            else siguientes.delete('q');
            setParametros(siguientes, { replace: true });
          }} />
        ) : (
          <VistaDia key={fecha} fecha={fecha} alNavegar={irA} alCambiar={cargarMes} capturar={parametros.get('capturar') === '1'} />
        )}
      </section>
    </div>
  );
}

function EnlaceExplorar({
  activo,
  icono,
  recuadro,
  texto,
  destino,
  compacto = false,
}: {
  activo: boolean;
  icono: React.ReactNode;
  recuadro: string;
  texto: string;
  destino: string;
  /** Riel recogido: solo el icono (en pantallas grandes). */
  compacto?: boolean;
}) {
  return (
    <Link
      to={destino}
      title={compacto ? texto : undefined}
      className={unirClases(
        'flex h-9 items-center gap-2.5 rounded-lg px-1.5 text-sm transition-colors',
        compacto && 'lg:justify-center lg:px-0',
        activo ? 'bg-superficie font-medium text-texto shadow-tarjeta' : 'text-texto-2 hover:bg-superficie/70 hover:text-texto',
      )}
    >
      <span className={unirClases('grid size-6 shrink-0 place-items-center rounded-md', recuadro)}>{icono}</span>
      <span className={unirClases(compacto && 'lg:hidden')}>{texto}</span>
    </Link>
  );
}

function VistaDia({ fecha, alNavegar, alCambiar, capturar }: { fecha: string; alNavegar: (fecha: string) => void; alCambiar: () => Promise<void>; capturar: boolean }) {
  const [dia, setDia] = useState<DiaDiarioDto | null>(null);
  const captura = useRef<ManejadorCaptura>(null);
  const esHoy = fecha === hoyIso();

  const cargar = useCallback(async () => {
    try {
      setDia(await apiDiario.dia(fecha));
    } catch (errorCarga) {
      notificar.error('No se pudo cargar el día', errorCarga);
    }
  }, [fecha]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (dia && capturar) captura.current?.enfocar();
  }, [dia, capturar]);

  // Alt + ← / → para moverse entre días.
  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent) => {
      if (!evento.altKey) return;
      if (evento.key === 'ArrowLeft') alNavegar(sumarDias(fecha, -1));
      if (evento.key === 'ArrowRight') alNavegar(sumarDias(fecha, 1));
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [fecha, alNavegar]);

  async function recargarTodo() {
    await Promise.all([cargar(), alCambiar()]);
  }

  // La actividad solo existe para hoy y días pasados.
  const conActividad = fecha <= hoyIso();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-orange-500">{esHoy ? 'Hoy' : deIso(fecha) < new Date() ? 'Día pasado' : 'Próximamente'}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{formatearFechaLarga(fecha)}</h1>
        </div>
        <span className="flex items-center gap-1">
          {dia?.registroId && <BotonMarcador tipo="RegistroDiario" id={dia.registroId} />}
          {dia?.registroId && (
            <BotonIcono
              icono={Download}
              etiqueta="Exportar el día a Markdown (.md)"
              onClick={() =>
                // Se pide de nuevo: la nota se autoguarda después de cargar la página.
                void apiDiario
                  .dia(fecha)
                  .then((actual) => descargarMarkdown(fecha, diaAMarkdown(actual)))
                  .catch((errorExportacion) => notificar.error('No se pudo exportar', errorExportacion))
              }
            />
          )}
          {dia?.registroId && (
            <Link
              to={`/reporte?desde=${fecha}&hasta=${fecha}`}
              title="Reportar este día (Excel de la empresa)"
              aria-label="Reportar este día"
              className="inline-grid size-9 place-items-center rounded-lg text-texto-2 transition-colors hover:bg-superficie-2 hover:text-texto"
            >
              <FileSpreadsheet className="size-4" />
            </Link>
          )}
          <BotonIcono icono={ChevronLeft} etiqueta="Día anterior (Alt + ←)" onClick={() => alNavegar(sumarDias(fecha, -1))} />
          {!esHoy && (
            <Boton variante="secundario" tamano="sm" onClick={() => alNavegar(hoyIso())}>
              Hoy
            </Boton>
          )}
          <BotonIcono icono={ChevronRight} etiqueta="Día siguiente (Alt + →)" onClick={() => alNavegar(sumarDias(fecha, 1))} />
        </span>
      </header>

      <BarraCaptura ref={captura} fecha={fecha} alCrear={recargarTodo} />

      {dia === null ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Esqueleto className="h-[60vh] rounded-2xl" />
          <div className="flex flex-col gap-3">
            <Esqueleto className="h-10" />
            <Esqueleto className="h-10 w-5/6" />
          </div>
        </div>
      ) : (
        // La nota ocupa el espacio principal; la línea de tiempo y la actividad van a su lado.
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <NotaDelDia
            key={fecha}
            dia={dia}
            alGuardar={(registroId) => {
              if (!dia.registroId) {
                setDia((actual) => (actual ? { ...actual, registroId } : actual));
                void alCambiar();
              }
            }}
          />

          <aside className="flex flex-col gap-4 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto sin-barra-scroll">
            <section className="flex flex-col gap-1 rounded-2xl border border-borde bg-superficie p-4">
              <h2 className="mb-1 flex items-center justify-between text-sm font-medium">
                Línea de tiempo
                {dia.entradas.length > 0 && <span className="text-xs font-normal tabular-nums text-texto-3">{dia.entradas.length}</span>}
              </h2>
              <ListaEntradas entradas={dia.entradas} alCambiar={recargarTodo} />
            </section>
            {conActividad && <PanelActividad fecha={fecha} entradas={dia.entradas} alAgregar={recargarTodo} />}
          </aside>
        </div>
      )}
    </div>
  );
}

function VistaExplorar({ tipo, texto, alBuscar }: { tipo: TipoEntradaDiario | null; texto: string; alBuscar: (texto: string) => void }) {
  const [entradas, setEntradas] = useState<EntradaExploradaDto[] | null>(null);
  const [busqueda, setBusqueda] = useState(texto);

  useEffect(() => {
    setEntradas(null);
    const temporizador = window.setTimeout(() => {
      apiDiario
        .explorar({ tipo: tipo ?? undefined, texto: texto.trim() })
        .then(setEntradas)
        .catch((errorCarga) => notificar.error('No se pudieron cargar las entradas', errorCarga));
    }, 150);
    return () => window.clearTimeout(temporizador);
  }, [tipo, texto]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => alBuscar(busqueda.trim()), 300);
    return () => window.clearTimeout(temporizador);
    // alBuscar cambia en cada render del padre; solo interesa la búsqueda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  const configuracion = tipo ? configuracionTipo[tipo] : null;
  const IconoTitulo = configuracion?.icono ?? Layers;
  const porFecha = (entradas ?? []).reduce<Map<string, EntradaExploradaDto[]>>((grupos, actual) => {
    grupos.set(actual.fecha, [...(grupos.get(actual.fecha) ?? []), actual]);
    return grupos;
  }, new Map());

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
          <span className={unirClases('grid size-9 place-items-center rounded-xl', configuracion?.recuadro ?? 'bg-violet-100 text-violet-500')}>
            <IconoTitulo className="size-5" />
          </span>
          {configuracion?.plural ?? 'Todas las entradas'}
        </h1>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-texto-3" />
          <Entrada value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar en título y detalle…" className="w-64 pl-9" />
        </div>
      </header>

      {entradas === null ? (
        <div className="flex items-center gap-2 py-10 text-sm text-texto-3">
          <Loader2 className="size-4 animate-spin" />
          Cargando…
        </div>
      ) : entradas.length === 0 ? (
        <EstadoVacio icono={IconoTitulo} titulo="Nada por aquí" descripcion={texto ? 'Ninguna entrada coincide con la búsqueda.' : 'Cuando registres entradas de este tipo, aparecerán aquí.'} />
      ) : (
        <ol className="flex flex-col gap-6">
          {[...porFecha.entries()].map(([fecha, grupo]) => (
            <li key={fecha} className="flex flex-col gap-1">
              <Link to={fecha === hoyIso() ? '/diario' : `/diario/${fecha}`} className="self-start text-xs font-medium uppercase tracking-wider text-texto-3 hover:text-texto-2 hover:underline">
                {formatearFechaCorta(fecha)} · {deIso(fecha).toLocaleDateString('es', { weekday: 'long' })}
              </Link>
              <ul className="flex flex-col divide-y divide-borde rounded-2xl border border-borde bg-superficie px-3">
                {grupo.map(({ entrada }) => (
                  <li key={entrada.id} className="py-2.5">
                    <TarjetaEntrada entrada={entrada} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** /diario/registro/:id (búsqueda y backlinks conocen el id, no la fecha). */
export function RedireccionRegistroDiario() {
  const { id = '' } = useParams();
  const [destino, setDestino] = useState<string | null>(null);

  useEffect(() => {
    apiDiario
      .fechaDeRegistro(id)
      .then((fecha) => setDestino(`/diario/${fecha}`))
      .catch((errorCarga) => {
        notificar.error('No se encontró ese día del diario', errorCarga);
        setDestino('/diario');
      });
  }, [id]);

  return destino ? (
    <Navigate to={destino} replace />
  ) : (
    <div className="flex items-center justify-center gap-2 py-24 text-sm text-texto-3">
      <Loader2 className="size-4 animate-spin" />
      Abriendo el diario…
    </div>
  );
}

const ClaveCalendarioOculto = 'diario.calendarioOculto';

function leerCalendarioOculto(): boolean {
  try {
    return localStorage.getItem(ClaveCalendarioOculto) === '1';
  } catch {
    return false;
  }
}
