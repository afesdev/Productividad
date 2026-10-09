using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class VinculosTrello : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VinculosTrello",
                columns: table => new
                {
                    VtrId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    VtrUsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VtrIdTarjeta = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    VtrNombreTarjeta = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    VtrNombreTablero = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    VtrUrlTarjeta = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    VtrTareaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    VtrTicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    VtrFechaVinculo = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VinculosTrello", x => x.VtrId);
                    table.CheckConstraint("CK_VinculosTrello_Destino", "([VtrTareaId] IS NOT NULL AND [VtrTicketId] IS NULL) OR ([VtrTareaId] IS NULL AND [VtrTicketId] IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_VinculosTrello_Tareas_VtrTareaId",
                        column: x => x.VtrTareaId,
                        principalTable: "Tareas",
                        principalColumn: "TarId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VinculosTrello_Tickets_VtrTicketId",
                        column: x => x.VtrTicketId,
                        principalTable: "Tickets",
                        principalColumn: "TckId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VinculosTrello_Usuarios_VtrUsuarioId",
                        column: x => x.VtrUsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VinculosTrello_VtrTareaId_VtrIdTarjeta",
                table: "VinculosTrello",
                columns: new[] { "VtrTareaId", "VtrIdTarjeta" },
                unique: true,
                filter: "[VtrTareaId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_VinculosTrello_VtrTicketId_VtrIdTarjeta",
                table: "VinculosTrello",
                columns: new[] { "VtrTicketId", "VtrIdTarjeta" },
                unique: true,
                filter: "[VtrTicketId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_VinculosTrello_VtrUsuarioId_VtrIdTarjeta",
                table: "VinculosTrello",
                columns: new[] { "VtrUsuarioId", "VtrIdTarjeta" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VinculosTrello");
        }
    }
}
