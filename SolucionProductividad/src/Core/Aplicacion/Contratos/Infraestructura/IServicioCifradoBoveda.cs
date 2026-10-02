namespace SolucionProductividad.Aplicacion.Contratos.Infraestructura;

public interface IServicioCifradoBoveda
{
    string CifrarTexto(string textoPlano);
    string DescifrarTexto(string textoCifrado);
}
