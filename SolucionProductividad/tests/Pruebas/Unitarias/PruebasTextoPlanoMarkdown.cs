using SolucionProductividad.Aplicacion.Comun.Utilidades;

namespace SolucionProductividad.Pruebas.Unitarias;

public class PruebasTextoPlanoMarkdown
{
    [Theory]
    [InlineData("**9:00** - Revisión para ver el certificado de consultas de integracion y procedimiento del ticket 1377 punto 2",
        "9:00 - Revisión para ver el certificado de consultas de integracion y procedimiento del ticket 1377 punto 2")]
    [InlineData("Ajuste de *web config* y __pruebas__", "Ajuste de web config y pruebas")]
    [InlineData("Revisar [[TCK-1377]] y [[Guía de despliegue|la guía]]", "Revisar TCK-1377 y la guía")]
    [InlineData("Ver [el PR](https://github.com/x/y/pull/1) en `main`", "Ver el PR en main")]
    [InlineData("~~Descartado~~ ==importante==", "Descartado importante")]
    [InlineData("- [ ] Llamar al cliente", "Llamar al cliente")]
    [InlineData("## Reunión de cierre", "Reunión de cierre")]
    [InlineData("Renombrar mi_variable_larga", "Renombrar mi_variable_larga")]
    [InlineData(@"Precio 5 \* 3", "Precio 5 * 3")]
    [InlineData("Texto sin formato", "Texto sin formato")]
    public void Quita_el_formato_markdown(string markdown, string esperado) =>
        Assert.Equal(esperado, TextoPlanoMarkdown.Convertir(markdown));
}
