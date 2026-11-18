package br.com.riscourbano;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class Contratos {
    private Contratos() {}

    public enum Tipo { ALAGAMENTO, CALOR, ENERGIA }
    public enum Origem { SENSOR, PUBLICA, COMUNIDADE }
    public enum Nivel { BAIXA, MEDIA, ALTA }
    public enum Sensor { SENSOR_A, SENSOR_B }

    public record Relato(UUID chave, String bairro, Tipo tipo, Integer duracaoMinutos) {}
    public record Medicao(UUID chave, String bairro, Tipo tipo, BigDecimal valor, String unidade,
                          BigDecimal referencia, Instant observadoEm, Instant referenciaEm, Sensor fonte) {}
    public record Recibo(long id, Long alertaId) {}
    record Gravacao(Recibo recibo, boolean nova) {}
    record Entrada(String chave, String assinatura, Tipo tipo, String bairro, Origem origem,
                   String fonte, Nivel confianca, String motivoConfianca, Instant observadoEm,
                   String descricao, int impacto, BigDecimal valor, String unidade,
                   BigDecimal referencia, Instant referenciaEm) {}

    public record Evidencia(long id, Long alertaId, Tipo tipo, String bairro, Origem origem, String fonte,
                            Nivel confianca, String motivoConfianca, Instant observadoEm, Instant recebidoEm,
                            String descricao, int impacto, BigDecimal valor, String unidade,
                            BigDecimal referencia, Instant referenciaEm) {}
    public record Alerta(long id, Tipo tipo, String bairro, Nivel prioridade, int pontos, int impacto,
                         Instant observadoEm, String titulo, List<String> motivos,
                         List<Evidencia> evidencias, boolean ativo) {}
    public record Pagina<T>(List<T> itens, long total, int page, int size) {}
    public record Painel(List<Alerta> itens, long total, int page, int size, Instant atualizadoEm,
                         Map<Nivel,Long> contagens) {}
    public record Erro(String mensagem, String campo) {}
}
