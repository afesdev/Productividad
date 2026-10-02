using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class ProyectosSoporte : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "RepProyectoSoporteId",
                table: "Repositorios",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProyectosSoporte",
                columns: table => new
                {
                    PsoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    PsoUsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PsoNombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PsoDescripcion = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PsoColor = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: false),
                    PsoEstaActivo = table.Column<bool>(type: "bit", nullable: false),
                    PsoFechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProyectosSoporte", x => x.PsoId);
                    table.ForeignKey(
                        name: "FK_ProyectosSoporte_Usuarios_PsoUsuarioId",
                        column: x => x.PsoUsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TicketsProyectos",
                columns: table => new
                {
                    TprId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    TprTicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TprProyectoSoporteId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TicketsProyectos", x => x.TprId);
                    table.ForeignKey(
                        name: "FK_TicketsProyectos_ProyectosSoporte_TprProyectoSoporteId",
                        column: x => x.TprProyectoSoporteId,
                        principalTable: "ProyectosSoporte",
                        principalColumn: "PsoId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TicketsProyectos_Tickets_TprTicketId",
                        column: x => x.TprTicketId,
                        principalTable: "Tickets",
                        principalColumn: "TckId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Repositorios_RepProyectoSoporteId",
                table: "Repositorios",
                column: "RepProyectoSoporteId");

            migrationBuilder.CreateIndex(
                name: "IX_ProyectosSoporte_PsoUsuarioId_PsoNombre",
                table: "ProyectosSoporte",
                columns: new[] { "PsoUsuarioId", "PsoNombre" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TicketsProyectos_TprProyectoSoporteId",
                table: "TicketsProyectos",
                column: "TprProyectoSoporteId");

            migrationBuilder.CreateIndex(
                name: "IX_TicketsProyectos_TprTicketId_TprProyectoSoporteId",
                table: "TicketsProyectos",
                columns: new[] { "TprTicketId", "TprProyectoSoporteId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Repositorios_ProyectosSoporte_RepProyectoSoporteId",
                table: "Repositorios",
                column: "RepProyectoSoporteId",
                principalTable: "ProyectosSoporte",
                principalColumn: "PsoId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Repositorios_ProyectosSoporte_RepProyectoSoporteId",
                table: "Repositorios");

            migrationBuilder.DropTable(
                name: "TicketsProyectos");

            migrationBuilder.DropTable(
                name: "ProyectosSoporte");

            migrationBuilder.DropIndex(
                name: "IX_Repositorios_RepProyectoSoporteId",
                table: "Repositorios");

            migrationBuilder.DropColumn(
                name: "RepProyectoSoporteId",
                table: "Repositorios");
        }
    }
}
