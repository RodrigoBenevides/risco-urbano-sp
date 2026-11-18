package br.com.riscourbano;

import java.time.Instant;
import java.util.ArrayList;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvFileSource;
import static br.com.riscourbano.Contratos.*;
import static org.junit.jupiter.api.Assertions.*;

class PrioridadeTest {
    static final Instant AGORA = Instant.parse("2026-11-18T18:00:00Z");

    @ParameterizedTest(name="{0} → {7}")
    @CsvFileSource(resources="/casos-prioridade.csv", numLinesToSkip=1)
    void comparaRotulos(String nome, Tipo tipo, double valor, int idade, Origem origem, String segunda,
                       int pontos, Nivel esperado, boolean ativo) {
        var registros = new ArrayList<Evidencia>();
        int impacto = Prioridade.impacto(tipo, valor);
        Instant instante = AGORA.minusSeconds(idade * 60L);
        registros.add(evidencia(1, tipo, origem, "A", impacto, instante));
        if (!segunda.equals("NENHUMA")) {
            String fonte = segunda.equals("INDEPENDENTE") || segunda.equals("DIVERGENTE") ? "B" : "A";
            int outroImpacto = segunda.equals("DIVERGENTE") || segunda.equals("RECUO") ? 1 : impacto;
            registros.add(evidencia(2, tipo, origem, fonte, outroImpacto, instante));
        }
        var alerta = Prioridade.avaliar(1, registros, AGORA);
        assertAll(() -> assertEquals(esperado, alerta.prioridade()), () -> assertEquals(pontos, alerta.pontos()),
                () -> assertEquals(ativo, alerta.ativo()));
        System.out.printf("RUBRICA|%s|%s|%s|%d|%s%n", nome, esperado, alerta.prioridade(), alerta.pontos(), alerta.ativo());
    }

    static Evidencia evidencia(long id, Tipo tipo, Origem origem, String fonte, int impacto, Instant instante) {
        return new Evidencia(id, 1L, tipo, "Saúde", origem, fonte, Nivel.MEDIA, "Teste",
                instante, instante, "Cenário controlado.", impacto, null, null, null, null);
    }
}
