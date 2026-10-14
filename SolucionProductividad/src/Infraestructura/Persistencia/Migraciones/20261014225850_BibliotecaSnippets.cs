using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class BibliotecaSnippets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Snippets",
                columns: table => new
                {
                    SnpId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    SnpUsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SnpTitulo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SnpLenguaje = table.Column<string>(type: "varchar(30)", unicode: false, maxLength: 30, nullable: false),
                    SnpContenido = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SnpDescripcion = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    SnpEsFavorito = table.Column<bool>(type: "bit", nullable: false),
                    SnpUsos = table.Column<int>(type: "int", nullable: false),
                    SnpFechaUltimoUso = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SnpFechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    SnpFechaActualizacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Snippets", x => x.SnpId);
                    table.ForeignKey(
                        name: "FK_Snippets_Usuarios_SnpUsuarioId",
                        column: x => x.SnpUsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SnippetsEtiquetas",
                columns: table => new
                {
                    SpeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    SpeSnippetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SpeEtiquetaId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SnippetsEtiquetas", x => x.SpeId);
                    table.ForeignKey(
                        name: "FK_SnippetsEtiquetas_EtiquetasDocumento_SpeEtiquetaId",
                        column: x => x.SpeEtiquetaId,
                        principalTable: "EtiquetasDocumento",
                        principalColumn: "EtqId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SnippetsEtiquetas_Snippets_SpeSnippetId",
                        column: x => x.SpeSnippetId,
                        principalTable: "Snippets",
                        principalColumn: "SnpId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Snippets_SnpUsuarioId_SnpTitulo",
                table: "Snippets",
                columns: new[] { "SnpUsuarioId", "SnpTitulo" });

            migrationBuilder.CreateIndex(
                name: "IX_SnippetsEtiquetas_SpeEtiquetaId",
                table: "SnippetsEtiquetas",
                column: "SpeEtiquetaId");

            migrationBuilder.CreateIndex(
                name: "IX_SnippetsEtiquetas_SpeSnippetId_SpeEtiquetaId",
                table: "SnippetsEtiquetas",
                columns: new[] { "SpeSnippetId", "SpeEtiquetaId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SnippetsEtiquetas");

            migrationBuilder.DropTable(
                name: "Snippets");
        }
    }
}
