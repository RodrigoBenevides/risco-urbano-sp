package br.com.riscourbano;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import static br.com.riscourbano.Contratos.*;

final class Prioridade {
    static final Duration ATIVIDADE = Duration.ofHours(2);
    static final Duration RECENTE = Duration.ofMinutes(30);
    static final Comparator<Alerta> ORDEM = Comparator.comparing(Alerta::prioridade)
            .thenComparingInt(Alerta::pontos).thenComparing(Alerta::observadoEm)
            .thenComparingLong(Alerta::id).reversed();
    private static final Comparator<Evidencia> MAIS_NOVA = Comparator.comparing(Evidencia::observadoEm)
            .thenComparingLong(Evidencia::id).reversed();

    private Prioridade() {}

    static int impacto(Tipo tipo, double intensidade) {
        int minimoMedio = switch (tipo) { case ALAGAMENTO -> 5; case CALOR -> 2; case ENERGIA -> 15; };
        int minimoAlto = switch (tipo) { case ALAGAMENTO -> 20; case CALOR -> 4; case ENERGIA -> 60; };
        if (intensidade >= minimoAlto) return 3;
        return intensidade >= minimoMedio ? 2 : 1;
    }

    static Alerta avaliar(long id, List<Evidencia> observacoes, Instant agora) {
        List<Evidencia> historico = observacoes.stream().sorted(MAIS_NOVA).toList();
        boolean ativo = !historico.getFirst().observadoEm().isBefore(agora.minus(ATIVIDADE));
        Map<String,Evidencia> ultimas = new LinkedHashMap<>();
        for (Evidencia e : historico) {
            if (ativo && e.observadoEm().isBefore(agora.minus(ATIVIDADE))) continue;
            ultimas.putIfAbsent(e.fonte(), e);
        }
        Alerta melhor = null;
        for (Evidencia e : ultimas.values()) {
            boolean recente = !e.observadoEm().isBefore(agora.minus(RECENTE));
            boolean confirmado = ultimas.values().stream().anyMatch(outra -> independente(e, outra));
            int pontos = 2 * e.impacto() + (recente ? 1 : 0) + (confirmado ? 1 : 0);
            Nivel nivel = pontos >= 7 ? Nivel.ALTA : pontos >= 5 ? Nivel.MEDIA : Nivel.BAIXA;
            boolean limitado = nivel == Nivel.ALTA && e.origem() == Origem.COMUNIDADE && !confirmado;
            if (limitado) nivel = Nivel.MEDIA;
            var motivos = new ArrayList<String>();
            motivos.add("Impacto " + e.impacto() + " de 3. " + e.descricao());
            motivos.add(recente ? "Leitura nos últimos 30 minutos (+1)." : "Leitura com mais de 30 minutos (+0).");
            motivos.add(confirmado ? "Outra fonte independente sustenta o impacto (+1)." : "Sem confirmação independente (+0).");
            if (limitado) motivos.add("Relato comunitário isolado tem prioridade máxima média.");
            String titulo = switch (e.tipo()) {
                case ALAGAMENTO -> "Água acumulada na via";
                case CALOR -> "Indício de ilha de calor";
                case ENERGIA -> "Interrupção de energia";
            };
            var candidato = new Alerta(id, e.tipo(), e.bairro(), nivel, pontos, e.impacto(), e.observadoEm(),
                    titulo, List.copyOf(motivos), historico, ativo);
            if (melhor == null || ORDEM.compare(candidato, melhor) < 0) melhor = candidato;
        }
        return melhor;
    }

    private static boolean independente(Evidencia a, Evidencia b) {
        return a.origem() == Origem.SENSOR && b.origem() == Origem.SENSOR && !a.fonte().equals(b.fonte())
                && b.impacto() >= a.impacto()
                && Duration.between(a.observadoEm(), b.observadoEm()).abs().compareTo(RECENTE) <= 0;
    }
}
