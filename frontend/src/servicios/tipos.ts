// Contratos espejo de los DTOs del backend (enums serializados como texto).

export type EstadoTarea = 'Pendiente' | 'EnProgreso' | 'Completada' | 'Cancelada';
export type Prioridad = 'Baja' | 'Media' | 'Alta' | 'Urgente';
export type CuadranteEisenhower = 'Hacer' | 'Programar' | 'Delegar' | 'Eliminar';
export type EntornoBoveda = 'Desarrollo' | 'Pruebas' | 'Produccion' | 'Local';
export type TipoEntidad = 'Tarea' | 'Ticket' | 'Documento' | 'RegistroDiario';

export interface UsuarioDto {
  id: string;
  correo: string;
  nombreUsuario: string;
  nombreCompleto: string;
  estaActivo: boolean;
  roles: string[];
}

export interface RespuestaSesion {
  tokenAcceso: string;
  fechaExpiracionAcceso: string;
  usuario: UsuarioDto;
}

export interface ProyectoDto {
  id: string;
  nombre: string;
  clavePrefijo: string;
  descripcion: string | null;
  fechaCreacion: string;
}

export interface ListaTareasDto {
  id: string;
  proyectoId: string;
  carpetaId: string | null;
  nombre: string;
  indiceOrden: number;
}

export interface TareaResumenDto {
  id: string;
  numeroTarea: number;
  clavePrefijoProyecto: string;
  proyectoId: string;
  listaTareaId: string;
  tareaPadreId: string | null;
  titulo: string;
  estado: EstadoTarea;
  prioridad: Prioridad;
  esUrgente: boolean;
  esImportante: boolean;
  fechaVencimiento: string | null;
  indiceOrden: number;
  totalSubtareas: number;
  subtareasCompletadas: number;
  clave: string;
  cuadrante: CuadranteEisenhower;
}

export interface ListaResumenDto {
  id: string;
  carpetaId: string | null;
  nombre: string;
  indiceOrden: number;
  totalTareas: number;
  tareasCompletadas: number;
}

export interface CarpetaDto {
  id: string;
  nombre: string;
  icono: string | null;
  indiceOrden: number;
  listas: ListaResumenDto[];
}

export interface EstructuraProyectoDto {
  proyecto: ProyectoDto;
  carpetas: CarpetaDto[];
  listasSinCarpeta: ListaResumenDto[];
}

export interface ArchivoAdjuntoDto {
  id: string;
  nombreArchivo: string;
  tipoContenido: string;
  tamanoEnBytes: number;
  urlDescarga: string;
  fechaCreacion: string;
  snippetMarkdown: string;
}

export interface TareaDetalleDto {
  resumen: TareaResumenDto;
  descripcionMarkdown: string | null;
  horasEstimadas: number | null;
  creadoPor: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  subtareas: TareaResumenDto[];
  adjuntos: ArchivoAdjuntoDto[];
}

export interface MatrizEisenhowerDto {
  hacer: TareaResumenDto[];
  programar: TareaResumenDto[];
  delegar: TareaResumenDto[];
  eliminar: TareaResumenDto[];
}

export interface SecretoResumenDto {
  id: string;
  proyectoId: string | null;
  entorno: EntornoBoveda;
  nombreClave: string;
  descripcion: string | null;
  creadoPor: string;
  fechaActualizacion: string;
}

export interface SecretoReveladoDto {
  id: string;
  entorno: EntornoBoveda;
  nombreClave: string;
  valor: string;
}

// ---------- Documentos ----------

/** Claves de la paleta compartida por carpetas y etiquetas (validadas en el backend). */
export type ColorPaleta = 'gris' | 'rojo' | 'naranja' | 'ambar' | 'verde' | 'turquesa' | 'azul' | 'violeta' | 'rosa';
export type VistaDocumentos = 'Activos' | 'Favoritos' | 'Papelera' | 'Borradores' | 'PorRevisar' | 'Obsoletos';
export type EstadoDocumento = 'Borrador' | 'Vigente' | 'Obsoleto';

export interface EtiquetaDto {
  id: string;
  nombre: string;
  color: ColorPaleta;
}

export interface DocumentoResumenDto {
  id: string;
  proyectoId: string | null;
  documentoPadreId: string | null;
  carpetaDocumentoId: string | null;
  titulo: string;
  rutaEsquema: string;
  icono: string | null;
  estaArchivado: boolean;
  esFavorito: boolean;
  fechaActualizacion: string;
  fechaArchivado: string | null;
  etiquetas: EtiquetaDto[];
  estado: EstadoDocumento;
  /** Desde esta fecha el documento aparece "por revisar" (si no está obsoleto). */
  fechaRevision: string | null;
  porRevisar: boolean;
}

export interface DocumentoDetalleDto extends DocumentoResumenDto {
  contenidoMarkdown: string;
  creadoPor: string;
  fechaCreacion: string;
  totalVersiones: number;
  documentoReemplazoId: string | null;
  tituloReemplazo: string | null;
}

export interface DocumentoGuardadoDto {
  fechaActualizacion: string;
  rutaEsquema: string;
  numeroVersionCreada: number | null;
}

export interface LienzoResumenDto {
  id: string;
  titulo: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface LienzoDetalleDto extends LienzoResumenDto {
  contenidoJson: string;
}

export interface LienzoGuardadoDto {
  fechaActualizacion: string;
}

export interface CarpetaDocumentoDto {
  id: string;
  carpetaPadreId: string | null;
  nombre: string;
  color: ColorPaleta | null;
  indiceOrden: number;
  totalDocumentos: number;
}

export interface EtiquetaConConteoDto extends EtiquetaDto {
  totalDocumentos: number;
}

export interface EstructuraDocumentosDto {
  carpetas: CarpetaDocumentoDto[];
  etiquetas: EtiquetaConConteoDto[];
  totalDocumentos: number;
  totalFavoritos: number;
  totalPapelera: number;
}

export interface VersionResumenDto {
  id: string;
  numeroVersion: number;
  titulo: string;
  nombreAutor: string;
  fechaCreacion: string;
  caracteres: number;
}

export interface VersionDetalleDto {
  id: string;
  documentoId: string;
  numeroVersion: number;
  titulo: string;
  contenidoMarkdown: string;
  nombreAutor: string;
  fechaCreacion: string;
}

export interface BacklinkDto {
  tipoOrigen: TipoEntidad;
  origenId: string;
  titulo: string;
}

export interface PuntoVelocidadSemanalDto {
  inicioSemana: string;
  tareasCompletadas: number;
  minutosRegistrados: number;
}

export interface ResumenAnaliticaPersonalDto {
  tareasCompletadas: number;
  tareasAbiertas: number;
  tareasVencidas: number;
  minutosRegistrados: number;
  ticketsAsignados: number;
  ticketsResueltos: number;
  porcentajeSlaPrimeraRespuesta: number | null;
  porcentajeSlaResolucion: number | null;
  velocidadSemanal: PuntoVelocidadSemanalDto[];
}

export interface ResultadoBusquedaDto {
  tipo: TipoEntidad;
  id: string;
  titulo: string;
  referencia: string;
  subtitulo: string | null;
}

/** Destino opcional de un adjunto (a lo sumo uno). */
export interface DestinoAdjunto {
  tareaId?: string;
  mensajeTicketId?: string;
  documentoId?: string;
  registroDiarioId?: string;
  ticketId?: string;
}

// ---------- Tickets ----------

export type EstadoTicket =
  | 'Nuevo'
  | 'Asignado'
  | 'EnAnalisis'
  | 'PendienteCliente'
  | 'EnDesarrollo'
  | 'EnRevision'
  | 'EnPruebas'
  | 'Devuelto'
  | 'Aprobado'
  | 'EnProduccion'
  | 'Cerrado'
  | 'Cancelado';
export type TipoTicket = 'Ajuste' | 'NuevoDesarrollo' | 'Incidencia' | 'Auditoria' | 'Soporte' | 'Otro';
export type EstadoSla = 'SinSla' | 'EnTiempo' | 'PorVencer' | 'Vencido' | 'Cumplido' | 'Incumplido';
export type EstadoPullRequest = 'Abierto' | 'Fusionado' | 'Cerrado';
export type TipoCambioArchivo = 'Agregado' | 'Modificado' | 'Eliminado' | 'Renombrado';
export type AmbienteDespliegue = 'Desarrollo' | 'Produccion';
export type ResultadoDespliegue = 'Pendiente' | 'Aprobado' | 'Rechazado';
export type VistaTickets = 'MisAbiertos' | 'Abiertos' | 'SinAsignar' | 'EnPruebas' | 'Cerrados' | 'Todos';
export type TipoEventoTicket =
  | 'Creado'
  | 'CambioEstado'
  | 'Asignado'
  | 'Editado'
  | 'RamaCreada'
  | 'RamaVinculada'
  | 'PullRequestCreado'
  | 'Sincronizado'
  | 'Desplegado'
  | 'PruebasAprobadas'
  | 'PruebasRechazadas'
  | 'TareaVinculada'
  | 'DocumentacionActualizada'
  | 'TiempoRegistrado';

export interface TicketResumenDto {
  id: string;
  numeroTicket: number;
  clave: string;
  asunto: string;
  tipo: TipoTicket;
  estado: EstadoTicket;
  prioridad: Prioridad;
  nombreSolicitante: string;
  agenteAsignadoId: string | null;
  nombreAgente: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaLimiteResolucion: string | null;
  fechaResolucion: string | null;
  /** Número del ticket en el sistema de la empresa o del cliente. */
  numeroExterno: string | null;
  proyectos: ProyectoTicketDto[];
  estadoSla: EstadoSla;
}

/** Proyecto (categoría) asignado a un ticket. */
export interface ProyectoTicketDto {
  id: string;
  nombre: string;
  color: ColorPaleta;
}

export interface ProyectoSoporteDto {
  id: string;
  nombre: string;
  descripcion: string | null;
  color: ColorPaleta;
  estaActivo: boolean;
  ticketsAbiertos: number;
  totalTickets: number;
  repositorios: { id: string; nombre: string; nombreCompleto: string }[];
}

export interface ArchivoModificadoDto {
  id: string;
  tieneParche: boolean;
  rutaArchivo: string;
  rutaAnterior: string | null;
  tipoCambio: TipoCambioArchivo;
  lineasAgregadas: number;
  lineasEliminadas: number;
}

export interface DiferenciaArchivoDto {
  id: string;
  rutaArchivo: string;
  rutaAnterior: string | null;
  tipoCambio: TipoCambioArchivo;
  parche: string | null;
}

export interface CommitRamaDto {
  sha: string;
  shaCorto: string;
  mensaje: string;
  autor: string;
  fechaCommit: string;
  url: string;
}

export interface RamaDetectadaDto {
  repositorioId: string;
  nombreRepositorio: string;
  nombreCompleto: string;
  nombreRama: string;
  nombreProyecto: string | null;
  /** El repositorio es de uno de los proyectos del ticket (se listan primero). */
  esDeProyectoDelTicket: boolean;
}

export interface DeteccionRamasDto {
  /** Referencias que se buscan en el nombre de la rama, ej. ["Ticket1468", "TCK-1042"]. */
  claves: string[];
  /** Nombre recomendado para crear la rama fuera de la app. */
  nombreSugerido: string;
  ramas: RamaDetectadaDto[];
  /** Repositorios que no se pudieron consultar. */
  avisos: string[];
}

export interface RamaTicketDto {
  id: string;
  repositorioId: string;
  nombreRepositorio: string;
  urlRepositorio: string;
  nombreRama: string;
  ramaBase: string;
  ramaDestino: string;
  pullRequestNumero: number | null;
  pullRequestUrl: string | null;
  pullRequestEstado: EstadoPullRequest | null;
  pullRequestFechaFusion: string | null;
  totalCommits: number;
  totalArchivos: number;
  lineasAgregadas: number;
  lineasEliminadas: number;
  fechaUltimaSincronizacion: string | null;
  fechaCreacion: string;
  archivos: ArchivoModificadoDto[];
  commits: CommitRamaDto[];
  urlRama: string;
  urlComparacion: string;
}

export interface DespliegueTicketDto {
  id: string;
  ambiente: AmbienteDespliegue;
  referencia: string | null;
  notas: string | null;
  resultado: ResultadoDespliegue;
  notasResultado: string | null;
  nombreDesplegadoPor: string;
  nombreEvaluadoPor: string | null;
  fechaDespliegue: string;
  fechaResultado: string | null;
}

export interface MensajeTicketDto {
  id: string;
  nombreRemitente: string;
  correoRemitente: string;
  esNotaInterna: boolean;
  cuerpoMensaje: string;
  usuarioId: string | null;
  fechaCreacion: string;
}

export interface EventoTicketDto {
  id: string;
  tipoEvento: TipoEventoTicket;
  estadoAnterior: EstadoTicket | null;
  estadoNuevo: EstadoTicket | null;
  descripcion: string;
  comentario: string | null;
  nombreUsuario: string;
  fechaEvento: string;
}

export interface TicketDetalleDto {
  resumen: TicketResumenDto;
  correoSolicitante: string;
  descripcionMarkdown: string | null;
  documentacionMarkdown: string | null;
  idSeguimiento: string | null;
  horasDedicadas: number | null;
  /** Fecha comprometida; es el único límite de resolución (sin ella el ticket no vence). */
  fechaVencimiento: string | null;
  nombreCola: string;
  nombrePoliticaSla: string | null;
  fechaLimitePrimeraRespuesta: string | null;
  fechaPrimeraRespuesta: string | null;
  fechaCierre: string | null;
  nombreCreador: string;
  tareaRelacionada: { id: string; clave: string; titulo: string; estado: EstadoTarea } | null;
  transicionesPermitidas: EstadoTicket[];
  ramas: RamaTicketDto[];
  despliegues: DespliegueTicketDto[];
  mensajes: MensajeTicketDto[];
  eventos: EventoTicketDto[];
  adjuntos: ArchivoAdjuntoDto[];
}

export interface ConteoTicketsDto {
  misAbiertos: number;
  sinAsignar: number;
  enPruebas: number;
  vencidos: number;
  abiertos: number;
}

export interface RamaGrafoDto {
  nombre: string;
  shaPunta: string;
  fechaUltimoCommit: string;
  esPrincipal: boolean;
  esDesarrollo: boolean;
  ticketId: string | null;
  claveTicket: string | null;
}

export interface CommitGrafoDto {
  sha: string;
  mensaje: string;
  autor: string;
  fecha: string;
  url: string;
  /** Un padre = commit normal; dos o más = merge. Puede incluir commits fuera del historial traído. */
  padres: string[];
}

export interface ArchivoCommitDto {
  ruta: string;
  rutaAnterior: string | null;
  tipoCambio: TipoCambioArchivo;
  lineasAgregadas: number;
  lineasEliminadas: number;
  parche: string | null;
}

export interface DetalleCommitDto {
  sha: string;
  /** Mensaje completo: título y cuerpo. */
  mensaje: string;
  autor: string;
  fecha: string;
  url: string;
  padres: string[];
  lineasAgregadas: number;
  lineasEliminadas: number;
  archivos: ArchivoCommitDto[];
  archivosTruncados: boolean;
}

export interface GrafoRepositorioDto {
  repositorioId: string;
  nombre: string;
  nombreCompleto: string;
  urlWeb: string;
  diasRecientes: number;
  ramas: RamaGrafoDto[];
  commits: CommitGrafoDto[];
}

export interface UsuarioAsignableDto {
  id: string;
  nombreCompleto: string;
  nombreUsuario: string;
}

export interface RepositorioDto {
  id: string;
  nombre: string;
  propietario: string;
  nombreRepositorio: string;
  ramaPrincipal: string;
  ramaDesarrollo: string;
  estaActivo: boolean;
  proyectoSoporteId: string | null;
  nombreProyecto: string | null;
  nombreCompleto: string;
  urlWeb: string;
}

// ---------- Diario ----------

export type TipoEntradaDiario = 'Evento' | 'Tarea' | 'Decision' | 'Aprendizaje' | 'Bloqueo' | 'Nota';

export interface EntradaDiarioDto {
  id: string;
  tipo: TipoEntradaDiario;
  titulo: string;
  detalleMarkdown: string | null;
  /** "HH:mm:ss" */
  horaInicio: string | null;
  horaFin: string | null;
  completada: boolean;
  fechaCreacion: string;
  /** Tarea real creada desde la entrada ("convertir en tarea"). */
  tareaId: string | null;
  claveTarea: string | null;
  /** Tablero del reporte de actividades de la empresa. */
  tableroReporteId: string | null;
}

export interface DiaDiarioDto {
  /** "AAAA-MM-DD" */
  fecha: string;
  registroId: string | null;
  contenidoMarkdown: string;
  animo: number | null;
  energia: number | null;
  fechaActualizacion: string | null;
  entradas: EntradaDiarioDto[];
}

export interface ResumenDiaDiarioDto {
  fecha: string;
  tieneNota: boolean;
  animo: number | null;
  eventos: number;
  tareas: number;
  tareasPendientes: number;
  decisiones: number;
  aprendizajes: number;
  bloqueos: number;
  notas: number;
}

export interface EntradaExploradaDto {
  fecha: string;
  entrada: EntradaDiarioDto;
}

// ---------- Tiempo ----------

export interface RegistroTiempoDto {
  id: string;
  tareaId: string | null;
  ticketId: string | null;
  /** WEB-105 o TCK-1042; null en tiempo libre. */
  clave: string | null;
  titulo: string;
  descripcion: string | null;
  /** ISO UTC */
  fechaInicio: string;
  fechaFin: string | null;
  minutos: number;
}

// ---------- Diario: actividad automática y revisión ----------

export interface TareaActividadDto {
  id: string;
  clave: string;
  titulo: string;
  hora: string;
}

export interface TicketActividadDto {
  id: string;
  clave: string;
  numeroExterno: string | null;
  asunto: string;
  estado: EstadoTicket;
  eventos: { hora: string; tipo: TipoEventoTicket; descripcion: string }[];
}

export interface DocumentoActividadDto {
  id: string;
  titulo: string;
  icono: string | null;
  creado: boolean;
  hora: string;
}

export interface TiempoActividadDto {
  tareaId: string | null;
  ticketId: string | null;
  clave: string | null;
  titulo: string;
  minutos: number;
}

export interface ActividadDiaDto {
  fecha: string;
  tareasCompletadas: TareaActividadDto[];
  tareasCreadas: TareaActividadDto[];
  tickets: TicketActividadDto[];
  documentos: DocumentoActividadDto[];
  minutosRegistrados: number;
  tiempo: TiempoActividadDto[];
}

export interface DiaRevisionDto {
  fecha: string;
  animo: number | null;
  energia: number | null;
  minutos: number;
  entradas: number;
}

export interface RevisionDiarioDto {
  desde: string;
  hasta: string;
  diasConRegistro: number;
  animoPromedio: number | null;
  energiaPromedio: number | null;
  dias: DiaRevisionDto[];
  decisiones: EntradaExploradaDto[];
  aprendizajes: EntradaExploradaDto[];
  bloqueos: EntradaExploradaDto[];
  tareasDiarioCompletadas: number;
  tareasDiarioPendientes: number;
  minutosRegistrados: number;
  topTiempo: TiempoActividadDto[];
  tareasCompletadas: number;
  tareasCreadas: number;
  ticketsTrabajados: number;
  ticketsCerrados: number;
}

// ---------- Marcadores ----------

export interface MarcadorDto {
  id: string;
  tipoEntidad: TipoEntidad;
  entidadId: string;
  /** Título actual de la entidad. */
  titulo: string;
  /** WEB-105, TCK-1042, la fecha del diario o el icono del documento. */
  referencia: string | null;
}

// ---------- Calendario (Outlook/Teams publicado como ICS) ----------

export interface EstadoConexionCalendarioDto {
  conectado: boolean;
  fechaConexion: string | null;
}

export type DisponibilidadEvento = 'Ocupado' | 'Provisional' | 'Libre' | 'FueraDeOficina' | 'TrabajandoEnOtroLugar';

export interface EventoCalendarioDto {
  id: string;
  titulo: string;
  /** "AAAA-MM-DD" (fin exclusivo) si es de todo el día; si no, instante UTC ISO-8601. */
  inicio: string;
  fin: string;
  todoElDia: boolean;
  ubicacion: string | null;
  organizador: string | null;
  disponibilidad: DisponibilidadEvento;
  cancelado: boolean;
  privado: boolean;
  enlaceReunion: string | null;
  descripcion: string | null;
}

// ---------- Reporte de actividades (Excel de la empresa) ----------

export type EstadoActividadReporte = 'Terminada' | 'EnProceso';

export interface TableroReporteDto {
  id: string;
  nombre: string;
  proyectoId: string | null;
  nombreProyecto: string | null;
  estaArchivado: boolean;
  actividades: number;
}

/** Una entrada del diario con hora, con los valores del reporte ya resueltos. */
export interface FilaReporteDto {
  entradaId: string;
  /** AAAA-MM-DD */
  fecha: string;
  fechaSolicitud: string;
  fechaSolicitudPersonalizada: boolean;
  /** "HH:mm:ss" */
  horaInicio: string;
  horaFin: string | null;
  /** Título de la entrada tal cual (puede llevar Markdown). */
  descripcion: string;
  /** Sin formato Markdown: lo que se muestra y va al Excel. */
  descripcionTexto: string;
  tipo: TipoEntradaDiario;
  claveTarea: string | null;
  tableroReporteId: string | null;
  nombreTablero: string | null;
  /** El tablero viene del proyecto de la tarea vinculada y no fue elegido. */
  tableroSugerido: boolean;
  estado: EstadoActividadReporte;
  horas: number | null;
  fechaReportado: string | null;
}

export interface DatosFilaReporte {
  descripcion: string;
  horaInicio: string;
  horaFin: string | null;
  tableroReporteId: string | null;
  fechaSolicitud: string | null;
  estado: EstadoActividadReporte;
}
