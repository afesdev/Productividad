using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SolucionProductividad.Servicios.GitHub;
using SolucionProductividad.Servicios.Opciones;

namespace SolucionProductividad.Pruebas.Unitarias;

public class PruebasServicioGitHubGrafo
{
    private sealed class GitHubGraphQLFalso(string respuesta) : HttpMessageHandler
    {
        public string? Ruta { get; private set; }
        public JsonDocument? Cuerpo { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage solicitud, CancellationToken tokenCancelacion)
        {
            Ruta = solicitud.RequestUri!.AbsolutePath;
            Cuerpo = JsonDocument.Parse(await solicitud.Content!.ReadAsStringAsync(tokenCancelacion));
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(respuesta, Encoding.UTF8, "application/json") };
        }
    }

    private const string Respuesta = """
        {"data":{"repository":{
          "f0":{"name":"main","target":{"oid":"m2","committedDate":"2026-09-20T10:00:00Z","history":{"nodes":[
            {"oid":"m2","messageHeadline":"Merge pull request #7","committedDate":"2026-09-20T10:00:00Z","url":"https://github.com/e/r/commit/m2","author":{"name":"Ana","user":null},"parents":{"nodes":[{"oid":"m1"},{"oid":"c1"}]}},
            {"oid":"m1","messageHeadline":"Inicio","committedDate":"2026-09-01T10:00:00Z","url":"https://github.com/e/r/commit/m1","author":{"name":"Ana","user":null},"parents":{"nodes":[]}}]}}},
          "f1":null,
          "recientes":{"nodes":[
            {"name":"feature/x","target":{"oid":"c1","committedDate":"2026-09-10T10:00:00Z","history":{"nodes":[
              {"oid":"c1","messageHeadline":"Agrega x","committedDate":"2026-09-10T10:00:00Z","url":"https://github.com/e/r/commit/c1","author":{"name":"","user":null},"parents":{"nodes":[{"oid":"m1"}]}},
              {"oid":"m1","messageHeadline":"Inicio","committedDate":"2026-09-01T10:00:00Z","url":"https://github.com/e/r/commit/m1","author":{"name":"Ana","user":null},"parents":{"nodes":[]}}]}}}]}
        }}}
        """;

    [Fact]
    public async Task Tolera_respuestas_parciales_y_traduce_errores_de_graphql()
    {
        const string parcial = """
            {"data":{"repository":{"f0":{"name":"main","target":{"oid":"m1","committedDate":"2026-09-01T10:00:00Z","history":null}},"recientes":null}},
             "errors":[{"message":"Something went wrong while executing your query."}]}
            """;
        var servicio = new ServicioGitHub(new HttpClient(new GitHubGraphQLFalso(parcial)), Options.Create(new OpcionesGitHub { Token = "token" }));
        var grafo = await servicio.ObtenerGrafoAsync("empresa", "repo", ["main"], 30);
        Assert.Equal("main", Assert.Single(grafo.Ramas).Nombre);
        Assert.Empty(grafo.Commits);

        const string sinRamas = """{"data":{"repository":{"f0":null,"recientes":{"nodes":[]}}},"errors":[{"message":"Resource not accessible by personal access token"}]}""";
        var otro = new ServicioGitHub(new HttpClient(new GitHubGraphQLFalso(sinRamas)), Options.Create(new OpcionesGitHub { Token = "token" }));
        var error = await Assert.ThrowsAsync<SolucionProductividad.Dominio.Excepciones.ExcepcionDominio>(() => otro.ObtenerGrafoAsync("empresa", "repo", ["main"], 30));
        Assert.Contains("Resource not accessible", error.Message);
    }

    [Fact]
    public async Task Consulta_por_graphql_con_variables_y_une_los_commits_sin_duplicados()
    {
        var falso = new GitHubGraphQLFalso(Respuesta);
        var servicio = new ServicioGitHub(new HttpClient(falso), Options.Create(new OpcionesGitHub { Token = "token" }));

        var grafo = await servicio.ObtenerGrafoAsync("empresa", "repo", ["main", "Desarrollo"], 30);

        Assert.Equal("/graphql", falso.Ruta);
        var consulta = falso.Cuerpo!.RootElement.GetProperty("query").GetString()!;
        Assert.StartsWith("query(", consulta.TrimStart());
        Assert.DoesNotContain("mutation", consulta);
        Assert.DoesNotContain("Desarrollo", consulta); // el nombre de la rama viaja como variable
        Assert.Equal("refs/heads/Desarrollo", falso.Cuerpo.RootElement.GetProperty("variables").GetProperty("f1").GetString());

        Assert.Equal(["main", "feature/x"], grafo.Ramas.Select(rama => rama.Nombre));
        Assert.Equal(["m2", "m1", "c1"], grafo.Commits.Select(commit => commit.Sha));
        Assert.Equal(["m1", "c1"], grafo.Commits[0].Padres);
        Assert.Equal("desconocido", grafo.Commits[2].Autor);
    }
}
