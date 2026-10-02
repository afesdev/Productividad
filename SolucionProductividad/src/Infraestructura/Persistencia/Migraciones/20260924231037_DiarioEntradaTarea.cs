using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class DiarioEntradaTarea : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "EndTareaId",
                table: "EntradasDiario",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_EntradasDiario_EndTareaId",
                table: "EntradasDiario",
                column: "EndTareaId");

            migrationBuilder.AddForeignKey(
                name: "FK_EntradasDiario_Tareas_EndTareaId",
                table: "EntradasDiario",
                column: "EndTareaId",
                principalTable: "Tareas",
                principalColumn: "TarId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EntradasDiario_Tareas_EndTareaId",
                table: "EntradasDiario");

            migrationBuilder.DropIndex(
                name: "IX_EntradasDiario_EndTareaId",
                table: "EntradasDiario");

            migrationBuilder.DropColumn(
                name: "EndTareaId",
                table: "EntradasDiario");
        }
    }
}
