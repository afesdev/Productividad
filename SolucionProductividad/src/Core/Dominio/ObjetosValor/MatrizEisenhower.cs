using SolucionProductividad.Dominio.Enumeraciones;

namespace SolucionProductividad.Dominio.ObjetosValor;

/// <summary>
/// Traduce entre las banderas (EsUrgente, EsImportante) y el cuadrante de la Matriz de Eisenhower.
/// </summary>
public static class MatrizEisenhower
{
    public static CuadranteEisenhower ObtenerCuadrante(bool esUrgente, bool esImportante) => (esUrgente, esImportante) switch
    {
        (true, true) => CuadranteEisenhower.Hacer,
        (false, true) => CuadranteEisenhower.Programar,
        (true, false) => CuadranteEisenhower.Delegar,
        _ => CuadranteEisenhower.Eliminar
    };

    public static (bool EsUrgente, bool EsImportante) ObtenerBanderas(CuadranteEisenhower cuadrante) => cuadrante switch
    {
        CuadranteEisenhower.Hacer => (true, true),
        CuadranteEisenhower.Programar => (false, true),
        CuadranteEisenhower.Delegar => (true, false),
        _ => (false, false)
    };
}
