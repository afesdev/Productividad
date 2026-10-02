# Plataforma de Productividad

Monolito con Clean Architecture (.NET 8) + SPA en React/TypeScript. Tareas Kanban, matriz de Eisenhower, documentos Markdown con WikiLinks y backlinks, bóveda de secretos AES-256-GCM, adjuntos en Firebase Storage y analítica personal.

## Estructura

```text
SolucionProductividad/
├── src/Core/Dominio                  Entidades con [PrefijoTabla], enums, excepciones
├── src/Core/Aplicacion               CQRS (MediatR) por característica, validación (FluentValidation), contratos
├── src/Infraestructura/Persistencia  EF Core + convención de prefijos, consultas Dapper, Migraciones
├── src/Infraestructura/Servicios     Firebase Storage, AES-256-GCM, PBKDF2, JWT, motor de WikiLinks
├── src/Presentacion/APIWeb           Controladores, middleware de excepciones, hub SignalR
└── basedatos/esquema.sql             DDL idempotente generado desde la migración
frontend/src/
├── componentes/                      UI reutilizable, CargadorImagenesPega, PaletaComandos
├── caracteristicas/                  autenticacion, proyectos, tareas (MatrizEisenhower), analitica (TableroAnalitica)
├── servicios/                        Axios, sesión en memoria, SignalR
└── paginas/
```

Regla del esquema: cada columna lleva el prefijo de 3 letras de su tabla en PascalCase y sin separador (`TarTitulo`, `UsuCorreo`, `TckEstado`). Se aplica una sola vez en `ContextoProductividad.AplicarConvencionPrefijos` a partir del atributo `[PrefijoTabla]` de cada entidad; una prueba automática falla si alguna columna no la cumple.

Tablas de autenticación añadidas al esquema original: `Usuarios (Usu)`, `Roles (Rol)`, `UsuariosRoles (Uro)`, `TokensRefresco (Tkr)`. Cada usuario tiene correo y nombre de usuario únicos, y puede iniciar sesión con cualquiera de los dos. El primer usuario registrado recibe el rol **Administrador**; los demás, **Miembro**.

## Puesta en marcha

1. Secretos de desarrollo (fuera del repositorio, en user-secrets):

   ```bash
   dotnet user-secrets set "Jwt:LlaveFirma" "<al menos 32 caracteres aleatorios>" --project SolucionProductividad/src/Presentacion/APIWeb
   dotnet user-secrets set "Boveda:LlaveMaestraBase64" "<32 bytes en Base64>" --project SolucionProductividad/src/Presentacion/APIWeb
   ```

   > La llave de la bóveda no se puede recuperar: si se pierde, los secretos guardados quedan ilegibles. Respáldala en un gestor de contraseñas.

2. Base de datos: ajusta `ConnectionStrings:Productividad` en `appsettings.json` y aplica la migración:

   ```bash
   dotnet tool restore
   dotnet ef database update --project src/Infraestructura/Persistencia
   ```

   (o ejecuta `basedatos/esquema.sql` en SQL Server).

3. Firebase Storage: crea una cuenta de servicio con acceso al bucket y configura `Firebase:NombreBucket` y `Firebase:RutaCredenciales` (JSON fuera del repositorio). Sin esto, todo funciona salvo la subida de archivos.

4. Ejecutar:

   ```bash
   dotnet run --project SolucionProductividad/src/Presentacion/APIWeb --launch-profile http
   npm run dev --prefix frontend
   ```

   Frontend en http://localhost:5173 (Vite hace proxy de `/api` y `/hubs` a http://localhost:5080). Swagger en http://localhost:5080/swagger.

## Tickets y GitHub

Flujo: Nuevo → Asignado → En análisis → En desarrollo → En revisión (PR a `Desarrollo`) → En pruebas → Aprobado → En producción → Cerrado (con Pendiente del cliente, Devuelto y Cancelado). Las transiciones válidas están en `MaquinaEstadosTicket`; cada acción queda en el historial.

La integración con GitHub es de **solo lectura**: la app nunca crea ramas, PRs ni commits (`ServicioGitHub` solo hace GET). Las ramas y PRs se crean fuera (git, IDE, web) y la app los **detecta**:

- **Detectar ramas** busca en los repositorios registrados las ramas que siguen la convención del equipo `Tipo/NombreDesarrollador-Ticket{NºExterno}-Asunto` (ej. `Ajuste/AndresEspitia-Ticket1468-AjusteMenuEnDispositivos`, sin confundir 1468 con 14680); sin Nº externo se usa la clave interna (`TCK-1042`). La app sugiere el nombre y también permite vincular por nombre exacto. Reglas en `ConvencionRamas`.
- **Sincronizar** trae archivos modificados (con diff), commits y el PR de la rama hacia cualquier destino. Al detectar un PR abierto, el ticket pasa a revisión.

Token: con repos propios o de una organización basta un *fine-grained* con Contents, Pull requests y Metadata en **lectura**. Para repos privados de otra cuenta donde eres colaborador hace falta un token *classic* con scope `repo` (GitHub no ofrece uno de solo lectura para repos privados; la app sigue sin escribir):

```bash
dotnet user-secrets set "GitHub:Token" "ghp_..." --project SolucionProductividad/src/Presentacion/APIWeb
```

Los repositorios se registran en **Tickets → Repositorios**.

## Pruebas

```bash
dotnet test SolucionProductividad/tests/Pruebas
```

Unitarias (dominio, cifrado, hash) e integración de manejadores contra SQL Server real: cada ejecución crea una base `ProductividadPruebas_<guid>` en `(localdb)\MSSQLLocalDB` con las migraciones y la elimina al terminar. Otro servidor: variable `PRODUCTIVIDAD_PRUEBAS_SERVIDOR`.

## Seguridad

- Token de acceso JWT de 15 min guardado solo en memoria; token de refresco en cookie HttpOnly `SameSite=Strict`, rotado en cada uso y con detección de reutilización (revoca todas las sesiones).
- Contraseñas con PBKDF2-SHA256 (600.000 iteraciones); límite de 10 intentos/min por IP en autenticación.
- Bóveda: solo el creador o un Administrador revela/modifica; las revelaciones se auditan en el log (sin el valor).
- Adjuntos: lista blanca de tipos (sin SVG/HTML), 15 MB máximo, rutas con GUID.

## WikiLinks

`[[TCK-1001]]` ticket · `[[WEB-105]]` o `[[#105]]` tarea · `[[Título]]` o `[[ruta/del/doc]]` documento · `[[destino|texto]]` alias.
