using System.Reflection;
using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Autenticacion.Comandos;
using SolucionProductividad.Aplicacion.Comun.Excepciones;
using SolucionProductividad.Dominio.Comun;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasAutenticacionYEsquema
{
    private readonly BaseDatosPrueba _baseDatos;

    public PruebasAutenticacionYEsquema(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    [Fact]
    public void Todas_las_columnas_usan_el_prefijo_de_su_tabla_sin_separador()
    {
        using var contexto = _baseDatos.CrearContexto();

        foreach (var tipoEntidad in contexto.Model.GetEntityTypes())
        {
            var prefijo = tipoEntidad.ClrType.GetCustomAttribute<PrefijoTablaAttribute>()!.Prefijo;
            Assert.Matches("^[A-Z][a-z]{2}$", prefijo);

            foreach (var propiedad in tipoEntidad.GetProperties())
            {
                var columna = propiedad.GetColumnName();
                Assert.Equal(prefijo + propiedad.Name, columna);
                Assert.DoesNotContain("_", columna);
            }
        }
    }

    [Fact]
    public async Task Registro_con_nombre_de_usuario_permite_iniciar_sesion_con_correo_o_usuario()
    {
        var usuarioAuxiliar = await _baseDatos.CrearUsuarioAsync();
        using var escenario = _baseDatos.CrearEscenario(usuarioAuxiliar);
        var sufijo = Guid.NewGuid().ToString("N")[..8];

        var registro = await escenario.EnviarAsync(new RegistrarUsuarioComando($"Ana.{sufijo}@Prueba.com", $"@Ana.{sufijo}", "Ana Prueba", "Clave12345"));
        Assert.Equal($"ana.{sufijo}", registro.Usuario.NombreUsuario);
        Assert.Equal($"ana.{sufijo}@prueba.com", registro.Usuario.Correo);

        var porUsuario = await escenario.EnviarAsync(new IniciarSesionComando($"ANA.{sufijo}", "Clave12345"));
        var porCorreo = await escenario.EnviarAsync(new IniciarSesionComando($"ana.{sufijo}@prueba.com", "Clave12345"));
        Assert.Equal(registro.Usuario.Id, porUsuario.Usuario.Id);
        Assert.Equal(registro.Usuario.Id, porCorreo.Usuario.Id);

        await Assert.ThrowsAsync<ExcepcionNoAutorizado>(() => escenario.EnviarAsync(new IniciarSesionComando($"ana.{sufijo}", "Incorrecta1")));
    }

    [Fact]
    public async Task No_se_repiten_nombre_de_usuario_ni_correo()
    {
        var usuarioAuxiliar = await _baseDatos.CrearUsuarioAsync();
        using var escenario = _baseDatos.CrearEscenario(usuarioAuxiliar);
        var sufijo = Guid.NewGuid().ToString("N")[..8];
        await escenario.EnviarAsync(new RegistrarUsuarioComando($"a{sufijo}@prueba.com", $"dev{sufijo}", "Dev Uno", "Clave12345"));

        var usuarioRepetido = await Assert.ThrowsAsync<ExcepcionConflicto>(() =>
            escenario.EnviarAsync(new RegistrarUsuarioComando($"b{sufijo}@prueba.com", $"DEV{sufijo}", "Dev Dos", "Clave12345")));
        Assert.Contains("nombre de usuario", usuarioRepetido.Message);

        await Assert.ThrowsAsync<ExcepcionConflicto>(() =>
            escenario.EnviarAsync(new RegistrarUsuarioComando($"a{sufijo}@prueba.com", $"otro{sufijo}", "Dev Tres", "Clave12345")));
    }

    [Theory]
    [InlineData("ab")]
    [InlineData("con espacio")]
    [InlineData("correo@invalido")]
    [InlineData(".empieza-con-punto")]
    public async Task Nombre_de_usuario_invalido_falla_la_validacion(string nombreUsuario)
    {
        var usuarioAuxiliar = await _baseDatos.CrearUsuarioAsync();
        using var escenario = _baseDatos.CrearEscenario(usuarioAuxiliar);

        var excepcion = await Assert.ThrowsAsync<ExcepcionValidacion>(() =>
            escenario.EnviarAsync(new RegistrarUsuarioComando($"{Guid.NewGuid():N}@prueba.com", nombreUsuario, "Nombre", "Clave12345")));
        Assert.Contains(nameof(RegistrarUsuarioComando.NombreUsuario), excepcion.Errores.Keys);
    }

    [Fact]
    public async Task La_migracion_crea_columnas_con_la_nueva_convencion()
    {
        await using var contexto = _baseDatos.CrearContexto();
        var columnas = await contexto.Database
            .SqlQueryRaw<string>("SELECT COLUMN_NAME AS Value FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Usuarios'")
            .ToListAsync();

        Assert.Contains("UsuCorreo", columnas);
        Assert.Contains("UsuNombreUsuario", columnas);
        Assert.DoesNotContain(columnas, columna => columna.Contains('_'));
    }
}
