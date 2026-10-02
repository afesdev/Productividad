using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class ModuloLienzos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Lienzos",
                columns: table => new
                {
                    LieId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    LieUsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LieTitulo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    LieContenidoJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LieFechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    LieFechaActualizacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Lienzos", x => x.LieId);
                    table.ForeignKey(
                        name: "FK_Lienzos_Usuarios_LieUsuarioId",
                        column: x => x.LieUsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Lienzos_LieUsuarioId_LieFechaActualizacion",
                table: "Lienzos",
                columns: new[] { "LieUsuarioId", "LieFechaActualizacion" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Lienzos");
        }
    }
}
