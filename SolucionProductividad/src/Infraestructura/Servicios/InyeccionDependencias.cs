using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Servicios.Almacenamiento;
using SolucionProductividad.Servicios.Calendario;
using SolucionProductividad.Servicios.GitHub;
using SolucionProductividad.Servicios.IA;
using SolucionProductividad.Servicios.Opciones;
using SolucionProductividad.Servicios.Reporte;
using SolucionProductividad.Servicios.Seguridad;
using SolucionProductividad.Servicios.Trello;
using SolucionProductividad.Servicios.WikiLinks;

namespace SolucionProductividad.Servicios;

public static class InyeccionDependencias
{
    public static IServiceCollection AgregarServiciosInfraestructura(this IServiceCollection servicios, IConfiguration configuracion)
    {
        servicios.AddOptions<OpcionesFirebase>().Bind(configuracion.GetSection(OpcionesFirebase.Seccion));
        servicios.AddOptions<OpcionesBoveda>().Bind(configuracion.GetSection(OpcionesBoveda.Seccion)).ValidateDataAnnotations().ValidateOnStart();
        servicios.AddOptions<OpcionesJwt>().Bind(configuracion.GetSection(OpcionesJwt.Seccion)).ValidateDataAnnotations().ValidateOnStart();

        servicios.AddOptions<OpcionesGitHub>().Bind(configuracion.GetSection(OpcionesGitHub.Seccion));
        servicios.AddHttpClient<IServicioGitHub, ServicioGitHub>(cliente => cliente.Timeout = TimeSpan.FromSeconds(30));

        servicios.AddOptions<OpcionesIA>().Bind(configuracion.GetSection(OpcionesIA.Seccion));
        servicios.AddHttpClient<IServicioIA, ServicioIA>(cliente => cliente.Timeout = TimeSpan.FromSeconds(120));

        // Calendario ICS de Outlook: sin redirecciones automáticas (el servicio valida cada salto) y con tope de tamaño.
        servicios.AddMemoryCache();
        servicios.AddHttpClient<IServicioCalendarioIcs, ServicioCalendarioIcs>(cliente =>
            {
                cliente.Timeout = TimeSpan.FromSeconds(30);
                cliente.MaxResponseContentBufferSize = 15 * 1024 * 1024;
            })
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });

        // Trello (solo lectura, token por usuario). Comparte la caché en memoria con el calendario.
        servicios.AddOptions<OpcionesTrello>().Bind(configuracion.GetSection(OpcionesTrello.Seccion));
        servicios.AddHttpClient<IServicioTrello, ServicioTrello>(cliente =>
        {
            cliente.Timeout = TimeSpan.FromSeconds(30);
            cliente.MaxResponseContentBufferSize = 20 * 1024 * 1024;
        });

        servicios.AddSingleton<IServicioAlmacenamientoFirebase, ServicioAlmacenamientoFirebase>();
        servicios.AddSingleton<IServicioCifradoBoveda, ServicioCifradoBoveda>();
        servicios.AddSingleton<IGeneradorExcelReporte, GeneradorExcelReporte>();
        servicios.AddSingleton<IServicioHashContrasena, ServicioHashContrasena>();
        servicios.AddSingleton<IServicioTokensJwt, ServicioTokensJwt>();
        servicios.AddScoped<IServicioProcesadorBacklinks, ServicioProcesadorBacklinks>();

        return servicios;
    }
}
