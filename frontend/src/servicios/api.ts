import { clienteApi } from './clienteApi';
import type {
  DatosFilaReporte,
  FilaReporteDto,
  TableroReporteDto,
  EstadoConexionCalendarioDto,
  EventoCalendarioDto,
  ActividadDiaDto,
  MarcadorDto,
  TipoEntidad,
  DeteccionRamasDto,
  RevisionDiarioDto,
  RegistroTiempoDto,
  DiaDiarioDto,
  EntradaExploradaDto,
  ResumenDiaDiarioDto,
  TipoEntradaDiario,
  ProyectoSoporteDto,
  ArchivoAdjuntoDto,
  BacklinkDto,
  CuadranteEisenhower,
  DestinoAdjunto,
  DocumentoDetalleDto,
  DocumentoResumenDto,
  EstadoDocumento,
  DetalleCommitDto,
  GrafoRepositorioDto,
  EntornoBoveda,
  EstadoTarea,
  EstructuraProyectoDto,
  Prioridad,
  ListaTareasDto,
  MatrizEisenhowerDto,
  ProyectoDto,
  RespuestaSesion,
  ResultadoBusquedaDto,
  ResumenAnaliticaPersonalDto,
  SecretoResumenDto,
  SecretoReveladoDto,
  TareaDetalleDto,
  TareaResumenDto,
  UsuarioDto,
  AmbienteDespliegue,
  ConteoTicketsDto,
  DiferenciaArchivoDto,
  ColorPaleta,
  DocumentoGuardadoDto,
  EstructuraDocumentosDto,
  EtiquetaDto,
  LienzoResumenDto,
  LienzoDetalleDto,
  LienzoGuardadoDto,
  VersionDetalleDto,
  VersionResumenDto,
  VistaDocumentos,
  EstadoTicket,
  RepositorioDto,
  TicketDetalleDto,
  TicketResumenDto,
  TipoTicket,
  UsuarioAsignableDto,
  VistaTickets,
} from './tipos';

const datos = <T,>(promesa: Promise<{ data: T }>) => promesa.then((respuesta) => respuesta.data);

export const apiAutenticacion = {
  registrar: (registro: { correo: string; nombreUsuario: string; nombreCompleto: string; contrasena: string }) =>
    datos(clienteApi.post<RespuestaSesion>('/autenticacion/registrar', registro)),
  /** `identificador`: correo o nombre de usuario. */
  iniciarSesion: (identificador: string, contrasena: string) =>
    datos(clienteApi.post<RespuestaSesion>('/autenticacion/iniciar-sesion', { identificador, contrasena })),
  cerrarSesion: () => clienteApi.post('/autenticacion/cerrar-sesion'),
  perfil: () => datos(clienteApi.get<UsuarioDto>('/autenticacion/perfil')),
};

export const apiProyectos = {
  listar: () => datos(clienteApi.get<ProyectoDto[]>('/proyectos')),
  crear: (nombre: string, clavePrefijo: string, descripcion?: string) =>
    datos(clienteApi.post<string>('/proyectos', { nombre, clavePrefijo, descripcion })),
  listarListas: (proyectoId: string) => datos(clienteApi.get<ListaTareasDto[]>(`/proyectos/${proyectoId}/listas`)),
  actualizar: (id: string, nombre: string, descripcion?: string | null) => clienteApi.put(`/proyectos/${id}`, { nombre, descripcion }),
  estructura: (id: string) => datos(clienteApi.get<EstructuraProyectoDto>(`/proyectos/${id}/estructura`)),
  crearLista: (proyectoId: string, nombre: string, carpetaId?: string | null) =>
    datos(clienteApi.post<string>(`/proyectos/${proyectoId}/listas`, { nombre, carpetaId })),
  crearCarpeta: (proyectoId: string, nombre: string) => datos(clienteApi.post<string>(`/proyectos/${proyectoId}/carpetas`, { nombre })),
};

export const apiCarpetas = {
  actualizar: (id: string, nombre: string) => clienteApi.put(`/carpetas/${id}`, { nombre }),
  eliminar: (id: string) => clienteApi.delete(`/carpetas/${id}`),
};

export const apiListas = {
  actualizar: (id: string, nombre: string, carpetaId: string | null) => clienteApi.put(`/listas/${id}`, { nombre, carpetaId }),
  eliminar: (id: string) => clienteApi.delete(`/listas/${id}`),
};

export interface NuevaTarea {
  listaTareaId: string;
  titulo: string;
  descripcionMarkdown?: string;
  esUrgente: boolean;
  esImportante: boolean;
  fechaVencimiento?: string | null;
  tareaPadreId?: string | null;
  estado?: EstadoTarea;
  prioridad?: Prioridad;
  horasEstimadas?: number;
}

export interface CambiosTarea {
  titulo: string;
  descripcionMarkdown: string | null;
  prioridad: Prioridad;
  esUrgente: boolean;
  esImportante: boolean;
  fechaVencimiento: string | null;
  horasEstimadas: number | null;
}

export const apiTareas = {
  crear: (tarea: NuevaTarea) => datos(clienteApi.post<string>('/tareas', tarea)),
  obtener: (id: string) => datos(clienteApi.get<TareaDetalleDto>(`/tareas/${id}`)),
  listarPorProyecto: (proyectoId: string, listaTareaId?: string | null) =>
    datos(clienteApi.get<TareaResumenDto[]>('/tareas', { params: { proyectoId, listaTareaId: listaTareaId ?? undefined } })),
  actualizar: (id: string, cambios: CambiosTarea) => datos(clienteApi.put<TareaResumenDto>(`/tareas/${id}`, cambios)),
  mover: (id: string, listaTareaId: string, estado: EstadoTarea, antesDeTareaId: string | null) =>
    datos(clienteApi.patch<TareaResumenDto>(`/tareas/${id}/mover`, { listaTareaId, estado, antesDeTareaId })),
  eliminar: (id: string) => clienteApi.delete(`/tareas/${id}`),
  matrizEisenhower: (proyectoId: string) =>
    datos(clienteApi.get<MatrizEisenhowerDto>('/tareas/matriz-eisenhower', { params: { proyectoId } })),
  moverCuadrante: (id: string, cuadrante: CuadranteEisenhower) =>
    datos(clienteApi.patch<TareaResumenDto>(`/tareas/${id}/cuadrante`, { cuadrante })),
  cambiarEstado: (id: string, estado: EstadoTarea) => datos(clienteApi.patch<TareaResumenDto>(`/tareas/${id}/estado`, { estado })),
  backlinks: (id: string) => datos(clienteApi.get<BacklinkDto[]>(`/tareas/${id}/backlinks`)),
};

export const apiArchivos = {
  subir(archivo: File, destino: DestinoAdjunto = {}) {
    const formulario = new FormData();
    formulario.append('Archivo', archivo);
    Object.entries(destino).forEach(([clave, valor]) => {
      if (valor) formulario.append(clave.charAt(0).toUpperCase() + clave.slice(1), valor);
    });
    return datos(clienteApi.post<ArchivoAdjuntoDto>('/archivos/subir', formulario));
  },
  eliminar: (id: string) => clienteApi.delete(`/archivos/${id}`),
};

export const apiBoveda = {
  listar: (proyectoId?: string, entorno?: EntornoBoveda) =>
    datos(clienteApi.get<SecretoResumenDto[]>('/boveda', { params: { proyectoId, entorno } })),
  guardar: (secreto: { proyectoId?: string | null; entorno: EntornoBoveda; nombreClave: string; valor: string; descripcion?: string }) =>
    datos(clienteApi.post<string>('/boveda/guardar-secreto', secreto)),
  revelar: (id: string) => datos(clienteApi.get<SecretoReveladoDto>(`/boveda/revelar-secreto/${id}`)),
  eliminar: (id: string) => clienteApi.delete(`/boveda/${id}`),
};

export const apiDocumentos = {
  listar: (filtros: { vista?: VistaDocumentos; carpetaDocumentoId?: string; etiquetaId?: string; texto?: string } = {}) =>
    datos(clienteApi.get<DocumentoResumenDto[]>('/documentos', { params: filtros })),
  estructura: () => datos(clienteApi.get<EstructuraDocumentosDto>('/documentos/estructura')),
  obtener: (id: string) => datos(clienteApi.get<DocumentoDetalleDto>(`/documentos/${id}`)),
  crear: (documento: { titulo: string; contenidoMarkdown: string; documentoPadreId?: string | null; carpetaDocumentoId?: string | null; icono?: string | null }) =>
    datos(clienteApi.post<string>('/documentos', documento)),
  actualizar: (id: string, documento: { titulo: string; contenidoMarkdown: string; icono?: string | null; crearVersion?: boolean }) =>
    datos(clienteApi.put<DocumentoGuardadoDto>(`/documentos/${id}`, documento)),
  mover: (id: string, carpetaDocumentoId: string | null) => clienteApi.patch(`/documentos/${id}/carpeta`, { carpetaDocumentoId }),
  marcarFavorito: (id: string, esFavorito: boolean) => clienteApi.patch(`/documentos/${id}/favorito`, { esFavorito }),
  actualizarVigencia: (id: string, vigencia: { estado: EstadoDocumento; fechaRevision: string | null; documentoReemplazoId: string | null }) =>
    clienteApi.patch(`/documentos/${id}/vigencia`, vigencia),
  asignarEtiquetas: (id: string, etiquetaIds: string[]) => datos(clienteApi.put<EtiquetaDto[]>(`/documentos/${id}/etiquetas`, { etiquetaIds })),
  backlinks: (id: string) => datos(clienteApi.get<BacklinkDto[]>(`/documentos/${id}/backlinks`)),
  moverAPapelera: (id: string) => clienteApi.post(`/documentos/${id}/papelera`),
  restaurar: (id: string) => clienteApi.post(`/documentos/${id}/restaurar`),
  eliminarDefinitivo: (id: string) => clienteApi.delete(`/documentos/${id}`),
  vaciarPapelera: () => datos(clienteApi.delete<number>('/documentos/papelera')),
  versiones: (id: string) => datos(clienteApi.get<VersionResumenDto[]>(`/documentos/${id}/versiones`)),
  version: (versionId: string) => datos(clienteApi.get<VersionDetalleDto>(`/documentos/versiones/${versionId}`)),
  restaurarVersion: (versionId: string) => datos(clienteApi.post<DocumentoGuardadoDto>(`/documentos/versiones/${versionId}/restaurar`)),
  guardarCarpeta: (id: string | null, carpeta: { nombre: string; carpetaPadreId: string | null; color: ColorPaleta | null }) =>
    datos(id ? clienteApi.put<string>(`/documentos/carpetas/${id}`, carpeta) : clienteApi.post<string>('/documentos/carpetas', carpeta)),
  eliminarCarpeta: (id: string) => clienteApi.delete(`/documentos/carpetas/${id}`),
  guardarEtiqueta: (id: string | null, etiqueta: { nombre: string; color: ColorPaleta }) =>
    datos(id ? clienteApi.put<string>(`/documentos/etiquetas/${id}`, etiqueta) : clienteApi.post<string>('/documentos/etiquetas', etiqueta)),
  eliminarEtiqueta: (id: string) => clienteApi.delete(`/documentos/etiquetas/${id}`),
};

export const apiLienzos = {
  listar: () => datos(clienteApi.get<LienzoResumenDto[]>('/lienzos')),
  obtener: (id: string) => datos(clienteApi.get<LienzoDetalleDto>(`/lienzos/${id}`)),
  crear: (titulo: string) => datos(clienteApi.post<string>('/lienzos', { titulo })),
  renombrar: (id: string, titulo: string) => clienteApi.patch(`/lienzos/${id}/titulo`, { titulo }),
  guardar: (id: string, contenidoJson: string) => datos(clienteApi.put<LienzoGuardadoDto>(`/lienzos/${id}`, { contenidoJson })),
  eliminar: (id: string) => clienteApi.delete(`/lienzos/${id}`),
};

/** Una API anterior a `descripcionTexto` no lo envía: se usa la descripción tal cual para no romper la página. */
const normalizarFila = (fila: FilaReporteDto): FilaReporteDto => ({ ...fila, descripcionTexto: fila.descripcionTexto ?? fila.descripcion });

export const apiReporte = {
  tableros: () => datos(clienteApi.get<TableroReporteDto[]>('/reporte/tableros')),
  crearTablero: (tablero: { nombre: string; proyectoId: string | null }) => datos(clienteApi.post<string>('/reporte/tableros', tablero)),
  actualizarTablero: (id: string, tablero: { nombre: string; proyectoId: string | null; estaArchivado: boolean }) =>
    datos(clienteApi.put<string>(`/reporte/tableros/${id}`, tablero)),
  eliminarTablero: (id: string) => clienteApi.delete(`/reporte/tableros/${id}`),
  /** Entradas del diario con hora en [desde, hasta] (AAAA-MM-DD, máx. 93 días). */
  actividades: (desde: string, hasta: string, soloPendientes: boolean) =>
    datos(clienteApi.get<FilaReporteDto[]>('/reporte/actividades', { params: { desde, hasta, soloPendientes } })).then((filas) => filas.map(normalizarFila)),
  actualizarActividad: (entradaId: string, fila: DatosFilaReporte) =>
    datos(clienteApi.put<FilaReporteDto>(`/reporte/actividades/${entradaId}`, fila)).then(normalizarFila),
  marcarReportadas: (entradaIds: string[], reportadas = true) => datos(clienteApi.post<number>('/reporte/actividades/reportadas', { entradaIds, reportadas })),
  /** .xlsx con las filas en el orden dado. */
  excel: (entradaIds: string[], ejecutor: string) =>
    datos(clienteApi.post<Blob>('/reporte/actividades/excel', { entradaIds, ejecutor }, { responseType: 'blob' })),
};

export const apiCalendario = {
  conexion: () => datos(clienteApi.get<EstadoConexionCalendarioDto>('/calendario/conexion')),
  conectar: (urlIcs: string) => datos(clienteApi.put<EstadoConexionCalendarioDto>('/calendario/conexion', { urlIcs })),
  desconectar: () => clienteApi.delete('/calendario/conexion'),
  /** `actualizar` ignora la caché del backend (unos minutos) y vuelve a descargar el calendario de Outlook. */
  eventos: (desde: string, hasta: string, actualizar = false, senal?: AbortSignal) =>
    datos(clienteApi.get<EventoCalendarioDto[]>('/calendario/eventos', { params: { desde, hasta, actualizar }, signal: senal })),
};

export const apiAnalitica = {
  /** `desplazamientoMinutos`: zona horaria del navegador respecto a UTC (Colombia = -300). */
  resumen: (fechaInicio: string, fechaFin: string, desplazamientoMinutos: number) =>
    datos(clienteApi.get<ResumenAnaliticaPersonalDto>('/analitica/resumen', { params: { fechaInicio, fechaFin, desplazamientoMinutos } })),
};

export type AccionTextoIA = 'Mejorar' | 'Corregir' | 'Resumir';

export const apiIa = {
  /** Devuelve el Markdown reescrito por la IA. */
  transformarTexto: (accion: AccionTextoIA, texto: string) =>
    datos(clienteApi.post<{ texto: string }>('/ia/texto', { accion, texto })).then((respuesta) => respuesta.texto),
};

export const apiBusqueda = {
  buscar: (termino: string, senal?: AbortSignal) =>
    datos(clienteApi.get<ResultadoBusquedaDto[]>('/busqueda', { params: { termino }, signal: senal })),
};

// ---------- Tickets ----------

export interface DatosTicket {
  asunto: string;
  tipo: TipoTicket;
  prioridad: Prioridad;
  nombreSolicitante: string;
  correoSolicitante: string;
  descripcionMarkdown: string | null;
  numeroExterno: string | null;
  idSeguimiento: string | null;
  horasDedicadas: number | null;
  /** ISO UTC; null = el ticket no vence. */
  fechaVencimiento: string | null;
  proyectoIds: string[];
}

export const apiTickets = {
  listar: (vista: VistaTickets, texto?: string, tipo?: TipoTicket, proyectoId?: string) =>
    datos(clienteApi.get<TicketResumenDto[]>('/tickets', { params: { vista, texto: texto || undefined, tipo, proyectoId } })),
  conteos: () => datos(clienteApi.get<ConteoTicketsDto>('/tickets/conteos')),
  obtener: (id: string) => datos(clienteApi.get<TicketDetalleDto>(`/tickets/${id}`)),
  usuariosAsignables: () => datos(clienteApi.get<UsuarioAsignableDto[]>('/tickets/usuarios-asignables')),
  backlinks: (id: string) => datos(clienteApi.get<BacklinkDto[]>(`/tickets/${id}/backlinks`)),
  crear: (ticket: DatosTicket & { agenteAsignadoId: string | null }) => datos(clienteApi.post<string>('/tickets', ticket)),
  actualizar: (id: string, ticket: DatosTicket) => clienteApi.put(`/tickets/${id}`, ticket),
  actualizarDocumentacion: (id: string, documentacionMarkdown: string | null) => clienteApi.put(`/tickets/${id}/documentacion`, { documentacionMarkdown }),
  asignar: (id: string, agenteId: string | null) => clienteApi.patch(`/tickets/${id}/asignar`, { agenteId }),
  cambiarEstado: (id: string, nuevoEstado: EstadoTicket, comentario?: string) => clienteApi.patch(`/tickets/${id}/estado`, { nuevoEstado, comentario }),
  agregarMensaje: (id: string, cuerpoMensaje: string, esNotaInterna: boolean) => clienteApi.post(`/tickets/${id}/mensajes`, { cuerpoMensaje, esNotaInterna }),
  vincularTarea: (id: string, tareaId: string | null) => clienteApi.patch(`/tickets/${id}/tarea`, { tareaId }),
  // GitHub en solo lectura: ramas y PRs se crean fuera de la app; aquí se detectan y vinculan.
  detectarRamas: (id: string) => datos(clienteApi.get<DeteccionRamasDto>(`/tickets/${id}/ramas-detectadas`)),
  vincularRama: (id: string, repositorioId: string, nombreRama: string) => datos(clienteApi.post<string>(`/tickets/${id}/ramas`, { repositorioId, nombreRama })),
  sincronizar: (ramaId: string) => clienteApi.post(`/tickets/ramas/${ramaId}/sincronizar`),
  desvincularRama: (ramaId: string) => clienteApi.delete(`/tickets/ramas/${ramaId}`),
  diferenciaArchivo: (archivoId: string) => datos(clienteApi.get<DiferenciaArchivoDto>(`/tickets/archivos-modificados/${archivoId}/diferencia`)),
  registrarDespliegue: (id: string, ambiente: AmbienteDespliegue, referencia?: string, notas?: string) =>
    clienteApi.post(`/tickets/${id}/despliegues`, { ambiente, referencia, notas }),
  registrarResultadoPruebas: (id: string, aprobado: boolean, notas?: string) => clienteApi.post(`/tickets/${id}/resultado-pruebas`, { aprobado, notas }),
};

export interface DatosRepositorio {
  nombre: string;
  propietario: string;
  nombreRepositorio: string;
  ramaPrincipal: string | null;
  ramaDesarrollo: string;
  estaActivo: boolean;
  proyectoSoporteId: string | null;
}

export interface DatosProyectoSoporte {
  nombre: string;
  descripcion: string | null;
  color: ColorPaleta;
  estaActivo: boolean;
}

/** Proyectos (categorías) de los tickets; independientes de los proyectos de Tareas. */
export const apiProyectosSoporte = {
  listar: (incluirInactivos = false) => datos(clienteApi.get<ProyectoSoporteDto[]>('/proyectos-soporte', { params: { incluirInactivos } })),
  crear: (proyecto: DatosProyectoSoporte) => datos(clienteApi.post<string>('/proyectos-soporte', proyecto)),
  actualizar: (id: string, proyecto: DatosProyectoSoporte) => datos(clienteApi.put<string>(`/proyectos-soporte/${id}`, proyecto)),
  eliminar: (id: string) => clienteApi.delete(`/proyectos-soporte/${id}`),
};

export const apiRepositorios = {
  listar: (incluirInactivos = false) => datos(clienteApi.get<RepositorioDto[]>('/repositorios', { params: { incluirInactivos } })),
  crear: (repositorio: DatosRepositorio) => datos(clienteApi.post<string>('/repositorios', repositorio)),
  actualizar: (id: string, repositorio: DatosRepositorio) => datos(clienteApi.put<string>(`/repositorios/${id}`, repositorio)),
  grafo: (id: string) => datos(clienteApi.get<GrafoRepositorioDto>(`/repositorios/${id}/grafo`)),
  commit: (id: string, sha: string) => datos(clienteApi.get<DetalleCommitDto>(`/repositorios/${id}/commits/${encodeURIComponent(sha)}`)),
};

// ---------- Diario ----------

export interface DatosEntradaDiario {
  tipo: TipoEntradaDiario;
  titulo: string;
  detalleMarkdown: string | null;
  /** "HH:mm:ss" */
  horaInicio: string | null;
  horaFin: string | null;
  completada: boolean;
  tableroReporteId?: string | null;
}

/** Diario personal: fechas en formato AAAA-MM-DD (día local). */
export const apiDiario = {
  dia: (fecha: string) => datos(clienteApi.get<DiaDiarioDto>(`/diario/${fecha}`)),
  mes: (anio: number, mes: number) => datos(clienteApi.get<ResumenDiaDiarioDto[]>('/diario/mes', { params: { anio, mes } })),
  explorar: (filtros: { tipo?: TipoEntradaDiario; texto?: string; desde?: string; hasta?: string }) =>
    datos(clienteApi.get<EntradaExploradaDto[]>('/diario/entradas', { params: { ...filtros, texto: filtros.texto || undefined } })),
  fechaDeRegistro: (registroId: string) => datos(clienteApi.get<string>(`/diario/registros/${registroId}/fecha`)),
  guardarNota: (fecha: string, nota: { contenidoMarkdown: string; animo: number | null; energia: number | null }) =>
    datos(clienteApi.put<string>(`/diario/${fecha}/nota`, nota)),
  crearEntrada: (fecha: string, entrada: DatosEntradaDiario) => datos(clienteApi.post<string>(`/diario/${fecha}/entradas`, entrada)),
  actualizarEntrada: (id: string, entrada: DatosEntradaDiario) => clienteApi.put(`/diario/entradas/${id}`, entrada),
  eliminarEntrada: (id: string) => clienteApi.delete(`/diario/entradas/${id}`),
  /** Lo que hiciste en la app ese día (tareas, tickets, documentos, tiempo). */
  actividad: (fecha: string) => datos(clienteApi.get<ActividadDiaDto>(`/diario/${fecha}/actividad`, { params: { desplazamiento: desplazamientoLocal() } })),
  /** Días con registro del rango (hasta incluido, máx. 62 días), con nota y entradas. */
  rango: (desde: string, hasta: string) => datos(clienteApi.get<DiaDiarioDto[]>('/diario/rango', { params: { desde, hasta } })),
  /** Crea una tarea real a partir de la entrada; devuelve el Id de la tarea. */
  convertirEnTarea: (entradaId: string, cuerpo: { listaTareaId: string; titulo: string | null; esUrgente: boolean; esImportante: boolean }) =>
    datos(clienteApi.post<string>(`/diario/entradas/${entradaId}/convertir-en-tarea`, cuerpo)),
  /** Resumen de un periodo (hasta incluido, máx. 62 días). */
  revision: (desde: string, hasta: string) =>
    datos(clienteApi.get<RevisionDiarioDto>('/diario/revision', { params: { desde, hasta, desplazamiento: desplazamientoLocal() } })),
};

/** Minutos que la hora local va por delante de UTC: define dónde empieza y acaba "el día" en el servidor. */
const desplazamientoLocal = () => -new Date().getTimezoneOffset();

// ---------- Tiempo ----------

/** A qué se imputa el tiempo: una tarea, un ticket o nada (tiempo libre con descripción). */
export interface DestinoTiempo {
  tareaId?: string | null;
  ticketId?: string | null;
  descripcion?: string | null;
}

export const apiTiempo = {
  /** null si no hay cronómetro en marcha (la API responde 204). */
  activo: () => clienteApi.get<RegistroTiempoDto | ''>('/tiempo/activo').then((respuesta) => respuesta.data || null),
  iniciar: (destino: DestinoTiempo) => datos(clienteApi.post<RegistroTiempoDto>('/tiempo/iniciar', destino)),
  detener: () => clienteApi.post<RegistroTiempoDto | ''>('/tiempo/detener').then((respuesta) => respuesta.data || null),
  listar: (desde: Date, hasta: Date) =>
    datos(clienteApi.get<RegistroTiempoDto[]>('/tiempo', { params: { desde: desde.toISOString(), hasta: hasta.toISOString() } })),
  crear: (registro: DestinoTiempo & { fechaInicio: string; fechaFin: string }) => datos(clienteApi.post<string>('/tiempo', registro)),
  actualizar: (id: string, registro: DestinoTiempo & { fechaInicio: string; fechaFin: string }) => datos(clienteApi.put<string>(`/tiempo/${id}`, registro)),
  eliminar: (id: string) => clienteApi.delete(`/tiempo/${id}`),
};

// ---------- Marcadores ----------

export const apiMarcadores = {
  listar: () => datos(clienteApi.get<MarcadorDto[]>('/marcadores')),
  /** Devuelve si queda marcado. */
  alternar: (tipoEntidad: TipoEntidad, entidadId: string) => datos(clienteApi.post<boolean>('/marcadores/alternar', { tipoEntidad, entidadId })),
};
