package br.com.riscourbano;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static br.com.riscourbano.Contratos.*;

@Repository
class Observacoes {
    private final JdbcTemplate jdbc;
    Observacoes(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    static OffsetDateTime utc(Instant t) { return t == null ? null : t.atOffset(ZoneOffset.UTC); }

    static Evidencia ler(ResultSet r, int indice) throws SQLException {
        var referencia = r.getObject("referencia_em", OffsetDateTime.class);
        return new Evidencia(r.getLong("id"), r.getObject("alerta_id", Long.class), Tipo.valueOf(r.getString("tipo")),
                r.getString("bairro"), Origem.valueOf(r.getString("origem")), r.getString("fonte"),
                Nivel.valueOf(r.getString("confianca")), r.getString("motivo_confianca"),
                r.getObject("observado_em", OffsetDateTime.class).toInstant(),
                r.getObject("recebido_em", OffsetDateTime.class).toInstant(), r.getString("descricao"),
                r.getInt("impacto"), r.getBigDecimal("valor"), r.getString("unidade"),
                r.getBigDecimal("referencia"), referencia == null ? null : referencia.toInstant());
    }

    Gravacao gravar(Entrada e, Instant agora) {
        // A trava cobre seleção do episódio e da chave numa única transação, inclusive entre requisições concorrentes.
        jdbc.queryForObject("SELECT id FROM trava_ingestao WHERE id=1 FOR UPDATE", Integer.class);
        var existente = jdbc.query("SELECT id, alerta_id, assinatura FROM observacao WHERE origem=? AND chave=?",
                (r, i) -> {
                    if (!e.assinatura().equals(r.getString("assinatura")))
                        throw new Falha(HttpStatus.CONFLICT, "chave", "Esta chave já foi usada com conteúdo diferente.");
                    return new Recibo(r.getLong("id"), r.getObject("alerta_id", Long.class));
                }, e.origem().name(), e.chave());
        if (!existente.isEmpty()) return new Gravacao(existente.getFirst(), false);
        Long alerta = e.origem() == Origem.PUBLICA ? null : episodio(e);
        Long id = jdbc.queryForObject("""
            SELECT id FROM FINAL TABLE (INSERT INTO observacao
              (chave, assinatura, alerta_id, tipo, bairro, origem, fonte, confianca, motivo_confianca,
               observado_em, recebido_em, descricao, impacto, valor, unidade, referencia, referencia_em)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?))
            """, Long.class, e.chave(), e.assinatura(), alerta, e.tipo().name(), e.bairro(), e.origem().name(),
                e.fonte(), e.confianca().name(), e.motivoConfianca(), utc(e.observadoEm()), utc(agora),
                e.descricao(), e.impacto(), e.valor(), e.unidade(), e.referencia(), utc(e.referenciaEm()));
        return new Gravacao(new Recibo(id, alerta), true);
    }

    private long episodio(Entrada e) {
        String contexto = e.origem() == Origem.SENSOR ? "SIMULADO" : "REAL";
        var instante = utc(e.observadoEm());
        List<Long> candidatas = jdbc.queryForList("""
            SELECT id FROM alerta WHERE tipo=? AND bairro=? AND contexto=? AND ultima>=? AND inicio<=?
            ORDER BY ultima DESC, id DESC LIMIT 1
            """, Long.class, e.tipo().name(), e.bairro(), contexto,
                utc(e.observadoEm().minus(Prioridade.ATIVIDADE)), utc(e.observadoEm().plus(Prioridade.ATIVIDADE)));
        if (candidatas.isEmpty()) return jdbc.queryForObject("""
            SELECT id FROM FINAL TABLE (INSERT INTO alerta(tipo,bairro,contexto,inicio,ultima) VALUES (?,?,?,?,?))
            """, Long.class, e.tipo().name(), e.bairro(), contexto, instante, instante);
        long id = candidatas.getFirst();
        jdbc.update("UPDATE alerta SET inicio=LEAST(inicio,?), ultima=GREATEST(ultima,?) WHERE id=?", instante, instante, id);
        return id;
    }

    static String consultaAtivas(Tipo tipo, String bairro) {
        StringBuilder sql = new StringBuilder("""
                SELECT * FROM (SELECT o.*, ROW_NUMBER() OVER (
                PARTITION BY o.alerta_id,o.fonte ORDER BY o.observado_em DESC,o.id DESC) AS posicao
                FROM alerta a JOIN observacao o ON o.alerta_id=a.id
                WHERE a.ultima>=? AND o.observado_em>=?
                """);
        if (tipo != null) sql.append(" AND a.tipo=?");
        if (bairro != null) sql.append(" AND a.bairro=?");
        sql.append(") recentes WHERE posicao=1");
        return sql.toString();
    }

    List<Evidencia> evidenciasAtivas(Tipo tipo, String bairro, Instant limite) {
        List<Object> args = new ArrayList<>(List.of(utc(limite), utc(limite)));
        if (tipo != null) args.add(tipo.name());
        if (bairro != null) args.add(bairro);
        return jdbc.query(consultaAtivas(tipo, bairro), Observacoes::ler, args.toArray());
    }

    List<Evidencia> porAlerta(long id) {
        return jdbc.query("SELECT * FROM observacao WHERE alerta_id=? ORDER BY observado_em DESC, id DESC",
                Observacoes::ler, id);
    }

    Pagina<Evidencia> historico(Origem origem, int page, int size) {
        String filtro = origem == null ? "" : " WHERE origem=?";
        List<Object> args = new ArrayList<>();
        if (origem != null) args.add(origem.name());
        long total = jdbc.queryForObject("SELECT COUNT(*) FROM observacao" + filtro, Long.class, args.toArray());
        args.add(size); args.add((long)page * size);
        var itens = jdbc.query("SELECT * FROM observacao" + filtro + " ORDER BY observado_em DESC,id DESC LIMIT ? OFFSET ?",
                Observacoes::ler, args.toArray());
        return new Pagina<>(itens, total, page, size);
    }
}
