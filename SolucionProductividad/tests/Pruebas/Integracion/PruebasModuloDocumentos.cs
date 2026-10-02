using Microsoft.EntityFrameworkCore;
using SolucionProductividad.Aplicacion.Caracteristicas.Documentos;
using SolucionProductividad.Aplicacion.Comun.Excepciones;
using SolucionProductividad.Dominio.Enumeraciones;
using SolucionProductividad.Dominio.Excepciones;
using SolucionProductividad.Pruebas.Infraestructura;

namespace SolucionProductividad.Pruebas.Integracion;

[Collection(ColeccionBaseDatos.Nombre)]
public class PruebasModuloDocumentos
{
    private readonly BaseDatosPrueba _baseDatos;

    public PruebasModuloDocumentos(BaseDatosPrueba baseDatos) => _baseDatos = baseDatos;

    private async Task<EscenarioPrueba> CrearEscenarioAsync() => _baseDatos.CrearEscenario(await _baseDatos.CrearUsuarioAsync());

    [Fact]
    public async Task Vigencia_borrador_por_revisar_y_obsoleto_con_reemplazo()
    {
        using var escenario = await CrearEscenarioAsync();
        var antiguoId = await escenario.EnviarAsync(new CrearDocumentoComando(null, null, "Despliegue v1", "pasos viejos", null));
        var nuevoId = await escenario.EnviarAsync(new CrearDocumentoComando(null, null, "Despliegue v2", "pasos nuevos", null));

        // Todo documento nuevo nace como borrador.
        Assert.Equal(EstadoDocumento.Borrador, (await escenario.EnviarAsync(new ObtenerDocumentoPorIdConsulta(nuevoId))).Estado);
        Assert.Contains(await escenario.EnviarAsync(new ListarDocumentosConsulta(VistaDocumentos.Borradores)), documento => documento.Id == nuevoId);

        // Vigente con revisión vencida: aparece "por revisar".
        await escenario.EnviarAsync(new ActualizarVigenciaDocumentoComando(nuevoId, EstadoDocumento.Vigente, DateTime.UtcNow.AddDays(-1), null));
        var nuevo = await escenario.EnviarAsync(new ObtenerDocumentoPorIdConsulta(nuevoId));
        Assert.Equal(EstadoDocumento.Vigente, nuevo.Estado);
        Assert.True(nuevo.PorRevisar);
        Assert.Equal([nuevoId], (await escenario.EnviarAsync(new ListarDocumentosConsulta(VistaDocumentos.PorRevisar))).Select(documento => documento.Id));

        // Obsoleto con reemplazo: no se revisa y enlaza al nuevo. El reemplazo se ignora si no está obsoleto.
        await Assert.ThrowsAsync<ExcepcionValidacion>(() => escenario.EnviarAsync(new ActualizarVigenciaDocumentoComando(antiguoId, EstadoDocumento.Obsoleto, null, antiguoId)));
        await escenario.EnviarAsync(new ActualizarVigenciaDocumentoComando(antiguoId, EstadoDocumento.Obsoleto, DateTime.UtcNow.AddDays(-5), nuevoId));
        var antiguo = await escenario.EnviarAsync(new ObtenerDocumentoPorIdConsulta(antiguoId));
        Assert.False(antiguo.PorRevisar);
        Assert.Equal(nuevoId, antiguo.DocumentoReemplazoId);
        Assert.Equal("Despliegue v2", antiguo.TituloReemplazo);
        Assert.Equal([antiguoId], (await escenario.EnviarAsync(new ListarDocumentosConsulta(VistaDocumentos.Obsoletos))).Select(documento => documento.Id));

        // Otro usuario no puede usarse como reemplazo ni ver el documento.
        using var ajeno = await CrearEscenarioAsync();
        var ajenoId = await ajeno.EnviarAsync(new CrearDocumentoComando(null, null, "De otro", "x", null));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => escenario.EnviarAsync(new ActualizarVigenciaDocumentoComando(antiguoId, EstadoDocumento.Obsoleto, null, ajenoId)));

        // Eliminar definitivamente el reemplazo limpia la referencia en lugar de fallar por la clave foránea.
        await escenario.EnviarAsync(new MoverDocumentoAPapeleraComando(nuevoId));
        await escenario.EnviarAsync(new EliminarDocumentoDefinitivoComando(nuevoId));
        Assert.Null((await escenario.EnviarAsync(new ObtenerDocumentoPorIdConsulta(antiguoId))).DocumentoReemplazoId);
    }

    [Fact]
    public async Task Carpetas_anidadas_mover_documentos_y_eliminar_carpeta_sube_su_contenido()
    {
        using var escenario = await CrearEscenarioAsync();
        var carpetaId = await escenario.EnviarAsync(new GuardarCarpetaDocumentoComando(null, "Backend", null, "azul"));
        var subcarpetaId = await escenario.EnviarAsync(new GuardarCarpetaDocumentoComando(null, "APIs", carpetaId, null));

        // Una carpeta no puede moverse dentro de su propia subcarpeta.
        await Assert.ThrowsAsync<ExcepcionDominio>(() => escenario.EnviarAsync(new GuardarCarpetaDocumentoComando(carpetaId, "Backend", subcarpetaId, "azul")));

        var documentoId = await escenario.EnviarAsync(new CrearDocumentoComando(null, null, "Autenticación", "texto", null, subcarpetaId));
        var subpaginaId = await escenario.EnviarAsync(new CrearDocumentoComando(null, documentoId, "Tokens", "texto", null));
        Assert.Equal(subcarpetaId, (await escenario.EnviarAsync(new ObtenerDocumentoPorIdConsulta(subpaginaId))).CarpetaDocumentoId);

        await escenario.EnviarAsync(new MoverDocumentoComando(documentoId, carpetaId));
        Assert.Equal(carpetaId, (await escenario.EnviarAsync(new ObtenerDocumentoPorIdConsulta(subpaginaId))).CarpetaDocumentoId);

        await escenario.EnviarAsync(new EliminarCarpetaDocumentoComando(carpetaId));
        var estructura = await escenario.EnviarAsync(new ObtenerEstructuraDocumentosConsulta());
        Assert.Null(estructura.Carpetas.Single().CarpetaPadreId);
        Assert.Null((await escenario.EnviarAsync(new ObtenerDocumentoPorIdConsulta(documentoId))).CarpetaDocumentoId);
    }

    [Fact]
    public async Task Etiquetas_se_asignan_filtran_y_no_se_repiten()
    {
        using var escenario = await CrearEscenarioAsync();
        var backend = await escenario.EnviarAsync(new GuardarEtiquetaDocumentoComando(null, "#backend", "verde"));
        var devops = await escenario.EnviarAsync(new GuardarEtiquetaDocumentoComando(null, "devops", "naranja"));
        await Assert.ThrowsAsync<ExcepcionConflicto>(() => escenario.EnviarAsync(new GuardarEtiquetaDocumentoComando(null, "backend", "rojo")));
        await Assert.ThrowsAsync<ExcepcionValidacion>(() => escenario.EnviarAsync(new GuardarEtiquetaDocumentoComando(null, "otra", "#ff0000")));

        var documentoId = await escenario.EnviarAsync(new CrearDocumentoComando(null, null, "Despliegue", "pasos", null));
        var asignadas = await escenario.EnviarAsync(new AsignarEtiquetasDocumentoComando(documentoId, [backend, devops]));
        Assert.Equal(["backend", "devops"], asignadas.Select(etiqueta => etiqueta.Nombre));

        await escenario.EnviarAsync(new AsignarEtiquetasDocumentoComando(documentoId, [devops]));
        Assert.Single(await escenario.EnviarAsync(new ListarDocumentosConsulta(EtiquetaId: devops)));
        Assert.Empty(await escenario.EnviarAsync(new ListarDocumentosConsulta(EtiquetaId: backend)));

        var estructura = await escenario.EnviarAsync(new ObtenerEstructuraDocumentosConsulta());
        Assert.Equal(1, estructura.Etiquetas.Single(etiqueta => etiqueta.Id == devops).TotalDocumentos);
    }

    [Fact]
    public async Task Favoritos_y_papelera_con_restaurar_y_eliminar_definitivo()
    {
        using var escenario = await CrearEscenarioAsync();
        var documentoId = await escenario.EnviarAsync(new CrearDocumentoComando(null, null, "Guía", "[[Otra]]", null));
        var subpaginaId = await escenario.EnviarAsync(new CrearDocumentoComando(null, documentoId, "Anexo", "texto", null));

        await escenario.EnviarAsync(new MarcarFavoritoDocumentoComando(documentoId, true));
        Assert.True((await escenario.EnviarAsync(new ObtenerDocumentoPorIdConsulta(documentoId))).EsFavorito);
        Assert.Single(await escenario.EnviarAsync(new ListarDocumentosConsulta(VistaDocumentos.Favoritos)));

        // A la papelera van la página y sus subpáginas; no se pueden editar allí.
        await escenario.EnviarAsync(new MoverDocumentoAPapeleraComando(documentoId));
        Assert.Equal(2, (await escenario.EnviarAsync(new ListarDocumentosConsulta(VistaDocumentos.Papelera))).Count);
        Assert.Empty(await escenario.EnviarAsync(new ListarDocumentosConsulta()));
        await Assert.ThrowsAsync<ExcepcionDominio>(() => escenario.EnviarAsync(new ActualizarDocumentoComando(documentoId, "Guía", "x", null)));

        await escenario.EnviarAsync(new RestaurarDocumentoComando(documentoId));
        Assert.Equal(2, (await escenario.EnviarAsync(new ListarDocumentosConsulta())).Count);

        // Solo se borra definitivamente desde la papelera.
        await Assert.ThrowsAsync<ExcepcionDominio>(() => escenario.EnviarAsync(new EliminarDocumentoDefinitivoComando(documentoId)));
        await escenario.EnviarAsync(new MoverDocumentoAPapeleraComando(documentoId));
        Assert.Equal(2, await escenario.EnviarAsync(new EliminarDocumentoDefinitivoComando(null)));

        await using var contexto = _baseDatos.CrearContexto();
        Assert.False(await contexto.DocumentosMarkdown.AnyAsync(documento => documento.Id == documentoId || documento.Id == subpaginaId));
        Assert.False(await contexto.Marcadores.AnyAsync(marcador => marcador.EntidadId == documentoId));
        Assert.False(await contexto.ReferenciasEntidades.AnyAsync(referencia => referencia.OrigenId == documentoId));
    }

    [Fact]
    public async Task Versiones_se_crean_al_pedirlas_y_restaurar_se_puede_deshacer()
    {
        using var escenario = await CrearEscenarioAsync();
        var documentoId = await escenario.EnviarAsync(new CrearDocumentoComando(null, null, "Notas", "v1", null));

        var primera = await escenario.EnviarAsync(new ActualizarDocumentoComando(documentoId, "Notas", "contenido A", null));
        Assert.Equal(1, primera.NumeroVersionCreada);

        // Autoguardado inmediato: no crea versión (intervalo mínimo); Ctrl+S sí.
        Assert.Null((await escenario.EnviarAsync(new ActualizarDocumentoComando(documentoId, "Notas", "contenido B", null))).NumeroVersionCreada);
        Assert.Equal(2, (await escenario.EnviarAsync(new ActualizarDocumentoComando(documentoId, "Notas", "contenido C", null, CrearVersion: true))).NumeroVersionCreada);
        // Sin cambios no se duplica aunque se pida.
        Assert.Null((await escenario.EnviarAsync(new ActualizarDocumentoComando(documentoId, "Notas", "contenido C", null, CrearVersion: true))).NumeroVersionCreada);

        var versiones = await escenario.EnviarAsync(new ListarVersionesDocumentoConsulta(documentoId));
        Assert.Equal([2, 1], versiones.Select(version => version.NumeroVersion));

        await escenario.EnviarAsync(new RestaurarVersionDocumentoComando(versiones.Last().Id));
        var documento = await escenario.EnviarAsync(new ObtenerDocumentoPorIdConsulta(documentoId));
        Assert.Equal("contenido A", documento.ContenidoMarkdown);
        Assert.Equal(3, documento.TotalVersiones);

        // Otro usuario no ve las versiones.
        using var ajeno = await CrearEscenarioAsync();
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => ajeno.EnviarAsync(new ObtenerVersionDocumentoConsulta(versiones.First().Id)));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => ajeno.EnviarAsync(new ListarVersionesDocumentoConsulta(documentoId)));
    }

    [Fact]
    public async Task Carpetas_y_etiquetas_son_privadas()
    {
        using var duena = await CrearEscenarioAsync();
        var carpetaId = await duena.EnviarAsync(new GuardarCarpetaDocumentoComando(null, "Privada", null, null));
        var etiquetaId = await duena.EnviarAsync(new GuardarEtiquetaDocumentoComando(null, "secreta", "rojo"));

        using var ajeno = await CrearEscenarioAsync();
        var estructura = await ajeno.EnviarAsync(new ObtenerEstructuraDocumentosConsulta());
        Assert.Empty(estructura.Carpetas);
        Assert.Empty(estructura.Etiquetas);
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => ajeno.EnviarAsync(new CrearDocumentoComando(null, null, "Intruso", "x", null, carpetaId)));
        var propio = await ajeno.EnviarAsync(new CrearDocumentoComando(null, null, "Mío", "x", null));
        await Assert.ThrowsAsync<ExcepcionEntidadNoEncontrada>(() => ajeno.EnviarAsync(new AsignarEtiquetasDocumentoComando(propio, [etiquetaId])));
    }
}
