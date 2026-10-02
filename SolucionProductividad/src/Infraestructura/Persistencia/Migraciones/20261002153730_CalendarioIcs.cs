using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class CalendarioIcs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ConexionesCalendario",
                columns: table => new
                {
                    CalId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    CalUsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CalUrlIcsCifrada = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    CalFechaConexion = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConexionesCalendario", x => x.CalId);
                    table.ForeignKey(
                        name: "FK_ConexionesCalendario_Usuarios_CalUsuarioId",
                        column: x => x.CalUsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ConexionesCalendario_CalUsuarioId",
                table: "ConexionesCalendario",
                column: "CalUsuarioId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConexionesCalendario");
        }
    }
}
