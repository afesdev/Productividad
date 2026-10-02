using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class ModuloTicketsGitHub : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TckCreadoPor",
                table: "Tickets",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "TckDescripcionMarkdown",
                table: "Tickets",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TckDocumentacionMarkdown",
                table: "Tickets",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TckFechaCierre",
                table: "Tickets",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TckTipo",
                table: "Tickets",
                type: "varchar(30)",
                unicode: false,
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "MsgUsuarioId",
                table: "MensajesTicket",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AdjTicketId",
                table: "ArchivosAdjuntos",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DesplieguesTicket",
                columns: table => new
                {
                    DspId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    DspTicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DspAmbiente = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    DspReferencia = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    DspNotas = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    DspResultado = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    DspNotasResultado = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    DspDesplegadoPor = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DspEvaluadoPor = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DspFechaDespliegue = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DspFechaResultado = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DesplieguesTicket", x => x.DspId);
                    table.ForeignKey(
                        name: "FK_DesplieguesTicket_Tickets_DspTicketId",
                        column: x => x.DspTicketId,
                        principalTable: "Tickets",
                        principalColumn: "TckId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DesplieguesTicket_Usuarios_DspDesplegadoPor",
                        column: x => x.DspDesplegadoPor,
                        principalTable: "Usuarios",
                        principalColumn: "UsuId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DesplieguesTicket_Usuarios_DspEvaluadoPor",
                        column: x => x.DspEvaluadoPor,
                        principalTable: "Usuarios",
                        principalColumn: "UsuId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EventosTicket",
                columns: table => new
                {
                    EvtId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    EvtTicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EvtTipoEvento = table.Column<string>(type: "varchar(40)", unicode: false, maxLength: 40, nullable: false),
                    EvtEstadoAnterior = table.Column<string>(type: "varchar(30)", unicode: false, maxLength: 30, nullable: true),
                    EvtEstadoNuevo = table.Column<string>(type: "varchar(30)", unicode: false, maxLength: 30, nullable: true),
                    EvtDescripcion = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    EvtComentario = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    EvtUsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EvtFechaEvento = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventosTicket", x => x.EvtId);
                    table.ForeignKey(
                        name: "FK_EventosTicket_Tickets_EvtTicketId",
                        column: x => x.EvtTicketId,
                        principalTable: "Tickets",
                        principalColumn: "TckId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EventosTicket_Usuarios_EvtUsuarioId",
                        column: x => x.EvtUsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Repositorios",
                columns: table => new
                {
                    RepId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    RepNombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    RepPropietario = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    RepNombreRepositorio = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    RepRamaPrincipal = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    RepRamaDesarrollo = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    RepEstaActivo = table.Column<bool>(type: "bit", nullable: false),
                    RepFechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Repositorios", x => x.RepId);
                });

            migrationBuilder.CreateTable(
                name: "RamasTicket",
                columns: table => new
                {
                    RtkId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    RtkTicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RtkRepositorioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RtkNombreRama = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    RtkRamaBase = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    RtkRamaDestino = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    RtkPullRequestNumero = table.Column<int>(type: "int", nullable: true),
                    RtkPullRequestUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    RtkPullRequestEstado = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: true),
                    RtkPullRequestFechaFusion = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RtkTotalCommits = table.Column<int>(type: "int", nullable: false),
                    RtkTotalArchivos = table.Column<int>(type: "int", nullable: false),
                    RtkLineasAgregadas = table.Column<int>(type: "int", nullable: false),
                    RtkLineasEliminadas = table.Column<int>(type: "int", nullable: false),
                    RtkFechaUltimaSincronizacion = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RtkCreadoPor = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RtkFechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RamasTicket", x => x.RtkId);
                    table.ForeignKey(
                        name: "FK_RamasTicket_Repositorios_RtkRepositorioId",
                        column: x => x.RtkRepositorioId,
                        principalTable: "Repositorios",
                        principalColumn: "RepId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RamasTicket_Tickets_RtkTicketId",
                        column: x => x.RtkTicketId,
                        principalTable: "Tickets",
                        principalColumn: "TckId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RamasTicket_Usuarios_RtkCreadoPor",
                        column: x => x.RtkCreadoPor,
                        principalTable: "Usuarios",
                        principalColumn: "UsuId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ArchivosModificados",
                columns: table => new
                {
                    AmoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    AmoRamaTicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AmoRutaArchivo = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    AmoRutaAnterior = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    AmoTipoCambio = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    AmoLineasAgregadas = table.Column<int>(type: "int", nullable: false),
                    AmoLineasEliminadas = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArchivosModificados", x => x.AmoId);
                    table.ForeignKey(
                        name: "FK_ArchivosModificados_RamasTicket_AmoRamaTicketId",
                        column: x => x.AmoRamaTicketId,
                        principalTable: "RamasTicket",
                        principalColumn: "RtkId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CommitsRama",
                columns: table => new
                {
                    CmtId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    CmtRamaTicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CmtSha = table.Column<string>(type: "varchar(40)", unicode: false, maxLength: 40, nullable: false),
                    CmtMensaje = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    CmtAutor = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    CmtFechaCommit = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CmtUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommitsRama", x => x.CmtId);
                    table.ForeignKey(
                        name: "FK_CommitsRama_RamasTicket_CmtRamaTicketId",
                        column: x => x.CmtRamaTicketId,
                        principalTable: "RamasTicket",
                        principalColumn: "RtkId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "ColasSoporte",
                columns: new[] { "ClaId", "ClaDescripcion", "ClaEstaActiva", "ClaNombre" },
                values: new object[] { new Guid("5c0a7e10-2b6f-4d1e-9a51-000000000001"), "Cola por defecto para todos los tickets.", true, "General" });

            migrationBuilder.InsertData(
                table: "PoliticasSla",
                columns: new[] { "SlaId", "SlaEstaActiva", "SlaMinutosPrimeraRespuesta", "SlaMinutosResolucion", "SlaNombre" },
                values: new object[,]
                {
                    { new Guid("5c0a7e10-2b6f-4d1e-9a51-000000000101"), true, 60, 480, "Urgente" },
                    { new Guid("5c0a7e10-2b6f-4d1e-9a51-000000000102"), true, 240, 1440, "Alta" },
                    { new Guid("5c0a7e10-2b6f-4d1e-9a51-000000000103"), true, 480, 4320, "Media" },
                    { new Guid("5c0a7e10-2b6f-4d1e-9a51-000000000104"), true, 1440, 7200, "Baja" }
                });

            // Tickets previos al módulo: estados del esquema original al nuevo flujo y un creador válido para la FK.
            migrationBuilder.Sql("""
                UPDATE Tickets SET TckEstado = 'EnAnalisis' WHERE TckEstado = 'Abierto';
                UPDATE Tickets SET TckEstado = 'Aprobado' WHERE TckEstado = 'Resuelto';
                UPDATE Tickets
                   SET TckCreadoPor = COALESCE(TckAgenteAsignadoId, (SELECT TOP 1 UsuId FROM Usuarios ORDER BY UsuFechaCreacion))
                 WHERE TckCreadoPor = '00000000-0000-0000-0000-000000000000';
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_TckCreadoPor",
                table: "Tickets",
                column: "TckCreadoPor");

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_TckEstado",
                table: "Tickets",
                column: "TckEstado");

            migrationBuilder.CreateIndex(
                name: "IX_MensajesTicket_MsgUsuarioId",
                table: "MensajesTicket",
                column: "MsgUsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_ArchivosAdjuntos_AdjTicketId",
                table: "ArchivosAdjuntos",
                column: "AdjTicketId");

            migrationBuilder.CreateIndex(
                name: "IX_ArchivosModificados_AmoRamaTicketId",
                table: "ArchivosModificados",
                column: "AmoRamaTicketId");

            migrationBuilder.CreateIndex(
                name: "IX_CommitsRama_CmtRamaTicketId",
                table: "CommitsRama",
                column: "CmtRamaTicketId");

            migrationBuilder.CreateIndex(
                name: "IX_DesplieguesTicket_DspDesplegadoPor",
                table: "DesplieguesTicket",
                column: "DspDesplegadoPor");

            migrationBuilder.CreateIndex(
                name: "IX_DesplieguesTicket_DspEvaluadoPor",
                table: "DesplieguesTicket",
                column: "DspEvaluadoPor");

            migrationBuilder.CreateIndex(
                name: "IX_DesplieguesTicket_DspTicketId",
                table: "DesplieguesTicket",
                column: "DspTicketId");

            migrationBuilder.CreateIndex(
                name: "IX_EventosTicket_EvtTicketId_EvtFechaEvento",
                table: "EventosTicket",
                columns: new[] { "EvtTicketId", "EvtFechaEvento" });

            migrationBuilder.CreateIndex(
                name: "IX_EventosTicket_EvtUsuarioId",
                table: "EventosTicket",
                column: "EvtUsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_RamasTicket_RtkCreadoPor",
                table: "RamasTicket",
                column: "RtkCreadoPor");

            migrationBuilder.CreateIndex(
                name: "IX_RamasTicket_RtkRepositorioId",
                table: "RamasTicket",
                column: "RtkRepositorioId");

            migrationBuilder.CreateIndex(
                name: "IX_RamasTicket_RtkTicketId_RtkRepositorioId_RtkNombreRama",
                table: "RamasTicket",
                columns: new[] { "RtkTicketId", "RtkRepositorioId", "RtkNombreRama" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Repositorios_RepPropietario_RepNombreRepositorio",
                table: "Repositorios",
                columns: new[] { "RepPropietario", "RepNombreRepositorio" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ArchivosAdjuntos_Tickets_AdjTicketId",
                table: "ArchivosAdjuntos",
                column: "AdjTicketId",
                principalTable: "Tickets",
                principalColumn: "TckId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MensajesTicket_Usuarios_MsgUsuarioId",
                table: "MensajesTicket",
                column: "MsgUsuarioId",
                principalTable: "Usuarios",
                principalColumn: "UsuId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tickets_Usuarios_TckCreadoPor",
                table: "Tickets",
                column: "TckCreadoPor",
                principalTable: "Usuarios",
                principalColumn: "UsuId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ArchivosAdjuntos_Tickets_AdjTicketId",
                table: "ArchivosAdjuntos");

            migrationBuilder.DropForeignKey(
                name: "FK_MensajesTicket_Usuarios_MsgUsuarioId",
                table: "MensajesTicket");

            migrationBuilder.DropForeignKey(
                name: "FK_Tickets_Usuarios_TckCreadoPor",
                table: "Tickets");

            migrationBuilder.DropTable(
                name: "ArchivosModificados");

            migrationBuilder.DropTable(
                name: "CommitsRama");

            migrationBuilder.DropTable(
                name: "DesplieguesTicket");

            migrationBuilder.DropTable(
                name: "EventosTicket");

            migrationBuilder.DropTable(
                name: "RamasTicket");

            migrationBuilder.DropTable(
                name: "Repositorios");

            migrationBuilder.DropIndex(
                name: "IX_Tickets_TckCreadoPor",
                table: "Tickets");

            migrationBuilder.DropIndex(
                name: "IX_Tickets_TckEstado",
                table: "Tickets");

            migrationBuilder.DropIndex(
                name: "IX_MensajesTicket_MsgUsuarioId",
                table: "MensajesTicket");

            migrationBuilder.DropIndex(
                name: "IX_ArchivosAdjuntos_AdjTicketId",
                table: "ArchivosAdjuntos");

            migrationBuilder.DeleteData(
                table: "ColasSoporte",
                keyColumn: "ClaId",
                keyValue: new Guid("5c0a7e10-2b6f-4d1e-9a51-000000000001"));

            migrationBuilder.DeleteData(
                table: "PoliticasSla",
                keyColumn: "SlaId",
                keyValue: new Guid("5c0a7e10-2b6f-4d1e-9a51-000000000101"));

            migrationBuilder.DeleteData(
                table: "PoliticasSla",
                keyColumn: "SlaId",
                keyValue: new Guid("5c0a7e10-2b6f-4d1e-9a51-000000000102"));

            migrationBuilder.DeleteData(
                table: "PoliticasSla",
                keyColumn: "SlaId",
                keyValue: new Guid("5c0a7e10-2b6f-4d1e-9a51-000000000103"));

            migrationBuilder.DeleteData(
                table: "PoliticasSla",
                keyColumn: "SlaId",
                keyValue: new Guid("5c0a7e10-2b6f-4d1e-9a51-000000000104"));

            migrationBuilder.DropColumn(
                name: "TckCreadoPor",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "TckDescripcionMarkdown",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "TckDocumentacionMarkdown",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "TckFechaCierre",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "TckTipo",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "MsgUsuarioId",
                table: "MensajesTicket");

            migrationBuilder.DropColumn(
                name: "AdjTicketId",
                table: "ArchivosAdjuntos");
        }
    }
}
