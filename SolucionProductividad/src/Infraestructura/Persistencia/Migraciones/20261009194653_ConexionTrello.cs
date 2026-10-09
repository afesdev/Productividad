using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class ConexionTrello : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ConexionesTrello",
                columns: table => new
                {
                    TreId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    TreUsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TreTokenCifrado = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    TreIdMiembro = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TreNombreMiembro = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    TreUsuarioMiembro = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    TreFechaConexion = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConexionesTrello", x => x.TreId);
                    table.ForeignKey(
                        name: "FK_ConexionesTrello_Usuarios_TreUsuarioId",
                        column: x => x.TreUsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ConexionesTrello_TreUsuarioId",
                table: "ConexionesTrello",
                column: "TreUsuarioId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConexionesTrello");
        }
    }
}
