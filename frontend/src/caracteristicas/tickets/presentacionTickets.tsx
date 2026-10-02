import {
  Ban,
  CircleCheck,
  CircleDashed,
  Clock,
  Code2,
  FlaskConical,
  GitPullRequest,
  Hourglass,
  Inbox,
  Rocket,
  SearchCheck,
  ShieldCheck,
  Undo2,
  UserCheck,
} from 'lucide-react';
import type { DatosTicket } from '../../servicios/api';
import type { EstadoSla, EstadoTicket, Prioridad, TicketDetalleDto, TipoTicket } from '../../servicios/tipos';
import { formatearRelativo } from '../../servicios/formato';
import { Insignia, type Icono } from '../../componentes/ui/primitivos';

type Tono = 'neutro' | 'acento' | 'exito' | 'aviso' | 'peligro';

export const configuracionEstado: Record<EstadoTicket, { etiqueta: string; tono: Tono; icono: Icono }> = {
  Nuevo: { etiqueta: 'Nuevo', tono: 'neutro', icono: Inbox },
  Asignado: { etiqueta: 'Asignado', tono: 'neutro', icono: UserCheck },
  EnAnalisis: { etiqueta: 'En análisis', tono: 'acento', icono: SearchCheck },
  PendienteCliente: { etiqueta: 'Pendiente del cliente', tono: 'aviso', icono: Hourglass },
  EnDesarrollo: { etiqueta: 'En desarrollo', tono: 'acento', icono: Code2 },
  EnRevision: { etiqueta: 'En revisión (PR)', tono: 'acento', icono: GitPullRequest },
  EnPruebas: { etiqueta: 'En pruebas', tono: 'aviso', icono: FlaskConical },
  Devuelto: { etiqueta: 'Devuelto', tono: 'peligro', icono: Undo2 },
  Aprobado: { etiqueta: 'Aprobado', tono: 'exito', icono: ShieldCheck },
  EnProduccion: { etiqueta: 'En producción', tono: 'exito', icono: Rocket },
  Cerrado: { etiqueta: 'Cerrado', tono: 'neutro', icono: CircleCheck },
  Cancelado: { etiqueta: 'Cancelado', tono: 'neutro', icono: Ban },
};

export const etiquetaTipo: Record<TipoTicket, string> = {
  Ajuste: 'Ajuste',
  NuevoDesarrollo: 'Nuevo desarrollo',
  Incidencia: 'Incidencia',
  Auditoria: 'Auditoría',
  Soporte: 'Soporte',
  Otro: 'Otro',
};

export const tiposTicket = Object.keys(etiquetaTipo) as TipoTicket[];
export const prioridades: Prioridad[] = ['Baja', 'Media', 'Alta', 'Urgente'];

/**
 * Datos editables actuales del ticket. El PUT reemplaza todo: se parte de aquí y se cambia solo lo necesario
 * para no borrar campos que la pantalla no muestra.
 */
export function datosDeDetalle(detalle: TicketDetalleDto): DatosTicket {
  return {
    asunto: detalle.resumen.asunto,
    tipo: detalle.resumen.tipo,
    prioridad: detalle.resumen.prioridad,
    nombreSolicitante: detalle.resumen.nombreSolicitante,
    correoSolicitante: detalle.correoSolicitante,
    descripcionMarkdown: detalle.descripcionMarkdown,
    numeroExterno: detalle.resumen.numeroExterno,
    idSeguimiento: detalle.idSeguimiento,
    horasDedicadas: detalle.horasDedicadas,
    fechaVencimiento: detalle.fechaVencimiento,
    proyectoIds: detalle.resumen.proyectos.map((proyecto) => proyecto.id),
  };
}

/** Fecha UTC → "AAAA-MM-DD" en la zona local (para <input type="date">). */
export function aFechaInput(fechaIso: string | null): string {
  if (!fechaIso) return '';
  const fecha = new Date(fechaIso);
  const dosDigitos = (numero: number) => String(numero).padStart(2, '0');
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

/** El vencimiento es el final del día local elegido, guardado como instante UTC. */
export const deFechaInput = (valor: string): string | null => (valor ? new Date(`${valor}T23:59:00`).toISOString() : null);

/** "2,5" o "2.5" → 2.5; vacío → null; inválido → undefined. */
export function leerHoras(texto: string): number | null | undefined {
  if (!texto.trim()) return null;
  const numero = Number(texto.replace(',', '.'));
  return Number.isNaN(numero) || numero < 0 || numero > 9999.99 ? undefined : numero;
}

/**
 * Referencia del ticket en el nombre de la rama según la convención del equipo
 * (Ajuste/AndresEspitia-Ticket1468-AjusteMenu…): "Ticket" + dígitos del Nº externo, o la clave interna si no hay.
 * Debe coincidir con ConvencionRamas en el backend.
 */
export function referenciaRama(resumen: { clave: string; numeroExterno: string | null }): string {
  const digitos = resumen.numeroExterno?.match(/\d+/g);
  if (!digitos) return resumen.clave;
  return `Ticket${digitos[digitos.length - 1].replace(/^0+(?=\d)/, '')}`;
}

export const formatearHoras = (horas: number | null) => (horas === null ? '—' : `${horas.toLocaleString('es', { maximumFractionDigits: 2 })} h`);

export function InsigniaEstado({ estado }: { estado: EstadoTicket }) {
  const { etiqueta, tono, icono } = configuracionEstado[estado];
  return (
    <Insignia tono={tono} icono={icono}>
      {etiqueta}
    </Insignia>
  );
}

const tonoPrioridad: Record<Prioridad, Tono> = { Baja: 'neutro', Media: 'neutro', Alta: 'aviso', Urgente: 'peligro' };

export function InsigniaPrioridad({ prioridad }: { prioridad: Prioridad }) {
  return <Insignia tono={tonoPrioridad[prioridad]}>{prioridad}</Insignia>;
}

const configuracionSla: Record<EstadoSla, { etiqueta: string; tono: Tono; icono: Icono } | null> = {
  SinSla: null,
  EnTiempo: { etiqueta: 'En tiempo', tono: 'neutro', icono: Clock },
  PorVencer: { etiqueta: 'Por vencer', tono: 'aviso', icono: Clock },
  Vencido: { etiqueta: 'Vencido', tono: 'peligro', icono: Clock },
  Cumplido: { etiqueta: 'Resuelto a tiempo', tono: 'exito', icono: CircleCheck },
  Incumplido: { etiqueta: 'Resuelto tarde', tono: 'peligro', icono: CircleDashed },
};

/** Semáforo de la fecha de vencimiento con el tiempo restante o vencido; sin fecha no se muestra. */
export function InsigniaSla({ estadoSla, fechaLimite }: { estadoSla: EstadoSla; fechaLimite: string | null }) {
  const configuracion = configuracionSla[estadoSla];
  if (!configuracion) return <span className="text-xs text-texto-3">—</span>;
  const abierto = estadoSla === 'EnTiempo' || estadoSla === 'PorVencer' || estadoSla === 'Vencido';
  return (
    <Insignia tono={configuracion.tono} icono={configuracion.icono}>
      {abierto && fechaLimite ? `${estadoSla === 'Vencido' ? 'Venció' : 'Vence'} ${formatearRelativo(fechaLimite)}` : configuracion.etiqueta}
    </Insignia>
  );
}
