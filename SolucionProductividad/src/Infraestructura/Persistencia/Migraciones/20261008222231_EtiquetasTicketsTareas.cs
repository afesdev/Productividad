using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class EtiquetasTicketsTareas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TareasEtiquetas",
                columns: table => new
                {
                    TaeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    TaeTareaId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TaeEtiquetaId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TareasEtiquetas", x => x.TaeId);
                    table.ForeignKey(
                        name: "FK_TareasEtiquetas_EtiquetasDocumento_TaeEtiquetaId",
                        column: x => x.TaeEtiquetaId,
                        principalTable: "EtiquetasDocumento",
                        principalColumn: "EtqId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TareasEtiquetas_Tareas_TaeTareaId",
                        column: x => x.TaeTareaId,
                        principalTable: "Tareas",
                        principalColumn: "TarId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TicketsEtiquetas",
                columns: table => new
                {
                    TkeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    TkeTicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TkeEtiquetaId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TicketsEtiquetas", x => x.TkeId);
                    table.ForeignKey(
                        name: "FK_TicketsEtiquetas_EtiquetasDocumento_TkeEtiquetaId",
                        column: x => x.TkeEtiquetaId,
                        principalTable: "EtiquetasDocumento",
                        principalColumn: "EtqId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TicketsEtiquetas_Tickets_TkeTicketId",
                        column: x => x.TkeTicketId,
                        principalTable: "Tickets",
                        principalColumn: "TckId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TareasEtiquetas_TaeEtiquetaId",
                table: "TareasEtiquetas",
                column: "TaeEtiquetaId");

            migrationBuilder.CreateIndex(
                name: "IX_TareasEtiquetas_TaeTareaId_TaeEtiquetaId",
                table: "TareasEtiquetas",
                columns: new[] { "TaeTareaId", "TaeEtiquetaId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TicketsEtiquetas_TkeEtiquetaId",
                table: "TicketsEtiquetas",
                column: "TkeEtiquetaId");

            migrationBuilder.CreateIndex(
                name: "IX_TicketsEtiquetas_TkeTicketId_TkeEtiquetaId",
                table: "TicketsEtiquetas",
                columns: new[] { "TkeTicketId", "TkeEtiquetaId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TareasEtiquetas");

            migrationBuilder.DropTable(
                name: "TicketsEtiquetas");
        }
    }
}
