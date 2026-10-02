IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [ColasSoporte] (
        [CLA_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [CLA_Nombre] nvarchar(100) NOT NULL,
        [CLA_Descripcion] nvarchar(250) NULL,
        [CLA_EstaActiva] bit NOT NULL,
        CONSTRAINT [PK_ColasSoporte] PRIMARY KEY ([CLA_Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [PoliticasSla] (
        [SLA_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [SLA_Nombre] nvarchar(100) NOT NULL,
        [SLA_MinutosPrimeraRespuesta] int NOT NULL,
        [SLA_MinutosResolucion] int NOT NULL,
        [SLA_EstaActiva] bit NOT NULL,
        CONSTRAINT [PK_PoliticasSla] PRIMARY KEY ([SLA_Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [Proyectos] (
        [PRY_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [PRY_Nombre] nvarchar(100) NOT NULL,
        [PRY_ClavePrefijo] nvarchar(10) NOT NULL,
        [PRY_Descripcion] nvarchar(500) NULL,
        [PRY_FechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_Proyectos] PRIMARY KEY ([PRY_Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [ReferenciasEntidades] (
        [REF_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [REF_TipoOrigen] varchar(30) NOT NULL,
        [REF_OrigenId] uniqueidentifier NOT NULL,
        [REF_TipoDestino] varchar(30) NOT NULL,
        [REF_DestinoId] uniqueidentifier NOT NULL,
        [REF_FechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_ReferenciasEntidades] PRIMARY KEY ([REF_Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [Roles] (
        [ROL_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [ROL_Nombre] nvarchar(50) NOT NULL,
        [ROL_Descripcion] nvarchar(250) NULL,
        [ROL_FechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_Roles] PRIMARY KEY ([ROL_Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [Usuarios] (
        [USR_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [USR_Correo] nvarchar(256) NOT NULL,
        [USR_NombreCompleto] nvarchar(150) NOT NULL,
        [USR_HashContrasena] varchar(200) NOT NULL,
        [USR_EstaActivo] bit NOT NULL,
        [USR_FechaUltimoAcceso] datetime2 NULL,
        [USR_FechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [USR_FechaActualizacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_Usuarios] PRIMARY KEY ([USR_Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [Carpetas] (
        [CRP_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [CRP_ProyectoId] uniqueidentifier NOT NULL,
        [CRP_Nombre] nvarchar(100) NOT NULL,
        [CRP_Icono] nvarchar(50) NULL,
        [CRP_IndiceOrden] int NOT NULL,
        [CRP_FechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_Carpetas] PRIMARY KEY ([CRP_Id]),
        CONSTRAINT [FK_Carpetas_Proyectos_CRP_ProyectoId] FOREIGN KEY ([CRP_ProyectoId]) REFERENCES [Proyectos] ([PRY_Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [BovedaSecretos] (
        [BVD_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [BVD_ProyectoId] uniqueidentifier NULL,
        [BVD_Entorno] varchar(20) NOT NULL,
        [BVD_NombreClave] nvarchar(150) NOT NULL,
        [BVD_ValorCifrado] nvarchar(max) NOT NULL,
        [BVD_Descripcion] nvarchar(250) NULL,
        [BVD_CreadoPor] uniqueidentifier NOT NULL,
        [BVD_FechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [BVD_FechaActualizacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_BovedaSecretos] PRIMARY KEY ([BVD_Id]),
        CONSTRAINT [FK_BovedaSecretos_Proyectos_BVD_ProyectoId] FOREIGN KEY ([BVD_ProyectoId]) REFERENCES [Proyectos] ([PRY_Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_BovedaSecretos_Usuarios_BVD_CreadoPor] FOREIGN KEY ([BVD_CreadoPor]) REFERENCES [Usuarios] ([USR_Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [DocumentosMarkdown] (
        [DOC_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [DOC_ProyectoId] uniqueidentifier NULL,
        [DOC_DocumentoPadreId] uniqueidentifier NULL,
        [DOC_Titulo] nvarchar(200) NOT NULL,
        [DOC_RutaEsquema] nvarchar(220) NOT NULL,
        [DOC_ContenidoMarkdown] nvarchar(max) NOT NULL,
        [DOC_Icono] nvarchar(50) NULL,
        [DOC_EstaArchivado] bit NOT NULL,
        [DOC_CreadoPor] uniqueidentifier NOT NULL,
        [DOC_FechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [DOC_FechaActualizacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_DocumentosMarkdown] PRIMARY KEY ([DOC_Id]),
        CONSTRAINT [FK_DocumentosMarkdown_DocumentosMarkdown_DOC_DocumentoPadreId] FOREIGN KEY ([DOC_DocumentoPadreId]) REFERENCES [DocumentosMarkdown] ([DOC_Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_DocumentosMarkdown_Proyectos_DOC_ProyectoId] FOREIGN KEY ([DOC_ProyectoId]) REFERENCES [Proyectos] ([PRY_Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_DocumentosMarkdown_Usuarios_DOC_CreadoPor] FOREIGN KEY ([DOC_CreadoPor]) REFERENCES [Usuarios] ([USR_Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [Marcadores] (
        [MRC_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [MRC_UsuarioId] uniqueidentifier NOT NULL,
        [MRC_TipoEntidad] varchar(30) NOT NULL,
        [MRC_EntidadId] uniqueidentifier NOT NULL,
        [MRC_Titulo] nvarchar(200) NOT NULL,
        [MRC_IndiceOrden] int NOT NULL,
        [MRC_FechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_Marcadores] PRIMARY KEY ([MRC_Id]),
        CONSTRAINT [FK_Marcadores_Usuarios_MRC_UsuarioId] FOREIGN KEY ([MRC_UsuarioId]) REFERENCES [Usuarios] ([USR_Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [RegistrosDiarios] (
        [LOG_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [LOG_UsuarioId] uniqueidentifier NOT NULL,
        [LOG_FechaLog] date NOT NULL,
        [LOG_ContenidoMarkdown] nvarchar(max) NOT NULL,
        [LOG_FechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [LOG_FechaActualizacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_RegistrosDiarios] PRIMARY KEY ([LOG_Id]),
        CONSTRAINT [FK_RegistrosDiarios_Usuarios_LOG_UsuarioId] FOREIGN KEY ([LOG_UsuarioId]) REFERENCES [Usuarios] ([USR_Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [TokensRefresco] (
        [TKR_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [TKR_UsuarioId] uniqueidentifier NOT NULL,
        [TKR_TokenHash] varchar(128) NOT NULL,
        [TKR_FechaExpiracion] datetime2 NOT NULL,
        [TKR_FechaRevocacion] datetime2 NULL,
        [TKR_FechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_TokensRefresco] PRIMARY KEY ([TKR_Id]),
        CONSTRAINT [FK_TokensRefresco_Usuarios_TKR_UsuarioId] FOREIGN KEY ([TKR_UsuarioId]) REFERENCES [Usuarios] ([USR_Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [UsuariosRoles] (
        [URO_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [URO_UsuarioId] uniqueidentifier NOT NULL,
        [URO_RolId] uniqueidentifier NOT NULL,
        [URO_FechaAsignacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_UsuariosRoles] PRIMARY KEY ([URO_Id]),
        CONSTRAINT [FK_UsuariosRoles_Roles_URO_RolId] FOREIGN KEY ([URO_RolId]) REFERENCES [Roles] ([ROL_Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_UsuariosRoles_Usuarios_URO_UsuarioId] FOREIGN KEY ([URO_UsuarioId]) REFERENCES [Usuarios] ([USR_Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [ListasTareas] (
        [LST_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [LST_CarpetaId] uniqueidentifier NULL,
        [LST_ProyectoId] uniqueidentifier NOT NULL,
        [LST_Nombre] nvarchar(100) NOT NULL,
        [LST_IndiceOrden] int NOT NULL,
        [LST_FechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_ListasTareas] PRIMARY KEY ([LST_Id]),
        CONSTRAINT [FK_ListasTareas_Carpetas_LST_CarpetaId] FOREIGN KEY ([LST_CarpetaId]) REFERENCES [Carpetas] ([CRP_Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_ListasTareas_Proyectos_LST_ProyectoId] FOREIGN KEY ([LST_ProyectoId]) REFERENCES [Proyectos] ([PRY_Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [Tareas] (
        [TAR_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [TAR_ListaTareaId] uniqueidentifier NOT NULL,
        [TAR_TareaPadreId] uniqueidentifier NULL,
        [TAR_NumeroTarea] int NOT NULL IDENTITY(100, 1),
        [TAR_Titulo] nvarchar(200) NOT NULL,
        [TAR_DescripcionMarkdown] nvarchar(max) NULL,
        [TAR_Estado] varchar(30) NOT NULL,
        [TAR_Prioridad] varchar(20) NOT NULL,
        [TAR_EsUrgente] bit NOT NULL,
        [TAR_EsImportante] bit NOT NULL,
        [TAR_FechaVencimiento] datetime2 NULL,
        [TAR_HorasEstimadas] decimal(5,2) NULL,
        [TAR_IndiceOrden] int NOT NULL,
        [TAR_CreadoPor] uniqueidentifier NOT NULL,
        [TAR_FechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [TAR_FechaActualizacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_Tareas] PRIMARY KEY ([TAR_Id]),
        CONSTRAINT [FK_Tareas_ListasTareas_TAR_ListaTareaId] FOREIGN KEY ([TAR_ListaTareaId]) REFERENCES [ListasTareas] ([LST_Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Tareas_Tareas_TAR_TareaPadreId] FOREIGN KEY ([TAR_TareaPadreId]) REFERENCES [Tareas] ([TAR_Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Tareas_Usuarios_TAR_CreadoPor] FOREIGN KEY ([TAR_CreadoPor]) REFERENCES [Usuarios] ([USR_Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [RegistrosTiempo] (
        [RGT_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [RGT_TareaId] uniqueidentifier NOT NULL,
        [RGT_UsuarioId] uniqueidentifier NOT NULL,
        [RGT_FechaInicio] datetime2 NOT NULL,
        [RGT_FechaFin] datetime2 NULL,
        [RGT_MinutosTranscurridos] AS DATEDIFF(MINUTE, [RGT_FechaInicio], [RGT_FechaFin]),
        [RGT_Descripcion] nvarchar(250) NULL,
        CONSTRAINT [PK_RegistrosTiempo] PRIMARY KEY ([RGT_Id]),
        CONSTRAINT [FK_RegistrosTiempo_Tareas_RGT_TareaId] FOREIGN KEY ([RGT_TareaId]) REFERENCES [Tareas] ([TAR_Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_RegistrosTiempo_Usuarios_RGT_UsuarioId] FOREIGN KEY ([RGT_UsuarioId]) REFERENCES [Usuarios] ([USR_Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [Tickets] (
        [TCK_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [TCK_NumeroTicket] int NOT NULL IDENTITY(1000, 1),
        [TCK_ColaSoporteId] uniqueidentifier NOT NULL,
        [TCK_PoliticaSlaId] uniqueidentifier NULL,
        [TCK_TareaRelacionadaId] uniqueidentifier NULL,
        [TCK_CorreoSolicitante] nvarchar(256) NOT NULL,
        [TCK_NombreSolicitante] nvarchar(150) NOT NULL,
        [TCK_Asunto] nvarchar(250) NOT NULL,
        [TCK_Estado] varchar(30) NOT NULL,
        [TCK_Prioridad] varchar(20) NOT NULL,
        [TCK_AgenteAsignadoId] uniqueidentifier NULL,
        [TCK_FechaLimitePrimeraRespuesta] datetime2 NULL,
        [TCK_FechaLimiteResolucion] datetime2 NULL,
        [TCK_FechaPrimeraRespuesta] datetime2 NULL,
        [TCK_FechaResolucion] datetime2 NULL,
        [TCK_FechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [TCK_FechaActualizacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_Tickets] PRIMARY KEY ([TCK_Id]),
        CONSTRAINT [FK_Tickets_ColasSoporte_TCK_ColaSoporteId] FOREIGN KEY ([TCK_ColaSoporteId]) REFERENCES [ColasSoporte] ([CLA_Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Tickets_PoliticasSla_TCK_PoliticaSlaId] FOREIGN KEY ([TCK_PoliticaSlaId]) REFERENCES [PoliticasSla] ([SLA_Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Tickets_Tareas_TCK_TareaRelacionadaId] FOREIGN KEY ([TCK_TareaRelacionadaId]) REFERENCES [Tareas] ([TAR_Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Tickets_Usuarios_TCK_AgenteAsignadoId] FOREIGN KEY ([TCK_AgenteAsignadoId]) REFERENCES [Usuarios] ([USR_Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [MensajesTicket] (
        [MSG_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [MSG_TicketId] uniqueidentifier NOT NULL,
        [MSG_CorreoRemitente] nvarchar(256) NOT NULL,
        [MSG_NombreRemitente] nvarchar(150) NOT NULL,
        [MSG_EsNotaInterna] bit NOT NULL,
        [MSG_CuerpoMensaje] nvarchar(max) NOT NULL,
        [MSG_FechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_MensajesTicket] PRIMARY KEY ([MSG_Id]),
        CONSTRAINT [FK_MensajesTicket_Tickets_MSG_TicketId] FOREIGN KEY ([MSG_TicketId]) REFERENCES [Tickets] ([TCK_Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE TABLE [ArchivosAdjuntos] (
        [ADJ_Id] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [ADJ_NombreArchivo] nvarchar(255) NOT NULL,
        [ADJ_TipoContenido] nvarchar(100) NOT NULL,
        [ADJ_TamanoEnBytes] bigint NOT NULL,
        [ADJ_RutaFirebaseStorage] nvarchar(500) NOT NULL,
        [ADJ_UrlDescarga] nvarchar(1000) NOT NULL,
        [ADJ_TareaId] uniqueidentifier NULL,
        [ADJ_MensajeTicketId] uniqueidentifier NULL,
        [ADJ_DocumentoId] uniqueidentifier NULL,
        [ADJ_RegistroDiarioId] uniqueidentifier NULL,
        [ADJ_SubidoPor] uniqueidentifier NOT NULL,
        [ADJ_FechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_ArchivosAdjuntos] PRIMARY KEY ([ADJ_Id]),
        CONSTRAINT [FK_ArchivosAdjuntos_DocumentosMarkdown_ADJ_DocumentoId] FOREIGN KEY ([ADJ_DocumentoId]) REFERENCES [DocumentosMarkdown] ([DOC_Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ArchivosAdjuntos_MensajesTicket_ADJ_MensajeTicketId] FOREIGN KEY ([ADJ_MensajeTicketId]) REFERENCES [MensajesTicket] ([MSG_Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ArchivosAdjuntos_RegistrosDiarios_ADJ_RegistroDiarioId] FOREIGN KEY ([ADJ_RegistroDiarioId]) REFERENCES [RegistrosDiarios] ([LOG_Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ArchivosAdjuntos_Tareas_ADJ_TareaId] FOREIGN KEY ([ADJ_TareaId]) REFERENCES [Tareas] ([TAR_Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ArchivosAdjuntos_Usuarios_ADJ_SubidoPor] FOREIGN KEY ([ADJ_SubidoPor]) REFERENCES [Usuarios] ([USR_Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'ROL_Id', N'ROL_Descripcion', N'ROL_FechaCreacion', N'ROL_Nombre') AND [object_id] = OBJECT_ID(N'[Roles]'))
        SET IDENTITY_INSERT [Roles] ON;
    EXEC(N'INSERT INTO [Roles] ([ROL_Id], [ROL_Descripcion], [ROL_FechaCreacion], [ROL_Nombre])
    VALUES (''7a1f0a4e-0c1b-4a8e-9f59-1d0a6b1e0001'', N''Acceso total, gestión de usuarios y roles.'', ''2026-01-01T00:00:00.0000000Z'', N''Administrador''),
    (''7a1f0a4e-0c1b-4a8e-9f59-1d0a6b1e0002'', N''Atiende tickets de soporte.'', ''2026-01-01T00:00:00.0000000Z'', N''Agente''),
    (''7a1f0a4e-0c1b-4a8e-9f59-1d0a6b1e0003'', N''Gestiona sus tareas, documentos y bóveda.'', ''2026-01-01T00:00:00.0000000Z'', N''Miembro'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'ROL_Id', N'ROL_Descripcion', N'ROL_FechaCreacion', N'ROL_Nombre') AND [object_id] = OBJECT_ID(N'[Roles]'))
        SET IDENTITY_INSERT [Roles] OFF;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_ArchivosAdjuntos_ADJ_DocumentoId] ON [ArchivosAdjuntos] ([ADJ_DocumentoId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_ArchivosAdjuntos_ADJ_MensajeTicketId] ON [ArchivosAdjuntos] ([ADJ_MensajeTicketId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_ArchivosAdjuntos_ADJ_RegistroDiarioId] ON [ArchivosAdjuntos] ([ADJ_RegistroDiarioId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_ArchivosAdjuntos_ADJ_SubidoPor] ON [ArchivosAdjuntos] ([ADJ_SubidoPor]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_ArchivosAdjuntos_ADJ_TareaId] ON [ArchivosAdjuntos] ([ADJ_TareaId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_BovedaSecretos_BVD_CreadoPor] ON [BovedaSecretos] ([BVD_CreadoPor]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE UNIQUE INDEX [IX_BovedaSecretos_BVD_ProyectoId_BVD_Entorno_BVD_NombreClave] ON [BovedaSecretos] ([BVD_ProyectoId], [BVD_Entorno], [BVD_NombreClave]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_Carpetas_CRP_ProyectoId] ON [Carpetas] ([CRP_ProyectoId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_DocumentosMarkdown_DOC_CreadoPor] ON [DocumentosMarkdown] ([DOC_CreadoPor]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_DocumentosMarkdown_DOC_DocumentoPadreId] ON [DocumentosMarkdown] ([DOC_DocumentoPadreId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_DocumentosMarkdown_DOC_ProyectoId] ON [DocumentosMarkdown] ([DOC_ProyectoId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DocumentosMarkdown_DOC_RutaEsquema] ON [DocumentosMarkdown] ([DOC_RutaEsquema]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_DocumentosMarkdown_DOC_Titulo] ON [DocumentosMarkdown] ([DOC_Titulo]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_ListasTareas_LST_CarpetaId] ON [ListasTareas] ([LST_CarpetaId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_ListasTareas_LST_ProyectoId] ON [ListasTareas] ([LST_ProyectoId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Marcadores_MRC_UsuarioId_MRC_TipoEntidad_MRC_EntidadId] ON [Marcadores] ([MRC_UsuarioId], [MRC_TipoEntidad], [MRC_EntidadId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_MensajesTicket_MSG_TicketId] ON [MensajesTicket] ([MSG_TicketId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Proyectos_PRY_ClavePrefijo] ON [Proyectos] ([PRY_ClavePrefijo]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_ReferenciasEntidades_REF_TipoDestino_REF_DestinoId] ON [ReferenciasEntidades] ([REF_TipoDestino], [REF_DestinoId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_ReferenciasEntidades_REF_TipoOrigen_REF_OrigenId] ON [ReferenciasEntidades] ([REF_TipoOrigen], [REF_OrigenId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE UNIQUE INDEX [UQ_Usuario_FechaLog] ON [RegistrosDiarios] ([LOG_UsuarioId], [LOG_FechaLog]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_RegistrosTiempo_RGT_TareaId] ON [RegistrosTiempo] ([RGT_TareaId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_RegistrosTiempo_RGT_UsuarioId_RGT_FechaInicio] ON [RegistrosTiempo] ([RGT_UsuarioId], [RGT_FechaInicio]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Roles_ROL_Nombre] ON [Roles] ([ROL_Nombre]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_Tareas_TAR_CreadoPor] ON [Tareas] ([TAR_CreadoPor]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_Tareas_TAR_ListaTareaId_TAR_IndiceOrden] ON [Tareas] ([TAR_ListaTareaId], [TAR_IndiceOrden]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Tareas_TAR_NumeroTarea] ON [Tareas] ([TAR_NumeroTarea]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_Tareas_TAR_TareaPadreId] ON [Tareas] ([TAR_TareaPadreId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_Tickets_TCK_AgenteAsignadoId_TCK_Estado] ON [Tickets] ([TCK_AgenteAsignadoId], [TCK_Estado]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_Tickets_TCK_ColaSoporteId] ON [Tickets] ([TCK_ColaSoporteId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Tickets_TCK_NumeroTicket] ON [Tickets] ([TCK_NumeroTicket]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_Tickets_TCK_PoliticaSlaId] ON [Tickets] ([TCK_PoliticaSlaId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_Tickets_TCK_TareaRelacionadaId] ON [Tickets] ([TCK_TareaRelacionadaId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE UNIQUE INDEX [IX_TokensRefresco_TKR_TokenHash] ON [TokensRefresco] ([TKR_TokenHash]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_TokensRefresco_TKR_UsuarioId] ON [TokensRefresco] ([TKR_UsuarioId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Usuarios_USR_Correo] ON [Usuarios] ([USR_Correo]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE INDEX [IX_UsuariosRoles_URO_RolId] ON [UsuariosRoles] ([URO_RolId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UsuariosRoles_URO_UsuarioId_URO_RolId] ON [UsuariosRoles] ([URO_UsuarioId], [URO_RolId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924012242_EsquemaInicial'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260924012242_EsquemaInicial', N'8.0.11');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [ArchivosAdjuntos] DROP CONSTRAINT [FK_ArchivosAdjuntos_DocumentosMarkdown_ADJ_DocumentoId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [ArchivosAdjuntos] DROP CONSTRAINT [FK_ArchivosAdjuntos_MensajesTicket_ADJ_MensajeTicketId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [ArchivosAdjuntos] DROP CONSTRAINT [FK_ArchivosAdjuntos_RegistrosDiarios_ADJ_RegistroDiarioId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [ArchivosAdjuntos] DROP CONSTRAINT [FK_ArchivosAdjuntos_Tareas_ADJ_TareaId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [ArchivosAdjuntos] DROP CONSTRAINT [FK_ArchivosAdjuntos_Usuarios_ADJ_SubidoPor];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [BovedaSecretos] DROP CONSTRAINT [FK_BovedaSecretos_Proyectos_BVD_ProyectoId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [BovedaSecretos] DROP CONSTRAINT [FK_BovedaSecretos_Usuarios_BVD_CreadoPor];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Carpetas] DROP CONSTRAINT [FK_Carpetas_Proyectos_CRP_ProyectoId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [DocumentosMarkdown] DROP CONSTRAINT [FK_DocumentosMarkdown_DocumentosMarkdown_DOC_DocumentoPadreId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [DocumentosMarkdown] DROP CONSTRAINT [FK_DocumentosMarkdown_Proyectos_DOC_ProyectoId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [DocumentosMarkdown] DROP CONSTRAINT [FK_DocumentosMarkdown_Usuarios_DOC_CreadoPor];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [ListasTareas] DROP CONSTRAINT [FK_ListasTareas_Carpetas_LST_CarpetaId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [ListasTareas] DROP CONSTRAINT [FK_ListasTareas_Proyectos_LST_ProyectoId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Marcadores] DROP CONSTRAINT [FK_Marcadores_Usuarios_MRC_UsuarioId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [MensajesTicket] DROP CONSTRAINT [FK_MensajesTicket_Tickets_MSG_TicketId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [RegistrosDiarios] DROP CONSTRAINT [FK_RegistrosDiarios_Usuarios_LOG_UsuarioId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [RegistrosTiempo] DROP CONSTRAINT [FK_RegistrosTiempo_Tareas_RGT_TareaId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [RegistrosTiempo] DROP CONSTRAINT [FK_RegistrosTiempo_Usuarios_RGT_UsuarioId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Tareas] DROP CONSTRAINT [FK_Tareas_ListasTareas_TAR_ListaTareaId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Tareas] DROP CONSTRAINT [FK_Tareas_Tareas_TAR_TareaPadreId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Tareas] DROP CONSTRAINT [FK_Tareas_Usuarios_TAR_CreadoPor];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Tickets] DROP CONSTRAINT [FK_Tickets_ColasSoporte_TCK_ColaSoporteId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Tickets] DROP CONSTRAINT [FK_Tickets_PoliticasSla_TCK_PoliticaSlaId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Tickets] DROP CONSTRAINT [FK_Tickets_Tareas_TCK_TareaRelacionadaId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Tickets] DROP CONSTRAINT [FK_Tickets_Usuarios_TCK_AgenteAsignadoId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [TokensRefresco] DROP CONSTRAINT [FK_TokensRefresco_Usuarios_TKR_UsuarioId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [UsuariosRoles] DROP CONSTRAINT [FK_UsuariosRoles_Roles_URO_RolId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [UsuariosRoles] DROP CONSTRAINT [FK_UsuariosRoles_Usuarios_URO_UsuarioId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[UsuariosRoles].[URO_UsuarioId]', N'UroUsuarioId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[UsuariosRoles].[URO_RolId]', N'UroRolId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[UsuariosRoles].[URO_FechaAsignacion]', N'UroFechaAsignacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[UsuariosRoles].[URO_Id]', N'UroId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[UsuariosRoles].[IX_UsuariosRoles_URO_UsuarioId_URO_RolId]', N'IX_UsuariosRoles_UroUsuarioId_UroRolId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[UsuariosRoles].[IX_UsuariosRoles_URO_RolId]', N'IX_UsuariosRoles_UroRolId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Usuarios].[USR_NombreCompleto]', N'UsuNombreCompleto', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Usuarios].[USR_HashContrasena]', N'UsuHashContrasena', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Usuarios].[USR_FechaUltimoAcceso]', N'UsuFechaUltimoAcceso', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Usuarios].[USR_FechaCreacion]', N'UsuFechaCreacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Usuarios].[USR_FechaActualizacion]', N'UsuFechaActualizacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Usuarios].[USR_EstaActivo]', N'UsuEstaActivo', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Usuarios].[USR_Correo]', N'UsuCorreo', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Usuarios].[USR_Id]', N'UsuId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Usuarios].[IX_Usuarios_USR_Correo]', N'IX_Usuarios_UsuCorreo', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[TokensRefresco].[TKR_UsuarioId]', N'TkrUsuarioId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[TokensRefresco].[TKR_TokenHash]', N'TkrTokenHash', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[TokensRefresco].[TKR_FechaRevocacion]', N'TkrFechaRevocacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[TokensRefresco].[TKR_FechaExpiracion]', N'TkrFechaExpiracion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[TokensRefresco].[TKR_FechaCreacion]', N'TkrFechaCreacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[TokensRefresco].[TKR_Id]', N'TkrId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[TokensRefresco].[IX_TokensRefresco_TKR_UsuarioId]', N'IX_TokensRefresco_TkrUsuarioId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[TokensRefresco].[IX_TokensRefresco_TKR_TokenHash]', N'IX_TokensRefresco_TkrTokenHash', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[TCK_TareaRelacionadaId]', N'TckTareaRelacionadaId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[TCK_Prioridad]', N'TckPrioridad', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[TCK_PoliticaSlaId]', N'TckPoliticaSlaId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[TCK_NumeroTicket]', N'TckNumeroTicket', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[TCK_NombreSolicitante]', N'TckNombreSolicitante', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[TCK_FechaResolucion]', N'TckFechaResolucion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[TCK_FechaPrimeraRespuesta]', N'TckFechaPrimeraRespuesta', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[TCK_FechaLimiteResolucion]', N'TckFechaLimiteResolucion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[TCK_FechaLimitePrimeraRespuesta]', N'TckFechaLimitePrimeraRespuesta', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[TCK_FechaCreacion]', N'TckFechaCreacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[TCK_FechaActualizacion]', N'TckFechaActualizacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[TCK_Estado]', N'TckEstado', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[TCK_CorreoSolicitante]', N'TckCorreoSolicitante', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[TCK_ColaSoporteId]', N'TckColaSoporteId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[TCK_Asunto]', N'TckAsunto', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[TCK_AgenteAsignadoId]', N'TckAgenteAsignadoId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[TCK_Id]', N'TckId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[IX_Tickets_TCK_TareaRelacionadaId]', N'IX_Tickets_TckTareaRelacionadaId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[IX_Tickets_TCK_PoliticaSlaId]', N'IX_Tickets_TckPoliticaSlaId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[IX_Tickets_TCK_NumeroTicket]', N'IX_Tickets_TckNumeroTicket', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[IX_Tickets_TCK_ColaSoporteId]', N'IX_Tickets_TckColaSoporteId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tickets].[IX_Tickets_TCK_AgenteAsignadoId_TCK_Estado]', N'IX_Tickets_TckAgenteAsignadoId_TckEstado', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[TAR_Titulo]', N'TarTitulo', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[TAR_TareaPadreId]', N'TarTareaPadreId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[TAR_Prioridad]', N'TarPrioridad', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[TAR_NumeroTarea]', N'TarNumeroTarea', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[TAR_ListaTareaId]', N'TarListaTareaId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[TAR_IndiceOrden]', N'TarIndiceOrden', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[TAR_HorasEstimadas]', N'TarHorasEstimadas', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[TAR_FechaVencimiento]', N'TarFechaVencimiento', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[TAR_FechaCreacion]', N'TarFechaCreacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[TAR_FechaActualizacion]', N'TarFechaActualizacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[TAR_Estado]', N'TarEstado', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[TAR_EsUrgente]', N'TarEsUrgente', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[TAR_EsImportante]', N'TarEsImportante', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[TAR_DescripcionMarkdown]', N'TarDescripcionMarkdown', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[TAR_CreadoPor]', N'TarCreadoPor', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[TAR_Id]', N'TarId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[IX_Tareas_TAR_TareaPadreId]', N'IX_Tareas_TarTareaPadreId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[IX_Tareas_TAR_NumeroTarea]', N'IX_Tareas_TarNumeroTarea', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[IX_Tareas_TAR_ListaTareaId_TAR_IndiceOrden]', N'IX_Tareas_TarListaTareaId_TarIndiceOrden', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Tareas].[IX_Tareas_TAR_CreadoPor]', N'IX_Tareas_TarCreadoPor', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Roles].[ROL_Nombre]', N'RolNombre', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Roles].[ROL_FechaCreacion]', N'RolFechaCreacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Roles].[ROL_Descripcion]', N'RolDescripcion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Roles].[ROL_Id]', N'RolId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Roles].[IX_Roles_ROL_Nombre]', N'IX_Roles_RolNombre', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[RegistrosTiempo].[RGT_UsuarioId]', N'RgtUsuarioId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[RegistrosTiempo].[RGT_TareaId]', N'RgtTareaId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    DECLARE @var0 sysname;
    SELECT @var0 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[RegistrosTiempo]') AND [c].[name] = N'RGT_MinutosTranscurridos');
    IF @var0 IS NOT NULL EXEC(N'ALTER TABLE [RegistrosTiempo] DROP CONSTRAINT [' + @var0 + '];');
    ALTER TABLE [RegistrosTiempo] DROP COLUMN [RGT_MinutosTranscurridos];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[RegistrosTiempo].[RGT_FechaInicio]', N'RgtFechaInicio', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[RegistrosTiempo].[RGT_FechaFin]', N'RgtFechaFin', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[RegistrosTiempo].[RGT_Descripcion]', N'RgtDescripcion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[RegistrosTiempo].[RGT_Id]', N'RgtId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[RegistrosTiempo].[IX_RegistrosTiempo_RGT_UsuarioId_RGT_FechaInicio]', N'IX_RegistrosTiempo_RgtUsuarioId_RgtFechaInicio', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[RegistrosTiempo].[IX_RegistrosTiempo_RGT_TareaId]', N'IX_RegistrosTiempo_RgtTareaId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[RegistrosDiarios].[LOG_UsuarioId]', N'LogUsuarioId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[RegistrosDiarios].[LOG_FechaLog]', N'LogFechaLog', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[RegistrosDiarios].[LOG_FechaCreacion]', N'LogFechaCreacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[RegistrosDiarios].[LOG_FechaActualizacion]', N'LogFechaActualizacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[RegistrosDiarios].[LOG_ContenidoMarkdown]', N'LogContenidoMarkdown', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[RegistrosDiarios].[LOG_Id]', N'LogId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ReferenciasEntidades].[REF_TipoOrigen]', N'RefTipoOrigen', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ReferenciasEntidades].[REF_TipoDestino]', N'RefTipoDestino', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ReferenciasEntidades].[REF_OrigenId]', N'RefOrigenId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ReferenciasEntidades].[REF_FechaCreacion]', N'RefFechaCreacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ReferenciasEntidades].[REF_DestinoId]', N'RefDestinoId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ReferenciasEntidades].[REF_Id]', N'RefId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ReferenciasEntidades].[IX_ReferenciasEntidades_REF_TipoOrigen_REF_OrigenId]', N'IX_ReferenciasEntidades_RefTipoOrigen_RefOrigenId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ReferenciasEntidades].[IX_ReferenciasEntidades_REF_TipoDestino_REF_DestinoId]', N'IX_ReferenciasEntidades_RefTipoDestino_RefDestinoId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Proyectos].[PRY_Nombre]', N'PryNombre', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Proyectos].[PRY_FechaCreacion]', N'PryFechaCreacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Proyectos].[PRY_Descripcion]', N'PryDescripcion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Proyectos].[PRY_ClavePrefijo]', N'PryClavePrefijo', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Proyectos].[PRY_Id]', N'PryId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Proyectos].[IX_Proyectos_PRY_ClavePrefijo]', N'IX_Proyectos_PryClavePrefijo', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[PoliticasSla].[SLA_Nombre]', N'SlaNombre', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[PoliticasSla].[SLA_MinutosResolucion]', N'SlaMinutosResolucion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[PoliticasSla].[SLA_MinutosPrimeraRespuesta]', N'SlaMinutosPrimeraRespuesta', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[PoliticasSla].[SLA_EstaActiva]', N'SlaEstaActiva', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[PoliticasSla].[SLA_Id]', N'SlaId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[MensajesTicket].[MSG_TicketId]', N'MsgTicketId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[MensajesTicket].[MSG_NombreRemitente]', N'MsgNombreRemitente', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[MensajesTicket].[MSG_FechaCreacion]', N'MsgFechaCreacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[MensajesTicket].[MSG_EsNotaInterna]', N'MsgEsNotaInterna', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[MensajesTicket].[MSG_CuerpoMensaje]', N'MsgCuerpoMensaje', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[MensajesTicket].[MSG_CorreoRemitente]', N'MsgCorreoRemitente', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[MensajesTicket].[MSG_Id]', N'MsgId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[MensajesTicket].[IX_MensajesTicket_MSG_TicketId]', N'IX_MensajesTicket_MsgTicketId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Marcadores].[MRC_UsuarioId]', N'MrcUsuarioId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Marcadores].[MRC_Titulo]', N'MrcTitulo', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Marcadores].[MRC_TipoEntidad]', N'MrcTipoEntidad', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Marcadores].[MRC_IndiceOrden]', N'MrcIndiceOrden', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Marcadores].[MRC_FechaCreacion]', N'MrcFechaCreacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Marcadores].[MRC_EntidadId]', N'MrcEntidadId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Marcadores].[MRC_Id]', N'MrcId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Marcadores].[IX_Marcadores_MRC_UsuarioId_MRC_TipoEntidad_MRC_EntidadId]', N'IX_Marcadores_MrcUsuarioId_MrcTipoEntidad_MrcEntidadId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ListasTareas].[LST_ProyectoId]', N'LstProyectoId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ListasTareas].[LST_Nombre]', N'LstNombre', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ListasTareas].[LST_IndiceOrden]', N'LstIndiceOrden', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ListasTareas].[LST_FechaCreacion]', N'LstFechaCreacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ListasTareas].[LST_CarpetaId]', N'LstCarpetaId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ListasTareas].[LST_Id]', N'LstId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ListasTareas].[IX_ListasTareas_LST_ProyectoId]', N'IX_ListasTareas_LstProyectoId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ListasTareas].[IX_ListasTareas_LST_CarpetaId]', N'IX_ListasTareas_LstCarpetaId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[DocumentosMarkdown].[DOC_Titulo]', N'DocTitulo', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[DocumentosMarkdown].[DOC_RutaEsquema]', N'DocRutaEsquema', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[DocumentosMarkdown].[DOC_ProyectoId]', N'DocProyectoId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[DocumentosMarkdown].[DOC_Icono]', N'DocIcono', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[DocumentosMarkdown].[DOC_FechaCreacion]', N'DocFechaCreacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[DocumentosMarkdown].[DOC_FechaActualizacion]', N'DocFechaActualizacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[DocumentosMarkdown].[DOC_EstaArchivado]', N'DocEstaArchivado', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[DocumentosMarkdown].[DOC_DocumentoPadreId]', N'DocDocumentoPadreId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[DocumentosMarkdown].[DOC_CreadoPor]', N'DocCreadoPor', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[DocumentosMarkdown].[DOC_ContenidoMarkdown]', N'DocContenidoMarkdown', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[DocumentosMarkdown].[DOC_Id]', N'DocId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[DocumentosMarkdown].[IX_DocumentosMarkdown_DOC_Titulo]', N'IX_DocumentosMarkdown_DocTitulo', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[DocumentosMarkdown].[IX_DocumentosMarkdown_DOC_RutaEsquema]', N'IX_DocumentosMarkdown_DocRutaEsquema', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[DocumentosMarkdown].[IX_DocumentosMarkdown_DOC_ProyectoId]', N'IX_DocumentosMarkdown_DocProyectoId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[DocumentosMarkdown].[IX_DocumentosMarkdown_DOC_DocumentoPadreId]', N'IX_DocumentosMarkdown_DocDocumentoPadreId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[DocumentosMarkdown].[IX_DocumentosMarkdown_DOC_CreadoPor]', N'IX_DocumentosMarkdown_DocCreadoPor', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ColasSoporte].[CLA_Nombre]', N'ClaNombre', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ColasSoporte].[CLA_EstaActiva]', N'ClaEstaActiva', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ColasSoporte].[CLA_Descripcion]', N'ClaDescripcion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ColasSoporte].[CLA_Id]', N'ClaId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Carpetas].[CRP_ProyectoId]', N'CrpProyectoId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Carpetas].[CRP_Nombre]', N'CrpNombre', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Carpetas].[CRP_IndiceOrden]', N'CrpIndiceOrden', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Carpetas].[CRP_Icono]', N'CrpIcono', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Carpetas].[CRP_FechaCreacion]', N'CrpFechaCreacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Carpetas].[CRP_Id]', N'CrpId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[Carpetas].[IX_Carpetas_CRP_ProyectoId]', N'IX_Carpetas_CrpProyectoId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[BovedaSecretos].[BVD_ValorCifrado]', N'BvdValorCifrado', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[BovedaSecretos].[BVD_ProyectoId]', N'BvdProyectoId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[BovedaSecretos].[BVD_NombreClave]', N'BvdNombreClave', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[BovedaSecretos].[BVD_FechaCreacion]', N'BvdFechaCreacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[BovedaSecretos].[BVD_FechaActualizacion]', N'BvdFechaActualizacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[BovedaSecretos].[BVD_Entorno]', N'BvdEntorno', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[BovedaSecretos].[BVD_Descripcion]', N'BvdDescripcion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[BovedaSecretos].[BVD_CreadoPor]', N'BvdCreadoPor', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[BovedaSecretos].[BVD_Id]', N'BvdId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[BovedaSecretos].[IX_BovedaSecretos_BVD_ProyectoId_BVD_Entorno_BVD_NombreClave]', N'IX_BovedaSecretos_BvdProyectoId_BvdEntorno_BvdNombreClave', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[BovedaSecretos].[IX_BovedaSecretos_BVD_CreadoPor]', N'IX_BovedaSecretos_BvdCreadoPor', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ArchivosAdjuntos].[ADJ_UrlDescarga]', N'AdjUrlDescarga', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ArchivosAdjuntos].[ADJ_TipoContenido]', N'AdjTipoContenido', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ArchivosAdjuntos].[ADJ_TareaId]', N'AdjTareaId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ArchivosAdjuntos].[ADJ_TamanoEnBytes]', N'AdjTamanoEnBytes', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ArchivosAdjuntos].[ADJ_SubidoPor]', N'AdjSubidoPor', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ArchivosAdjuntos].[ADJ_RutaFirebaseStorage]', N'AdjRutaFirebaseStorage', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ArchivosAdjuntos].[ADJ_RegistroDiarioId]', N'AdjRegistroDiarioId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ArchivosAdjuntos].[ADJ_NombreArchivo]', N'AdjNombreArchivo', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ArchivosAdjuntos].[ADJ_MensajeTicketId]', N'AdjMensajeTicketId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ArchivosAdjuntos].[ADJ_FechaCreacion]', N'AdjFechaCreacion', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ArchivosAdjuntos].[ADJ_DocumentoId]', N'AdjDocumentoId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ArchivosAdjuntos].[ADJ_Id]', N'AdjId', N'COLUMN';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ArchivosAdjuntos].[IX_ArchivosAdjuntos_ADJ_TareaId]', N'IX_ArchivosAdjuntos_AdjTareaId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ArchivosAdjuntos].[IX_ArchivosAdjuntos_ADJ_SubidoPor]', N'IX_ArchivosAdjuntos_AdjSubidoPor', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ArchivosAdjuntos].[IX_ArchivosAdjuntos_ADJ_RegistroDiarioId]', N'IX_ArchivosAdjuntos_AdjRegistroDiarioId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ArchivosAdjuntos].[IX_ArchivosAdjuntos_ADJ_MensajeTicketId]', N'IX_ArchivosAdjuntos_AdjMensajeTicketId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC sp_rename N'[ArchivosAdjuntos].[IX_ArchivosAdjuntos_ADJ_DocumentoId]', N'IX_ArchivosAdjuntos_AdjDocumentoId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Usuarios] ADD [UsuNombreUsuario] nvarchar(30) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    EXEC(N'ALTER TABLE [RegistrosTiempo] ADD [RgtMinutosTranscurridos] AS DATEDIFF(MINUTE, [RgtFechaInicio], [RgtFechaFin])');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    UPDATE Usuarios
       SET UsuNombreUsuario = LOWER(LEFT(LEFT(UsuCorreo, CHARINDEX('@', UsuCorreo + '@') - 1), 25)
                                    + '.' + LEFT(REPLACE(CONVERT(VARCHAR(36), UsuId), '-', ''), 4))
     WHERE UsuNombreUsuario = '';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Usuarios_UsuNombreUsuario] ON [Usuarios] ([UsuNombreUsuario]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [ArchivosAdjuntos] ADD CONSTRAINT [FK_ArchivosAdjuntos_DocumentosMarkdown_AdjDocumentoId] FOREIGN KEY ([AdjDocumentoId]) REFERENCES [DocumentosMarkdown] ([DocId]) ON DELETE CASCADE;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [ArchivosAdjuntos] ADD CONSTRAINT [FK_ArchivosAdjuntos_MensajesTicket_AdjMensajeTicketId] FOREIGN KEY ([AdjMensajeTicketId]) REFERENCES [MensajesTicket] ([MsgId]) ON DELETE CASCADE;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [ArchivosAdjuntos] ADD CONSTRAINT [FK_ArchivosAdjuntos_RegistrosDiarios_AdjRegistroDiarioId] FOREIGN KEY ([AdjRegistroDiarioId]) REFERENCES [RegistrosDiarios] ([LogId]) ON DELETE CASCADE;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [ArchivosAdjuntos] ADD CONSTRAINT [FK_ArchivosAdjuntos_Tareas_AdjTareaId] FOREIGN KEY ([AdjTareaId]) REFERENCES [Tareas] ([TarId]) ON DELETE CASCADE;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [ArchivosAdjuntos] ADD CONSTRAINT [FK_ArchivosAdjuntos_Usuarios_AdjSubidoPor] FOREIGN KEY ([AdjSubidoPor]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [BovedaSecretos] ADD CONSTRAINT [FK_BovedaSecretos_Proyectos_BvdProyectoId] FOREIGN KEY ([BvdProyectoId]) REFERENCES [Proyectos] ([PryId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [BovedaSecretos] ADD CONSTRAINT [FK_BovedaSecretos_Usuarios_BvdCreadoPor] FOREIGN KEY ([BvdCreadoPor]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Carpetas] ADD CONSTRAINT [FK_Carpetas_Proyectos_CrpProyectoId] FOREIGN KEY ([CrpProyectoId]) REFERENCES [Proyectos] ([PryId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [DocumentosMarkdown] ADD CONSTRAINT [FK_DocumentosMarkdown_DocumentosMarkdown_DocDocumentoPadreId] FOREIGN KEY ([DocDocumentoPadreId]) REFERENCES [DocumentosMarkdown] ([DocId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [DocumentosMarkdown] ADD CONSTRAINT [FK_DocumentosMarkdown_Proyectos_DocProyectoId] FOREIGN KEY ([DocProyectoId]) REFERENCES [Proyectos] ([PryId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [DocumentosMarkdown] ADD CONSTRAINT [FK_DocumentosMarkdown_Usuarios_DocCreadoPor] FOREIGN KEY ([DocCreadoPor]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [ListasTareas] ADD CONSTRAINT [FK_ListasTareas_Carpetas_LstCarpetaId] FOREIGN KEY ([LstCarpetaId]) REFERENCES [Carpetas] ([CrpId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [ListasTareas] ADD CONSTRAINT [FK_ListasTareas_Proyectos_LstProyectoId] FOREIGN KEY ([LstProyectoId]) REFERENCES [Proyectos] ([PryId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Marcadores] ADD CONSTRAINT [FK_Marcadores_Usuarios_MrcUsuarioId] FOREIGN KEY ([MrcUsuarioId]) REFERENCES [Usuarios] ([UsuId]) ON DELETE CASCADE;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [MensajesTicket] ADD CONSTRAINT [FK_MensajesTicket_Tickets_MsgTicketId] FOREIGN KEY ([MsgTicketId]) REFERENCES [Tickets] ([TckId]) ON DELETE CASCADE;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [RegistrosDiarios] ADD CONSTRAINT [FK_RegistrosDiarios_Usuarios_LogUsuarioId] FOREIGN KEY ([LogUsuarioId]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [RegistrosTiempo] ADD CONSTRAINT [FK_RegistrosTiempo_Tareas_RgtTareaId] FOREIGN KEY ([RgtTareaId]) REFERENCES [Tareas] ([TarId]) ON DELETE CASCADE;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [RegistrosTiempo] ADD CONSTRAINT [FK_RegistrosTiempo_Usuarios_RgtUsuarioId] FOREIGN KEY ([RgtUsuarioId]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Tareas] ADD CONSTRAINT [FK_Tareas_ListasTareas_TarListaTareaId] FOREIGN KEY ([TarListaTareaId]) REFERENCES [ListasTareas] ([LstId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Tareas] ADD CONSTRAINT [FK_Tareas_Tareas_TarTareaPadreId] FOREIGN KEY ([TarTareaPadreId]) REFERENCES [Tareas] ([TarId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Tareas] ADD CONSTRAINT [FK_Tareas_Usuarios_TarCreadoPor] FOREIGN KEY ([TarCreadoPor]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Tickets] ADD CONSTRAINT [FK_Tickets_ColasSoporte_TckColaSoporteId] FOREIGN KEY ([TckColaSoporteId]) REFERENCES [ColasSoporte] ([ClaId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Tickets] ADD CONSTRAINT [FK_Tickets_PoliticasSla_TckPoliticaSlaId] FOREIGN KEY ([TckPoliticaSlaId]) REFERENCES [PoliticasSla] ([SlaId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Tickets] ADD CONSTRAINT [FK_Tickets_Tareas_TckTareaRelacionadaId] FOREIGN KEY ([TckTareaRelacionadaId]) REFERENCES [Tareas] ([TarId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [Tickets] ADD CONSTRAINT [FK_Tickets_Usuarios_TckAgenteAsignadoId] FOREIGN KEY ([TckAgenteAsignadoId]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [TokensRefresco] ADD CONSTRAINT [FK_TokensRefresco_Usuarios_TkrUsuarioId] FOREIGN KEY ([TkrUsuarioId]) REFERENCES [Usuarios] ([UsuId]) ON DELETE CASCADE;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [UsuariosRoles] ADD CONSTRAINT [FK_UsuariosRoles_Roles_UroRolId] FOREIGN KEY ([UroRolId]) REFERENCES [Roles] ([RolId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    ALTER TABLE [UsuariosRoles] ADD CONSTRAINT [FK_UsuariosRoles_Usuarios_UroUsuarioId] FOREIGN KEY ([UroUsuarioId]) REFERENCES [Usuarios] ([UsuId]) ON DELETE CASCADE;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924024304_ConvencionColumnasYNombreUsuario'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260924024304_ConvencionColumnasYNombreUsuario', N'8.0.11');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    ALTER TABLE [Tickets] ADD [TckCreadoPor] uniqueidentifier NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    ALTER TABLE [Tickets] ADD [TckDescripcionMarkdown] nvarchar(max) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    ALTER TABLE [Tickets] ADD [TckDocumentacionMarkdown] nvarchar(max) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    ALTER TABLE [Tickets] ADD [TckFechaCierre] datetime2 NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    ALTER TABLE [Tickets] ADD [TckTipo] varchar(30) NOT NULL DEFAULT '';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    ALTER TABLE [MensajesTicket] ADD [MsgUsuarioId] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    ALTER TABLE [ArchivosAdjuntos] ADD [AdjTicketId] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE TABLE [DesplieguesTicket] (
        [DspId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [DspTicketId] uniqueidentifier NOT NULL,
        [DspAmbiente] varchar(20) NOT NULL,
        [DspReferencia] nvarchar(200) NULL,
        [DspNotas] nvarchar(2000) NULL,
        [DspResultado] varchar(20) NOT NULL,
        [DspNotasResultado] nvarchar(2000) NULL,
        [DspDesplegadoPor] uniqueidentifier NOT NULL,
        [DspEvaluadoPor] uniqueidentifier NULL,
        [DspFechaDespliegue] datetime2 NOT NULL,
        [DspFechaResultado] datetime2 NULL,
        CONSTRAINT [PK_DesplieguesTicket] PRIMARY KEY ([DspId]),
        CONSTRAINT [FK_DesplieguesTicket_Tickets_DspTicketId] FOREIGN KEY ([DspTicketId]) REFERENCES [Tickets] ([TckId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_DesplieguesTicket_Usuarios_DspDesplegadoPor] FOREIGN KEY ([DspDesplegadoPor]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_DesplieguesTicket_Usuarios_DspEvaluadoPor] FOREIGN KEY ([DspEvaluadoPor]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE TABLE [EventosTicket] (
        [EvtId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [EvtTicketId] uniqueidentifier NOT NULL,
        [EvtTipoEvento] varchar(40) NOT NULL,
        [EvtEstadoAnterior] varchar(30) NULL,
        [EvtEstadoNuevo] varchar(30) NULL,
        [EvtDescripcion] nvarchar(500) NOT NULL,
        [EvtComentario] nvarchar(4000) NULL,
        [EvtUsuarioId] uniqueidentifier NOT NULL,
        [EvtFechaEvento] datetime2 NOT NULL,
        CONSTRAINT [PK_EventosTicket] PRIMARY KEY ([EvtId]),
        CONSTRAINT [FK_EventosTicket_Tickets_EvtTicketId] FOREIGN KEY ([EvtTicketId]) REFERENCES [Tickets] ([TckId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_EventosTicket_Usuarios_EvtUsuarioId] FOREIGN KEY ([EvtUsuarioId]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE TABLE [Repositorios] (
        [RepId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [RepNombre] nvarchar(100) NOT NULL,
        [RepPropietario] nvarchar(100) NOT NULL,
        [RepNombreRepositorio] nvarchar(100) NOT NULL,
        [RepRamaPrincipal] nvarchar(250) NOT NULL,
        [RepRamaDesarrollo] nvarchar(250) NOT NULL,
        [RepEstaActivo] bit NOT NULL,
        [RepFechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_Repositorios] PRIMARY KEY ([RepId])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE TABLE [RamasTicket] (
        [RtkId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [RtkTicketId] uniqueidentifier NOT NULL,
        [RtkRepositorioId] uniqueidentifier NOT NULL,
        [RtkNombreRama] nvarchar(250) NOT NULL,
        [RtkRamaBase] nvarchar(250) NOT NULL,
        [RtkRamaDestino] nvarchar(250) NOT NULL,
        [RtkPullRequestNumero] int NULL,
        [RtkPullRequestUrl] nvarchar(500) NULL,
        [RtkPullRequestEstado] varchar(20) NULL,
        [RtkPullRequestFechaFusion] datetime2 NULL,
        [RtkTotalCommits] int NOT NULL,
        [RtkTotalArchivos] int NOT NULL,
        [RtkLineasAgregadas] int NOT NULL,
        [RtkLineasEliminadas] int NOT NULL,
        [RtkFechaUltimaSincronizacion] datetime2 NULL,
        [RtkCreadoPor] uniqueidentifier NOT NULL,
        [RtkFechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_RamasTicket] PRIMARY KEY ([RtkId]),
        CONSTRAINT [FK_RamasTicket_Repositorios_RtkRepositorioId] FOREIGN KEY ([RtkRepositorioId]) REFERENCES [Repositorios] ([RepId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_RamasTicket_Tickets_RtkTicketId] FOREIGN KEY ([RtkTicketId]) REFERENCES [Tickets] ([TckId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_RamasTicket_Usuarios_RtkCreadoPor] FOREIGN KEY ([RtkCreadoPor]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE TABLE [ArchivosModificados] (
        [AmoId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [AmoRamaTicketId] uniqueidentifier NOT NULL,
        [AmoRutaArchivo] nvarchar(500) NOT NULL,
        [AmoRutaAnterior] nvarchar(500) NULL,
        [AmoTipoCambio] varchar(20) NOT NULL,
        [AmoLineasAgregadas] int NOT NULL,
        [AmoLineasEliminadas] int NOT NULL,
        CONSTRAINT [PK_ArchivosModificados] PRIMARY KEY ([AmoId]),
        CONSTRAINT [FK_ArchivosModificados_RamasTicket_AmoRamaTicketId] FOREIGN KEY ([AmoRamaTicketId]) REFERENCES [RamasTicket] ([RtkId]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE TABLE [CommitsRama] (
        [CmtId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [CmtRamaTicketId] uniqueidentifier NOT NULL,
        [CmtSha] varchar(40) NOT NULL,
        [CmtMensaje] nvarchar(2000) NOT NULL,
        [CmtAutor] nvarchar(150) NOT NULL,
        [CmtFechaCommit] datetime2 NOT NULL,
        [CmtUrl] nvarchar(500) NOT NULL,
        CONSTRAINT [PK_CommitsRama] PRIMARY KEY ([CmtId]),
        CONSTRAINT [FK_CommitsRama_RamasTicket_CmtRamaTicketId] FOREIGN KEY ([CmtRamaTicketId]) REFERENCES [RamasTicket] ([RtkId]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'ClaId', N'ClaDescripcion', N'ClaEstaActiva', N'ClaNombre') AND [object_id] = OBJECT_ID(N'[ColasSoporte]'))
        SET IDENTITY_INSERT [ColasSoporte] ON;
    EXEC(N'INSERT INTO [ColasSoporte] ([ClaId], [ClaDescripcion], [ClaEstaActiva], [ClaNombre])
    VALUES (''5c0a7e10-2b6f-4d1e-9a51-000000000001'', N''Cola por defecto para todos los tickets.'', CAST(1 AS bit), N''General'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'ClaId', N'ClaDescripcion', N'ClaEstaActiva', N'ClaNombre') AND [object_id] = OBJECT_ID(N'[ColasSoporte]'))
        SET IDENTITY_INSERT [ColasSoporte] OFF;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'SlaId', N'SlaEstaActiva', N'SlaMinutosPrimeraRespuesta', N'SlaMinutosResolucion', N'SlaNombre') AND [object_id] = OBJECT_ID(N'[PoliticasSla]'))
        SET IDENTITY_INSERT [PoliticasSla] ON;
    EXEC(N'INSERT INTO [PoliticasSla] ([SlaId], [SlaEstaActiva], [SlaMinutosPrimeraRespuesta], [SlaMinutosResolucion], [SlaNombre])
    VALUES (''5c0a7e10-2b6f-4d1e-9a51-000000000101'', CAST(1 AS bit), 60, 480, N''Urgente''),
    (''5c0a7e10-2b6f-4d1e-9a51-000000000102'', CAST(1 AS bit), 240, 1440, N''Alta''),
    (''5c0a7e10-2b6f-4d1e-9a51-000000000103'', CAST(1 AS bit), 480, 4320, N''Media''),
    (''5c0a7e10-2b6f-4d1e-9a51-000000000104'', CAST(1 AS bit), 1440, 7200, N''Baja'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'SlaId', N'SlaEstaActiva', N'SlaMinutosPrimeraRespuesta', N'SlaMinutosResolucion', N'SlaNombre') AND [object_id] = OBJECT_ID(N'[PoliticasSla]'))
        SET IDENTITY_INSERT [PoliticasSla] OFF;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    UPDATE Tickets SET TckEstado = 'EnAnalisis' WHERE TckEstado = 'Abierto';
    UPDATE Tickets SET TckEstado = 'Aprobado' WHERE TckEstado = 'Resuelto';
    UPDATE Tickets
       SET TckCreadoPor = COALESCE(TckAgenteAsignadoId, (SELECT TOP 1 UsuId FROM Usuarios ORDER BY UsuFechaCreacion))
     WHERE TckCreadoPor = '00000000-0000-0000-0000-000000000000';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE INDEX [IX_Tickets_TckCreadoPor] ON [Tickets] ([TckCreadoPor]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE INDEX [IX_Tickets_TckEstado] ON [Tickets] ([TckEstado]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE INDEX [IX_MensajesTicket_MsgUsuarioId] ON [MensajesTicket] ([MsgUsuarioId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE INDEX [IX_ArchivosAdjuntos_AdjTicketId] ON [ArchivosAdjuntos] ([AdjTicketId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE INDEX [IX_ArchivosModificados_AmoRamaTicketId] ON [ArchivosModificados] ([AmoRamaTicketId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE INDEX [IX_CommitsRama_CmtRamaTicketId] ON [CommitsRama] ([CmtRamaTicketId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE INDEX [IX_DesplieguesTicket_DspDesplegadoPor] ON [DesplieguesTicket] ([DspDesplegadoPor]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE INDEX [IX_DesplieguesTicket_DspEvaluadoPor] ON [DesplieguesTicket] ([DspEvaluadoPor]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE INDEX [IX_DesplieguesTicket_DspTicketId] ON [DesplieguesTicket] ([DspTicketId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE INDEX [IX_EventosTicket_EvtTicketId_EvtFechaEvento] ON [EventosTicket] ([EvtTicketId], [EvtFechaEvento]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE INDEX [IX_EventosTicket_EvtUsuarioId] ON [EventosTicket] ([EvtUsuarioId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE INDEX [IX_RamasTicket_RtkCreadoPor] ON [RamasTicket] ([RtkCreadoPor]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE INDEX [IX_RamasTicket_RtkRepositorioId] ON [RamasTicket] ([RtkRepositorioId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE UNIQUE INDEX [IX_RamasTicket_RtkTicketId_RtkRepositorioId_RtkNombreRama] ON [RamasTicket] ([RtkTicketId], [RtkRepositorioId], [RtkNombreRama]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Repositorios_RepPropietario_RepNombreRepositorio] ON [Repositorios] ([RepPropietario], [RepNombreRepositorio]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    ALTER TABLE [ArchivosAdjuntos] ADD CONSTRAINT [FK_ArchivosAdjuntos_Tickets_AdjTicketId] FOREIGN KEY ([AdjTicketId]) REFERENCES [Tickets] ([TckId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    ALTER TABLE [MensajesTicket] ADD CONSTRAINT [FK_MensajesTicket_Usuarios_MsgUsuarioId] FOREIGN KEY ([MsgUsuarioId]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    ALTER TABLE [Tickets] ADD CONSTRAINT [FK_Tickets_Usuarios_TckCreadoPor] FOREIGN KEY ([TckCreadoPor]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924030840_ModuloTicketsGitHub'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260924030840_ModuloTicketsGitHub', N'8.0.11');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924032909_AislamientoPorUsuario'
)
BEGIN
    DROP INDEX [IX_Repositorios_RepPropietario_RepNombreRepositorio] ON [Repositorios];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924032909_AislamientoPorUsuario'
)
BEGIN
    DROP INDEX [IX_Proyectos_PryClavePrefijo] ON [Proyectos];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924032909_AislamientoPorUsuario'
)
BEGIN
    DROP INDEX [IX_DocumentosMarkdown_DocCreadoPor] ON [DocumentosMarkdown];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924032909_AislamientoPorUsuario'
)
BEGIN
    DROP INDEX [IX_DocumentosMarkdown_DocRutaEsquema] ON [DocumentosMarkdown];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924032909_AislamientoPorUsuario'
)
BEGIN
    ALTER TABLE [Repositorios] ADD [RepUsuarioId] uniqueidentifier NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924032909_AislamientoPorUsuario'
)
BEGIN
    ALTER TABLE [Proyectos] ADD [PryPropietarioId] uniqueidentifier NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924032909_AislamientoPorUsuario'
)
BEGIN
    DECLARE @PrimerUsuario UNIQUEIDENTIFIER = (SELECT TOP 1 UsuId FROM Usuarios ORDER BY UsuFechaCreacion);

    UPDATE p
       SET PryPropietarioId = COALESCE(
           (SELECT TOP 1 t.TarCreadoPor
              FROM Tareas t
              JOIN ListasTareas l ON l.LstId = t.TarListaTareaId
             WHERE l.LstProyectoId = p.PryId
             ORDER BY t.TarFechaCreacion),
           @PrimerUsuario)
      FROM Proyectos p;

    UPDATE r
       SET RepUsuarioId = COALESCE(
           (SELECT TOP 1 rt.RtkCreadoPor FROM RamasTicket rt WHERE rt.RtkRepositorioId = r.RepId ORDER BY rt.RtkFechaCreacion),
           @PrimerUsuario)
      FROM Repositorios r;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924032909_AislamientoPorUsuario'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Repositorios_RepUsuarioId_RepPropietario_RepNombreRepositorio] ON [Repositorios] ([RepUsuarioId], [RepPropietario], [RepNombreRepositorio]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924032909_AislamientoPorUsuario'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Proyectos_PryPropietarioId_PryClavePrefijo] ON [Proyectos] ([PryPropietarioId], [PryClavePrefijo]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924032909_AislamientoPorUsuario'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DocumentosMarkdown_DocCreadoPor_DocRutaEsquema] ON [DocumentosMarkdown] ([DocCreadoPor], [DocRutaEsquema]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924032909_AislamientoPorUsuario'
)
BEGIN
    ALTER TABLE [Proyectos] ADD CONSTRAINT [FK_Proyectos_Usuarios_PryPropietarioId] FOREIGN KEY ([PryPropietarioId]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924032909_AislamientoPorUsuario'
)
BEGIN
    ALTER TABLE [Repositorios] ADD CONSTRAINT [FK_Repositorios_Usuarios_RepUsuarioId] FOREIGN KEY ([RepUsuarioId]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924032909_AislamientoPorUsuario'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260924032909_AislamientoPorUsuario', N'8.0.11');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924040549_ParcheArchivosModificados'
)
BEGIN
    ALTER TABLE [ArchivosModificados] ADD [AmoParche] nvarchar(max) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924040549_ParcheArchivosModificados'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260924040549_ParcheArchivosModificados', N'8.0.11');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924045331_OrganizacionYVersionesDocumentos'
)
BEGIN
    ALTER TABLE [DocumentosMarkdown] ADD [DocCarpetaDocumentoId] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924045331_OrganizacionYVersionesDocumentos'
)
BEGIN
    ALTER TABLE [DocumentosMarkdown] ADD [DocFechaArchivado] datetime2 NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924045331_OrganizacionYVersionesDocumentos'
)
BEGIN
    CREATE TABLE [CarpetasDocumento] (
        [CdoId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [CdoUsuarioId] uniqueidentifier NOT NULL,
        [CdoCarpetaPadreId] uniqueidentifier NULL,
        [CdoNombre] nvarchar(100) NOT NULL,
        [CdoColor] varchar(20) NULL,
        [CdoIndiceOrden] int NOT NULL,
        [CdoFechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_CarpetasDocumento] PRIMARY KEY ([CdoId]),
        CONSTRAINT [FK_CarpetasDocumento_CarpetasDocumento_CdoCarpetaPadreId] FOREIGN KEY ([CdoCarpetaPadreId]) REFERENCES [CarpetasDocumento] ([CdoId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_CarpetasDocumento_Usuarios_CdoUsuarioId] FOREIGN KEY ([CdoUsuarioId]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924045331_OrganizacionYVersionesDocumentos'
)
BEGIN
    CREATE TABLE [EtiquetasDocumento] (
        [EtqId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [EtqUsuarioId] uniqueidentifier NOT NULL,
        [EtqNombre] nvarchar(50) NOT NULL,
        [EtqColor] varchar(20) NOT NULL,
        [EtqFechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_EtiquetasDocumento] PRIMARY KEY ([EtqId]),
        CONSTRAINT [FK_EtiquetasDocumento_Usuarios_EtqUsuarioId] FOREIGN KEY ([EtqUsuarioId]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924045331_OrganizacionYVersionesDocumentos'
)
BEGIN
    CREATE TABLE [VersionesDocumento] (
        [VdoId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [VdoDocumentoId] uniqueidentifier NOT NULL,
        [VdoNumeroVersion] int NOT NULL,
        [VdoTitulo] nvarchar(200) NOT NULL,
        [VdoContenidoMarkdown] nvarchar(max) NOT NULL,
        [VdoCreadoPor] uniqueidentifier NOT NULL,
        [VdoFechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_VersionesDocumento] PRIMARY KEY ([VdoId]),
        CONSTRAINT [FK_VersionesDocumento_DocumentosMarkdown_VdoDocumentoId] FOREIGN KEY ([VdoDocumentoId]) REFERENCES [DocumentosMarkdown] ([DocId]) ON DELETE CASCADE,
        CONSTRAINT [FK_VersionesDocumento_Usuarios_VdoCreadoPor] FOREIGN KEY ([VdoCreadoPor]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924045331_OrganizacionYVersionesDocumentos'
)
BEGIN
    CREATE TABLE [DocumentosEtiquetas] (
        [DteId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [DteDocumentoId] uniqueidentifier NOT NULL,
        [DteEtiquetaId] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_DocumentosEtiquetas] PRIMARY KEY ([DteId]),
        CONSTRAINT [FK_DocumentosEtiquetas_DocumentosMarkdown_DteDocumentoId] FOREIGN KEY ([DteDocumentoId]) REFERENCES [DocumentosMarkdown] ([DocId]) ON DELETE CASCADE,
        CONSTRAINT [FK_DocumentosEtiquetas_EtiquetasDocumento_DteEtiquetaId] FOREIGN KEY ([DteEtiquetaId]) REFERENCES [EtiquetasDocumento] ([EtqId]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924045331_OrganizacionYVersionesDocumentos'
)
BEGIN
    CREATE INDEX [IX_DocumentosMarkdown_DocCarpetaDocumentoId] ON [DocumentosMarkdown] ([DocCarpetaDocumentoId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924045331_OrganizacionYVersionesDocumentos'
)
BEGIN
    CREATE INDEX [IX_DocumentosMarkdown_DocCreadoPor_DocEstaArchivado_DocCarpetaDocumentoId] ON [DocumentosMarkdown] ([DocCreadoPor], [DocEstaArchivado], [DocCarpetaDocumentoId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924045331_OrganizacionYVersionesDocumentos'
)
BEGIN
    CREATE INDEX [IX_CarpetasDocumento_CdoCarpetaPadreId] ON [CarpetasDocumento] ([CdoCarpetaPadreId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924045331_OrganizacionYVersionesDocumentos'
)
BEGIN
    CREATE INDEX [IX_CarpetasDocumento_CdoUsuarioId_CdoCarpetaPadreId] ON [CarpetasDocumento] ([CdoUsuarioId], [CdoCarpetaPadreId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924045331_OrganizacionYVersionesDocumentos'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DocumentosEtiquetas_DteDocumentoId_DteEtiquetaId] ON [DocumentosEtiquetas] ([DteDocumentoId], [DteEtiquetaId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924045331_OrganizacionYVersionesDocumentos'
)
BEGIN
    CREATE INDEX [IX_DocumentosEtiquetas_DteEtiquetaId] ON [DocumentosEtiquetas] ([DteEtiquetaId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924045331_OrganizacionYVersionesDocumentos'
)
BEGIN
    CREATE UNIQUE INDEX [IX_EtiquetasDocumento_EtqUsuarioId_EtqNombre] ON [EtiquetasDocumento] ([EtqUsuarioId], [EtqNombre]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924045331_OrganizacionYVersionesDocumentos'
)
BEGIN
    CREATE INDEX [IX_VersionesDocumento_VdoCreadoPor] ON [VersionesDocumento] ([VdoCreadoPor]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924045331_OrganizacionYVersionesDocumentos'
)
BEGIN
    CREATE UNIQUE INDEX [IX_VersionesDocumento_VdoDocumentoId_VdoNumeroVersion] ON [VersionesDocumento] ([VdoDocumentoId], [VdoNumeroVersion]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924045331_OrganizacionYVersionesDocumentos'
)
BEGIN
    ALTER TABLE [DocumentosMarkdown] ADD CONSTRAINT [FK_DocumentosMarkdown_CarpetasDocumento_DocCarpetaDocumentoId] FOREIGN KEY ([DocCarpetaDocumentoId]) REFERENCES [CarpetasDocumento] ([CdoId]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924045331_OrganizacionYVersionesDocumentos'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260924045331_OrganizacionYVersionesDocumentos', N'8.0.11');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924164121_CamposExternosTicket'
)
BEGIN
    ALTER TABLE [Tickets] ADD [TckFechaVencimiento] datetime2 NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924164121_CamposExternosTicket'
)
BEGIN
    ALTER TABLE [Tickets] ADD [TckHorasDedicadas] decimal(6,2) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924164121_CamposExternosTicket'
)
BEGIN
    ALTER TABLE [Tickets] ADD [TckIdSeguimiento] nvarchar(100) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924164121_CamposExternosTicket'
)
BEGIN
    ALTER TABLE [Tickets] ADD [TckNumeroExterno] nvarchar(50) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924164121_CamposExternosTicket'
)
BEGIN
    CREATE INDEX [IX_Tickets_TckNumeroExterno] ON [Tickets] ([TckNumeroExterno]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924164121_CamposExternosTicket'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260924164121_CamposExternosTicket', N'8.0.11');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924174019_ProyectosSoporte'
)
BEGIN
    ALTER TABLE [Repositorios] ADD [RepProyectoSoporteId] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924174019_ProyectosSoporte'
)
BEGIN
    CREATE TABLE [ProyectosSoporte] (
        [PsoId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [PsoUsuarioId] uniqueidentifier NOT NULL,
        [PsoNombre] nvarchar(100) NOT NULL,
        [PsoDescripcion] nvarchar(500) NULL,
        [PsoColor] varchar(20) NOT NULL,
        [PsoEstaActivo] bit NOT NULL,
        [PsoFechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_ProyectosSoporte] PRIMARY KEY ([PsoId]),
        CONSTRAINT [FK_ProyectosSoporte_Usuarios_PsoUsuarioId] FOREIGN KEY ([PsoUsuarioId]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924174019_ProyectosSoporte'
)
BEGIN
    CREATE TABLE [TicketsProyectos] (
        [TprId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [TprTicketId] uniqueidentifier NOT NULL,
        [TprProyectoSoporteId] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_TicketsProyectos] PRIMARY KEY ([TprId]),
        CONSTRAINT [FK_TicketsProyectos_ProyectosSoporte_TprProyectoSoporteId] FOREIGN KEY ([TprProyectoSoporteId]) REFERENCES [ProyectosSoporte] ([PsoId]) ON DELETE CASCADE,
        CONSTRAINT [FK_TicketsProyectos_Tickets_TprTicketId] FOREIGN KEY ([TprTicketId]) REFERENCES [Tickets] ([TckId]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924174019_ProyectosSoporte'
)
BEGIN
    CREATE INDEX [IX_Repositorios_RepProyectoSoporteId] ON [Repositorios] ([RepProyectoSoporteId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924174019_ProyectosSoporte'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProyectosSoporte_PsoUsuarioId_PsoNombre] ON [ProyectosSoporte] ([PsoUsuarioId], [PsoNombre]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924174019_ProyectosSoporte'
)
BEGIN
    CREATE INDEX [IX_TicketsProyectos_TprProyectoSoporteId] ON [TicketsProyectos] ([TprProyectoSoporteId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924174019_ProyectosSoporte'
)
BEGIN
    CREATE UNIQUE INDEX [IX_TicketsProyectos_TprTicketId_TprProyectoSoporteId] ON [TicketsProyectos] ([TprTicketId], [TprProyectoSoporteId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924174019_ProyectosSoporte'
)
BEGIN
    ALTER TABLE [Repositorios] ADD CONSTRAINT [FK_Repositorios_ProyectosSoporte_RepProyectoSoporteId] FOREIGN KEY ([RepProyectoSoporteId]) REFERENCES [ProyectosSoporte] ([PsoId]) ON DELETE SET NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924174019_ProyectosSoporte'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260924174019_ProyectosSoporte', N'8.0.11');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924185111_DiarioEntradas'
)
BEGIN
    ALTER TABLE [RegistrosDiarios] ADD [LogAnimo] tinyint NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924185111_DiarioEntradas'
)
BEGIN
    ALTER TABLE [RegistrosDiarios] ADD [LogEnergia] tinyint NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924185111_DiarioEntradas'
)
BEGIN
    CREATE TABLE [EntradasDiario] (
        [EndId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [EndRegistroDiarioId] uniqueidentifier NOT NULL,
        [EndTipo] varchar(20) NOT NULL,
        [EndTitulo] nvarchar(500) NOT NULL,
        [EndDetalleMarkdown] nvarchar(max) NULL,
        [EndHoraInicio] time(0) NULL,
        [EndHoraFin] time(0) NULL,
        [EndCompletada] bit NOT NULL,
        [EndFechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_EntradasDiario] PRIMARY KEY ([EndId]),
        CONSTRAINT [FK_EntradasDiario_RegistrosDiarios_EndRegistroDiarioId] FOREIGN KEY ([EndRegistroDiarioId]) REFERENCES [RegistrosDiarios] ([LogId]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924185111_DiarioEntradas'
)
BEGIN
    EXEC(N'ALTER TABLE [RegistrosDiarios] ADD CONSTRAINT [CK_RegistrosDiarios_Animo] CHECK ([LogAnimo] IS NULL OR [LogAnimo] BETWEEN 1 AND 5)');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924185111_DiarioEntradas'
)
BEGIN
    EXEC(N'ALTER TABLE [RegistrosDiarios] ADD CONSTRAINT [CK_RegistrosDiarios_Energia] CHECK ([LogEnergia] IS NULL OR [LogEnergia] BETWEEN 1 AND 5)');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924185111_DiarioEntradas'
)
BEGIN
    CREATE INDEX [IX_EntradasDiario_EndRegistroDiarioId_EndHoraInicio] ON [EntradasDiario] ([EndRegistroDiarioId], [EndHoraInicio]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924185111_DiarioEntradas'
)
BEGIN
    CREATE INDEX [IX_EntradasDiario_EndTipo] ON [EntradasDiario] ([EndTipo]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924185111_DiarioEntradas'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260924185111_DiarioEntradas', N'8.0.11');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924202731_TiempoTicketsYCronometro'
)
BEGIN
    DECLARE @var1 sysname;
    SELECT @var1 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[RegistrosTiempo]') AND [c].[name] = N'RgtTareaId');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [RegistrosTiempo] DROP CONSTRAINT [' + @var1 + '];');
    ALTER TABLE [RegistrosTiempo] ALTER COLUMN [RgtTareaId] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924202731_TiempoTicketsYCronometro'
)
BEGIN
    ALTER TABLE [RegistrosTiempo] ADD [RgtTicketId] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924202731_TiempoTicketsYCronometro'
)
BEGIN
    CREATE INDEX [IX_RegistrosTiempo_RgtTicketId] ON [RegistrosTiempo] ([RgtTicketId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924202731_TiempoTicketsYCronometro'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UQ_RegistrosTiempo_UnoEnCurso] ON [RegistrosTiempo] ([RgtUsuarioId]) WHERE [RgtFechaFin] IS NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924202731_TiempoTicketsYCronometro'
)
BEGIN
    EXEC(N'ALTER TABLE [RegistrosTiempo] ADD CONSTRAINT [CK_RegistrosTiempo_Rango] CHECK ([RgtFechaFin] IS NULL OR [RgtFechaFin] >= [RgtFechaInicio])');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924202731_TiempoTicketsYCronometro'
)
BEGIN
    EXEC(N'ALTER TABLE [RegistrosTiempo] ADD CONSTRAINT [CK_RegistrosTiempo_UnDestino] CHECK ([RgtTareaId] IS NULL OR [RgtTicketId] IS NULL)');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924202731_TiempoTicketsYCronometro'
)
BEGIN
    ALTER TABLE [RegistrosTiempo] ADD CONSTRAINT [FK_RegistrosTiempo_Tickets_RgtTicketId] FOREIGN KEY ([RgtTicketId]) REFERENCES [Tickets] ([TckId]) ON DELETE SET NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924202731_TiempoTicketsYCronometro'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260924202731_TiempoTicketsYCronometro', N'8.0.11');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924231037_DiarioEntradaTarea'
)
BEGIN
    ALTER TABLE [EntradasDiario] ADD [EndTareaId] uniqueidentifier NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924231037_DiarioEntradaTarea'
)
BEGIN
    CREATE INDEX [IX_EntradasDiario_EndTareaId] ON [EntradasDiario] ([EndTareaId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924231037_DiarioEntradaTarea'
)
BEGIN
    ALTER TABLE [EntradasDiario] ADD CONSTRAINT [FK_EntradasDiario_Tareas_EndTareaId] FOREIGN KEY ([EndTareaId]) REFERENCES [Tareas] ([TarId]) ON DELETE SET NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924231037_DiarioEntradaTarea'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260924231037_DiarioEntradaTarea', N'8.0.11');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260925020110_ModuloLienzos'
)
BEGIN
    CREATE TABLE [Lienzos] (
        [LieId] uniqueidentifier NOT NULL DEFAULT (NEWID()),
        [LieUsuarioId] uniqueidentifier NOT NULL,
        [LieTitulo] nvarchar(200) NOT NULL,
        [LieContenidoJson] nvarchar(max) NOT NULL,
        [LieFechaCreacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        [LieFechaActualizacion] datetime2 NOT NULL DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_Lienzos] PRIMARY KEY ([LieId]),
        CONSTRAINT [FK_Lienzos_Usuarios_LieUsuarioId] FOREIGN KEY ([LieUsuarioId]) REFERENCES [Usuarios] ([UsuId]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260925020110_ModuloLienzos'
)
BEGIN
    CREATE INDEX [IX_Lienzos_LieUsuarioId_LieFechaActualizacion] ON [Lienzos] ([LieUsuarioId], [LieFechaActualizacion]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260925020110_ModuloLienzos'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260925020110_ModuloLienzos', N'8.0.11');
END;
GO

COMMIT;
GO

