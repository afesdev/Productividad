using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Scalar.AspNetCore;
using SolucionProductividad.APIWeb.Hubs;
using SolucionProductividad.APIWeb.Middlewares;
using SolucionProductividad.APIWeb.Seguridad;
using SolucionProductividad.APIWeb.Serializacion;
using SolucionProductividad.Aplicacion;
using SolucionProductividad.Aplicacion.Contratos.Infraestructura;
using SolucionProductividad.Aplicacion.Contratos.Seguridad;
using SolucionProductividad.Persistencia;
using SolucionProductividad.Servicios;
using SolucionProductividad.Servicios.Opciones;

var constructor = WebApplication.CreateBuilder(args);
var configuracion = constructor.Configuration;

// ---------- Capas ----------
constructor.Services
    .AgregarAplicacion()
    .AgregarPersistencia(configuracion)
    .AgregarServiciosInfraestructura(configuracion);

constructor.Services.AddHttpContextAccessor();
constructor.Services.AddScoped<IServicioUsuarioActual, ServicioUsuarioActual>();
constructor.Services.AddSingleton<INotificadorTiempoReal, NotificadorSignalR>();
// SignalR usa su propio serializador: mismas reglas que la API (enums como texto, fechas UTC con "Z").
constructor.Services.AddSignalR().AddJsonProtocol(opciones =>
{
    opciones.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    opciones.PayloadSerializerOptions.Converters.Add(new ConvertidorFechaUtcJson());
});

// ---------- Autenticación JWT ----------
var opcionesJwt = configuracion.GetSection(OpcionesJwt.Seccion).Get<OpcionesJwt>() ?? new OpcionesJwt();
constructor.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opciones =>
    {
        opciones.MapInboundClaims = false;
        opciones.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = opcionesJwt.Emisor,
            ValidateAudience = true,
            ValidAudience = opcionesJwt.Audiencia,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(opcionesJwt.LlaveFirma)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "name",
            RoleClaimType = "role"
        };
        // SignalR envía el token por query string en WebSockets.
        opciones.Events = new JwtBearerEvents
        {
            OnMessageReceived = contexto =>
            {
                var tokenAcceso = contexto.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(tokenAcceso) && contexto.HttpContext.Request.Path.StartsWithSegments(HubNotificaciones.Ruta))
                    contexto.Token = tokenAcceso;
                return Task.CompletedTask;
            }
        };
    });

// Todo endpoint exige sesión salvo los marcados con [AllowAnonymous].
constructor.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

// ---------- Límite de intentos en autenticación (fuerza bruta) ----------
constructor.Services.AddRateLimiter(opciones =>
{
    opciones.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    opciones.AddPolicy("autenticacion", contexto => RateLimitPartition.GetFixedWindowLimiter(
        contexto.Connection.RemoteIpAddress?.ToString() ?? "desconocido",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    // La IA consume la cuota del proveedor: límite por usuario.
    opciones.AddPolicy("ia", contexto => RateLimitPartition.GetFixedWindowLimiter(
        contexto.User.FindFirst("sub")?.Value ?? contexto.Connection.RemoteIpAddress?.ToString() ?? "desconocido",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});

// ---------- CORS (solo necesario si el frontend no usa el proxy de Vite) ----------
var origenesPermitidos = configuracion.GetSection("Cors:OrigenesPermitidos").Get<string[]>() ?? ["http://localhost:5173"];
constructor.Services.AddCors(opciones => opciones.AddDefaultPolicy(politica => politica
    .WithOrigins(origenesPermitidos)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

// ---------- MVC + Swagger ----------
constructor.Services.AddRouting(opciones => opciones.LowercaseUrls = true);
constructor.Services
    .AddControllers()
    .AddJsonOptions(opciones =>
    {
        opciones.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        opciones.JsonSerializerOptions.Converters.Add(new ConvertidorFechaUtcJson());
    });
constructor.Services.AddEndpointsApiExplorer();
constructor.Services.AddSwaggerGen(opciones =>
{
    opciones.SwaggerDoc("v1", new OpenApiInfo { Title = "API Productividad", Version = "v1" });
    opciones.CustomSchemaIds(tipo => tipo.FullName?.Replace('+', '.'));
    var esquemaBearer = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
    };
    opciones.AddSecurityDefinition("Bearer", esquemaBearer);
    opciones.AddSecurityRequirement(new OpenApiSecurityRequirement { [esquemaBearer] = Array.Empty<string>() });
});

var aplicacion = constructor.Build();

// Falla al arrancar (y no en la primera petición) si la llave AES no es válida.
aplicacion.Services.GetRequiredService<IServicioCifradoBoveda>();

aplicacion.UseMiddleware<MiddlewareManejoExcepciones>();

// Sirve la SPA compilada (wwwroot) en el mismo sitio: /api y /hubs conviven con la web sin CORS ni proxy.
// En desarrollo la web va por Vite; wwwroot suele estar vacío y esto no molesta.
aplicacion.UseDefaultFiles();
aplicacion.UseStaticFiles();

if (aplicacion.Environment.IsDevelopment())
{
    // Swashbuckle genera el documento OpenAPI; Scalar lo presenta en /scalar/v1.
    aplicacion.UseSwagger(opciones => opciones.RouteTemplate = "openapi/{documentName}.json");
}
else
{
    aplicacion.UseHsts();
    // Solo redirige a https si se configura (IIS local suele servir solo http). Actívalo con "Https:Redirigir": true.
    if (configuracion.GetValue("Https:Redirigir", false))
        aplicacion.UseHttpsRedirection();
}

aplicacion.UseCors();
aplicacion.UseAuthentication();
aplicacion.UseAuthorization();
aplicacion.UseRateLimiter();

aplicacion.MapControllers();
aplicacion.MapHub<HubNotificaciones>(HubNotificaciones.Ruta);

// Cualquier ruta no-API (rutas del enrutador de React) devuelve index.html.
// AllowAnonymous: la política por defecto exige sesión y bloquearía la carga inicial de la web.
aplicacion.MapFallbackToFile("index.html").AllowAnonymous();

if (aplicacion.Environment.IsDevelopment())
{
    // AllowAnonymous: la política por defecto exige sesión y bloquearía la documentación.
    aplicacion.MapScalarApiReference(opciones => opciones
            .WithTitle("API Productividad")
            .AddPreferredSecuritySchemes(new[] { "Bearer" }))
        .AllowAnonymous();
}

aplicacion.Run();
