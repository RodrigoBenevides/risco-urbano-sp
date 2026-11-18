package br.com.riscourbano;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT, properties="spring.datasource.url=jdbc:h2:mem:carga")
class CargaTest {
    @Autowired JdbcTemplate db;
    @Autowired ObjectMapper json;
    @LocalServerPort int porta;
    final HttpClient cliente = HttpClient.newHttpClient();

    @Test void milAlertasComDezLeitores() throws Exception {
        var t = OffsetDateTime.now(ZoneOffset.UTC).withNano(0);
        // Episódios independentes artificiais pressionam a consulta sem contornar a agregação na API pública.
        db.update("""
            INSERT INTO alerta (id,tipo,bairro,contexto,inicio,ultima)
            SELECT 10000+x,'ALAGAMENTO','Moema','SIMULADO',?,? FROM SYSTEM_RANGE(1,1000)
            """, t, t);
        db.update("""
            INSERT INTO observacao (chave,assinatura,alerta_id,tipo,bairro,origem,fonte,confianca,
                motivo_confianca,observado_em,recebido_em,descricao,impacto,valor,unidade)
            SELECT 'CARGA-'||x,'teste',10000+x,'ALAGAMENTO','Moema','SENSOR','Sensor simulado A','MEDIA',
                'Ensaio isolado',?,?,'22 cm de água em ensaio sintético.',3,22,'cm' FROM SYSTEM_RANGE(1,1000)
            """, t, t);
        var resultados = new ArrayList<Amostra>();
        for (int i = 0; i < 3; i++) consultar(i);
        try (var pool = Executors.newFixedThreadPool(10)) {
            var largada = new CyclicBarrier(10);
            var futuros = new ArrayList<Future<List<Amostra>>>();
            for (int leitor = 0; leitor < 10; leitor++) {
                int id = leitor;
                futuros.add(pool.submit(() -> {
                    largada.await(20,TimeUnit.SECONDS);
                    var serie = new ArrayList<Amostra>();
                    for (int i = 0; i < 5; i++) serie.add(new Amostra(id, i, consultar(i)));
                    return serie;
                }));
            }
            for (var f : futuros) resultados.addAll(f.get(90,TimeUnit.SECONDS));
        }
        var ordenadas = resultados.stream().map(Amostra::milissegundos).sorted().toList();
        Path pasta = Files.createDirectories(Path.of("target","indicadores"));
        var linhas = new ArrayList<>(List.of("leitor,rodada,latencia_ms"));
        for (var a : resultados) linhas.add(a.leitor + "," + a.rodada + "," + a.milissegundos);
        Files.write(pasta.resolve("carga.csv"), linhas);
        var limite = t.minusHours(2);
        String plano = db.queryForObject("EXPLAIN "+Observacoes.consultaAtivas(null,null),String.class,limite,limite);
        Files.writeString(pasta.resolve("plano-h2.txt"), plano);
        System.out.printf(Locale.ROOT,"CARGA|alertas=1000|leitores=10|amostras=50|p50_ms=%.2f|p95_ms=%.2f|max_ms=%.2f%n",
                ordenadas.get(24), ordenadas.get(47), ordenadas.getLast());
    }

    private double consultar(int pagina) throws Exception {
        var uri = URI.create("http://127.0.0.1:"+porta+"/api/alertas?page="+pagina+"&size=20");
        var req = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(15)).GET().build();
        long inicio = System.nanoTime();
        var res = cliente.send(req,HttpResponse.BodyHandlers.ofByteArray());
        double ms = (System.nanoTime()-inicio)/1_000_000d;
        assertEquals(200,res.statusCode());
        var painel = json.readTree(res.body());
        assertEquals(1000,painel.path("total").asInt());
        assertEquals(20,painel.path("itens").size());
        assertEquals(11000-pagina*20,painel.at("/itens/0/id").asInt());
        assertEquals(11000-pagina*20-19,painel.at("/itens/19/id").asInt());
        return ms;
    }

    record Amostra(int leitor, int rodada, double milissegundos) {}
}
