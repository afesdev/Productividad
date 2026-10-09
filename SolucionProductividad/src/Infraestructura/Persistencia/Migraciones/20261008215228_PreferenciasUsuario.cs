using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class PreferenciasUsuario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PreferenciasUsuario",
                columns: table => new
                {
                    PreId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    PreUsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PreClave = table.Column<string>(type: "varchar(100)", unicode: false, maxLength: 100, nullable: false),
                    PreValorJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PreFechaActualizacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PreferenciasUsuario", x => x.PreId);
                    table.ForeignKey(
                        name: "FK_PreferenciasUsuario_Usuarios_PreUsuarioId",
                        column: x => x.PreUsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PreferenciasUsuario_PreUsuarioId_PreClave",
                table: "PreferenciasUsuario",
                columns: new[] { "PreUsuarioId", "PreClave" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PreferenciasUsuario");
        }
    }
}
