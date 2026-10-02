using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class VigenciaDocumentos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DocDocumentoReemplazoId",
                table: "DocumentosMarkdown",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DocEstado",
                table: "DocumentosMarkdown",
                type: "varchar(20)",
                unicode: false,
                maxLength: 20,
                nullable: false,
                defaultValue: "Vigente"); // Los documentos existentes se consideran vigentes.

            migrationBuilder.AddColumn<DateTime>(
                name: "DocFechaRevision",
                table: "DocumentosMarkdown",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DocumentosMarkdown_DocDocumentoReemplazoId",
                table: "DocumentosMarkdown",
                column: "DocDocumentoReemplazoId");

            migrationBuilder.AddForeignKey(
                name: "FK_DocumentosMarkdown_DocumentosMarkdown_DocDocumentoReemplazoId",
                table: "DocumentosMarkdown",
                column: "DocDocumentoReemplazoId",
                principalTable: "DocumentosMarkdown",
                principalColumn: "DocId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DocumentosMarkdown_DocumentosMarkdown_DocDocumentoReemplazoId",
                table: "DocumentosMarkdown");

            migrationBuilder.DropIndex(
                name: "IX_DocumentosMarkdown_DocDocumentoReemplazoId",
                table: "DocumentosMarkdown");

            migrationBuilder.DropColumn(
                name: "DocDocumentoReemplazoId",
                table: "DocumentosMarkdown");

            migrationBuilder.DropColumn(
                name: "DocEstado",
                table: "DocumentosMarkdown");

            migrationBuilder.DropColumn(
                name: "DocFechaRevision",
                table: "DocumentosMarkdown");
        }
    }
}
