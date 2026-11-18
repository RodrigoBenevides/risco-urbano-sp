package br.com.riscourbano;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.nio.file.*;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import static org.junit.jupiter.api.Assertions.*;

class ReinicioTest {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final HttpClient HTTP = HttpClient.newHttpClient();
    private static final Pattern PORTA = Pattern.compile("Tomcat started on port (\\d+)");
    @TempDir Path pasta;

    @Test void preservaIdsEmOutraJvmEApenasDemoHabilitaEscritaDeSensor() throws Exception {
        long observacao;
        long alerta;
        String chave = UUID.randomUUID().toString();
        String relato = "{\"chave\":\""+chave+"\",\"bairro\":\"Saúde\",\"tipo\":\"ENERGIA\",\"duracaoMinutos\":60}";
        try (Servidor primeiro = iniciar("primeiro")) {
            var bloqueado = primeiro.post("/api/demo/sensores","{}");
            assertEquals(404,bloqueado.statusCode());
            var salvo = primeiro.post("/api/relatos",relato);
            assertEquals(201,salvo.statusCode());
            var recibo = JSON.readTree(salvo.body());
            observacao = recibo.path("id").asLong();
            alerta = recibo.path("alertaId").asLong();
        }
        assertTrue(Files.isRegularFile(pasta.resolve("monitoramento.mv.db")));
        try (Servidor segundo = iniciar("segundo")) {
            var repetido = segundo.post("/api/relatos",relato);
            assertEquals(200,repetido.statusCode());
            var recibo = JSON.readTree(repetido.body());
            assertEquals(observacao,recibo.path("id").asLong());
            assertEquals(alerta,recibo.path("alertaId").asLong());
            var detalhe = JSON.readTree(segundo.get("/api/alertas/"+alerta).body());
            assertEquals(observacao,detalhe.at("/evidencias/0/id").asLong());
            var publico = JSON.readTree(segundo.get("/api/observacoes?origem=PUBLICA").body());
            assertEquals(4,publico.path("total").asInt());
        }
    }

    Servidor iniciar(String nome) throws Exception {
        boolean windows = System.getProperty("os.name").startsWith("Windows");
        Path java = Path.of(System.getProperty("java.home"),"bin",windows ? "java.exe" : "java");
        var log = pasta.resolve(nome+".log");
        var argumentos = pasta.resolve(nome+".args");
        var classpath = System.getProperty("surefire.test.class.path").replace('\\','/');
        Files.writeString(argumentos,"-Xmx128m\n-classpath\n\""+classpath+"\"\nbr.com.riscourbano.RiscoUrbano\n");
        var proc = new ProcessBuilder(java.toString(),"@"+argumentos, "--server.port=0",
                "--spring.datasource.url=jdbc:h2:file:"+pasta.resolve("monitoramento").toAbsolutePath(),
                "--spring.main.banner-mode=off").redirectErrorStream(true).redirectOutput(log.toFile()).start();
        var servidor = new Servidor(proc);
        try {
            Instant prazo = Instant.now().plusSeconds(50);
            while (Instant.now().isBefore(prazo) && proc.isAlive()) {
                String texto = Files.readString(log);
                var porta = PORTA.matcher(texto);
                if (porta.find()) {
                    servidor.base = "http://127.0.0.1:"+porta.group(1);
                    if (servidor.get("/actuator/health").statusCode()==200) return servidor;
                }
                Thread.sleep(120);
            }
            throw new AssertionError("Falha ao iniciar a JVM de teste. "+Files.readString(log));
        } catch (Exception | AssertionError e) {
            servidor.close();
            throw e;
        }
    }

    static final class Servidor implements AutoCloseable {
        final Process processo;
        String base;
        Servidor(Process processo) { this.processo = processo; }
        HttpResponse<String> get(String caminho) throws Exception {
            return HTTP.send(HttpRequest.newBuilder(URI.create(base+caminho)).timeout(Duration.ofSeconds(5)).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
        }
        HttpResponse<String> post(String caminho,String corpo) throws Exception {
            return HTTP.send(HttpRequest.newBuilder(URI.create(base+caminho)).timeout(Duration.ofSeconds(8))
                    .header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(corpo)).build(),
                    HttpResponse.BodyHandlers.ofString());
        }
        public void close() throws Exception {
            processo.destroy();
            if (!processo.waitFor(12,TimeUnit.SECONDS)) processo.destroyForcibly().waitFor();
        }
    }
}
