# Despliegue a producción (Azure App Service)

La API (.NET 8) y la web (React) se publican **juntas** en una sola Web App de Azure. `npm run build` deja la web compilada en `APIWeb/wwwroot` y la API la sirve en el mismo dominio que `/api` y `/hubs`.

## Datos del entorno

| Qué | Valor |
|---|---|
| URL | https://api-productividad-gtcrgdabf5bte7ez.westus3-01.azurewebsites.net |
| Web App | `api-productividad` (Windows, plan F1) |
| Grupo de recursos | `rg-developer.uno-1437` |
| Perfil de publicación | `APIWeb/Properties/PublishProfiles/api-productividad - Web Deploy.pubxml` |
| Credenciales Firebase (servidor) | `D:\home\site\secretos\firebase-productividad.json` |
| Kudu (consola del servidor) | Portal → Web App → Herramientas avanzadas → Ir |
| Logs en vivo | Portal → Web App → Supervisión → Secuencia de registro |

---

## Checklist rápido

```text
[ ] 1. Probar en local (build + tests + web)
[ ] 2. ¿Cambió la base de datos? → aplicar migración en producción
[ ] 3. ¿Hay configuración nueva? → crear variable en Azure
[ ] 4. npm run build (frontend → wwwroot)
[ ] 5. Publicar desde Visual Studio
[ ] 6. Verificar en la URL de producción
```

---

## 1. Probar en local

Desde `SolucionProductividad/`:

```powershell
dotnet build -c Release
dotnet test
```

Desde `frontend/`:

```powershell
npm run build
```

`npm run build` ejecuta `tsc -b` antes de Vite: si hay errores de TypeScript, no compila.

## 2. Cambios en la base de datos

Solo si modificaste entidades o el `ContextoProductividad`.

**Crear la migración** (en local, desde `SolucionProductividad/`):

```powershell
dotnet tool restore
dotnet ef migrations add NombreDelCambio --project src/Infraestructura/Persistencia
```

**Aplicarla en producción.** La fábrica de diseño lee la cadena de `PRODUCTIVIDAD_CADENA_CONEXION`:

```powershell
$env:PRODUCTIVIDAD_CADENA_CONEXION = "<cadena de producción>"
dotnet ef database update --project src/Infraestructura/Persistencia
Remove-Item Env:PRODUCTIVIDAD_CADENA_CONEXION
```

Alternativa más segura (revisar el SQL antes de ejecutarlo):

```powershell
dotnet ef migrations script --idempotent --project src/Infraestructura/Persistencia -o basedatos/migracion.sql
```

y ejecutar `migracion.sql` en SQL Server Management Studio / Azure Data Studio contra la base de producción.

**Orden recomendado:** migrar la base **antes** de publicar el código, siempre que el cambio sea compatible con la versión anterior (agregar tablas o columnas nullable). Si el cambio borra o renombra columnas, hazlo en dos publicaciones: primero el código que ya no las usa, después la migración que las elimina.

> Haz un respaldo de la base antes de cualquier migración que borre datos.

## 3. Configuración nueva

Si agregaste una sección nueva a `appsettings.json` con un **secreto** (clave, token, contraseña), no lo pongas en el archivo: créalo en Azure.

Portal → Web App → Configuración → Variables de entorno → **+ Agregar** → Aplicar.

- Los niveles del JSON se separan con `__` (dos guiones bajos): `Seccion:Clave` → `Seccion__Clave`.
- Arreglos: `Cors:OrigenesPermitidos[0]` → `Cors__OrigenesPermitidos__0`.
- Prioridad: variables de Azure > `appsettings.Production.json` > `appsettings.json`.

Variables actuales en Azure:

| Variable | Contenido |
|---|---|
| `ConnectionStrings__Productividad` | Cadena de SQL Server |
| `Jwt__LlaveFirma` | Llave de firma JWT |
| `Boveda__LlaveMaestraBase64` | Llave AES de la bóveda (**nunca cambiarla**: los secretos ya cifrados dejarían de leerse) |
| `Firebase__RutaCredenciales` | `D:\home\site\secretos\firebase-productividad.json` |
| `IA__ApiKey` | Clave de Gemini |
| `GitHub__Token` | Token fine-grained de GitHub |
| `Https__Redirigir` | `true` |

Guardar variables reinicia la app automáticamente.

## 4. Compilar la web

Desde `frontend/`:

```powershell
npm run build
```

Vacía y regenera `SolucionProductividad/src/Presentacion/APIWeb/wwwroot`. **Si te saltas este paso, se publica la web vieja** que haya quedado en `wwwroot`.

## 5. Publicar

En Visual Studio:

1. Configuración **Release**.
2. Clic derecho en `SolucionProductividad.APIWeb` → **Publicar**.
3. Perfil `api-productividad - Web Deploy` → **Publicar**.
4. Si aparece "Vuelva a escribir sus credenciales", inicia sesión de nuevo antes de publicar.

La publicación compila, sube los archivos y reinicia la app (la web queda caída unos segundos).

> `UpdateApiOnPublish` está en `false` en el `.pubxml`: evita que Visual Studio intente actualizar Azure API Management, que no se usa.

## 6. Verificar

1. Abrir la URL de producción (la primera carga tarda en el plan F1 porque la app "duerme").
2. Iniciar sesión.
3. Probar lo que cambiaste.
4. Si tocaste adjuntos, subir un archivo (valida Firebase).
5. Si hay errores: Portal → Supervisión → **Secuencia de registro**.

---

## Si algo sale mal

| Síntoma | Causa probable | Solución |
|---|---|---|
| `HTTP Error 500.30` al abrir el sitio | La app no arranca: falta una variable o está mal escrita (`ValidateOnStart`) | Revisar Secuencia de registro y el nombre de la variable (`__`) |
| La web se ve con la versión anterior | No se ejecutó `npm run build` antes de publicar | Compilar y volver a publicar; recargar con Ctrl+F5 |
| Error al subir archivos | JSON de Firebase no está en el servidor o la ruta no coincide | Revisar `D:\home\site\secretos` en Kudu y `Firebase__RutaCredenciales` |
| Error de SQL / columna inválida | Se publicó código sin aplicar la migración | Aplicar la migración (paso 2) |
| Notificaciones en tiempo real lentas | Web sockets desactivados | Configuración general → Web sockets: Activado |
| Publicación falla con BadRequest de API Management | Se reactivó `UpdateApiOnPublish` o la dependencia de APIM | Quitar la dependencia en Visual Studio / poner `false` en el `.pubxml` |

**Volver a la versión anterior:** no hay slots de despliegue en el plan F1, así que la forma de revertir es publicar de nuevo el código anterior. Conviene tener el proyecto en **git** y crear una etiqueta por cada publicación (`git tag v2026-09-26`) para poder volver a ella.

---

## Pendientes

- **.NET 8 deja de tener soporte el 10/11/2026.** Migrar a .NET 10 (LTS): `TargetFramework` → `net10.0`, paquetes `Microsoft.EntityFrameworkCore.*` y `Microsoft.AspNetCore.*` → 10.x, y cambiar la pila de la Web App a .NET 10 en Configuración general.
- Vaciar los secretos de `appsettings.Production.json` (ya están en las variables de Azure) para que no viajen en cada publicación.
- Plan F1: 60 min de CPU al día y la app se duerme. Para uso diario, subir a B1 y activar **Always On**.
