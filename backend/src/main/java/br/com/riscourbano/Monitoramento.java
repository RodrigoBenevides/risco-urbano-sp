package br.com.riscourbano;

import java.time.Clock;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import static br.com.riscourbano.Contratos.*;

@Service
class Monitoramento {
    private final Observacoes dados;
    private final Clock relogio;
    Monitoramento(Observacoes dados, Clock relogio) { this.dados = dados; this.relogio = relogio; }

    @Transactional
    public Gravacao relatar(Relato relato) {
        var agora = relogio.instant();
        return dados.gravar(Entradas.relato(relato, agora), agora);
    }

    @Transactional
    public Gravacao simular(Medicao medicao) {
        var agora = relogio.instant();
        return dados.gravar(Entradas.sensor(medicao, agora), agora);
    }

    @Transactional
    public void importar(List<Entrada> entradas) {
        for (Entrada entrada : entradas) dados.gravar(entrada, relogio.instant());
    }

    @Transactional(readOnly=true)
    public Painel painel(Tipo tipo, String bairro, Nivel prioridade, int page, int size) {
        paginaValida(page, size);
        if (bairro != null) Entradas.checarBairro(bairro);
        var agora = relogio.instant();
        Map<Long,List<Evidencia>> grupos = dados.evidenciasAtivas(tipo, bairro, agora.minus(Prioridade.ATIVIDADE))
                .stream().collect(Collectors.groupingBy(Evidencia::alertaId));
        var ativos = grupos.entrySet().stream().map(e -> Prioridade.avaliar(e.getKey(), e.getValue(), agora))
                .filter(a -> prioridade == null || a.prioridade() == prioridade).sorted(Prioridade.ORDEM).toList();
        var contagens = new EnumMap<Nivel,Long>(Nivel.class);
        for (Nivel nivel : Nivel.values()) contagens.put(nivel, 0L);
        for (Alerta a : ativos) contagens.merge(a.prioridade(), 1L, Long::sum);
        var itens = ativos.stream().skip((long)page * size).limit(size).toList();
        return new Painel(itens, ativos.size(), page, size, agora, contagens);
    }

    @Transactional(readOnly=true)
    public Alerta detalhe(long id) {
        var evidencias = dados.porAlerta(id);
        if (evidencias.isEmpty()) throw new Falha(HttpStatus.NOT_FOUND, "id", "Alerta não encontrado.");
        return Prioridade.avaliar(id, evidencias, relogio.instant());
    }

    @Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
    public Pagina<Evidencia> historico(Origem origem, int page, int size) {
        paginaValida(page, size);
        return dados.historico(origem, page, size);
    }

    private static void paginaValida(int page, int size) {
        if (page < 0) throw Falha.campo("page", "A página começa em zero.");
        if (size < 1 || size > 50) throw Falha.campo("size", "Escolha uma página de 1 a 50 itens.");
    }
}
