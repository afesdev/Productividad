using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolucionProductividad.Persistencia.Migraciones
{
    /// <inheritdoc />
    public partial class LimiteResolucionSoloVencimiento : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // El límite de resolución deja de calcularse con el SLA: solo vence el ticket con fecha de vencimiento.
            migrationBuilder.Sql("UPDATE [Tickets] SET [TckFechaLimiteResolucion] = [TckFechaVencimiento];");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Los límites calculados por el SLA no se reconstruyen.
        }
    }
}
