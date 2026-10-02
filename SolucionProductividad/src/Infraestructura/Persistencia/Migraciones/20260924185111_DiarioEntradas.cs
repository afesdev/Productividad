using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class DiarioEntradas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte>(
                name: "LogAnimo",
                table: "RegistrosDiarios",
                type: "tinyint",
                nullable: true);

            migrationBuilder.AddColumn<byte>(
                name: "LogEnergia",
                table: "RegistrosDiarios",
                type: "tinyint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "EntradasDiario",
                columns: table => new
                {
                    EndId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    EndRegistroDiarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EndTipo = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    EndTitulo = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    EndDetalleMarkdown = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EndHoraInicio = table.Column<TimeOnly>(type: "time(0)", nullable: true),
                    EndHoraFin = table.Column<TimeOnly>(type: "time(0)", nullable: true),
                    EndCompletada = table.Column<bool>(type: "bit", nullable: false),
                    EndFechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EntradasDiario", x => x.EndId);
                    table.ForeignKey(
                        name: "FK_EntradasDiario_RegistrosDiarios_EndRegistroDiarioId",
                        column: x => x.EndRegistroDiarioId,
                        principalTable: "RegistrosDiarios",
                        principalColumn: "LogId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_RegistrosDiarios_Animo",
                table: "RegistrosDiarios",
                sql: "[LogAnimo] IS NULL OR [LogAnimo] BETWEEN 1 AND 5");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RegistrosDiarios_Energia",
                table: "RegistrosDiarios",
                sql: "[LogEnergia] IS NULL OR [LogEnergia] BETWEEN 1 AND 5");

            migrationBuilder.CreateIndex(
                name: "IX_EntradasDiario_EndRegistroDiarioId_EndHoraInicio",
                table: "EntradasDiario",
                columns: new[] { "EndRegistroDiarioId", "EndHoraInicio" });

            migrationBuilder.CreateIndex(
                name: "IX_EntradasDiario_EndTipo",
                table: "EntradasDiario",
                column: "EndTipo");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EntradasDiario");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RegistrosDiarios_Animo",
                table: "RegistrosDiarios");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RegistrosDiarios_Energia",
                table: "RegistrosDiarios");

            migrationBuilder.DropColumn(
                name: "LogAnimo",
                table: "RegistrosDiarios");

            migrationBuilder.DropColumn(
                name: "LogEnergia",
                table: "RegistrosDiarios");
        }
    }
}
