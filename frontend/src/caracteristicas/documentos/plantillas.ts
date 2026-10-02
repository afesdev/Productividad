export interface PlantillaDocumento {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  /** Título que se propone si el documento aún no tiene uno. */
  titulo: string;
  markdown: string;
}

/** Plantillas de documentación técnica. Usan los bloques del editor: callouts, desplegables, diagramas, tablas y tareas. */
export const plantillasDocumento: PlantillaDocumento[] = [
  {
    id: 'decision',
    nombre: 'Decisión técnica (ADR)',
    descripcion: 'Contexto, opciones evaluadas y por qué se eligió una',
    icono: '🧭',
    titulo: 'ADR: ',
    markdown: `> [!NOTE]
> **Estado:** Propuesta · **Fecha:** · **Responsable:**

## Contexto

¿Qué problema o necesidad obliga a decidir? Restricciones, requisitos y situación actual.

## Opciones evaluadas

| Opción | Ventajas | Desventajas |
| --- | --- | --- |
| A |  |  |
| B |  |  |

## Decisión

Elegimos **…** porque …

## Consecuencias

- Positivas:
- Negativas o riesgos:
- Tareas que se derivan:

> [!DETALLES]- Referencias
> Enlaces a tickets, documentos o discusiones: [[…]]`,
  },
  {
    id: 'runbook',
    nombre: 'Runbook / procedimiento',
    descripcion: 'Pasos operativos repetibles con verificación y reversa',
    icono: '🛠️',
    titulo: 'Runbook: ',
    markdown: `## Cuándo usarlo

Situación o alerta que dispara este procedimiento.

> [!WARNING]
> Requisitos previos: accesos, ventana de mantenimiento, respaldo reciente.

## Pasos

1. Paso uno.
2. Paso dos.
3. Paso tres.

\`\`\`bash
# Comandos del procedimiento
\`\`\`

## Verificación

- [ ] El servicio responde.
- [ ] Los registros no muestran errores.

## Reversa

> [!CAUTION]
> Cómo deshacer los cambios si algo sale mal.

## Contactos

| Rol | Persona | Canal |
| --- | --- | --- |
| Responsable |  |  |`,
  },
  {
    id: 'postmortem',
    nombre: 'Postmortem de incidente',
    descripcion: 'Qué pasó, impacto, causa raíz y acciones',
    icono: '🐛',
    titulo: 'Postmortem: ',
    markdown: `> [!NOTE]
> **Severidad:** · **Inicio:** · **Resolución:** · **Ticket:** [[…]]

## Resumen

Qué pasó en dos o tres líneas.

## Impacto

Usuarios, clientes o sistemas afectados, y durante cuánto tiempo.

## Línea de tiempo

| Hora | Evento |
| --- | --- |
|  | Se detecta el problema |
|  | Se aplica la mitigación |
|  | Servicio normalizado |

## Causa raíz

\`\`\`mermaid
flowchart LR
  A[Cambio o evento] --> B[Falla]
  B --> C[Impacto]
\`\`\`

## Qué funcionó y qué no

- Funcionó:
- No funcionó:

## Acciones

- [ ] Acción correctiva — responsable — fecha
- [ ] Acción preventiva — responsable — fecha`,
  },
  {
    id: 'despliegue',
    nombre: 'Guía de despliegue',
    descripcion: 'Checklist antes, durante y después de publicar',
    icono: '🚀',
    titulo: 'Despliegue: ',
    markdown: `## Alcance

Versión, tickets incluidos y ambientes: [[…]]

> [!WARNING]
> Confirma el respaldo de la base de datos y la ventana de mantenimiento.

## Antes

- [ ] Pruebas aprobadas en Desarrollo
- [ ] Migraciones revisadas
- [ ] Configuración y secretos del ambiente actualizados

## Pasos

\`\`\`bash
# Comandos de publicación
\`\`\`

## Después

- [ ] Verificación funcional
- [ ] Monitoreo de errores durante 30 minutos
- [ ] Aviso a los interesados

> [!CAUTION]
> **Plan de reversa:** cómo volver a la versión anterior.`,
  },
  {
    id: 'manual',
    nombre: 'Manual de usuario',
    descripcion: 'Explica una funcionalidad paso a paso',
    icono: '📘',
    titulo: 'Manual: ',
    markdown: `## ¿Para qué sirve?

Describe la funcionalidad y quién la usa.

## Requisitos

- Permisos necesarios:
- Datos previos:

## Paso a paso

1. Ingresa a …
2. Selecciona …
3. Guarda …

> [!TIP]
> Atajos o buenas prácticas para trabajar más rápido.

## Preguntas frecuentes

> [!DETALLES]- ¿Qué hago si aparece un error?
> Describe la solución o a quién contactar.`,
  },
  {
    id: 'solucion-ticket',
    nombre: 'Solución de ticket',
    descripcion: 'Análisis, cambios aplicados y cómo probarlo',
    icono: '🎫',
    titulo: 'Solución: ',
    markdown: `> [!NOTE]
> **Ticket:** [[…]] · **Rama:** \`…\` · **Proyecto:**

## Problema reportado

Qué reportó el usuario y cómo se reproduce.

## Análisis

Causa encontrada.

## Solución aplicada

- Archivo o componente modificado y por qué.

## Cómo probarlo

- [ ] Caso principal
- [ ] Casos borde

> [!WARNING]
> Consideraciones para producción (migraciones, configuración, datos).`,
  },
  {
    id: 'reunion',
    nombre: 'Acta de reunión',
    descripcion: 'Asistentes, acuerdos y pendientes',
    icono: '🗒️',
    titulo: 'Reunión: ',
    markdown: `**Fecha:** · **Asistentes:**

## Temas

1. Tema uno
2. Tema dos

## Acuerdos

- Acuerdo

## Pendientes

- [ ] Pendiente — responsable — fecha`,
  },
];
