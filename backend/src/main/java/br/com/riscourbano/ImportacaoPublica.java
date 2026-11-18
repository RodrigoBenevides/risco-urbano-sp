package br.com.riscourbano;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.StringReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVRecord;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import static br.com.riscourbano.Contratos.*;

@Component
class ImportacaoPublica implements ApplicationRunner {
    private static final String ESTACAO = "83780099999";
    private static final String CSV = "congonhas-2025.csv";
    private static final String IBGE = "sao-paulo-ibge.json";
    private final ObjectMapper json;
    private final Monitoramento servico;
    ImportacaoPublica(ObjectMapper json, Monitoramento servico) { this.json = json; this.servico = servico; }

    @Override
    public void run(ApplicationArguments args) throws IOException, NoSuchAlgorithmException {
        JsonNode manifesto = json.readTree(recurso("manifesto.json"));
        byte[] csv = verificado(CSV, manifesto);
        JsonNode ibge = json.readTree(verificado(IBGE, manifesto));
        if (ibge.path("id").asInt() != 3550308 || !"São Paulo".equals(ibge.path("nome").asText())
                || !"SP".equals(ibge.at("/microrregiao/mesorregiao/UF/sigla").asText())) {
            throw new IllegalStateException("O recorte IBGE não identifica São Paulo/SP.");
        }
        var entradas = new ArrayList<Entrada>();
        var formato = CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).get();
        try (var registros = formato.parse(new StringReader(new String(csv, StandardCharsets.UTF_8)))) {
            for (CSVRecord registro : registros) {
                if (!ESTACAO.equals(registro.get("STATION"))) throw new IllegalStateException("Estação GSOD inesperada.");
                LocalDate data = LocalDate.parse(registro.get("DATE"));
                medida(entradas, data, "TEMP", registro.get("TEMP").strip(), registro.get("TEMP_ATTRIBUTES").strip());
                medida(entradas, data, "PRCP", registro.get("PRCP").strip(), registro.get("PRCP_ATTRIBUTES").strip());
            }
        }
        servico.importar(entradas);
    }

    static void medida(List<Entrada> destino, LocalDate data, String variavel, String raw, String atributo) {
        boolean chuva = variavel.equals("PRCP");
        BigDecimal bruto = new BigDecimal(raw);
        if (bruto.compareTo(new BigDecimal(chuva ? "99.99" : "9999.9")) == 0) return;
        // Para o recorte, usamos somente acumulado completo de 24h (G) ou média de temperatura com amostras.
        if (chuva && (!"G".equals(atributo) || bruto.signum() < 0)) return;
        if (!chuva && (!atributo.matches("[0-9]{1,2}") || Integer.parseInt(atributo) < 1)) return;
        BigDecimal valor = chuva ? bruto.multiply(new BigDecimal("25.4")).setScale(2, RoundingMode.HALF_UP)
                : bruto.subtract(new BigDecimal("32")).multiply(new BigDecimal("5"))
                       .divide(new BigDecimal("9"), 1, RoundingMode.HALF_UP);
        String unidade = chuva ? "mm" : "°C";
        String descricao = (chuva ? "Chuva acumulada" : "Temperatura média") + " no dia UTC " + data + ": "
                + Entradas.numero(valor) + " " + unidade + ". Original GSOD: " + raw + (chuva ? " in" : " °F")
                + ", atributo " + atributo + ". Município de São Paulo/SP (IBGE 3550308).";
        String chave = ESTACAO + "/" + data + "/" + variavel;
        destino.add(new Entrada(chave, Entradas.assinatura(chave + "/" + raw + "/" + atributo),
                chuva ? Tipo.ALAGAMENTO : Tipo.CALOR, "Campo Belo", Origem.PUBLICA, "NOAA GSOD · Congonhas (83780099999)",
                Nivel.ALTA, "Valor oficial rastreável da estação, com atributo aceito. Refere-se somente ao dia indicado.",
                data.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC).minusSeconds(1), descricao, 0, valor, unidade, null, null));
    }

    private byte[] verificado(String nome, JsonNode manifesto) throws IOException, NoSuchAlgorithmException {
        byte[] conteudo = recurso(nome);
        String sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(conteudo));
        for (JsonNode entrada : manifesto.path("arquivos"))
            if (nome.equals(entrada.path("arquivo").asText()) && sha.equals(entrada.path("sha256").asText()))
                return conteudo;
        throw new IllegalStateException("O arquivo de dados não confere com o manifesto: " + nome);
    }

    private static byte[] recurso(String nome) throws IOException {
        try (var input = new ClassPathResource("dados/" + nome).getInputStream()) { return input.readAllBytes(); }
    }
}
