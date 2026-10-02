using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class EsquemaInicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ColasSoporte",
                columns: table => new
                {
                    CLA_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    CLA_Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CLA_Descripcion = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    CLA_EstaActiva = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ColasSoporte", x => x.CLA_Id);
                });

            migrationBuilder.CreateTable(
                name: "PoliticasSla",
                columns: table => new
                {
                    SLA_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    SLA_Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SLA_MinutosPrimeraRespuesta = table.Column<int>(type: "int", nullable: false),
                    SLA_MinutosResolucion = table.Column<int>(type: "int", nullable: false),
                    SLA_EstaActiva = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PoliticasSla", x => x.SLA_Id);
                });

            migrationBuilder.CreateTable(
                name: "Proyectos",
                columns: table => new
                {
                    PRY_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    PRY_Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PRY_ClavePrefijo = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    PRY_Descripcion = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PRY_FechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Proyectos", x => x.PRY_Id);
                });

            migrationBuilder.CreateTable(
                name: "ReferenciasEntidades",
                columns: table => new
                {
                    REF_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    REF_TipoOrigen = table.Column<string>(type: "varchar(30)", unicode: false, maxLength: 30, nullable: false),
                    REF_OrigenId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    REF_TipoDestino = table.Column<string>(type: "varchar(30)", unicode: false, maxLength: 30, nullable: false),
                    REF_DestinoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    REF_FechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReferenciasEntidades", x => x.REF_Id);
                });

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    ROL_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    ROL_Nombre = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ROL_Descripcion = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    ROL_FechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.ROL_Id);
                });

            migrationBuilder.CreateTable(
                name: "Usuarios",
                columns: table => new
                {
                    USR_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    USR_Correo = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    USR_NombreCompleto = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    USR_HashContrasena = table.Column<string>(type: "varchar(200)", unicode: false, maxLength: 200, nullable: false),
                    USR_EstaActivo = table.Column<bool>(type: "bit", nullable: false),
                    USR_FechaUltimoAcceso = table.Column<DateTime>(type: "datetime2", nullable: true),
                    USR_FechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    USR_FechaActualizacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Usuarios", x => x.USR_Id);
                });

            migrationBuilder.CreateTable(
                name: "Carpetas",
                columns: table => new
                {
                    CRP_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    CRP_ProyectoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CRP_Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CRP_Icono = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CRP_IndiceOrden = table.Column<int>(type: "int", nullable: false),
                    CRP_FechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Carpetas", x => x.CRP_Id);
                    table.ForeignKey(
                        name: "FK_Carpetas_Proyectos_CRP_ProyectoId",
                        column: x => x.CRP_ProyectoId,
                        principalTable: "Proyectos",
                        principalColumn: "PRY_Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BovedaSecretos",
                columns: table => new
                {
                    BVD_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    BVD_ProyectoId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    BVD_Entorno = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    BVD_NombreClave = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    BVD_ValorCifrado = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BVD_Descripcion = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    BVD_CreadoPor = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BVD_FechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    BVD_FechaActualizacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BovedaSecretos", x => x.BVD_Id);
                    table.ForeignKey(
                        name: "FK_BovedaSecretos_Proyectos_BVD_ProyectoId",
                        column: x => x.BVD_ProyectoId,
                        principalTable: "Proyectos",
                        principalColumn: "PRY_Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BovedaSecretos_Usuarios_BVD_CreadoPor",
                        column: x => x.BVD_CreadoPor,
                        principalTable: "Usuarios",
                        principalColumn: "USR_Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DocumentosMarkdown",
                columns: table => new
                {
                    DOC_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    DOC_ProyectoId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DOC_DocumentoPadreId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DOC_Titulo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DOC_RutaEsquema = table.Column<string>(type: "nvarchar(220)", maxLength: 220, nullable: false),
                    DOC_ContenidoMarkdown = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DOC_Icono = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    DOC_EstaArchivado = table.Column<bool>(type: "bit", nullable: false),
                    DOC_CreadoPor = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DOC_FechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    DOC_FechaActualizacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentosMarkdown", x => x.DOC_Id);
                    table.ForeignKey(
                        name: "FK_DocumentosMarkdown_DocumentosMarkdown_DOC_DocumentoPadreId",
                        column: x => x.DOC_DocumentoPadreId,
                        principalTable: "DocumentosMarkdown",
                        principalColumn: "DOC_Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DocumentosMarkdown_Proyectos_DOC_ProyectoId",
                        column: x => x.DOC_ProyectoId,
                        principalTable: "Proyectos",
                        principalColumn: "PRY_Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DocumentosMarkdown_Usuarios_DOC_CreadoPor",
                        column: x => x.DOC_CreadoPor,
                        principalTable: "Usuarios",
                        principalColumn: "USR_Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Marcadores",
                columns: table => new
                {
                    MRC_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    MRC_UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MRC_TipoEntidad = table.Column<string>(type: "varchar(30)", unicode: false, maxLength: 30, nullable: false),
                    MRC_EntidadId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MRC_Titulo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    MRC_IndiceOrden = table.Column<int>(type: "int", nullable: false),
                    MRC_FechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Marcadores", x => x.MRC_Id);
                    table.ForeignKey(
                        name: "FK_Marcadores_Usuarios_MRC_UsuarioId",
                        column: x => x.MRC_UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "USR_Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RegistrosDiarios",
                columns: table => new
                {
                    LOG_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    LOG_UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LOG_FechaLog = table.Column<DateOnly>(type: "date", nullable: false),
                    LOG_ContenidoMarkdown = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LOG_FechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    LOG_FechaActualizacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RegistrosDiarios", x => x.LOG_Id);
                    table.ForeignKey(
                        name: "FK_RegistrosDiarios_Usuarios_LOG_UsuarioId",
                        column: x => x.LOG_UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "USR_Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TokensRefresco",
                columns: table => new
                {
                    TKR_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    TKR_UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TKR_TokenHash = table.Column<string>(type: "varchar(128)", unicode: false, maxLength: 128, nullable: false),
                    TKR_FechaExpiracion = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TKR_FechaRevocacion = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TKR_FechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TokensRefresco", x => x.TKR_Id);
                    table.ForeignKey(
                        name: "FK_TokensRefresco_Usuarios_TKR_UsuarioId",
                        column: x => x.TKR_UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "USR_Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UsuariosRoles",
                columns: table => new
                {
                    URO_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    URO_UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    URO_RolId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    URO_FechaAsignacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsuariosRoles", x => x.URO_Id);
                    table.ForeignKey(
                        name: "FK_UsuariosRoles_Roles_URO_RolId",
                        column: x => x.URO_RolId,
                        principalTable: "Roles",
                        principalColumn: "ROL_Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UsuariosRoles_Usuarios_URO_UsuarioId",
                        column: x => x.URO_UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "USR_Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ListasTareas",
                columns: table => new
                {
                    LST_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    LST_CarpetaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LST_ProyectoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LST_Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LST_IndiceOrden = table.Column<int>(type: "int", nullable: false),
                    LST_FechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ListasTareas", x => x.LST_Id);
                    table.ForeignKey(
                        name: "FK_ListasTareas_Carpetas_LST_CarpetaId",
                        column: x => x.LST_CarpetaId,
                        principalTable: "Carpetas",
                        principalColumn: "CRP_Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ListasTareas_Proyectos_LST_ProyectoId",
                        column: x => x.LST_ProyectoId,
                        principalTable: "Proyectos",
                        principalColumn: "PRY_Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Tareas",
                columns: table => new
                {
                    TAR_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    TAR_ListaTareaId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TAR_TareaPadreId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TAR_NumeroTarea = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "100, 1"),
                    TAR_Titulo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    TAR_DescripcionMarkdown = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TAR_Estado = table.Column<string>(type: "varchar(30)", unicode: false, maxLength: 30, nullable: false),
                    TAR_Prioridad = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    TAR_EsUrgente = table.Column<bool>(type: "bit", nullable: false),
                    TAR_EsImportante = table.Column<bool>(type: "bit", nullable: false),
                    TAR_FechaVencimiento = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TAR_HorasEstimadas = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    TAR_IndiceOrden = table.Column<int>(type: "int", nullable: false),
                    TAR_CreadoPor = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TAR_FechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    TAR_FechaActualizacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tareas", x => x.TAR_Id);
                    table.ForeignKey(
                        name: "FK_Tareas_ListasTareas_TAR_ListaTareaId",
                        column: x => x.TAR_ListaTareaId,
                        principalTable: "ListasTareas",
                        principalColumn: "LST_Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Tareas_Tareas_TAR_TareaPadreId",
                        column: x => x.TAR_TareaPadreId,
                        principalTable: "Tareas",
                        principalColumn: "TAR_Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Tareas_Usuarios_TAR_CreadoPor",
                        column: x => x.TAR_CreadoPor,
                        principalTable: "Usuarios",
                        principalColumn: "USR_Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RegistrosTiempo",
                columns: table => new
                {
                    RGT_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    RGT_TareaId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RGT_UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RGT_FechaInicio = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RGT_FechaFin = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RGT_MinutosTranscurridos = table.Column<int>(type: "int", nullable: true, computedColumnSql: "DATEDIFF(MINUTE, [RGT_FechaInicio], [RGT_FechaFin])"),
                    RGT_Descripcion = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RegistrosTiempo", x => x.RGT_Id);
                    table.ForeignKey(
                        name: "FK_RegistrosTiempo_Tareas_RGT_TareaId",
                        column: x => x.RGT_TareaId,
                        principalTable: "Tareas",
                        principalColumn: "TAR_Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RegistrosTiempo_Usuarios_RGT_UsuarioId",
                        column: x => x.RGT_UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "USR_Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Tickets",
                columns: table => new
                {
                    TCK_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    TCK_NumeroTicket = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1000, 1"),
                    TCK_ColaSoporteId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TCK_PoliticaSlaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TCK_TareaRelacionadaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TCK_CorreoSolicitante = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    TCK_NombreSolicitante = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    TCK_Asunto = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    TCK_Estado = table.Column<string>(type: "varchar(30)", unicode: false, maxLength: 30, nullable: false),
                    TCK_Prioridad = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    TCK_AgenteAsignadoId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TCK_FechaLimitePrimeraRespuesta = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TCK_FechaLimiteResolucion = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TCK_FechaPrimeraRespuesta = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TCK_FechaResolucion = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TCK_FechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    TCK_FechaActualizacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tickets", x => x.TCK_Id);
                    table.ForeignKey(
                        name: "FK_Tickets_ColasSoporte_TCK_ColaSoporteId",
                        column: x => x.TCK_ColaSoporteId,
                        principalTable: "ColasSoporte",
                        principalColumn: "CLA_Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Tickets_PoliticasSla_TCK_PoliticaSlaId",
                        column: x => x.TCK_PoliticaSlaId,
                        principalTable: "PoliticasSla",
                        principalColumn: "SLA_Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Tickets_Tareas_TCK_TareaRelacionadaId",
                        column: x => x.TCK_TareaRelacionadaId,
                        principalTable: "Tareas",
                        principalColumn: "TAR_Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Tickets_Usuarios_TCK_AgenteAsignadoId",
                        column: x => x.TCK_AgenteAsignadoId,
                        principalTable: "Usuarios",
                        principalColumn: "USR_Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MensajesTicket",
                columns: table => new
                {
                    MSG_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    MSG_TicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MSG_CorreoRemitente = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    MSG_NombreRemitente = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    MSG_EsNotaInterna = table.Column<bool>(type: "bit", nullable: false),
                    MSG_CuerpoMensaje = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MSG_FechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MensajesTicket", x => x.MSG_Id);
                    table.ForeignKey(
                        name: "FK_MensajesTicket_Tickets_MSG_TicketId",
                        column: x => x.MSG_TicketId,
                        principalTable: "Tickets",
                        principalColumn: "TCK_Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ArchivosAdjuntos",
                columns: table => new
                {
                    ADJ_Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    ADJ_NombreArchivo = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ADJ_TipoContenido = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ADJ_TamanoEnBytes = table.Column<long>(type: "bigint", nullable: false),
                    ADJ_RutaFirebaseStorage = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ADJ_UrlDescarga = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    ADJ_TareaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ADJ_MensajeTicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ADJ_DocumentoId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ADJ_RegistroDiarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ADJ_SubidoPor = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ADJ_FechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArchivosAdjuntos", x => x.ADJ_Id);
                    table.ForeignKey(
                        name: "FK_ArchivosAdjuntos_DocumentosMarkdown_ADJ_DocumentoId",
                        column: x => x.ADJ_DocumentoId,
                        principalTable: "DocumentosMarkdown",
                        principalColumn: "DOC_Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ArchivosAdjuntos_MensajesTicket_ADJ_MensajeTicketId",
                        column: x => x.ADJ_MensajeTicketId,
                        principalTable: "MensajesTicket",
                        principalColumn: "MSG_Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ArchivosAdjuntos_RegistrosDiarios_ADJ_RegistroDiarioId",
                        column: x => x.ADJ_RegistroDiarioId,
                        principalTable: "RegistrosDiarios",
                        principalColumn: "LOG_Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ArchivosAdjuntos_Tareas_ADJ_TareaId",
                        column: x => x.ADJ_TareaId,
                        principalTable: "Tareas",
                        principalColumn: "TAR_Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ArchivosAdjuntos_Usuarios_ADJ_SubidoPor",
                        column: x => x.ADJ_SubidoPor,
                        principalTable: "Usuarios",
                        principalColumn: "USR_Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Roles",
                columns: new[] { "ROL_Id", "ROL_Descripcion", "ROL_FechaCreacion", "ROL_Nombre" },
                values: new object[,]
                {
                    { new Guid("7a1f0a4e-0c1b-4a8e-9f59-1d0a6b1e0001"), "Acceso total, gestión de usuarios y roles.", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Administrador" },
                    { new Guid("7a1f0a4e-0c1b-4a8e-9f59-1d0a6b1e0002"), "Atiende tickets de soporte.", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Agente" },
                    { new Guid("7a1f0a4e-0c1b-4a8e-9f59-1d0a6b1e0003"), "Gestiona sus tareas, documentos y bóveda.", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Miembro" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ArchivosAdjuntos_ADJ_DocumentoId",
                table: "ArchivosAdjuntos",
                column: "ADJ_DocumentoId");

            migrationBuilder.CreateIndex(
                name: "IX_ArchivosAdjuntos_ADJ_MensajeTicketId",
                table: "ArchivosAdjuntos",
                column: "ADJ_MensajeTicketId");

            migrationBuilder.CreateIndex(
                name: "IX_ArchivosAdjuntos_ADJ_RegistroDiarioId",
                table: "ArchivosAdjuntos",
                column: "ADJ_RegistroDiarioId");

            migrationBuilder.CreateIndex(
                name: "IX_ArchivosAdjuntos_ADJ_SubidoPor",
                table: "ArchivosAdjuntos",
                column: "ADJ_SubidoPor");

            migrationBuilder.CreateIndex(
                name: "IX_ArchivosAdjuntos_ADJ_TareaId",
                table: "ArchivosAdjuntos",
                column: "ADJ_TareaId");

            migrationBuilder.CreateIndex(
                name: "IX_BovedaSecretos_BVD_CreadoPor",
                table: "BovedaSecretos",
                column: "BVD_CreadoPor");

            migrationBuilder.CreateIndex(
                name: "IX_BovedaSecretos_BVD_ProyectoId_BVD_Entorno_BVD_NombreClave",
                table: "BovedaSecretos",
                columns: new[] { "BVD_ProyectoId", "BVD_Entorno", "BVD_NombreClave" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Carpetas_CRP_ProyectoId",
                table: "Carpetas",
                column: "CRP_ProyectoId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentosMarkdown_DOC_CreadoPor",
                table: "DocumentosMarkdown",
                column: "DOC_CreadoPor");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentosMarkdown_DOC_DocumentoPadreId",
                table: "DocumentosMarkdown",
                column: "DOC_DocumentoPadreId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentosMarkdown_DOC_ProyectoId",
                table: "DocumentosMarkdown",
                column: "DOC_ProyectoId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentosMarkdown_DOC_RutaEsquema",
                table: "DocumentosMarkdown",
                column: "DOC_RutaEsquema",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DocumentosMarkdown_DOC_Titulo",
                table: "DocumentosMarkdown",
                column: "DOC_Titulo");

            migrationBuilder.CreateIndex(
                name: "IX_ListasTareas_LST_CarpetaId",
                table: "ListasTareas",
                column: "LST_CarpetaId");

            migrationBuilder.CreateIndex(
                name: "IX_ListasTareas_LST_ProyectoId",
                table: "ListasTareas",
                column: "LST_ProyectoId");

            migrationBuilder.CreateIndex(
                name: "IX_Marcadores_MRC_UsuarioId_MRC_TipoEntidad_MRC_EntidadId",
                table: "Marcadores",
                columns: new[] { "MRC_UsuarioId", "MRC_TipoEntidad", "MRC_EntidadId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MensajesTicket_MSG_TicketId",
                table: "MensajesTicket",
                column: "MSG_TicketId");

            migrationBuilder.CreateIndex(
                name: "IX_Proyectos_PRY_ClavePrefijo",
                table: "Proyectos",
                column: "PRY_ClavePrefijo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReferenciasEntidades_REF_TipoDestino_REF_DestinoId",
                table: "ReferenciasEntidades",
                columns: new[] { "REF_TipoDestino", "REF_DestinoId" });

            migrationBuilder.CreateIndex(
                name: "IX_ReferenciasEntidades_REF_TipoOrigen_REF_OrigenId",
                table: "ReferenciasEntidades",
                columns: new[] { "REF_TipoOrigen", "REF_OrigenId" });

            migrationBuilder.CreateIndex(
                name: "UQ_Usuario_FechaLog",
                table: "RegistrosDiarios",
                columns: new[] { "LOG_UsuarioId", "LOG_FechaLog" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RegistrosTiempo_RGT_TareaId",
                table: "RegistrosTiempo",
                column: "RGT_TareaId");

            migrationBuilder.CreateIndex(
                name: "IX_RegistrosTiempo_RGT_UsuarioId_RGT_FechaInicio",
                table: "RegistrosTiempo",
                columns: new[] { "RGT_UsuarioId", "RGT_FechaInicio" });

            migrationBuilder.CreateIndex(
                name: "IX_Roles_ROL_Nombre",
                table: "Roles",
                column: "ROL_Nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tareas_TAR_CreadoPor",
                table: "Tareas",
                column: "TAR_CreadoPor");

            migrationBuilder.CreateIndex(
                name: "IX_Tareas_TAR_ListaTareaId_TAR_IndiceOrden",
                table: "Tareas",
                columns: new[] { "TAR_ListaTareaId", "TAR_IndiceOrden" });

            migrationBuilder.CreateIndex(
                name: "IX_Tareas_TAR_NumeroTarea",
                table: "Tareas",
                column: "TAR_NumeroTarea",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tareas_TAR_TareaPadreId",
                table: "Tareas",
                column: "TAR_TareaPadreId");

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_TCK_AgenteAsignadoId_TCK_Estado",
                table: "Tickets",
                columns: new[] { "TCK_AgenteAsignadoId", "TCK_Estado" });

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_TCK_ColaSoporteId",
                table: "Tickets",
                column: "TCK_ColaSoporteId");

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_TCK_NumeroTicket",
                table: "Tickets",
                column: "TCK_NumeroTicket",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_TCK_PoliticaSlaId",
                table: "Tickets",
                column: "TCK_PoliticaSlaId");

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_TCK_TareaRelacionadaId",
                table: "Tickets",
                column: "TCK_TareaRelacionadaId");

            migrationBuilder.CreateIndex(
                name: "IX_TokensRefresco_TKR_TokenHash",
                table: "TokensRefresco",
                column: "TKR_TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TokensRefresco_TKR_UsuarioId",
                table: "TokensRefresco",
                column: "TKR_UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_USR_Correo",
                table: "Usuarios",
                column: "USR_Correo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UsuariosRoles_URO_RolId",
                table: "UsuariosRoles",
                column: "URO_RolId");

            migrationBuilder.CreateIndex(
                name: "IX_UsuariosRoles_URO_UsuarioId_URO_RolId",
                table: "UsuariosRoles",
                columns: new[] { "URO_UsuarioId", "URO_RolId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ArchivosAdjuntos");

            migrationBuilder.DropTable(
                name: "BovedaSecretos");

            migrationBuilder.DropTable(
                name: "Marcadores");

            migrationBuilder.DropTable(
                name: "ReferenciasEntidades");

            migrationBuilder.DropTable(
                name: "RegistrosTiempo");

            migrationBuilder.DropTable(
                name: "TokensRefresco");

            migrationBuilder.DropTable(
                name: "UsuariosRoles");

            migrationBuilder.DropTable(
                name: "DocumentosMarkdown");

            migrationBuilder.DropTable(
                name: "MensajesTicket");

            migrationBuilder.DropTable(
                name: "RegistrosDiarios");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropTable(
                name: "Tickets");

            migrationBuilder.DropTable(
                name: "ColasSoporte");

            migrationBuilder.DropTable(
                name: "PoliticasSla");

            migrationBuilder.DropTable(
                name: "Tareas");

            migrationBuilder.DropTable(
                name: "ListasTareas");

            migrationBuilder.DropTable(
                name: "Usuarios");

            migrationBuilder.DropTable(
                name: "Carpetas");

            migrationBuilder.DropTable(
                name: "Proyectos");
        }
    }
}
