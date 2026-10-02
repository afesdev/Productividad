using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class CamposExternosTicket : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "TckFechaVencimiento",
                table: "Tickets",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TckHorasDedicadas",
                table: "Tickets",
                type: "decimal(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TckIdSeguimiento",
                table: "Tickets",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TckNumeroExterno",
                table: "Tickets",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_TckNumeroExterno",
                table: "Tickets",
                column: "TckNumeroExterno");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tickets_TckNumeroExterno",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "TckFechaVencimiento",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "TckHorasDedicadas",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "TckIdSeguimiento",
                table: "Tickets");

            migrationBuilder.DropColumn(
                name: "TckNumeroExterno",
                table: "Tickets");
        }
    }
}
