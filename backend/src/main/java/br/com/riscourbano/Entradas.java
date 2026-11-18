package br.com.riscourbano;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Set;
import java.util.UUID;
import static br.com.riscourbano.Contratos.*;

final class Entradas {
    static final Set<String> BAIRROS = Set.of("Vila Mariana", "Saúde", "Moema", "Campo Belo");
    private Entradas() {}

    static void checarBairro(String bairro) {
        if (bairro == null || !BAIRROS.contains(bairro))
            throw Falha.campo("bairro", "Escolha um bairro atendido pelo projeto.");
    }

    static String assinatura(String conteudo) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(conteudo.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static void comuns(UUID chave, String bairro, Tipo tipo) {
        if (chave == null) throw Falha.campo("chave", "Informe uma chave UUID para este envio.");
        checarBairro(bairro);
        if (tipo == null) throw Falha.campo("tipo", "Escolha a categoria da ocorrência.");
    }

    static Entrada relato(Relato r, Instant agora) {
        comuns(r.chave(), r.bairro(), r.tipo());
        boolean energia = r.tipo() == Tipo.ENERGIA;
        if (energia && (r.duracaoMinutos() == null || r.duracaoMinutos() < 0 || r.duracaoMinutos() > 10080))
            throw Falha.campo("duracaoMinutos", "Informe a duração entre 0 e 10.080 minutos.");
        if (!energia && r.duracaoMinutos() != null)
            throw Falha.campo("duracaoMinutos", "Use a duração apenas para interrupção de energia.");
        String descricao = switch (r.tipo()) {
            case ENERGIA -> "Falta de energia relatada há " + r.duracaoMinutos() + " min.";
            case ALAGAMENTO -> "Pessoa no bairro relatou água acumulada na via.";
            case CALOR -> "Pessoa no bairro relatou calor intenso.";
        };
        return new Entrada(r.chave().toString(), assinatura(r.toString()), r.tipo(), r.bairro(),
                Origem.COMUNIDADE, "Relato comunitário", Nivel.BAIXA, "Relato anônimo, sem verificação independente.",
                agora, descricao, energia ? Prioridade.impacto(r.tipo(), r.duracaoMinutos()) : 1,
                energia ? BigDecimal.valueOf(r.duracaoMinutos()) : null, energia ? "min" : null, null, null);
    }

    static Entrada sensor(Medicao m, Instant agora) {
        comuns(m.chave(), m.bairro(), m.tipo());
        if (m.tipo() == Tipo.ENERGIA) throw Falha.campo("tipo", "Sensores medem água ou temperatura.");
        Instant quando = m.observadoEm() == null ? agora : m.observadoEm();
        checarInstante(quando, agora, "observadoEm");
        boolean agua = m.tipo() == Tipo.ALAGAMENTO;
        String unidade = agua ? "cm" : "°C";
        if (!unidade.equals(m.unidade())) throw Falha.campo("unidade", "Use a unidade " + unidade + ".");
        medida(m.valor(), agua ? 0 : -20, agua ? 500 : 65, "valor");
        BigDecimal intensidade = m.valor();
        String descricao;
        Instant ref = null;
        if (agua) {
            if (m.referencia() != null || m.referenciaEm() != null)
                throw Falha.campo("referencia", "A leitura de água não utiliza referência térmica.");
            descricao = numero(m.valor()) + " cm de água sobre a via (simulação).";
        } else {
            medida(m.referencia(), -20, 65, "referencia");
            ref = m.referenciaEm() == null ? quando : m.referenciaEm();
            checarInstante(ref, agora, "referenciaEm");
            if (Duration.between(quando, ref).abs().compareTo(Duration.ofMinutes(5)) > 0)
                throw Falha.campo("referenciaEm", "As leituras pareadas devem diferir em até 5 minutos.");
            intensidade = m.valor().subtract(m.referencia());
            descricao = "Zona urbana " + numero(m.valor()) + " °C e referência " + numero(m.referencia())
                    + " °C. Diferença de " + numero(intensidade) + " °C (par simulado).";
        }
        String sensor = m.fonte() == Sensor.SENSOR_B ? "B" : "A";
        return new Entrada(m.chave().toString(), assinatura(m.toString()), m.tipo(), m.bairro(), Origem.SENSOR,
                "Sensor simulado " + sensor, Nivel.MEDIA, "Simulação identificada, com unidade e faixa validadas.",
                quando, descricao, Prioridade.impacto(m.tipo(), intensidade.doubleValue()), m.valor(), unidade, m.referencia(), ref);
    }

    private static void checarInstante(Instant valor, Instant agora, String campo) {
        if (valor.isBefore(Instant.parse("2000-01-01T00:00:00Z")) || valor.isAfter(agora.plusSeconds(120)))
            throw Falha.campo(campo, "Use um horário a partir de 2000 e até dois minutos à frente do servidor.");
    }

    private static void medida(BigDecimal valor, int min, int max, String campo) {
        if (valor == null || valor.compareTo(BigDecimal.valueOf(min)) < 0 || valor.compareTo(BigDecimal.valueOf(max)) > 0
                || valor.stripTrailingZeros().scale() > 3)
            throw Falha.campo(campo, "Informe uma medida entre " + min + " e " + max + ", com até três casas decimais.");
    }

    static String numero(BigDecimal valor) {
        return valor.setScale(3, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString().replace('.', ',');
    }
}
