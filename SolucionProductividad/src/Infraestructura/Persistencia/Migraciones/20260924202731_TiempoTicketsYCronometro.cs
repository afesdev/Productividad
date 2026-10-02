using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class TiempoTicketsYCronometro : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "RgtTareaId",
                table: "RegistrosTiempo",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<Guid>(
                name: "RgtTicketId",
                table: "RegistrosTiempo",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RegistrosTiempo_RgtTicketId",
                table: "RegistrosTiempo",
                column: "RgtTicketId");

            migrationBuilder.CreateIndex(
                name: "UQ_RegistrosTiempo_UnoEnCurso",
                table: "RegistrosTiempo",
                column: "RgtUsuarioId",
                unique: true,
                filter: "[RgtFechaFin] IS NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RegistrosTiempo_Rango",
                table: "RegistrosTiempo",
                sql: "[RgtFechaFin] IS NULL OR [RgtFechaFin] >= [RgtFechaInicio]");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RegistrosTiempo_UnDestino",
                table: "RegistrosTiempo",
                sql: "[RgtTareaId] IS NULL OR [RgtTicketId] IS NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_RegistrosTiempo_Tickets_RgtTicketId",
                table: "RegistrosTiempo",
                column: "RgtTicketId",
                principalTable: "Tickets",
                principalColumn: "TckId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RegistrosTiempo_Tickets_RgtTicketId",
                table: "RegistrosTiempo");

            migrationBuilder.DropIndex(
                name: "IX_RegistrosTiempo_RgtTicketId",
                table: "RegistrosTiempo");

            migrationBuilder.DropIndex(
                name: "UQ_RegistrosTiempo_UnoEnCurso",
                table: "RegistrosTiempo");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RegistrosTiempo_Rango",
                table: "RegistrosTiempo");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RegistrosTiempo_UnDestino",
                table: "RegistrosTiempo");

            migrationBuilder.DropColumn(
                name: "RgtTicketId",
                table: "RegistrosTiempo");

            migrationBuilder.AlterColumn<Guid>(
                name: "RgtTareaId",
                table: "RegistrosTiempo",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
        }
    }
}
