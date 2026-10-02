using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class ConvencionColumnasYNombreUsuario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ArchivosAdjuntos_DocumentosMarkdown_ADJ_DocumentoId",
                table: "ArchivosAdjuntos");

            migrationBuilder.DropForeignKey(
                name: "FK_ArchivosAdjuntos_MensajesTicket_ADJ_MensajeTicketId",
                table: "ArchivosAdjuntos");

            migrationBuilder.DropForeignKey(
                name: "FK_ArchivosAdjuntos_RegistrosDiarios_ADJ_RegistroDiarioId",
                table: "ArchivosAdjuntos");

            migrationBuilder.DropForeignKey(
                name: "FK_ArchivosAdjuntos_Tareas_ADJ_TareaId",
                table: "ArchivosAdjuntos");

            migrationBuilder.DropForeignKey(
                name: "FK_ArchivosAdjuntos_Usuarios_ADJ_SubidoPor",
                table: "ArchivosAdjuntos");

            migrationBuilder.DropForeignKey(
                name: "FK_BovedaSecretos_Proyectos_BVD_ProyectoId",
                table: "BovedaSecretos");

            migrationBuilder.DropForeignKey(
                name: "FK_BovedaSecretos_Usuarios_BVD_CreadoPor",
                table: "BovedaSecretos");

            migrationBuilder.DropForeignKey(
                name: "FK_Carpetas_Proyectos_CRP_ProyectoId",
                table: "Carpetas");

            migrationBuilder.DropForeignKey(
                name: "FK_DocumentosMarkdown_DocumentosMarkdown_DOC_DocumentoPadreId",
                table: "DocumentosMarkdown");

            migrationBuilder.DropForeignKey(
                name: "FK_DocumentosMarkdown_Proyectos_DOC_ProyectoId",
                table: "DocumentosMarkdown");

            migrationBuilder.DropForeignKey(
                name: "FK_DocumentosMarkdown_Usuarios_DOC_CreadoPor",
                table: "DocumentosMarkdown");

            migrationBuilder.DropForeignKey(
                name: "FK_ListasTareas_Carpetas_LST_CarpetaId",
                table: "ListasTareas");

            migrationBuilder.DropForeignKey(
                name: "FK_ListasTareas_Proyectos_LST_ProyectoId",
                table: "ListasTareas");

            migrationBuilder.DropForeignKey(
                name: "FK_Marcadores_Usuarios_MRC_UsuarioId",
                table: "Marcadores");

            migrationBuilder.DropForeignKey(
                name: "FK_MensajesTicket_Tickets_MSG_TicketId",
                table: "MensajesTicket");

            migrationBuilder.DropForeignKey(
                name: "FK_RegistrosDiarios_Usuarios_LOG_UsuarioId",
                table: "RegistrosDiarios");

            migrationBuilder.DropForeignKey(
                name: "FK_RegistrosTiempo_Tareas_RGT_TareaId",
                table: "RegistrosTiempo");

            migrationBuilder.DropForeignKey(
                name: "FK_RegistrosTiempo_Usuarios_RGT_UsuarioId",
                table: "RegistrosTiempo");

            migrationBuilder.DropForeignKey(
                name: "FK_Tareas_ListasTareas_TAR_ListaTareaId",
                table: "Tareas");

            migrationBuilder.DropForeignKey(
                name: "FK_Tareas_Tareas_TAR_TareaPadreId",
                table: "Tareas");

            migrationBuilder.DropForeignKey(
                name: "FK_Tareas_Usuarios_TAR_CreadoPor",
                table: "Tareas");

            migrationBuilder.DropForeignKey(
                name: "FK_Tickets_ColasSoporte_TCK_ColaSoporteId",
                table: "Tickets");

            migrationBuilder.DropForeignKey(
                name: "FK_Tickets_PoliticasSla_TCK_PoliticaSlaId",
                table: "Tickets");

            migrationBuilder.DropForeignKey(
                name: "FK_Tickets_Tareas_TCK_TareaRelacionadaId",
                table: "Tickets");

            migrationBuilder.DropForeignKey(
                name: "FK_Tickets_Usuarios_TCK_AgenteAsignadoId",
                table: "Tickets");

            migrationBuilder.DropForeignKey(
                name: "FK_TokensRefresco_Usuarios_TKR_UsuarioId",
                table: "TokensRefresco");

            migrationBuilder.DropForeignKey(
                name: "FK_UsuariosRoles_Roles_URO_RolId",
                table: "UsuariosRoles");

            migrationBuilder.DropForeignKey(
                name: "FK_UsuariosRoles_Usuarios_URO_UsuarioId",
                table: "UsuariosRoles");

            migrationBuilder.RenameColumn(
                name: "URO_UsuarioId",
                table: "UsuariosRoles",
                newName: "UroUsuarioId");

            migrationBuilder.RenameColumn(
                name: "URO_RolId",
                table: "UsuariosRoles",
                newName: "UroRolId");

            migrationBuilder.RenameColumn(
                name: "URO_FechaAsignacion",
                table: "UsuariosRoles",
                newName: "UroFechaAsignacion");

            migrationBuilder.RenameColumn(
                name: "URO_Id",
                table: "UsuariosRoles",
                newName: "UroId");

            migrationBuilder.RenameIndex(
                name: "IX_UsuariosRoles_URO_UsuarioId_URO_RolId",
                table: "UsuariosRoles",
                newName: "IX_UsuariosRoles_UroUsuarioId_UroRolId");

            migrationBuilder.RenameIndex(
                name: "IX_UsuariosRoles_URO_RolId",
                table: "UsuariosRoles",
                newName: "IX_UsuariosRoles_UroRolId");

            migrationBuilder.RenameColumn(
                name: "USR_NombreCompleto",
                table: "Usuarios",
                newName: "UsuNombreCompleto");

            migrationBuilder.RenameColumn(
                name: "USR_HashContrasena",
                table: "Usuarios",
                newName: "UsuHashContrasena");

            migrationBuilder.RenameColumn(
                name: "USR_FechaUltimoAcceso",
                table: "Usuarios",
                newName: "UsuFechaUltimoAcceso");

            migrationBuilder.RenameColumn(
                name: "USR_FechaCreacion",
                table: "Usuarios",
                newName: "UsuFechaCreacion");

            migrationBuilder.RenameColumn(
                name: "USR_FechaActualizacion",
                table: "Usuarios",
                newName: "UsuFechaActualizacion");

            migrationBuilder.RenameColumn(
                name: "USR_EstaActivo",
                table: "Usuarios",
                newName: "UsuEstaActivo");

            migrationBuilder.RenameColumn(
                name: "USR_Correo",
                table: "Usuarios",
                newName: "UsuCorreo");

            migrationBuilder.RenameColumn(
                name: "USR_Id",
                table: "Usuarios",
                newName: "UsuId");

            migrationBuilder.RenameIndex(
                name: "IX_Usuarios_USR_Correo",
                table: "Usuarios",
                newName: "IX_Usuarios_UsuCorreo");

            migrationBuilder.RenameColumn(
                name: "TKR_UsuarioId",
                table: "TokensRefresco",
                newName: "TkrUsuarioId");

            migrationBuilder.RenameColumn(
                name: "TKR_TokenHash",
                table: "TokensRefresco",
                newName: "TkrTokenHash");

            migrationBuilder.RenameColumn(
                name: "TKR_FechaRevocacion",
                table: "TokensRefresco",
                newName: "TkrFechaRevocacion");

            migrationBuilder.RenameColumn(
                name: "TKR_FechaExpiracion",
                table: "TokensRefresco",
                newName: "TkrFechaExpiracion");

            migrationBuilder.RenameColumn(
                name: "TKR_FechaCreacion",
                table: "TokensRefresco",
                newName: "TkrFechaCreacion");

            migrationBuilder.RenameColumn(
                name: "TKR_Id",
                table: "TokensRefresco",
                newName: "TkrId");

            migrationBuilder.RenameIndex(
                name: "IX_TokensRefresco_TKR_UsuarioId",
                table: "TokensRefresco",
                newName: "IX_TokensRefresco_TkrUsuarioId");

            migrationBuilder.RenameIndex(
                name: "IX_TokensRefresco_TKR_TokenHash",
                table: "TokensRefresco",
                newName: "IX_TokensRefresco_TkrTokenHash");

            migrationBuilder.RenameColumn(
                name: "TCK_TareaRelacionadaId",
                table: "Tickets",
                newName: "TckTareaRelacionadaId");

            migrationBuilder.RenameColumn(
                name: "TCK_Prioridad",
                table: "Tickets",
                newName: "TckPrioridad");

            migrationBuilder.RenameColumn(
                name: "TCK_PoliticaSlaId",
                table: "Tickets",
                newName: "TckPoliticaSlaId");

            migrationBuilder.RenameColumn(
                name: "TCK_NumeroTicket",
                table: "Tickets",
                newName: "TckNumeroTicket");

            migrationBuilder.RenameColumn(
                name: "TCK_NombreSolicitante",
                table: "Tickets",
                newName: "TckNombreSolicitante");

            migrationBuilder.RenameColumn(
                name: "TCK_FechaResolucion",
                table: "Tickets",
                newName: "TckFechaResolucion");

            migrationBuilder.RenameColumn(
                name: "TCK_FechaPrimeraRespuesta",
                table: "Tickets",
                newName: "TckFechaPrimeraRespuesta");

            migrationBuilder.RenameColumn(
                name: "TCK_FechaLimiteResolucion",
                table: "Tickets",
                newName: "TckFechaLimiteResolucion");

            migrationBuilder.RenameColumn(
                name: "TCK_FechaLimitePrimeraRespuesta",
                table: "Tickets",
                newName: "TckFechaLimitePrimeraRespuesta");

            migrationBuilder.RenameColumn(
                name: "TCK_FechaCreacion",
                table: "Tickets",
                newName: "TckFechaCreacion");

            migrationBuilder.RenameColumn(
                name: "TCK_FechaActualizacion",
                table: "Tickets",
                newName: "TckFechaActualizacion");

            migrationBuilder.RenameColumn(
                name: "TCK_Estado",
                table: "Tickets",
                newName: "TckEstado");

            migrationBuilder.RenameColumn(
                name: "TCK_CorreoSolicitante",
                table: "Tickets",
                newName: "TckCorreoSolicitante");

            migrationBuilder.RenameColumn(
                name: "TCK_ColaSoporteId",
                table: "Tickets",
                newName: "TckColaSoporteId");

            migrationBuilder.RenameColumn(
                name: "TCK_Asunto",
                table: "Tickets",
                newName: "TckAsunto");

            migrationBuilder.RenameColumn(
                name: "TCK_AgenteAsignadoId",
                table: "Tickets",
                newName: "TckAgenteAsignadoId");

            migrationBuilder.RenameColumn(
                name: "TCK_Id",
                table: "Tickets",
                newName: "TckId");

            migrationBuilder.RenameIndex(
                name: "IX_Tickets_TCK_TareaRelacionadaId",
                table: "Tickets",
                newName: "IX_Tickets_TckTareaRelacionadaId");

            migrationBuilder.RenameIndex(
                name: "IX_Tickets_TCK_PoliticaSlaId",
                table: "Tickets",
                newName: "IX_Tickets_TckPoliticaSlaId");

            migrationBuilder.RenameIndex(
                name: "IX_Tickets_TCK_NumeroTicket",
                table: "Tickets",
                newName: "IX_Tickets_TckNumeroTicket");

            migrationBuilder.RenameIndex(
                name: "IX_Tickets_TCK_ColaSoporteId",
                table: "Tickets",
                newName: "IX_Tickets_TckColaSoporteId");

            migrationBuilder.RenameIndex(
                name: "IX_Tickets_TCK_AgenteAsignadoId_TCK_Estado",
                table: "Tickets",
                newName: "IX_Tickets_TckAgenteAsignadoId_TckEstado");

            migrationBuilder.RenameColumn(
                name: "TAR_Titulo",
                table: "Tareas",
                newName: "TarTitulo");

            migrationBuilder.RenameColumn(
                name: "TAR_TareaPadreId",
                table: "Tareas",
                newName: "TarTareaPadreId");

            migrationBuilder.RenameColumn(
                name: "TAR_Prioridad",
                table: "Tareas",
                newName: "TarPrioridad");

            migrationBuilder.RenameColumn(
                name: "TAR_NumeroTarea",
                table: "Tareas",
                newName: "TarNumeroTarea");

            migrationBuilder.RenameColumn(
                name: "TAR_ListaTareaId",
                table: "Tareas",
                newName: "TarListaTareaId");

            migrationBuilder.RenameColumn(
                name: "TAR_IndiceOrden",
                table: "Tareas",
                newName: "TarIndiceOrden");

            migrationBuilder.RenameColumn(
                name: "TAR_HorasEstimadas",
                table: "Tareas",
                newName: "TarHorasEstimadas");

            migrationBuilder.RenameColumn(
                name: "TAR_FechaVencimiento",
                table: "Tareas",
                newName: "TarFechaVencimiento");

            migrationBuilder.RenameColumn(
                name: "TAR_FechaCreacion",
                table: "Tareas",
                newName: "TarFechaCreacion");

            migrationBuilder.RenameColumn(
                name: "TAR_FechaActualizacion",
                table: "Tareas",
                newName: "TarFechaActualizacion");

            migrationBuilder.RenameColumn(
                name: "TAR_Estado",
                table: "Tareas",
                newName: "TarEstado");

            migrationBuilder.RenameColumn(
                name: "TAR_EsUrgente",
                table: "Tareas",
                newName: "TarEsUrgente");

            migrationBuilder.RenameColumn(
                name: "TAR_EsImportante",
                table: "Tareas",
                newName: "TarEsImportante");

            migrationBuilder.RenameColumn(
                name: "TAR_DescripcionMarkdown",
                table: "Tareas",
                newName: "TarDescripcionMarkdown");

            migrationBuilder.RenameColumn(
                name: "TAR_CreadoPor",
                table: "Tareas",
                newName: "TarCreadoPor");

            migrationBuilder.RenameColumn(
                name: "TAR_Id",
                table: "Tareas",
                newName: "TarId");

            migrationBuilder.RenameIndex(
                name: "IX_Tareas_TAR_TareaPadreId",
                table: "Tareas",
                newName: "IX_Tareas_TarTareaPadreId");

            migrationBuilder.RenameIndex(
                name: "IX_Tareas_TAR_NumeroTarea",
                table: "Tareas",
                newName: "IX_Tareas_TarNumeroTarea");

            migrationBuilder.RenameIndex(
                name: "IX_Tareas_TAR_ListaTareaId_TAR_IndiceOrden",
                table: "Tareas",
                newName: "IX_Tareas_TarListaTareaId_TarIndiceOrden");

            migrationBuilder.RenameIndex(
                name: "IX_Tareas_TAR_CreadoPor",
                table: "Tareas",
                newName: "IX_Tareas_TarCreadoPor");

            migrationBuilder.RenameColumn(
                name: "ROL_Nombre",
                table: "Roles",
                newName: "RolNombre");

            migrationBuilder.RenameColumn(
                name: "ROL_FechaCreacion",
                table: "Roles",
                newName: "RolFechaCreacion");

            migrationBuilder.RenameColumn(
                name: "ROL_Descripcion",
                table: "Roles",
                newName: "RolDescripcion");

            migrationBuilder.RenameColumn(
                name: "ROL_Id",
                table: "Roles",
                newName: "RolId");

            migrationBuilder.RenameIndex(
                name: "IX_Roles_ROL_Nombre",
                table: "Roles",
                newName: "IX_Roles_RolNombre");

            migrationBuilder.RenameColumn(
                name: "RGT_UsuarioId",
                table: "RegistrosTiempo",
                newName: "RgtUsuarioId");

            migrationBuilder.RenameColumn(
                name: "RGT_TareaId",
                table: "RegistrosTiempo",
                newName: "RgtTareaId");

            // SQL Server no permite renombrar/alterar columnas calculadas ni las que ellas referencian:
            // se elimina (no almacena datos) y se recrea con el nombre nuevo al final.
            migrationBuilder.DropColumn(
                name: "RGT_MinutosTranscurridos",
                table: "RegistrosTiempo");

            migrationBuilder.RenameColumn(
                name: "RGT_FechaInicio",
                table: "RegistrosTiempo",
                newName: "RgtFechaInicio");

            migrationBuilder.RenameColumn(
                name: "RGT_FechaFin",
                table: "RegistrosTiempo",
                newName: "RgtFechaFin");

            migrationBuilder.RenameColumn(
                name: "RGT_Descripcion",
                table: "RegistrosTiempo",
                newName: "RgtDescripcion");

            migrationBuilder.RenameColumn(
                name: "RGT_Id",
                table: "RegistrosTiempo",
                newName: "RgtId");

            migrationBuilder.RenameIndex(
                name: "IX_RegistrosTiempo_RGT_UsuarioId_RGT_FechaInicio",
                table: "RegistrosTiempo",
                newName: "IX_RegistrosTiempo_RgtUsuarioId_RgtFechaInicio");

            migrationBuilder.RenameIndex(
                name: "IX_RegistrosTiempo_RGT_TareaId",
                table: "RegistrosTiempo",
                newName: "IX_RegistrosTiempo_RgtTareaId");

            migrationBuilder.RenameColumn(
                name: "LOG_UsuarioId",
                table: "RegistrosDiarios",
                newName: "LogUsuarioId");

            migrationBuilder.RenameColumn(
                name: "LOG_FechaLog",
                table: "RegistrosDiarios",
                newName: "LogFechaLog");

            migrationBuilder.RenameColumn(
                name: "LOG_FechaCreacion",
                table: "RegistrosDiarios",
                newName: "LogFechaCreacion");

            migrationBuilder.RenameColumn(
                name: "LOG_FechaActualizacion",
                table: "RegistrosDiarios",
                newName: "LogFechaActualizacion");

            migrationBuilder.RenameColumn(
                name: "LOG_ContenidoMarkdown",
                table: "RegistrosDiarios",
                newName: "LogContenidoMarkdown");

            migrationBuilder.RenameColumn(
                name: "LOG_Id",
                table: "RegistrosDiarios",
                newName: "LogId");

            migrationBuilder.RenameColumn(
                name: "REF_TipoOrigen",
                table: "ReferenciasEntidades",
                newName: "RefTipoOrigen");

            migrationBuilder.RenameColumn(
                name: "REF_TipoDestino",
                table: "ReferenciasEntidades",
                newName: "RefTipoDestino");

            migrationBuilder.RenameColumn(
                name: "REF_OrigenId",
                table: "ReferenciasEntidades",
                newName: "RefOrigenId");

            migrationBuilder.RenameColumn(
                name: "REF_FechaCreacion",
                table: "ReferenciasEntidades",
                newName: "RefFechaCreacion");

            migrationBuilder.RenameColumn(
                name: "REF_DestinoId",
                table: "ReferenciasEntidades",
                newName: "RefDestinoId");

            migrationBuilder.RenameColumn(
                name: "REF_Id",
                table: "ReferenciasEntidades",
                newName: "RefId");

            migrationBuilder.RenameIndex(
                name: "IX_ReferenciasEntidades_REF_TipoOrigen_REF_OrigenId",
                table: "ReferenciasEntidades",
                newName: "IX_ReferenciasEntidades_RefTipoOrigen_RefOrigenId");

            migrationBuilder.RenameIndex(
                name: "IX_ReferenciasEntidades_REF_TipoDestino_REF_DestinoId",
                table: "ReferenciasEntidades",
                newName: "IX_ReferenciasEntidades_RefTipoDestino_RefDestinoId");

            migrationBuilder.RenameColumn(
                name: "PRY_Nombre",
                table: "Proyectos",
                newName: "PryNombre");

            migrationBuilder.RenameColumn(
                name: "PRY_FechaCreacion",
                table: "Proyectos",
                newName: "PryFechaCreacion");

            migrationBuilder.RenameColumn(
                name: "PRY_Descripcion",
                table: "Proyectos",
                newName: "PryDescripcion");

            migrationBuilder.RenameColumn(
                name: "PRY_ClavePrefijo",
                table: "Proyectos",
                newName: "PryClavePrefijo");

            migrationBuilder.RenameColumn(
                name: "PRY_Id",
                table: "Proyectos",
                newName: "PryId");

            migrationBuilder.RenameIndex(
                name: "IX_Proyectos_PRY_ClavePrefijo",
                table: "Proyectos",
                newName: "IX_Proyectos_PryClavePrefijo");

            migrationBuilder.RenameColumn(
                name: "SLA_Nombre",
                table: "PoliticasSla",
                newName: "SlaNombre");

            migrationBuilder.RenameColumn(
                name: "SLA_MinutosResolucion",
                table: "PoliticasSla",
                newName: "SlaMinutosResolucion");

            migrationBuilder.RenameColumn(
                name: "SLA_MinutosPrimeraRespuesta",
                table: "PoliticasSla",
                newName: "SlaMinutosPrimeraRespuesta");

            migrationBuilder.RenameColumn(
                name: "SLA_EstaActiva",
                table: "PoliticasSla",
                newName: "SlaEstaActiva");

            migrationBuilder.RenameColumn(
                name: "SLA_Id",
                table: "PoliticasSla",
                newName: "SlaId");

            migrationBuilder.RenameColumn(
                name: "MSG_TicketId",
                table: "MensajesTicket",
                newName: "MsgTicketId");

            migrationBuilder.RenameColumn(
                name: "MSG_NombreRemitente",
                table: "MensajesTicket",
                newName: "MsgNombreRemitente");

            migrationBuilder.RenameColumn(
                name: "MSG_FechaCreacion",
                table: "MensajesTicket",
                newName: "MsgFechaCreacion");

            migrationBuilder.RenameColumn(
                name: "MSG_EsNotaInterna",
                table: "MensajesTicket",
                newName: "MsgEsNotaInterna");

            migrationBuilder.RenameColumn(
                name: "MSG_CuerpoMensaje",
                table: "MensajesTicket",
                newName: "MsgCuerpoMensaje");

            migrationBuilder.RenameColumn(
                name: "MSG_CorreoRemitente",
                table: "MensajesTicket",
                newName: "MsgCorreoRemitente");

            migrationBuilder.RenameColumn(
                name: "MSG_Id",
                table: "MensajesTicket",
                newName: "MsgId");

            migrationBuilder.RenameIndex(
                name: "IX_MensajesTicket_MSG_TicketId",
                table: "MensajesTicket",
                newName: "IX_MensajesTicket_MsgTicketId");

            migrationBuilder.RenameColumn(
                name: "MRC_UsuarioId",
                table: "Marcadores",
                newName: "MrcUsuarioId");

            migrationBuilder.RenameColumn(
                name: "MRC_Titulo",
                table: "Marcadores",
                newName: "MrcTitulo");

            migrationBuilder.RenameColumn(
                name: "MRC_TipoEntidad",
                table: "Marcadores",
                newName: "MrcTipoEntidad");

            migrationBuilder.RenameColumn(
                name: "MRC_IndiceOrden",
                table: "Marcadores",
                newName: "MrcIndiceOrden");

            migrationBuilder.RenameColumn(
                name: "MRC_FechaCreacion",
                table: "Marcadores",
                newName: "MrcFechaCreacion");

            migrationBuilder.RenameColumn(
                name: "MRC_EntidadId",
                table: "Marcadores",
                newName: "MrcEntidadId");

            migrationBuilder.RenameColumn(
                name: "MRC_Id",
                table: "Marcadores",
                newName: "MrcId");

            migrationBuilder.RenameIndex(
                name: "IX_Marcadores_MRC_UsuarioId_MRC_TipoEntidad_MRC_EntidadId",
                table: "Marcadores",
                newName: "IX_Marcadores_MrcUsuarioId_MrcTipoEntidad_MrcEntidadId");

            migrationBuilder.RenameColumn(
                name: "LST_ProyectoId",
                table: "ListasTareas",
                newName: "LstProyectoId");

            migrationBuilder.RenameColumn(
                name: "LST_Nombre",
                table: "ListasTareas",
                newName: "LstNombre");

            migrationBuilder.RenameColumn(
                name: "LST_IndiceOrden",
                table: "ListasTareas",
                newName: "LstIndiceOrden");

            migrationBuilder.RenameColumn(
                name: "LST_FechaCreacion",
                table: "ListasTareas",
                newName: "LstFechaCreacion");

            migrationBuilder.RenameColumn(
                name: "LST_CarpetaId",
                table: "ListasTareas",
                newName: "LstCarpetaId");

            migrationBuilder.RenameColumn(
                name: "LST_Id",
                table: "ListasTareas",
                newName: "LstId");

            migrationBuilder.RenameIndex(
                name: "IX_ListasTareas_LST_ProyectoId",
                table: "ListasTareas",
                newName: "IX_ListasTareas_LstProyectoId");

            migrationBuilder.RenameIndex(
                name: "IX_ListasTareas_LST_CarpetaId",
                table: "ListasTareas",
                newName: "IX_ListasTareas_LstCarpetaId");

            migrationBuilder.RenameColumn(
                name: "DOC_Titulo",
                table: "DocumentosMarkdown",
                newName: "DocTitulo");

            migrationBuilder.RenameColumn(
                name: "DOC_RutaEsquema",
                table: "DocumentosMarkdown",
                newName: "DocRutaEsquema");

            migrationBuilder.RenameColumn(
                name: "DOC_ProyectoId",
                table: "DocumentosMarkdown",
                newName: "DocProyectoId");

            migrationBuilder.RenameColumn(
                name: "DOC_Icono",
                table: "DocumentosMarkdown",
                newName: "DocIcono");

            migrationBuilder.RenameColumn(
                name: "DOC_FechaCreacion",
                table: "DocumentosMarkdown",
                newName: "DocFechaCreacion");

            migrationBuilder.RenameColumn(
                name: "DOC_FechaActualizacion",
                table: "DocumentosMarkdown",
                newName: "DocFechaActualizacion");

            migrationBuilder.RenameColumn(
                name: "DOC_EstaArchivado",
                table: "DocumentosMarkdown",
                newName: "DocEstaArchivado");

            migrationBuilder.RenameColumn(
                name: "DOC_DocumentoPadreId",
                table: "DocumentosMarkdown",
                newName: "DocDocumentoPadreId");

            migrationBuilder.RenameColumn(
                name: "DOC_CreadoPor",
                table: "DocumentosMarkdown",
                newName: "DocCreadoPor");

            migrationBuilder.RenameColumn(
                name: "DOC_ContenidoMarkdown",
                table: "DocumentosMarkdown",
                newName: "DocContenidoMarkdown");

            migrationBuilder.RenameColumn(
                name: "DOC_Id",
                table: "DocumentosMarkdown",
                newName: "DocId");

            migrationBuilder.RenameIndex(
                name: "IX_DocumentosMarkdown_DOC_Titulo",
                table: "DocumentosMarkdown",
                newName: "IX_DocumentosMarkdown_DocTitulo");

            migrationBuilder.RenameIndex(
                name: "IX_DocumentosMarkdown_DOC_RutaEsquema",
                table: "DocumentosMarkdown",
                newName: "IX_DocumentosMarkdown_DocRutaEsquema");

            migrationBuilder.RenameIndex(
                name: "IX_DocumentosMarkdown_DOC_ProyectoId",
                table: "DocumentosMarkdown",
                newName: "IX_DocumentosMarkdown_DocProyectoId");

            migrationBuilder.RenameIndex(
                name: "IX_DocumentosMarkdown_DOC_DocumentoPadreId",
                table: "DocumentosMarkdown",
                newName: "IX_DocumentosMarkdown_DocDocumentoPadreId");

            migrationBuilder.RenameIndex(
                name: "IX_DocumentosMarkdown_DOC_CreadoPor",
                table: "DocumentosMarkdown",
                newName: "IX_DocumentosMarkdown_DocCreadoPor");

            migrationBuilder.RenameColumn(
                name: "CLA_Nombre",
                table: "ColasSoporte",
                newName: "ClaNombre");

            migrationBuilder.RenameColumn(
                name: "CLA_EstaActiva",
                table: "ColasSoporte",
                newName: "ClaEstaActiva");

            migrationBuilder.RenameColumn(
                name: "CLA_Descripcion",
                table: "ColasSoporte",
                newName: "ClaDescripcion");

            migrationBuilder.RenameColumn(
                name: "CLA_Id",
                table: "ColasSoporte",
                newName: "ClaId");

            migrationBuilder.RenameColumn(
                name: "CRP_ProyectoId",
                table: "Carpetas",
                newName: "CrpProyectoId");

            migrationBuilder.RenameColumn(
                name: "CRP_Nombre",
                table: "Carpetas",
                newName: "CrpNombre");

            migrationBuilder.RenameColumn(
                name: "CRP_IndiceOrden",
                table: "Carpetas",
                newName: "CrpIndiceOrden");

            migrationBuilder.RenameColumn(
                name: "CRP_Icono",
                table: "Carpetas",
                newName: "CrpIcono");

            migrationBuilder.RenameColumn(
                name: "CRP_FechaCreacion",
                table: "Carpetas",
                newName: "CrpFechaCreacion");

            migrationBuilder.RenameColumn(
                name: "CRP_Id",
                table: "Carpetas",
                newName: "CrpId");

            migrationBuilder.RenameIndex(
                name: "IX_Carpetas_CRP_ProyectoId",
                table: "Carpetas",
                newName: "IX_Carpetas_CrpProyectoId");

            migrationBuilder.RenameColumn(
                name: "BVD_ValorCifrado",
                table: "BovedaSecretos",
                newName: "BvdValorCifrado");

            migrationBuilder.RenameColumn(
                name: "BVD_ProyectoId",
                table: "BovedaSecretos",
                newName: "BvdProyectoId");

            migrationBuilder.RenameColumn(
                name: "BVD_NombreClave",
                table: "BovedaSecretos",
                newName: "BvdNombreClave");

            migrationBuilder.RenameColumn(
                name: "BVD_FechaCreacion",
                table: "BovedaSecretos",
                newName: "BvdFechaCreacion");

            migrationBuilder.RenameColumn(
                name: "BVD_FechaActualizacion",
                table: "BovedaSecretos",
                newName: "BvdFechaActualizacion");

            migrationBuilder.RenameColumn(
                name: "BVD_Entorno",
                table: "BovedaSecretos",
                newName: "BvdEntorno");

            migrationBuilder.RenameColumn(
                name: "BVD_Descripcion",
                table: "BovedaSecretos",
                newName: "BvdDescripcion");

            migrationBuilder.RenameColumn(
                name: "BVD_CreadoPor",
                table: "BovedaSecretos",
                newName: "BvdCreadoPor");

            migrationBuilder.RenameColumn(
                name: "BVD_Id",
                table: "BovedaSecretos",
                newName: "BvdId");

            migrationBuilder.RenameIndex(
                name: "IX_BovedaSecretos_BVD_ProyectoId_BVD_Entorno_BVD_NombreClave",
                table: "BovedaSecretos",
                newName: "IX_BovedaSecretos_BvdProyectoId_BvdEntorno_BvdNombreClave");

            migrationBuilder.RenameIndex(
                name: "IX_BovedaSecretos_BVD_CreadoPor",
                table: "BovedaSecretos",
                newName: "IX_BovedaSecretos_BvdCreadoPor");

            migrationBuilder.RenameColumn(
                name: "ADJ_UrlDescarga",
                table: "ArchivosAdjuntos",
                newName: "AdjUrlDescarga");

            migrationBuilder.RenameColumn(
                name: "ADJ_TipoContenido",
                table: "ArchivosAdjuntos",
                newName: "AdjTipoContenido");

            migrationBuilder.RenameColumn(
                name: "ADJ_TareaId",
                table: "ArchivosAdjuntos",
                newName: "AdjTareaId");

            migrationBuilder.RenameColumn(
                name: "ADJ_TamanoEnBytes",
                table: "ArchivosAdjuntos",
                newName: "AdjTamanoEnBytes");

            migrationBuilder.RenameColumn(
                name: "ADJ_SubidoPor",
                table: "ArchivosAdjuntos",
                newName: "AdjSubidoPor");

            migrationBuilder.RenameColumn(
                name: "ADJ_RutaFirebaseStorage",
                table: "ArchivosAdjuntos",
                newName: "AdjRutaFirebaseStorage");

            migrationBuilder.RenameColumn(
                name: "ADJ_RegistroDiarioId",
                table: "ArchivosAdjuntos",
                newName: "AdjRegistroDiarioId");

            migrationBuilder.RenameColumn(
                name: "ADJ_NombreArchivo",
                table: "ArchivosAdjuntos",
                newName: "AdjNombreArchivo");

            migrationBuilder.RenameColumn(
                name: "ADJ_MensajeTicketId",
                table: "ArchivosAdjuntos",
                newName: "AdjMensajeTicketId");

            migrationBuilder.RenameColumn(
                name: "ADJ_FechaCreacion",
                table: "ArchivosAdjuntos",
                newName: "AdjFechaCreacion");

            migrationBuilder.RenameColumn(
                name: "ADJ_DocumentoId",
                table: "ArchivosAdjuntos",
                newName: "AdjDocumentoId");

            migrationBuilder.RenameColumn(
                name: "ADJ_Id",
                table: "ArchivosAdjuntos",
                newName: "AdjId");

            migrationBuilder.RenameIndex(
                name: "IX_ArchivosAdjuntos_ADJ_TareaId",
                table: "ArchivosAdjuntos",
                newName: "IX_ArchivosAdjuntos_AdjTareaId");

            migrationBuilder.RenameIndex(
                name: "IX_ArchivosAdjuntos_ADJ_SubidoPor",
                table: "ArchivosAdjuntos",
                newName: "IX_ArchivosAdjuntos_AdjSubidoPor");

            migrationBuilder.RenameIndex(
                name: "IX_ArchivosAdjuntos_ADJ_RegistroDiarioId",
                table: "ArchivosAdjuntos",
                newName: "IX_ArchivosAdjuntos_AdjRegistroDiarioId");

            migrationBuilder.RenameIndex(
                name: "IX_ArchivosAdjuntos_ADJ_MensajeTicketId",
                table: "ArchivosAdjuntos",
                newName: "IX_ArchivosAdjuntos_AdjMensajeTicketId");

            migrationBuilder.RenameIndex(
                name: "IX_ArchivosAdjuntos_ADJ_DocumentoId",
                table: "ArchivosAdjuntos",
                newName: "IX_ArchivosAdjuntos_AdjDocumentoId");

            migrationBuilder.AddColumn<string>(
                name: "UsuNombreUsuario",
                table: "Usuarios",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "RgtMinutosTranscurridos",
                table: "RegistrosTiempo",
                type: "int",
                nullable: true,
                computedColumnSql: "DATEDIFF(MINUTE, [RgtFechaInicio], [RgtFechaFin])");

            // Cuentas existentes: nombre de usuario derivado del correo + 4 caracteres del Id para garantizar unicidad.
            // Sin esto, el índice único fallaría porque todas las filas quedarían con ''.
            migrationBuilder.Sql("""
                UPDATE Usuarios
                   SET UsuNombreUsuario = LOWER(LEFT(LEFT(UsuCorreo, CHARINDEX('@', UsuCorreo + '@') - 1), 25)
                                                + '.' + LEFT(REPLACE(CONVERT(VARCHAR(36), UsuId), '-', ''), 4))
                 WHERE UsuNombreUsuario = '';
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_UsuNombreUsuario",
                table: "Usuarios",
                column: "UsuNombreUsuario",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ArchivosAdjuntos_DocumentosMarkdown_AdjDocumentoId",
                table: "ArchivosAdjuntos",
                column: "AdjDocumentoId",
                principalTable: "DocumentosMarkdown",
                principalColumn: "DocId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ArchivosAdjuntos_MensajesTicket_AdjMensajeTicketId",
                table: "ArchivosAdjuntos",
                column: "AdjMensajeTicketId",
                principalTable: "MensajesTicket",
                principalColumn: "MsgId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ArchivosAdjuntos_RegistrosDiarios_AdjRegistroDiarioId",
                table: "ArchivosAdjuntos",
                column: "AdjRegistroDiarioId",
                principalTable: "RegistrosDiarios",
                principalColumn: "LogId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ArchivosAdjuntos_Tareas_AdjTareaId",
                table: "ArchivosAdjuntos",
                column: "AdjTareaId",
                principalTable: "Tareas",
                principalColumn: "TarId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ArchivosAdjuntos_Usuarios_AdjSubidoPor",
                table: "ArchivosAdjuntos",
                column: "AdjSubidoPor",
                principalTable: "Usuarios",
                principalColumn: "UsuId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_BovedaSecretos_Proyectos_BvdProyectoId",
                table: "BovedaSecretos",
                column: "BvdProyectoId",
                principalTable: "Proyectos",
                principalColumn: "PryId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_BovedaSecretos_Usuarios_BvdCreadoPor",
                table: "BovedaSecretos",
                column: "BvdCreadoPor",
                principalTable: "Usuarios",
                principalColumn: "UsuId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Carpetas_Proyectos_CrpProyectoId",
                table: "Carpetas",
                column: "CrpProyectoId",
                principalTable: "Proyectos",
                principalColumn: "PryId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DocumentosMarkdown_DocumentosMarkdown_DocDocumentoPadreId",
                table: "DocumentosMarkdown",
                column: "DocDocumentoPadreId",
                principalTable: "DocumentosMarkdown",
                principalColumn: "DocId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DocumentosMarkdown_Proyectos_DocProyectoId",
                table: "DocumentosMarkdown",
                column: "DocProyectoId",
                principalTable: "Proyectos",
                principalColumn: "PryId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DocumentosMarkdown_Usuarios_DocCreadoPor",
                table: "DocumentosMarkdown",
                column: "DocCreadoPor",
                principalTable: "Usuarios",
                principalColumn: "UsuId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ListasTareas_Carpetas_LstCarpetaId",
                table: "ListasTareas",
                column: "LstCarpetaId",
                principalTable: "Carpetas",
                principalColumn: "CrpId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ListasTareas_Proyectos_LstProyectoId",
                table: "ListasTareas",
                column: "LstProyectoId",
                principalTable: "Proyectos",
                principalColumn: "PryId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Marcadores_Usuarios_MrcUsuarioId",
                table: "Marcadores",
                column: "MrcUsuarioId",
                principalTable: "Usuarios",
                principalColumn: "UsuId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MensajesTicket_Tickets_MsgTicketId",
                table: "MensajesTicket",
                column: "MsgTicketId",
                principalTable: "Tickets",
                principalColumn: "TckId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_RegistrosDiarios_Usuarios_LogUsuarioId",
                table: "RegistrosDiarios",
                column: "LogUsuarioId",
                principalTable: "Usuarios",
                principalColumn: "UsuId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_RegistrosTiempo_Tareas_RgtTareaId",
                table: "RegistrosTiempo",
                column: "RgtTareaId",
                principalTable: "Tareas",
                principalColumn: "TarId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_RegistrosTiempo_Usuarios_RgtUsuarioId",
                table: "RegistrosTiempo",
                column: "RgtUsuarioId",
                principalTable: "Usuarios",
                principalColumn: "UsuId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tareas_ListasTareas_TarListaTareaId",
                table: "Tareas",
                column: "TarListaTareaId",
                principalTable: "ListasTareas",
                principalColumn: "LstId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tareas_Tareas_TarTareaPadreId",
                table: "Tareas",
                column: "TarTareaPadreId",
                principalTable: "Tareas",
                principalColumn: "TarId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tareas_Usuarios_TarCreadoPor",
                table: "Tareas",
                column: "TarCreadoPor",
                principalTable: "Usuarios",
                principalColumn: "UsuId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tickets_ColasSoporte_TckColaSoporteId",
                table: "Tickets",
                column: "TckColaSoporteId",
                principalTable: "ColasSoporte",
                principalColumn: "ClaId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tickets_PoliticasSla_TckPoliticaSlaId",
                table: "Tickets",
                column: "TckPoliticaSlaId",
                principalTable: "PoliticasSla",
                principalColumn: "SlaId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tickets_Tareas_TckTareaRelacionadaId",
                table: "Tickets",
                column: "TckTareaRelacionadaId",
                principalTable: "Tareas",
                principalColumn: "TarId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tickets_Usuarios_TckAgenteAsignadoId",
                table: "Tickets",
                column: "TckAgenteAsignadoId",
                principalTable: "Usuarios",
                principalColumn: "UsuId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TokensRefresco_Usuarios_TkrUsuarioId",
                table: "TokensRefresco",
                column: "TkrUsuarioId",
                principalTable: "Usuarios",
                principalColumn: "UsuId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_UsuariosRoles_Roles_UroRolId",
                table: "UsuariosRoles",
                column: "UroRolId",
                principalTable: "Roles",
                principalColumn: "RolId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_UsuariosRoles_Usuarios_UroUsuarioId",
                table: "UsuariosRoles",
                column: "UroUsuarioId",
                principalTable: "Usuarios",
                principalColumn: "UsuId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ArchivosAdjuntos_DocumentosMarkdown_AdjDocumentoId",
                table: "ArchivosAdjuntos");

            migrationBuilder.DropForeignKey(
                name: "FK_ArchivosAdjuntos_MensajesTicket_AdjMensajeTicketId",
                table: "ArchivosAdjuntos");

            migrationBuilder.DropForeignKey(
                name: "FK_ArchivosAdjuntos_RegistrosDiarios_AdjRegistroDiarioId",
                table: "ArchivosAdjuntos");

            migrationBuilder.DropForeignKey(
                name: "FK_ArchivosAdjuntos_Tareas_AdjTareaId",
                table: "ArchivosAdjuntos");

            migrationBuilder.DropForeignKey(
                name: "FK_ArchivosAdjuntos_Usuarios_AdjSubidoPor",
                table: "ArchivosAdjuntos");

            migrationBuilder.DropForeignKey(
                name: "FK_BovedaSecretos_Proyectos_BvdProyectoId",
                table: "BovedaSecretos");

            migrationBuilder.DropForeignKey(
                name: "FK_BovedaSecretos_Usuarios_BvdCreadoPor",
                table: "BovedaSecretos");

            migrationBuilder.DropForeignKey(
                name: "FK_Carpetas_Proyectos_CrpProyectoId",
                table: "Carpetas");

            migrationBuilder.DropForeignKey(
                name: "FK_DocumentosMarkdown_DocumentosMarkdown_DocDocumentoPadreId",
                table: "DocumentosMarkdown");

            migrationBuilder.DropForeignKey(
                name: "FK_DocumentosMarkdown_Proyectos_DocProyectoId",
                table: "DocumentosMarkdown");

            migrationBuilder.DropForeignKey(
                name: "FK_DocumentosMarkdown_Usuarios_DocCreadoPor",
                table: "DocumentosMarkdown");

            migrationBuilder.DropForeignKey(
                name: "FK_ListasTareas_Carpetas_LstCarpetaId",
                table: "ListasTareas");

            migrationBuilder.DropForeignKey(
                name: "FK_ListasTareas_Proyectos_LstProyectoId",
                table: "ListasTareas");

            migrationBuilder.DropForeignKey(
                name: "FK_Marcadores_Usuarios_MrcUsuarioId",
                table: "Marcadores");

            migrationBuilder.DropForeignKey(
                name: "FK_MensajesTicket_Tickets_MsgTicketId",
                table: "MensajesTicket");

            migrationBuilder.DropForeignKey(
                name: "FK_RegistrosDiarios_Usuarios_LogUsuarioId",
                table: "RegistrosDiarios");

            migrationBuilder.DropForeignKey(
                name: "FK_RegistrosTiempo_Tareas_RgtTareaId",
                table: "RegistrosTiempo");

            migrationBuilder.DropForeignKey(
                name: "FK_RegistrosTiempo_Usuarios_RgtUsuarioId",
                table: "RegistrosTiempo");

            migrationBuilder.DropForeignKey(
                name: "FK_Tareas_ListasTareas_TarListaTareaId",
                table: "Tareas");

            migrationBuilder.DropForeignKey(
                name: "FK_Tareas_Tareas_TarTareaPadreId",
                table: "Tareas");

            migrationBuilder.DropForeignKey(
                name: "FK_Tareas_Usuarios_TarCreadoPor",
                table: "Tareas");

            migrationBuilder.DropForeignKey(
                name: "FK_Tickets_ColasSoporte_TckColaSoporteId",
                table: "Tickets");

            migrationBuilder.DropForeignKey(
                name: "FK_Tickets_PoliticasSla_TckPoliticaSlaId",
                table: "Tickets");

            migrationBuilder.DropForeignKey(
                name: "FK_Tickets_Tareas_TckTareaRelacionadaId",
                table: "Tickets");

            migrationBuilder.DropForeignKey(
                name: "FK_Tickets_Usuarios_TckAgenteAsignadoId",
                table: "Tickets");

            migrationBuilder.DropForeignKey(
                name: "FK_TokensRefresco_Usuarios_TkrUsuarioId",
                table: "TokensRefresco");

            migrationBuilder.DropForeignKey(
                name: "FK_UsuariosRoles_Roles_UroRolId",
                table: "UsuariosRoles");

            migrationBuilder.DropForeignKey(
                name: "FK_UsuariosRoles_Usuarios_UroUsuarioId",
                table: "UsuariosRoles");

            migrationBuilder.DropIndex(
                name: "IX_Usuarios_UsuNombreUsuario",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "UsuNombreUsuario",
                table: "Usuarios");

            migrationBuilder.RenameColumn(
                name: "UroUsuarioId",
                table: "UsuariosRoles",
                newName: "URO_UsuarioId");

            migrationBuilder.RenameColumn(
                name: "UroRolId",
                table: "UsuariosRoles",
                newName: "URO_RolId");

            migrationBuilder.RenameColumn(
                name: "UroFechaAsignacion",
                table: "UsuariosRoles",
                newName: "URO_FechaAsignacion");

            migrationBuilder.RenameColumn(
                name: "UroId",
                table: "UsuariosRoles",
                newName: "URO_Id");

            migrationBuilder.RenameIndex(
                name: "IX_UsuariosRoles_UroUsuarioId_UroRolId",
                table: "UsuariosRoles",
                newName: "IX_UsuariosRoles_URO_UsuarioId_URO_RolId");

            migrationBuilder.RenameIndex(
                name: "IX_UsuariosRoles_UroRolId",
                table: "UsuariosRoles",
                newName: "IX_UsuariosRoles_URO_RolId");

            migrationBuilder.RenameColumn(
                name: "UsuNombreCompleto",
                table: "Usuarios",
                newName: "USR_NombreCompleto");

            migrationBuilder.RenameColumn(
                name: "UsuHashContrasena",
                table: "Usuarios",
                newName: "USR_HashContrasena");

            migrationBuilder.RenameColumn(
                name: "UsuFechaUltimoAcceso",
                table: "Usuarios",
                newName: "USR_FechaUltimoAcceso");

            migrationBuilder.RenameColumn(
                name: "UsuFechaCreacion",
                table: "Usuarios",
                newName: "USR_FechaCreacion");

            migrationBuilder.RenameColumn(
                name: "UsuFechaActualizacion",
                table: "Usuarios",
                newName: "USR_FechaActualizacion");

            migrationBuilder.RenameColumn(
                name: "UsuEstaActivo",
                table: "Usuarios",
                newName: "USR_EstaActivo");

            migrationBuilder.RenameColumn(
                name: "UsuCorreo",
                table: "Usuarios",
                newName: "USR_Correo");

            migrationBuilder.RenameColumn(
                name: "UsuId",
                table: "Usuarios",
                newName: "USR_Id");

            migrationBuilder.RenameIndex(
                name: "IX_Usuarios_UsuCorreo",
                table: "Usuarios",
                newName: "IX_Usuarios_USR_Correo");

            migrationBuilder.RenameColumn(
                name: "TkrUsuarioId",
                table: "TokensRefresco",
                newName: "TKR_UsuarioId");

            migrationBuilder.RenameColumn(
                name: "TkrTokenHash",
                table: "TokensRefresco",
                newName: "TKR_TokenHash");

            migrationBuilder.RenameColumn(
                name: "TkrFechaRevocacion",
                table: "TokensRefresco",
                newName: "TKR_FechaRevocacion");

            migrationBuilder.RenameColumn(
                name: "TkrFechaExpiracion",
                table: "TokensRefresco",
                newName: "TKR_FechaExpiracion");

            migrationBuilder.RenameColumn(
                name: "TkrFechaCreacion",
                table: "TokensRefresco",
                newName: "TKR_FechaCreacion");

            migrationBuilder.RenameColumn(
                name: "TkrId",
                table: "TokensRefresco",
                newName: "TKR_Id");

            migrationBuilder.RenameIndex(
                name: "IX_TokensRefresco_TkrUsuarioId",
                table: "TokensRefresco",
                newName: "IX_TokensRefresco_TKR_UsuarioId");

            migrationBuilder.RenameIndex(
                name: "IX_TokensRefresco_TkrTokenHash",
                table: "TokensRefresco",
                newName: "IX_TokensRefresco_TKR_TokenHash");

            migrationBuilder.RenameColumn(
                name: "TckTareaRelacionadaId",
                table: "Tickets",
                newName: "TCK_TareaRelacionadaId");

            migrationBuilder.RenameColumn(
                name: "TckPrioridad",
                table: "Tickets",
                newName: "TCK_Prioridad");

            migrationBuilder.RenameColumn(
                name: "TckPoliticaSlaId",
                table: "Tickets",
                newName: "TCK_PoliticaSlaId");

            migrationBuilder.RenameColumn(
                name: "TckNumeroTicket",
                table: "Tickets",
                newName: "TCK_NumeroTicket");

            migrationBuilder.RenameColumn(
                name: "TckNombreSolicitante",
                table: "Tickets",
                newName: "TCK_NombreSolicitante");

            migrationBuilder.RenameColumn(
                name: "TckFechaResolucion",
                table: "Tickets",
                newName: "TCK_FechaResolucion");

            migrationBuilder.RenameColumn(
                name: "TckFechaPrimeraRespuesta",
                table: "Tickets",
                newName: "TCK_FechaPrimeraRespuesta");

            migrationBuilder.RenameColumn(
                name: "TckFechaLimiteResolucion",
                table: "Tickets",
                newName: "TCK_FechaLimiteResolucion");

            migrationBuilder.RenameColumn(
                name: "TckFechaLimitePrimeraRespuesta",
                table: "Tickets",
                newName: "TCK_FechaLimitePrimeraRespuesta");

            migrationBuilder.RenameColumn(
                name: "TckFechaCreacion",
                table: "Tickets",
                newName: "TCK_FechaCreacion");

            migrationBuilder.RenameColumn(
                name: "TckFechaActualizacion",
                table: "Tickets",
                newName: "TCK_FechaActualizacion");

            migrationBuilder.RenameColumn(
                name: "TckEstado",
                table: "Tickets",
                newName: "TCK_Estado");

            migrationBuilder.RenameColumn(
                name: "TckCorreoSolicitante",
                table: "Tickets",
                newName: "TCK_CorreoSolicitante");

            migrationBuilder.RenameColumn(
                name: "TckColaSoporteId",
                table: "Tickets",
                newName: "TCK_ColaSoporteId");

            migrationBuilder.RenameColumn(
                name: "TckAsunto",
                table: "Tickets",
                newName: "TCK_Asunto");

            migrationBuilder.RenameColumn(
                name: "TckAgenteAsignadoId",
                table: "Tickets",
                newName: "TCK_AgenteAsignadoId");

            migrationBuilder.RenameColumn(
                name: "TckId",
                table: "Tickets",
                newName: "TCK_Id");

            migrationBuilder.RenameIndex(
                name: "IX_Tickets_TckTareaRelacionadaId",
                table: "Tickets",
                newName: "IX_Tickets_TCK_TareaRelacionadaId");

            migrationBuilder.RenameIndex(
                name: "IX_Tickets_TckPoliticaSlaId",
                table: "Tickets",
                newName: "IX_Tickets_TCK_PoliticaSlaId");

            migrationBuilder.RenameIndex(
                name: "IX_Tickets_TckNumeroTicket",
                table: "Tickets",
                newName: "IX_Tickets_TCK_NumeroTicket");

            migrationBuilder.RenameIndex(
                name: "IX_Tickets_TckColaSoporteId",
                table: "Tickets",
                newName: "IX_Tickets_TCK_ColaSoporteId");

            migrationBuilder.RenameIndex(
                name: "IX_Tickets_TckAgenteAsignadoId_TckEstado",
                table: "Tickets",
                newName: "IX_Tickets_TCK_AgenteAsignadoId_TCK_Estado");

            migrationBuilder.RenameColumn(
                name: "TarTitulo",
                table: "Tareas",
                newName: "TAR_Titulo");

            migrationBuilder.RenameColumn(
                name: "TarTareaPadreId",
                table: "Tareas",
                newName: "TAR_TareaPadreId");

            migrationBuilder.RenameColumn(
                name: "TarPrioridad",
                table: "Tareas",
                newName: "TAR_Prioridad");

            migrationBuilder.RenameColumn(
                name: "TarNumeroTarea",
                table: "Tareas",
                newName: "TAR_NumeroTarea");

            migrationBuilder.RenameColumn(
                name: "TarListaTareaId",
                table: "Tareas",
                newName: "TAR_ListaTareaId");

            migrationBuilder.RenameColumn(
                name: "TarIndiceOrden",
                table: "Tareas",
                newName: "TAR_IndiceOrden");

            migrationBuilder.RenameColumn(
                name: "TarHorasEstimadas",
                table: "Tareas",
                newName: "TAR_HorasEstimadas");

            migrationBuilder.RenameColumn(
                name: "TarFechaVencimiento",
                table: "Tareas",
                newName: "TAR_FechaVencimiento");

            migrationBuilder.RenameColumn(
                name: "TarFechaCreacion",
                table: "Tareas",
                newName: "TAR_FechaCreacion");

            migrationBuilder.RenameColumn(
                name: "TarFechaActualizacion",
                table: "Tareas",
                newName: "TAR_FechaActualizacion");

            migrationBuilder.RenameColumn(
                name: "TarEstado",
                table: "Tareas",
                newName: "TAR_Estado");

            migrationBuilder.RenameColumn(
                name: "TarEsUrgente",
                table: "Tareas",
                newName: "TAR_EsUrgente");

            migrationBuilder.RenameColumn(
                name: "TarEsImportante",
                table: "Tareas",
                newName: "TAR_EsImportante");

            migrationBuilder.RenameColumn(
                name: "TarDescripcionMarkdown",
                table: "Tareas",
                newName: "TAR_DescripcionMarkdown");

            migrationBuilder.RenameColumn(
                name: "TarCreadoPor",
                table: "Tareas",
                newName: "TAR_CreadoPor");

            migrationBuilder.RenameColumn(
                name: "TarId",
                table: "Tareas",
                newName: "TAR_Id");

            migrationBuilder.RenameIndex(
                name: "IX_Tareas_TarTareaPadreId",
                table: "Tareas",
                newName: "IX_Tareas_TAR_TareaPadreId");

            migrationBuilder.RenameIndex(
                name: "IX_Tareas_TarNumeroTarea",
                table: "Tareas",
                newName: "IX_Tareas_TAR_NumeroTarea");

            migrationBuilder.RenameIndex(
                name: "IX_Tareas_TarListaTareaId_TarIndiceOrden",
                table: "Tareas",
                newName: "IX_Tareas_TAR_ListaTareaId_TAR_IndiceOrden");

            migrationBuilder.RenameIndex(
                name: "IX_Tareas_TarCreadoPor",
                table: "Tareas",
                newName: "IX_Tareas_TAR_CreadoPor");

            migrationBuilder.RenameColumn(
                name: "RolNombre",
                table: "Roles",
                newName: "ROL_Nombre");

            migrationBuilder.RenameColumn(
                name: "RolFechaCreacion",
                table: "Roles",
                newName: "ROL_FechaCreacion");

            migrationBuilder.RenameColumn(
                name: "RolDescripcion",
                table: "Roles",
                newName: "ROL_Descripcion");

            migrationBuilder.RenameColumn(
                name: "RolId",
                table: "Roles",
                newName: "ROL_Id");

            migrationBuilder.RenameIndex(
                name: "IX_Roles_RolNombre",
                table: "Roles",
                newName: "IX_Roles_ROL_Nombre");

            migrationBuilder.RenameColumn(
                name: "RgtUsuarioId",
                table: "RegistrosTiempo",
                newName: "RGT_UsuarioId");

            migrationBuilder.RenameColumn(
                name: "RgtTareaId",
                table: "RegistrosTiempo",
                newName: "RGT_TareaId");

            migrationBuilder.DropColumn(
                name: "RgtMinutosTranscurridos",
                table: "RegistrosTiempo");

            migrationBuilder.RenameColumn(
                name: "RgtFechaInicio",
                table: "RegistrosTiempo",
                newName: "RGT_FechaInicio");

            migrationBuilder.RenameColumn(
                name: "RgtFechaFin",
                table: "RegistrosTiempo",
                newName: "RGT_FechaFin");

            migrationBuilder.RenameColumn(
                name: "RgtDescripcion",
                table: "RegistrosTiempo",
                newName: "RGT_Descripcion");

            migrationBuilder.RenameColumn(
                name: "RgtId",
                table: "RegistrosTiempo",
                newName: "RGT_Id");

            migrationBuilder.RenameIndex(
                name: "IX_RegistrosTiempo_RgtUsuarioId_RgtFechaInicio",
                table: "RegistrosTiempo",
                newName: "IX_RegistrosTiempo_RGT_UsuarioId_RGT_FechaInicio");

            migrationBuilder.RenameIndex(
                name: "IX_RegistrosTiempo_RgtTareaId",
                table: "RegistrosTiempo",
                newName: "IX_RegistrosTiempo_RGT_TareaId");

            migrationBuilder.RenameColumn(
                name: "LogUsuarioId",
                table: "RegistrosDiarios",
                newName: "LOG_UsuarioId");

            migrationBuilder.RenameColumn(
                name: "LogFechaLog",
                table: "RegistrosDiarios",
                newName: "LOG_FechaLog");

            migrationBuilder.RenameColumn(
                name: "LogFechaCreacion",
                table: "RegistrosDiarios",
                newName: "LOG_FechaCreacion");

            migrationBuilder.RenameColumn(
                name: "LogFechaActualizacion",
                table: "RegistrosDiarios",
                newName: "LOG_FechaActualizacion");

            migrationBuilder.RenameColumn(
                name: "LogContenidoMarkdown",
                table: "RegistrosDiarios",
                newName: "LOG_ContenidoMarkdown");

            migrationBuilder.RenameColumn(
                name: "LogId",
                table: "RegistrosDiarios",
                newName: "LOG_Id");

            migrationBuilder.RenameColumn(
                name: "RefTipoOrigen",
                table: "ReferenciasEntidades",
                newName: "REF_TipoOrigen");

            migrationBuilder.RenameColumn(
                name: "RefTipoDestino",
                table: "ReferenciasEntidades",
                newName: "REF_TipoDestino");

            migrationBuilder.RenameColumn(
                name: "RefOrigenId",
                table: "ReferenciasEntidades",
                newName: "REF_OrigenId");

            migrationBuilder.RenameColumn(
                name: "RefFechaCreacion",
                table: "ReferenciasEntidades",
                newName: "REF_FechaCreacion");

            migrationBuilder.RenameColumn(
                name: "RefDestinoId",
                table: "ReferenciasEntidades",
                newName: "REF_DestinoId");

            migrationBuilder.RenameColumn(
                name: "RefId",
                table: "ReferenciasEntidades",
                newName: "REF_Id");

            migrationBuilder.RenameIndex(
                name: "IX_ReferenciasEntidades_RefTipoOrigen_RefOrigenId",
                table: "ReferenciasEntidades",
                newName: "IX_ReferenciasEntidades_REF_TipoOrigen_REF_OrigenId");

            migrationBuilder.RenameIndex(
                name: "IX_ReferenciasEntidades_RefTipoDestino_RefDestinoId",
                table: "ReferenciasEntidades",
                newName: "IX_ReferenciasEntidades_REF_TipoDestino_REF_DestinoId");

            migrationBuilder.RenameColumn(
                name: "PryNombre",
                table: "Proyectos",
                newName: "PRY_Nombre");

            migrationBuilder.RenameColumn(
                name: "PryFechaCreacion",
                table: "Proyectos",
                newName: "PRY_FechaCreacion");

            migrationBuilder.RenameColumn(
                name: "PryDescripcion",
                table: "Proyectos",
                newName: "PRY_Descripcion");

            migrationBuilder.RenameColumn(
                name: "PryClavePrefijo",
                table: "Proyectos",
                newName: "PRY_ClavePrefijo");

            migrationBuilder.RenameColumn(
                name: "PryId",
                table: "Proyectos",
                newName: "PRY_Id");

            migrationBuilder.RenameIndex(
                name: "IX_Proyectos_PryClavePrefijo",
                table: "Proyectos",
                newName: "IX_Proyectos_PRY_ClavePrefijo");

            migrationBuilder.RenameColumn(
                name: "SlaNombre",
                table: "PoliticasSla",
                newName: "SLA_Nombre");

            migrationBuilder.RenameColumn(
                name: "SlaMinutosResolucion",
                table: "PoliticasSla",
                newName: "SLA_MinutosResolucion");

            migrationBuilder.RenameColumn(
                name: "SlaMinutosPrimeraRespuesta",
                table: "PoliticasSla",
                newName: "SLA_MinutosPrimeraRespuesta");

            migrationBuilder.RenameColumn(
                name: "SlaEstaActiva",
                table: "PoliticasSla",
                newName: "SLA_EstaActiva");

            migrationBuilder.RenameColumn(
                name: "SlaId",
                table: "PoliticasSla",
                newName: "SLA_Id");

            migrationBuilder.RenameColumn(
                name: "MsgTicketId",
                table: "MensajesTicket",
                newName: "MSG_TicketId");

            migrationBuilder.RenameColumn(
                name: "MsgNombreRemitente",
                table: "MensajesTicket",
                newName: "MSG_NombreRemitente");

            migrationBuilder.RenameColumn(
                name: "MsgFechaCreacion",
                table: "MensajesTicket",
                newName: "MSG_FechaCreacion");

            migrationBuilder.RenameColumn(
                name: "MsgEsNotaInterna",
                table: "MensajesTicket",
                newName: "MSG_EsNotaInterna");

            migrationBuilder.RenameColumn(
                name: "MsgCuerpoMensaje",
                table: "MensajesTicket",
                newName: "MSG_CuerpoMensaje");

            migrationBuilder.RenameColumn(
                name: "MsgCorreoRemitente",
                table: "MensajesTicket",
                newName: "MSG_CorreoRemitente");

            migrationBuilder.RenameColumn(
                name: "MsgId",
                table: "MensajesTicket",
                newName: "MSG_Id");

            migrationBuilder.RenameIndex(
                name: "IX_MensajesTicket_MsgTicketId",
                table: "MensajesTicket",
                newName: "IX_MensajesTicket_MSG_TicketId");

            migrationBuilder.RenameColumn(
                name: "MrcUsuarioId",
                table: "Marcadores",
                newName: "MRC_UsuarioId");

            migrationBuilder.RenameColumn(
                name: "MrcTitulo",
                table: "Marcadores",
                newName: "MRC_Titulo");

            migrationBuilder.RenameColumn(
                name: "MrcTipoEntidad",
                table: "Marcadores",
                newName: "MRC_TipoEntidad");

            migrationBuilder.RenameColumn(
                name: "MrcIndiceOrden",
                table: "Marcadores",
                newName: "MRC_IndiceOrden");

            migrationBuilder.RenameColumn(
                name: "MrcFechaCreacion",
                table: "Marcadores",
                newName: "MRC_FechaCreacion");

            migrationBuilder.RenameColumn(
                name: "MrcEntidadId",
                table: "Marcadores",
                newName: "MRC_EntidadId");

            migrationBuilder.RenameColumn(
                name: "MrcId",
                table: "Marcadores",
                newName: "MRC_Id");

            migrationBuilder.RenameIndex(
                name: "IX_Marcadores_MrcUsuarioId_MrcTipoEntidad_MrcEntidadId",
                table: "Marcadores",
                newName: "IX_Marcadores_MRC_UsuarioId_MRC_TipoEntidad_MRC_EntidadId");

            migrationBuilder.RenameColumn(
                name: "LstProyectoId",
                table: "ListasTareas",
                newName: "LST_ProyectoId");

            migrationBuilder.RenameColumn(
                name: "LstNombre",
                table: "ListasTareas",
                newName: "LST_Nombre");

            migrationBuilder.RenameColumn(
                name: "LstIndiceOrden",
                table: "ListasTareas",
                newName: "LST_IndiceOrden");

            migrationBuilder.RenameColumn(
                name: "LstFechaCreacion",
                table: "ListasTareas",
                newName: "LST_FechaCreacion");

            migrationBuilder.RenameColumn(
                name: "LstCarpetaId",
                table: "ListasTareas",
                newName: "LST_CarpetaId");

            migrationBuilder.RenameColumn(
                name: "LstId",
                table: "ListasTareas",
                newName: "LST_Id");

            migrationBuilder.RenameIndex(
                name: "IX_ListasTareas_LstProyectoId",
                table: "ListasTareas",
                newName: "IX_ListasTareas_LST_ProyectoId");

            migrationBuilder.RenameIndex(
                name: "IX_ListasTareas_LstCarpetaId",
                table: "ListasTareas",
                newName: "IX_ListasTareas_LST_CarpetaId");

            migrationBuilder.RenameColumn(
                name: "DocTitulo",
                table: "DocumentosMarkdown",
                newName: "DOC_Titulo");

            migrationBuilder.RenameColumn(
                name: "DocRutaEsquema",
                table: "DocumentosMarkdown",
                newName: "DOC_RutaEsquema");

            migrationBuilder.RenameColumn(
                name: "DocProyectoId",
                table: "DocumentosMarkdown",
                newName: "DOC_ProyectoId");

            migrationBuilder.RenameColumn(
                name: "DocIcono",
                table: "DocumentosMarkdown",
                newName: "DOC_Icono");

            migrationBuilder.RenameColumn(
                name: "DocFechaCreacion",
                table: "DocumentosMarkdown",
                newName: "DOC_FechaCreacion");

            migrationBuilder.RenameColumn(
                name: "DocFechaActualizacion",
                table: "DocumentosMarkdown",
                newName: "DOC_FechaActualizacion");

            migrationBuilder.RenameColumn(
                name: "DocEstaArchivado",
                table: "DocumentosMarkdown",
                newName: "DOC_EstaArchivado");

            migrationBuilder.RenameColumn(
                name: "DocDocumentoPadreId",
                table: "DocumentosMarkdown",
                newName: "DOC_DocumentoPadreId");

            migrationBuilder.RenameColumn(
                name: "DocCreadoPor",
                table: "DocumentosMarkdown",
                newName: "DOC_CreadoPor");

            migrationBuilder.RenameColumn(
                name: "DocContenidoMarkdown",
                table: "DocumentosMarkdown",
                newName: "DOC_ContenidoMarkdown");

            migrationBuilder.RenameColumn(
                name: "DocId",
                table: "DocumentosMarkdown",
                newName: "DOC_Id");

            migrationBuilder.RenameIndex(
                name: "IX_DocumentosMarkdown_DocTitulo",
                table: "DocumentosMarkdown",
                newName: "IX_DocumentosMarkdown_DOC_Titulo");

            migrationBuilder.RenameIndex(
                name: "IX_DocumentosMarkdown_DocRutaEsquema",
                table: "DocumentosMarkdown",
                newName: "IX_DocumentosMarkdown_DOC_RutaEsquema");

            migrationBuilder.RenameIndex(
                name: "IX_DocumentosMarkdown_DocProyectoId",
                table: "DocumentosMarkdown",
                newName: "IX_DocumentosMarkdown_DOC_ProyectoId");

            migrationBuilder.RenameIndex(
                name: "IX_DocumentosMarkdown_DocDocumentoPadreId",
                table: "DocumentosMarkdown",
                newName: "IX_DocumentosMarkdown_DOC_DocumentoPadreId");

            migrationBuilder.RenameIndex(
                name: "IX_DocumentosMarkdown_DocCreadoPor",
                table: "DocumentosMarkdown",
                newName: "IX_DocumentosMarkdown_DOC_CreadoPor");

            migrationBuilder.RenameColumn(
                name: "ClaNombre",
                table: "ColasSoporte",
                newName: "CLA_Nombre");

            migrationBuilder.RenameColumn(
                name: "ClaEstaActiva",
                table: "ColasSoporte",
                newName: "CLA_EstaActiva");

            migrationBuilder.RenameColumn(
                name: "ClaDescripcion",
                table: "ColasSoporte",
                newName: "CLA_Descripcion");

            migrationBuilder.RenameColumn(
                name: "ClaId",
                table: "ColasSoporte",
                newName: "CLA_Id");

            migrationBuilder.RenameColumn(
                name: "CrpProyectoId",
                table: "Carpetas",
                newName: "CRP_ProyectoId");

            migrationBuilder.RenameColumn(
                name: "CrpNombre",
                table: "Carpetas",
                newName: "CRP_Nombre");

            migrationBuilder.RenameColumn(
                name: "CrpIndiceOrden",
                table: "Carpetas",
                newName: "CRP_IndiceOrden");

            migrationBuilder.RenameColumn(
                name: "CrpIcono",
                table: "Carpetas",
                newName: "CRP_Icono");

            migrationBuilder.RenameColumn(
                name: "CrpFechaCreacion",
                table: "Carpetas",
                newName: "CRP_FechaCreacion");

            migrationBuilder.RenameColumn(
                name: "CrpId",
                table: "Carpetas",
                newName: "CRP_Id");

            migrationBuilder.RenameIndex(
                name: "IX_Carpetas_CrpProyectoId",
                table: "Carpetas",
                newName: "IX_Carpetas_CRP_ProyectoId");

            migrationBuilder.RenameColumn(
                name: "BvdValorCifrado",
                table: "BovedaSecretos",
                newName: "BVD_ValorCifrado");

            migrationBuilder.RenameColumn(
                name: "BvdProyectoId",
                table: "BovedaSecretos",
                newName: "BVD_ProyectoId");

            migrationBuilder.RenameColumn(
                name: "BvdNombreClave",
                table: "BovedaSecretos",
                newName: "BVD_NombreClave");

            migrationBuilder.RenameColumn(
                name: "BvdFechaCreacion",
                table: "BovedaSecretos",
                newName: "BVD_FechaCreacion");

            migrationBuilder.RenameColumn(
                name: "BvdFechaActualizacion",
                table: "BovedaSecretos",
                newName: "BVD_FechaActualizacion");

            migrationBuilder.RenameColumn(
                name: "BvdEntorno",
                table: "BovedaSecretos",
                newName: "BVD_Entorno");

            migrationBuilder.RenameColumn(
                name: "BvdDescripcion",
                table: "BovedaSecretos",
                newName: "BVD_Descripcion");

            migrationBuilder.RenameColumn(
                name: "BvdCreadoPor",
                table: "BovedaSecretos",
                newName: "BVD_CreadoPor");

            migrationBuilder.RenameColumn(
                name: "BvdId",
                table: "BovedaSecretos",
                newName: "BVD_Id");

            migrationBuilder.RenameIndex(
                name: "IX_BovedaSecretos_BvdProyectoId_BvdEntorno_BvdNombreClave",
                table: "BovedaSecretos",
                newName: "IX_BovedaSecretos_BVD_ProyectoId_BVD_Entorno_BVD_NombreClave");

            migrationBuilder.RenameIndex(
                name: "IX_BovedaSecretos_BvdCreadoPor",
                table: "BovedaSecretos",
                newName: "IX_BovedaSecretos_BVD_CreadoPor");

            migrationBuilder.RenameColumn(
                name: "AdjUrlDescarga",
                table: "ArchivosAdjuntos",
                newName: "ADJ_UrlDescarga");

            migrationBuilder.RenameColumn(
                name: "AdjTipoContenido",
                table: "ArchivosAdjuntos",
                newName: "ADJ_TipoContenido");

            migrationBuilder.RenameColumn(
                name: "AdjTareaId",
                table: "ArchivosAdjuntos",
                newName: "ADJ_TareaId");

            migrationBuilder.RenameColumn(
                name: "AdjTamanoEnBytes",
                table: "ArchivosAdjuntos",
                newName: "ADJ_TamanoEnBytes");

            migrationBuilder.RenameColumn(
                name: "AdjSubidoPor",
                table: "ArchivosAdjuntos",
                newName: "ADJ_SubidoPor");

            migrationBuilder.RenameColumn(
                name: "AdjRutaFirebaseStorage",
                table: "ArchivosAdjuntos",
                newName: "ADJ_RutaFirebaseStorage");

            migrationBuilder.RenameColumn(
                name: "AdjRegistroDiarioId",
                table: "ArchivosAdjuntos",
                newName: "ADJ_RegistroDiarioId");

            migrationBuilder.RenameColumn(
                name: "AdjNombreArchivo",
                table: "ArchivosAdjuntos",
                newName: "ADJ_NombreArchivo");

            migrationBuilder.RenameColumn(
                name: "AdjMensajeTicketId",
                table: "ArchivosAdjuntos",
                newName: "ADJ_MensajeTicketId");

            migrationBuilder.RenameColumn(
                name: "AdjFechaCreacion",
                table: "ArchivosAdjuntos",
                newName: "ADJ_FechaCreacion");

            migrationBuilder.RenameColumn(
                name: "AdjDocumentoId",
                table: "ArchivosAdjuntos",
                newName: "ADJ_DocumentoId");

            migrationBuilder.RenameColumn(
                name: "AdjId",
                table: "ArchivosAdjuntos",
                newName: "ADJ_Id");

            migrationBuilder.RenameIndex(
                name: "IX_ArchivosAdjuntos_AdjTareaId",
                table: "ArchivosAdjuntos",
                newName: "IX_ArchivosAdjuntos_ADJ_TareaId");

            migrationBuilder.RenameIndex(
                name: "IX_ArchivosAdjuntos_AdjSubidoPor",
                table: "ArchivosAdjuntos",
                newName: "IX_ArchivosAdjuntos_ADJ_SubidoPor");

            migrationBuilder.RenameIndex(
                name: "IX_ArchivosAdjuntos_AdjRegistroDiarioId",
                table: "ArchivosAdjuntos",
                newName: "IX_ArchivosAdjuntos_ADJ_RegistroDiarioId");

            migrationBuilder.RenameIndex(
                name: "IX_ArchivosAdjuntos_AdjMensajeTicketId",
                table: "ArchivosAdjuntos",
                newName: "IX_ArchivosAdjuntos_ADJ_MensajeTicketId");

            migrationBuilder.RenameIndex(
                name: "IX_ArchivosAdjuntos_AdjDocumentoId",
                table: "ArchivosAdjuntos",
                newName: "IX_ArchivosAdjuntos_ADJ_DocumentoId");

            migrationBuilder.AddColumn<int>(
                name: "RGT_MinutosTranscurridos",
                table: "RegistrosTiempo",
                type: "int",
                nullable: true,
                computedColumnSql: "DATEDIFF(MINUTE, [RGT_FechaInicio], [RGT_FechaFin])");

            migrationBuilder.AddForeignKey(
                name: "FK_ArchivosAdjuntos_DocumentosMarkdown_ADJ_DocumentoId",
                table: "ArchivosAdjuntos",
                column: "ADJ_DocumentoId",
                principalTable: "DocumentosMarkdown",
                principalColumn: "DOC_Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ArchivosAdjuntos_MensajesTicket_ADJ_MensajeTicketId",
                table: "ArchivosAdjuntos",
                column: "ADJ_MensajeTicketId",
                principalTable: "MensajesTicket",
                principalColumn: "MSG_Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ArchivosAdjuntos_RegistrosDiarios_ADJ_RegistroDiarioId",
                table: "ArchivosAdjuntos",
                column: "ADJ_RegistroDiarioId",
                principalTable: "RegistrosDiarios",
                principalColumn: "LOG_Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ArchivosAdjuntos_Tareas_ADJ_TareaId",
                table: "ArchivosAdjuntos",
                column: "ADJ_TareaId",
                principalTable: "Tareas",
                principalColumn: "TAR_Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ArchivosAdjuntos_Usuarios_ADJ_SubidoPor",
                table: "ArchivosAdjuntos",
                column: "ADJ_SubidoPor",
                principalTable: "Usuarios",
                principalColumn: "USR_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_BovedaSecretos_Proyectos_BVD_ProyectoId",
                table: "BovedaSecretos",
                column: "BVD_ProyectoId",
                principalTable: "Proyectos",
                principalColumn: "PRY_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_BovedaSecretos_Usuarios_BVD_CreadoPor",
                table: "BovedaSecretos",
                column: "BVD_CreadoPor",
                principalTable: "Usuarios",
                principalColumn: "USR_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Carpetas_Proyectos_CRP_ProyectoId",
                table: "Carpetas",
                column: "CRP_ProyectoId",
                principalTable: "Proyectos",
                principalColumn: "PRY_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DocumentosMarkdown_DocumentosMarkdown_DOC_DocumentoPadreId",
                table: "DocumentosMarkdown",
                column: "DOC_DocumentoPadreId",
                principalTable: "DocumentosMarkdown",
                principalColumn: "DOC_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DocumentosMarkdown_Proyectos_DOC_ProyectoId",
                table: "DocumentosMarkdown",
                column: "DOC_ProyectoId",
                principalTable: "Proyectos",
                principalColumn: "PRY_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DocumentosMarkdown_Usuarios_DOC_CreadoPor",
                table: "DocumentosMarkdown",
                column: "DOC_CreadoPor",
                principalTable: "Usuarios",
                principalColumn: "USR_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ListasTareas_Carpetas_LST_CarpetaId",
                table: "ListasTareas",
                column: "LST_CarpetaId",
                principalTable: "Carpetas",
                principalColumn: "CRP_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ListasTareas_Proyectos_LST_ProyectoId",
                table: "ListasTareas",
                column: "LST_ProyectoId",
                principalTable: "Proyectos",
                principalColumn: "PRY_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Marcadores_Usuarios_MRC_UsuarioId",
                table: "Marcadores",
                column: "MRC_UsuarioId",
                principalTable: "Usuarios",
                principalColumn: "USR_Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MensajesTicket_Tickets_MSG_TicketId",
                table: "MensajesTicket",
                column: "MSG_TicketId",
                principalTable: "Tickets",
                principalColumn: "TCK_Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_RegistrosDiarios_Usuarios_LOG_UsuarioId",
                table: "RegistrosDiarios",
                column: "LOG_UsuarioId",
                principalTable: "Usuarios",
                principalColumn: "USR_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_RegistrosTiempo_Tareas_RGT_TareaId",
                table: "RegistrosTiempo",
                column: "RGT_TareaId",
                principalTable: "Tareas",
                principalColumn: "TAR_Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_RegistrosTiempo_Usuarios_RGT_UsuarioId",
                table: "RegistrosTiempo",
                column: "RGT_UsuarioId",
                principalTable: "Usuarios",
                principalColumn: "USR_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tareas_ListasTareas_TAR_ListaTareaId",
                table: "Tareas",
                column: "TAR_ListaTareaId",
                principalTable: "ListasTareas",
                principalColumn: "LST_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tareas_Tareas_TAR_TareaPadreId",
                table: "Tareas",
                column: "TAR_TareaPadreId",
                principalTable: "Tareas",
                principalColumn: "TAR_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tareas_Usuarios_TAR_CreadoPor",
                table: "Tareas",
                column: "TAR_CreadoPor",
                principalTable: "Usuarios",
                principalColumn: "USR_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tickets_ColasSoporte_TCK_ColaSoporteId",
                table: "Tickets",
                column: "TCK_ColaSoporteId",
                principalTable: "ColasSoporte",
                principalColumn: "CLA_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tickets_PoliticasSla_TCK_PoliticaSlaId",
                table: "Tickets",
                column: "TCK_PoliticaSlaId",
                principalTable: "PoliticasSla",
                principalColumn: "SLA_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tickets_Tareas_TCK_TareaRelacionadaId",
                table: "Tickets",
                column: "TCK_TareaRelacionadaId",
                principalTable: "Tareas",
                principalColumn: "TAR_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tickets_Usuarios_TCK_AgenteAsignadoId",
                table: "Tickets",
                column: "TCK_AgenteAsignadoId",
                principalTable: "Usuarios",
                principalColumn: "USR_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TokensRefresco_Usuarios_TKR_UsuarioId",
                table: "TokensRefresco",
                column: "TKR_UsuarioId",
                principalTable: "Usuarios",
                principalColumn: "USR_Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_UsuariosRoles_Roles_URO_RolId",
                table: "UsuariosRoles",
                column: "URO_RolId",
                principalTable: "Roles",
                principalColumn: "ROL_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_UsuariosRoles_Usuarios_URO_UsuarioId",
                table: "UsuariosRoles",
                column: "URO_UsuarioId",
                principalTable: "Usuarios",
                principalColumn: "USR_Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
