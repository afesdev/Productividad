namespace SolucionProductividad.Dominio.Comun;

/// <summary>
/// Define el prefijo de 3 letras que se antepone a cada columna de la tabla, sin separador (ej. TarTitulo, UsuCorreo).
/// El prefijo se normaliza a PascalCase: "TAR", "tar" o "Tar" producen "Tar".
/// </summary>
[AttributeUsage(AttributeTargets.Class, Inherited = false)]
public sealed class PrefijoTablaAttribute : Attribute
{
    public PrefijoTablaAttribute(string nombreTabla, string prefijo)
    {
        if (prefijo.Length != 3 || !prefijo.All(char.IsLetter))
            throw new ArgumentException("El prefijo de tabla debe tener exactamente 3 letras.", nameof(prefijo));

        NombreTabla = nombreTabla;
        Prefijo = char.ToUpperInvariant(prefijo[0]) + prefijo[1..].ToLowerInvariant();
    }

    public string NombreTabla { get; }
    public string Prefijo { get; }
}
