package br.com.riscourbano;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties="spring.datasource.url=jdbc:h2:mem:api;DB_CLOSE_DELAY=-1")
@ActiveProfiles("demo")
class ApiTest {
    @LocalServerPort int porta;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate banco;
    @Autowired ImportacaoPublica importador;
    final HttpClient http = HttpClient.newHttpClient();

    @BeforeEach void limparCenarios() {
        banco.update("DELETE FROM observacao WHERE origem <> 'PUBLICA'");
        banco.update("DELETE FROM alerta");
    }

    record Resposta(int status, JsonNode corpo) {}
    Resposta enviar(String caminho, String body) throws Exception {
        var req = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + porta + caminho));
        if (body == null) req.GET();
        else req.header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body));
        var res = http.send(req.build(), HttpResponse.BodyHandlers.ofString());
        return new Resposta(res.statusCode(), json.readTree(res.body()));
    }

    Resposta post(String path, Object valor) throws Exception {
        return enviar(path, json.writeValueAsString(valor));
    }

    static HashMap<String,Object> sensor() {
        return new HashMap<>(Map.of("chave", UUID.randomUUID(), "bairro", "Vila Mariana",
                "tipo", "ALAGAMENTO", "valor", 22, "unidade", "cm"));
    }

    @Test void sensorApiDetalhePrioridadeEReenvio() throws Exception {
        var dados = sensor();
        var inicial = post("/api/demo/sensores", dados);
        assertEquals(201, inicial.status);
        long id = inicial.corpo.path("alertaId").asLong();
        var repetido = post("/api/demo/sensores", dados);
        assertEquals(200, repetido.status);
        assertEquals(inicial.corpo, repetido.corpo);
        dados.put("valor", 25);
        assertEquals(409, post("/api/demo/sensores", dados).status);
        var detalhe = enviar("/api/alertas/" + id, null);
        assertEquals(200, detalhe.status);
        assertEquals("ALTA", detalhe.corpo.path("prioridade").asText());
        assertEquals(7, detalhe.corpo.path("pontos").asInt());
        var evidencia = detalhe.corpo.path("evidencias").get(0);
        assertEquals(inicial.corpo.path("id"), evidencia.path("id"));
        assertEquals("SENSOR", evidencia.path("origem").asText());
        assertEquals("MEDIA", evidencia.path("confianca").asText());
        var painel = enviar("/api/alertas?prioridade=ALTA&tipo=ALAGAMENTO&bairro=Vila%20Mariana", null);
        assertEquals(id, painel.corpo.path("itens").get(0).path("id").asLong());
        assertEquals(1, painel.corpo.at("/contagens/ALTA").asInt());
        assertEquals(0, enviar("/api/alertas?prioridade=MEDIA", null).corpo.path("total").asInt());
        assertEquals(1, enviar("/api/resumo", null).corpo.path("total").asInt());
        assertEquals(404, enviar("/api/alertas/9223372036854775807", null).status);
    }

    @Test void concorrenciaPreservaUmaUnicaGravacao() throws Exception {
        var relato = Map.of("chave", UUID.randomUUID(), "tipo", "ENERGIA", "bairro", "Saúde", "duracaoMinutos", 65);
        var tarefas = new java.util.ArrayList<Future<Resposta>>();
        try (var pool = Executors.newFixedThreadPool(8)) {
            for (int i = 0; i < 8; i++) tarefas.add(pool.submit(() -> post("/api/relatos", relato)));
            int novos = 0;
            var ids = new java.util.HashSet<Long>();
            for (var t : tarefas) {
                var r = t.get(15, TimeUnit.SECONDS);
                assertTrue(r.status == 200 || r.status == 201);
                if (r.status == 201) novos++;
                ids.add(r.corpo.path("id").asLong());
            }
            assertEquals(1, novos);
            assertEquals(1, ids.size());
        }
        var a = enviar("/api/alertas", null).corpo.at("/itens/0");
        assertEquals("MEDIA", a.path("prioridade").asText());
        assertEquals("BAIXA", a.at("/evidencias/0/confianca").asText());
    }

    @Test void validaCalorCamposFuturosUnidadesEPrivacidade() throws Exception {
        var dados = sensor();
        dados.put("valor", 35); dados.put("tipo", "CALOR"); dados.put("unidade", "°C");
        assertEquals("referencia", post("/api/demo/sensores", dados).corpo.path("campo").asText());
        dados.put("referencia", 30); dados.put("referenciaEm", Instant.now().minusSeconds(360).toString());
        assertEquals("referenciaEm", post("/api/demo/sensores", dados).corpo.path("campo").asText());
        dados.remove("referenciaEm"); dados.put("observadoEm", Instant.now().plusSeconds(3600).toString());
        assertEquals("observadoEm", post("/api/demo/sensores", dados).corpo.path("campo").asText());
        dados.remove("observadoEm"); dados.put("unidade", "F");
        assertEquals("unidade", post("/api/demo/sensores", dados).corpo.path("campo").asText());
        dados.put("unidade", "°C");
        assertEquals(201, post("/api/demo/sensores", dados).status);
        var rel = new HashMap<String,Object>(Map.of("chave", UUID.randomUUID(), "tipo", "ENERGIA", "bairro", "Moema", "duracaoMinutos", -1));
        assertEquals("duracaoMinutos", post("/api/relatos", rel).corpo.path("campo").asText());
        rel.put("duracaoMinutos", 6); rel.put("gps", "dado que não deve ser gravado");
        assertEquals(400, post("/api/relatos", rel).status);
        rel.remove("gps");
        String corpo = json.writeValueAsString(rel);
        assertEquals(400, enviar("/api/relatos", corpo + " {}").status);
        assertEquals(400, enviar("/api/relatos", corpo.replace("\"Moema\"", "\"Moema\",\"bairro\":\"Saúde\"")).status);
        assertEquals(0, enviar("/api/observacoes?origem=COMUNIDADE", null).corpo.path("total").asInt());
        assertEquals(413, enviar("/api/relatos", "x".repeat(8200)).status);
        assertEquals(400, enviar("/api/alertas?size=51", null).status);
        assertEquals(400, enviar("/api/alertas?page=-1", null).status);
        assertEquals(400, enviar("/api/alertas?tipo=tudo", null).status);
        assertEquals(400, enviar("/api/alertas?bairro=ausente", null).status);
    }

    @Test void simuladorExigeConexaoLocalMesmoNoPerfilDemo() {
        var request = new org.springframework.mock.web.MockHttpServletRequest();
        request.setRemoteAddr("192.0.2.10");
        request.addHeader("X-Forwarded-For", "127.0.0.1");
        var api = new ApiDemonstracao(org.mockito.Mockito.mock(Monitoramento.class));
        var erro = assertThrows(Falha.class, () -> api.sensor(null, request));
        assertEquals(403, erro.status.value());
    }

    @Test void importacaoPublicaIdempotenteSemAlertaAtual() throws Exception {
        importador.run(null);
        var historico = enviar("/api/observacoes?origem=PUBLICA", null).corpo;
        assertEquals(4, historico.path("total").asInt());
        assertEquals(0, enviar("/api/alertas", null).corpo.path("total").asInt());
        var itens = historico.path("itens");
        assertTrue(itens.toString().contains("33,02 mm"));
        assertTrue(itens.toString().contains("29,1 °C"));
        for (var e : itens) {
            assertTrue(e.path("alertaId").isNull());
            assertEquals("ALTA", e.path("confianca").asText());
            assertTrue(e.path("descricao").asText().contains("3550308"));
        }
        var lista = new java.util.ArrayList<Contratos.Entrada>();
        var data = java.time.LocalDate.of(2025,2,1);
        ImportacaoPublica.medida(lista, data, "PRCP", "99.99", "G");
        ImportacaoPublica.medida(lista, data, "TEMP", "9999.9", "24");
        ImportacaoPublica.medida(lista, data, "PRCP", "1.30", "I");
        ImportacaoPublica.medida(lista, data, "TEMP", "84.4", "0");
        assertTrue(lista.isEmpty());
        assertEquals("UP", enviar("/actuator/health", null).corpo.path("status").asText());
    }

    @Test void eventoExpiradoFicaConsultavelPorId() throws Exception {
        var leitura = sensor();
        leitura.put("observadoEm", Instant.now().minusSeconds(3*3600).toString());
        var r = post("/api/demo/sensores", leitura);
        var painel = enviar("/api/alertas", null).corpo;
        assertEquals(0, painel.path("total").asInt());
        var detalhe = enviar("/api/alertas/" + r.corpo.path("alertaId").asLong(), null).corpo;
        assertFalse(detalhe.path("ativo").asBoolean(true));
    }
}
