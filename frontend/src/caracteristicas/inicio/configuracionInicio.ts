import { BarChart3, CalendarDays, Columns3, FileClock, FileText, ListChecks, LifeBuoy, NotebookPen, FileSpreadsheet, Star, Workflow } from 'lucide-react';
import type { Icono } from '../../componentes/ui/primitivos';

export type IdWidget = 'agenda' | 'tareas' | 'tickets' | 'reporte' | 'recientes' | 'porRevisar' | 'favoritos' | 'diario' | 'flujos' | 'semana' | 'trello';

/** 1 = media fila (en pantallas anchas), 2 = fila completa. */
export type AnchoWidget = 1 | 2;

export interface WidgetConfigurado {
  id: IdWidget;
  ancho: AnchoWidget;
}

export interface ConfiguracionInicio {
  version: 1;
  /** Widgets visibles, en orden. Los que no están, están ocultos. */
  widgets: WidgetConfigurado[];
}

export const ClavePreferenciaInicio = 'inicio.widgets';

export const catalogoWidgets: Record<IdWidget, { titulo: string; descripcion: string; icono: Icono; ancho: AnchoWidget }> = {
  agenda: { titulo: 'Agenda', descripcion: 'Próxima reunión y el resto del día', icono: CalendarDays, ancho: 1 },
  tareas: { titulo: 'Tareas por vencer', descripcion: 'Vencidas, de hoy y de esta semana, de todos los proyectos (y tus tarjetas de Trello)', icono: ListChecks, ancho: 1 },
  tickets: { titulo: 'Mis tickets', descripcion: 'Mis abiertos y los conteos por vista', icono: LifeBuoy, ancho: 1 },
  reporte: { titulo: 'Pendiente de reportar', descripcion: 'Horas sin pasar al Excel de la empresa', icono: FileSpreadsheet, ancho: 1 },
  recientes: { titulo: 'Documentos recientes', descripcion: 'Lo último que editaste', icono: FileText, ancho: 1 },
  porRevisar: { titulo: 'Por revisar', descripcion: 'Documentos cuya vigencia pide revisión', icono: FileClock, ancho: 1 },
  favoritos: { titulo: 'Favoritos', descripcion: 'Tus marcadores', icono: Star, ancho: 1 },
  diario: { titulo: 'Diario de hoy', descripcion: 'Captura rápida y lo registrado hoy', icono: NotebookPen, ancho: 2 },
  flujos: { titulo: 'Flujos recientes', descripcion: 'Los últimos procesos con su recorrido', icono: Workflow, ancho: 1 },
  semana: { titulo: 'Resumen de la semana', descripcion: 'Tareas, horas y tickets desde el lunes', icono: BarChart3, ancho: 2 },
  trello: { titulo: 'Mis tarjetas de Trello', descripcion: 'Tarjetas asignadas a ti, por vencimiento', icono: Columns3, ancho: 1 },
};

export const idsWidget = Object.keys(catalogoWidgets) as IdWidget[];

export const configuracionPorDefecto = (): ConfiguracionInicio => ({
  version: 1,
  widgets: (['agenda', 'tareas', 'tickets', 'reporte', 'recientes', 'favoritos'] as IdWidget[]).map((id) => ({ id, ancho: catalogoWidgets[id].ancho })),
});

/** Acepta lo guardado (o algo viejo o incompleto) y devuelve una configuración válida sin repetidos ni widgets desconocidos. */
export function normalizarConfiguracion(valor: unknown): ConfiguracionInicio {
  const widgets = (valor as Partial<ConfiguracionInicio> | null)?.widgets;
  if (!Array.isArray(widgets)) return configuracionPorDefecto();
  const vistos = new Set<IdWidget>();
  const validos: WidgetConfigurado[] = [];
  for (const widget of widgets) {
    if (!widget || !(widget.id in catalogoWidgets) || vistos.has(widget.id)) continue;
    vistos.add(widget.id);
    validos.push({ id: widget.id, ancho: widget.ancho === 2 ? 2 : 1 });
  }
  return { version: 1, widgets: validos };
}
