using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class ReporteActividades : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EndEstadoReporte",
                table: "EntradasDiario",
                type: "varchar(20)",
                unicode: false,
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EndFechaReportado",
                table: "EntradasDiario",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "EndFechaSolicitud",
                table: "EntradasDiario",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "EndTableroReporteId",
                table: "EntradasDiario",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TablerosReporte",
                columns: table => new
                {
                    TbrId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    TbrUsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TbrNombre = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    TbrProyectoId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TbrEstaArchivado = table.Column<bool>(type: "bit", nullable: false),
                    TbrFechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TablerosReporte", x => x.TbrId);
                    table.ForeignKey(
                        name: "FK_TablerosReporte_Proyectos_TbrProyectoId",
                        column: x => x.TbrProyectoId,
                        principalTable: "Proyectos",
                        principalColumn: "PryId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_TablerosReporte_Usuarios_TbrUsuarioId",
                        column: x => x.TbrUsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EntradasDiario_EndFechaReportado",
                table: "EntradasDiario",
                column: "EndFechaReportado");

            migrationBuilder.CreateIndex(
                name: "IX_EntradasDiario_EndTableroReporteId",
                table: "EntradasDiario",
                column: "EndTableroReporteId");

            migrationBuilder.CreateIndex(
                name: "IX_TablerosReporte_TbrProyectoId",
                table: "TablerosReporte",
                column: "TbrProyectoId");

            migrationBuilder.CreateIndex(
                name: "IX_TablerosReporte_TbrUsuarioId_TbrNombre",
                table: "TablerosReporte",
                columns: new[] { "TbrUsuarioId", "TbrNombre" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_EntradasDiario_TablerosReporte_EndTableroReporteId",
                table: "EntradasDiario",
                column: "EndTableroReporteId",
                principalTable: "TablerosReporte",
                principalColumn: "TbrId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EntradasDiario_TablerosReporte_EndTableroReporteId",
                table: "EntradasDiario");

            migrationBuilder.DropTable(
                name: "TablerosReporte");

            migrationBuilder.DropIndex(
                name: "IX_EntradasDiario_EndFechaReportado",
                table: "EntradasDiario");

            migrationBuilder.DropIndex(
                name: "IX_EntradasDiario_EndTableroReporteId",
                table: "EntradasDiario");

            migrationBuilder.DropColumn(
                name: "EndEstadoReporte",
                table: "EntradasDiario");

            migrationBuilder.DropColumn(
                name: "EndFechaReportado",
                table: "EntradasDiario");

            migrationBuilder.DropColumn(
                name: "EndFechaSolicitud",
                table: "EntradasDiario");

            migrationBuilder.DropColumn(
                name: "EndTableroReporteId",
                table: "EntradasDiario");
        }
    }
}
