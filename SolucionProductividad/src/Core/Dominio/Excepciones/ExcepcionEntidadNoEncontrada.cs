namespace SolucionProductividad.Dominio.Excepciones;

public class ExcepcionEntidadNoEncontrada : ExcepcionDominio
{
    public ExcepcionEntidadNoEncontrada(string nombreEntidad, object identificador)
        : base($"No se encontró {nombreEntidad} con identificador '{identificador}'.") { }
}
