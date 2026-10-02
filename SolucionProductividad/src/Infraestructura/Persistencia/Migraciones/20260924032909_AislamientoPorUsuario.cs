using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class AislamientoPorUsuario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Repositorios_RepPropietario_RepNombreRepositorio",
                table: "Repositorios");

            migrationBuilder.DropIndex(
                name: "IX_Proyectos_PryClavePrefijo",
                table: "Proyectos");

            migrationBuilder.DropIndex(
                name: "IX_DocumentosMarkdown_DocCreadoPor",
                table: "DocumentosMarkdown");

            migrationBuilder.DropIndex(
                name: "IX_DocumentosMarkdown_DocRutaEsquema",
                table: "DocumentosMarkdown");

            migrationBuilder.AddColumn<Guid>(
                name: "RepUsuarioId",
                table: "Repositorios",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "PryPropietarioId",
                table: "Proyectos",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            // Datos existentes: cada proyecto queda para quien creó su primera tarea; si no tiene tareas, para el primer usuario registrado.
            // Cada repositorio queda para quien creó su primera rama; si no tiene ramas, para el primer usuario registrado.
            migrationBuilder.Sql("""
                DECLARE @PrimerUsuario UNIQUEIDENTIFIER = (SELECT TOP 1 UsuId FROM Usuarios ORDER BY UsuFechaCreacion);

                UPDATE p
                   SET PryPropietarioId = COALESCE(
                       (SELECT TOP 1 t.TarCreadoPor
                          FROM Tareas t
                          JOIN ListasTareas l ON l.LstId = t.TarListaTareaId
                         WHERE l.LstProyectoId = p.PryId
                         ORDER BY t.TarFechaCreacion),
                       @PrimerUsuario)
                  FROM Proyectos p;

                UPDATE r
                   SET RepUsuarioId = COALESCE(
                       (SELECT TOP 1 rt.RtkCreadoPor FROM RamasTicket rt WHERE rt.RtkRepositorioId = r.RepId ORDER BY rt.RtkFechaCreacion),
                       @PrimerUsuario)
                  FROM Repositorios r;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Repositorios_RepUsuarioId_RepPropietario_RepNombreRepositorio",
                table: "Repositorios",
                columns: new[] { "RepUsuarioId", "RepPropietario", "RepNombreRepositorio" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Proyectos_PryPropietarioId_PryClavePrefijo",
                table: "Proyectos",
                columns: new[] { "PryPropietarioId", "PryClavePrefijo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DocumentosMarkdown_DocCreadoPor_DocRutaEsquema",
                table: "DocumentosMarkdown",
                columns: new[] { "DocCreadoPor", "DocRutaEsquema" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Proyectos_Usuarios_PryPropietarioId",
                table: "Proyectos",
                column: "PryPropietarioId",
                principalTable: "Usuarios",
                principalColumn: "UsuId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Repositorios_Usuarios_RepUsuarioId",
                table: "Repositorios",
                column: "RepUsuarioId",
                principalTable: "Usuarios",
                principalColumn: "UsuId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Proyectos_Usuarios_PryPropietarioId",
                table: "Proyectos");

            migrationBuilder.DropForeignKey(
                name: "FK_Repositorios_Usuarios_RepUsuarioId",
                table: "Repositorios");

            migrationBuilder.DropIndex(
                name: "IX_Repositorios_RepUsuarioId_RepPropietario_RepNombreRepositorio",
                table: "Repositorios");

            migrationBuilder.DropIndex(
                name: "IX_Proyectos_PryPropietarioId_PryClavePrefijo",
                table: "Proyectos");

            migrationBuilder.DropIndex(
                name: "IX_DocumentosMarkdown_DocCreadoPor_DocRutaEsquema",
                table: "DocumentosMarkdown");

            migrationBuilder.DropColumn(
                name: "RepUsuarioId",
                table: "Repositorios");

            migrationBuilder.DropColumn(
                name: "PryPropietarioId",
                table: "Proyectos");

            migrationBuilder.CreateIndex(
                name: "IX_Repositorios_RepPropietario_RepNombreRepositorio",
                table: "Repositorios",
                columns: new[] { "RepPropietario", "RepNombreRepositorio" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Proyectos_PryClavePrefijo",
                table: "Proyectos",
                column: "PryClavePrefijo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DocumentosMarkdown_DocCreadoPor",
                table: "DocumentosMarkdown",
                column: "DocCreadoPor");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentosMarkdown_DocRutaEsquema",
                table: "DocumentosMarkdown",
                column: "DocRutaEsquema",
                unique: true);
        }
    }
}
