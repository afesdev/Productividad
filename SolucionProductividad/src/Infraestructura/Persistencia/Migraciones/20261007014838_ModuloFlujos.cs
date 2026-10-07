using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class ModuloFlujos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Flujos",
                columns: table => new
                {
                    FluId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    FluUsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FluTitulo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    FluSistema = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    FluDescripcion = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    FluContenidoJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FluTextoBuscable = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FluFechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    FluFechaActualizacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Flujos", x => x.FluId);
                    table.ForeignKey(
                        name: "FK_Flujos_Usuarios_FluUsuarioId",
                        column: x => x.FluUsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Flujos_FluUsuarioId_FluFechaActualizacion",
                table: "Flujos",
                columns: new[] { "FluUsuarioId", "FluFechaActualizacion" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Flujos");
        }
    }
}
