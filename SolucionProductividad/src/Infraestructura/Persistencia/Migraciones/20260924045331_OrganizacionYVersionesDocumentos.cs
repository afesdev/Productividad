using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class OrganizacionYVersionesDocumentos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DocCarpetaDocumentoId",
                table: "DocumentosMarkdown",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DocFechaArchivado",
                table: "DocumentosMarkdown",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CarpetasDocumento",
                columns: table => new
                {
                    CdoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    CdoUsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CdoCarpetaPadreId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CdoNombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CdoColor = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: true),
                    CdoIndiceOrden = table.Column<int>(type: "int", nullable: false),
                    CdoFechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CarpetasDocumento", x => x.CdoId);
                    table.ForeignKey(
                        name: "FK_CarpetasDocumento_CarpetasDocumento_CdoCarpetaPadreId",
                        column: x => x.CdoCarpetaPadreId,
                        principalTable: "CarpetasDocumento",
                        principalColumn: "CdoId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CarpetasDocumento_Usuarios_CdoUsuarioId",
                        column: x => x.CdoUsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EtiquetasDocumento",
                columns: table => new
                {
                    EtqId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    EtqUsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EtqNombre = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    EtqColor = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    EtqFechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EtiquetasDocumento", x => x.EtqId);
                    table.ForeignKey(
                        name: "FK_EtiquetasDocumento_Usuarios_EtqUsuarioId",
                        column: x => x.EtqUsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VersionesDocumento",
                columns: table => new
                {
                    VdoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    VdoDocumentoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VdoNumeroVersion = table.Column<int>(type: "int", nullable: false),
                    VdoTitulo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    VdoContenidoMarkdown = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    VdoCreadoPor = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VdoFechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VersionesDocumento", x => x.VdoId);
                    table.ForeignKey(
                        name: "FK_VersionesDocumento_DocumentosMarkdown_VdoDocumentoId",
                        column: x => x.VdoDocumentoId,
                        principalTable: "DocumentosMarkdown",
                        principalColumn: "DocId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VersionesDocumento_Usuarios_VdoCreadoPor",
                        column: x => x.VdoCreadoPor,
                        principalTable: "Usuarios",
                        principalColumn: "UsuId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DocumentosEtiquetas",
                columns: table => new
                {
                    DteId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    DteDocumentoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DteEtiquetaId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentosEtiquetas", x => x.DteId);
                    table.ForeignKey(
                        name: "FK_DocumentosEtiquetas_DocumentosMarkdown_DteDocumentoId",
                        column: x => x.DteDocumentoId,
                        principalTable: "DocumentosMarkdown",
                        principalColumn: "DocId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DocumentosEtiquetas_EtiquetasDocumento_DteEtiquetaId",
                        column: x => x.DteEtiquetaId,
                        principalTable: "EtiquetasDocumento",
                        principalColumn: "EtqId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentosMarkdown_DocCarpetaDocumentoId",
                table: "DocumentosMarkdown",
                column: "DocCarpetaDocumentoId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentosMarkdown_DocCreadoPor_DocEstaArchivado_DocCarpetaDocumentoId",
                table: "DocumentosMarkdown",
                columns: new[] { "DocCreadoPor", "DocEstaArchivado", "DocCarpetaDocumentoId" });

            migrationBuilder.CreateIndex(
                name: "IX_CarpetasDocumento_CdoCarpetaPadreId",
                table: "CarpetasDocumento",
                column: "CdoCarpetaPadreId");

            migrationBuilder.CreateIndex(
                name: "IX_CarpetasDocumento_CdoUsuarioId_CdoCarpetaPadreId",
                table: "CarpetasDocumento",
                columns: new[] { "CdoUsuarioId", "CdoCarpetaPadreId" });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentosEtiquetas_DteDocumentoId_DteEtiquetaId",
                table: "DocumentosEtiquetas",
                columns: new[] { "DteDocumentoId", "DteEtiquetaId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DocumentosEtiquetas_DteEtiquetaId",
                table: "DocumentosEtiquetas",
                column: "DteEtiquetaId");

            migrationBuilder.CreateIndex(
                name: "IX_EtiquetasDocumento_EtqUsuarioId_EtqNombre",
                table: "EtiquetasDocumento",
                columns: new[] { "EtqUsuarioId", "EtqNombre" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VersionesDocumento_VdoCreadoPor",
                table: "VersionesDocumento",
                column: "VdoCreadoPor");

            migrationBuilder.CreateIndex(
                name: "IX_VersionesDocumento_VdoDocumentoId_VdoNumeroVersion",
                table: "VersionesDocumento",
                columns: new[] { "VdoDocumentoId", "VdoNumeroVersion" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_DocumentosMarkdown_CarpetasDocumento_DocCarpetaDocumentoId",
                table: "DocumentosMarkdown",
                column: "DocCarpetaDocumentoId",
                principalTable: "CarpetasDocumento",
                principalColumn: "CdoId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DocumentosMarkdown_CarpetasDocumento_DocCarpetaDocumentoId",
                table: "DocumentosMarkdown");

            migrationBuilder.DropTable(
                name: "CarpetasDocumento");

            migrationBuilder.DropTable(
                name: "DocumentosEtiquetas");

            migrationBuilder.DropTable(
                name: "VersionesDocumento");

            migrationBuilder.DropTable(
                name: "EtiquetasDocumento");

            migrationBuilder.DropIndex(
                name: "IX_DocumentosMarkdown_DocCarpetaDocumentoId",
                table: "DocumentosMarkdown");

            migrationBuilder.DropIndex(
                name: "IX_DocumentosMarkdown_DocCreadoPor_DocEstaArchivado_DocCarpetaDocumentoId",
                table: "DocumentosMarkdown");

            migrationBuilder.DropColumn(
                name: "DocCarpetaDocumentoId",
                table: "DocumentosMarkdown");

            migrationBuilder.DropColumn(
                name: "DocFechaArchivado",
                table: "DocumentosMarkdown");
        }
    }
}
