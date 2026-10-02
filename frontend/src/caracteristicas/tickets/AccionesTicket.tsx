import { useState, type FormEvent } from 'react';
import { Ban, CheckCheck, CircleCheck, Code2, FlaskConical, GitPullRequest, Hourglass, Rocket, RotateCcw, SearchCheck, ShieldCheck, Undo2, UserCheck } from 'lucide-react';
import { apiTickets } from '../../servicios/api';
import { obtenerMensajeError } from '../../servicios/clienteApi';
import { notificar } from '../../servicios/notificaciones';
import type { EstadoTicket, TicketDetalleDto, UsuarioAsignableDto } from '../../servicios/tipos';
import { Modal } from '../../componentes/ui/Modal';
import { AreaTexto, Boton, Campo, Entrada, MensajeError, Selector, type Icono } from '../../componentes/ui/primitivos';

type TipoAccion = 'directa' | 'asignar' | 'despliegueDesarrollo' | 'despliegueProduccion' | 'aprobarPruebas' | 'devolverPruebas';

interface DefinicionAccion {
  etiqueta: string;
  icono: Icono;
  tipo: TipoAccion;
  descripcion?: string;
  comentario?: 'opcional' | 'obligatorio';
  peligrosa?: boolean;
}

/** Cómo se presenta cada transición según el estado de origen. */
function definirAccion(desde: EstadoTicket, hacia: EstadoTicket): DefinicionAccion {
  switch (hacia) {
    case 'Asignado':
      return { etiqueta: 'Asignar', icono: UserCheck, tipo: 'asignar' };
    case 'EnAnalisis':
      return desde === 'Cerrado'
        ? { etiqueta: 'Reabrir', icono: RotateCcw, tipo: 'directa', comentario: 'opcional', descripcion: 'El ticket vuelve a análisis.' }
        : { etiqueta: desde === 'PendienteCliente' ? 'Retomar análisis' : 'Iniciar análisis', icono: SearchCheck, tipo: 'directa' };
    case 'PendienteCliente':
      return { etiqueta: 'Esperar al cliente', icono: Hourglass, tipo: 'directa', comentario: 'obligatorio', descripcion: '¿Qué información falta del solicitante?' };
    case 'EnDesarrollo':
      return desde === 'EnRevision'
        ? { etiqueta: 'Solicitar cambios', icono: Code2, tipo: 'directa', comentario: 'opcional', descripcion: 'El PR necesita correcciones; vuelve a desarrollo.' }
        : { etiqueta: desde === 'Devuelto' ? 'Retomar desarrollo' : 'Iniciar desarrollo', icono: Code2, tipo: 'directa' };
    case 'EnRevision':
      return { etiqueta: 'Enviar a revisión', icono: GitPullRequest, tipo: 'directa' };
    case 'EnPruebas':
      return { etiqueta: 'Desplegado en Desarrollo', icono: FlaskConical, tipo: 'despliegueDesarrollo' };
    case 'Aprobado':
      return { etiqueta: 'Aprobar pruebas', icono: ShieldCheck, tipo: 'aprobarPruebas' };
    case 'Devuelto':
      return { etiqueta: 'Devolver', icono: Undo2, tipo: 'devolverPruebas', peligrosa: true };
    case 'EnProduccion':
      return { etiqueta: 'Pasar a producción', icono: Rocket, tipo: 'despliegueProduccion' };
    case 'Cerrado':
      return { etiqueta: 'Cerrar ticket', icono: CircleCheck, tipo: 'directa', comentario: 'opcional', descripcion: 'Resumen del cierre (opcional).' };
    case 'Cancelado':
      return { etiqueta: 'Cancelar', icono: Ban, tipo: 'directa', comentario: 'obligatorio', descripcion: '¿Por qué se cancela?', peligrosa: true };
    default:
      return { etiqueta: hacia, icono: CheckCheck, tipo: 'directa' };
  }
}

interface PropiedadesAcciones {
  detalle: TicketDetalleDto;
  usuarios: UsuarioAsignableDto[];
  alCambiar: () => Promise<void>;
}

/** Botones del siguiente paso del flujo. Solo aparecen las transiciones que el backend permite. */
export function AccionesTicket({ detalle, usuarios, alCambiar }: PropiedadesAcciones) {
  const [accionActiva, setAccionActiva] = useState<{ hacia: EstadoTicket; definicion: DefinicionAccion } | null>(null);
  const [ejecutando, setEjecutando] = useState<EstadoTicket | null>(null);
  const estado = detalle.resumen.estado;

  const acciones = detalle.transicionesPermitidas.map((hacia) => ({ hacia, definicion: definirAccion(estado, hacia) }));
  const principales = acciones.filter((accion) => !accion.definicion.peligrosa && accion.hacia !== 'PendienteCliente');
  const secundarias = acciones.filter((accion) => accion.definicion.peligrosa || accion.hacia === 'PendienteCliente');

  async function ejecutarDirecta(hacia: EstadoTicket, definicion: DefinicionAccion) {
    if (definicion.tipo !== 'directa' || definicion.comentario) {
      setAccionActiva({ hacia, definicion });
      return;
    }
    setEjecutando(hacia);
    try {
      await apiTickets.cambiarEstado(detalle.resumen.id, hacia);
      notificar.exito(definicion.etiqueta, detalle.resumen.clave);
      await alCambiar();
    } catch (errorAccion) {
      notificar.error('No se pudo cambiar el estado', errorAccion);
    } finally {
      setEjecutando(null);
    }
  }

  if (acciones.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {secundarias.map(({ hacia, definicion }) => (
          <Boton key={hacia} variante="fantasma" icono={definicion.icono} onClick={() => void ejecutarDirecta(hacia, definicion)} className={definicion.peligrosa ? 'hover:text-peligro' : ''}>
            {definicion.etiqueta}
          </Boton>
        ))}
        {principales.map(({ hacia, definicion }, indice) => (
          <Boton
            key={hacia}
            variante={indice === principales.length - 1 ? 'primario' : 'secundario'}
            icono={definicion.icono}
            cargando={ejecutando === hacia}
            onClick={() => void ejecutarDirecta(hacia, definicion)}
          >
            {definicion.etiqueta}
          </Boton>
        ))}
      </div>

      <ModalAccion
        accion={accionActiva}
        detalle={detalle}
        usuarios={usuarios}
        alCerrar={() => setAccionActiva(null)}
        alCompletar={async () => {
          setAccionActiva(null);
          await alCambiar();
        }}
      />
    </>
  );
}

function ModalAccion({
  accion,
  detalle,
  usuarios,
  alCerrar,
  alCompletar,
}: {
  accion: { hacia: EstadoTicket; definicion: DefinicionAccion } | null;
  detalle: TicketDetalleDto;
  usuarios: UsuarioAsignableDto[];
  alCerrar: () => void;
  alCompletar: () => Promise<void>;
}) {
  const [texto, setTexto] = useState('');
  const [referencia, setReferencia] = useState('');
  const [agenteId, setAgenteId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [accionPrevia, setAccionPrevia] = useState(accion);

  if (accion !== accionPrevia) {
    setAccionPrevia(accion);
    setTexto('');
    setReferencia('');
    setError(null);
    setAgenteId(detalle.resumen.agenteAsignadoId ?? usuarios[0]?.id ?? '');
  }

  const definicion = accion?.definicion;
  const esDespliegue = definicion?.tipo === 'despliegueDesarrollo' || definicion?.tipo === 'despliegueProduccion';
  const notasObligatorias = definicion?.comentario === 'obligatorio' || definicion?.tipo === 'devolverPruebas';
  const ticketId = detalle.resumen.id;

  const descripciones: Partial<Record<TipoAccion, string>> = {
    asignar: 'Quién se encargará del ticket.',
    despliegueDesarrollo: 'Registra que el cambio ya está en la aplicación de desarrollo. El ticket pasa a pruebas.',
    despliegueProduccion: 'Registra el paso a producción. Después podrás cerrar el ticket.',
    aprobarPruebas: 'Las pruebas en Desarrollo fueron exitosas: queda aprobado para producción.',
    devolverPruebas: 'Las pruebas fallaron. Describe qué hay que corregir; el ticket vuelve a desarrollo.',
  };

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!accion || !definicion) return;
    setEnviando(true);
    setError(null);
    try {
      const notas = texto.trim() || undefined;
      switch (definicion.tipo) {
        case 'asignar':
          await apiTickets.asignar(ticketId, agenteId || null);
          break;
        case 'despliegueDesarrollo':
          await apiTickets.registrarDespliegue(ticketId, 'Desarrollo', referencia.trim() || undefined, notas);
          break;
        case 'despliegueProduccion':
          await apiTickets.registrarDespliegue(ticketId, 'Produccion', referencia.trim() || undefined, notas);
          break;
        case 'aprobarPruebas':
          await apiTickets.registrarResultadoPruebas(ticketId, true, notas);
          break;
        case 'devolverPruebas':
          await apiTickets.registrarResultadoPruebas(ticketId, false, notas);
          break;
        default:
          await apiTickets.cambiarEstado(ticketId, accion.hacia, notas);
      }
      notificar.exito(definicion.etiqueta, detalle.resumen.clave);
      await alCompletar();
    } catch (errorAccion) {
      setError(obtenerMensajeError(errorAccion));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      abierto={accion !== null}
      alCerrar={alCerrar}
      titulo={definicion?.etiqueta ?? ''}
      descripcion={definicion ? (descripciones[definicion.tipo] ?? definicion.descripcion) : undefined}
      pie={
        <>
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form="formulario-accion-ticket" variante={definicion?.peligrosa ? 'peligro' : 'primario'} cargando={enviando}>
            {definicion?.etiqueta}
          </Boton>
        </>
      }
    >
      <form id="formulario-accion-ticket" onSubmit={enviar} className="flex flex-col gap-4">
        {definicion?.tipo === 'asignar' && (
          <Campo etiqueta="Responsable">
            <Selector required value={agenteId} onChange={(evento) => setAgenteId(evento.target.value)}>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nombreCompleto} (@{usuario.nombreUsuario})
                </option>
              ))}
            </Selector>
          </Campo>
        )}
        {esDespliegue && (
          <Campo etiqueta="Versión, tag o commit (opcional)">
            <Entrada value={referencia} maxLength={200} onChange={(evento) => setReferencia(evento.target.value)} placeholder="v1.8.0 · build 245 · a1b2c3d" className="font-mono" />
          </Campo>
        )}
        {definicion?.tipo !== 'asignar' && (
          <Campo etiqueta={notasObligatorias ? 'Detalle' : 'Notas (opcional)'}>
            <AreaTexto rows={4} required={notasObligatorias} maxLength={2000} value={texto} onChange={(evento) => setTexto(evento.target.value)} />
          </Campo>
        )}
        <MensajeError mensaje={error} />
      </form>
    </Modal>
  );
}
