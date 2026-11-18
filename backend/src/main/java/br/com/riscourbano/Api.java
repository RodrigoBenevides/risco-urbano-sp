package br.com.riscourbano;

import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;
import java.net.UnknownHostException;
import org.springframework.http.HttpStatus;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import static br.com.riscourbano.Contratos.*;

@RestController
@RequestMapping("/api")
class Api {
    private final Monitoramento servico;
    Api(Monitoramento servico) { this.servico = servico; }

    @GetMapping("/alertas")
    Painel alertas(@RequestParam(required=false) Tipo tipo, @RequestParam(required=false) String bairro,
                  @RequestParam(required=false) Nivel prioridade, @RequestParam(defaultValue="0") int page,
                  @RequestParam(defaultValue="50") int size) {
        return servico.painel(tipo, bairro, prioridade, page, size);
    }

    @GetMapping("/resumo")
    Map<String,Object> resumo(@RequestParam(required=false) Tipo tipo, @RequestParam(required=false) String bairro,
                              @RequestParam(required=false) Nivel prioridade) {
        var p = servico.painel(tipo, bairro, prioridade, 0, 1);
        return Map.of("total", p.total(), "contagens", p.contagens(), "atualizadoEm", p.atualizadoEm());
    }

    @GetMapping("/alertas/{id}")
    Alerta detalhe(@PathVariable long id) { return servico.detalhe(id); }

    @GetMapping("/observacoes")
    Pagina<Evidencia> historico(@RequestParam(required=false) Origem origem, @RequestParam(defaultValue="0") int page,
                               @RequestParam(defaultValue="20") int size) {
        return servico.historico(origem, page, size);
    }

    @PostMapping(value="/relatos", consumes="application/json")
    ResponseEntity<Recibo> relatar(@RequestBody Relato relato) { return resposta(servico.relatar(relato)); }

    static ResponseEntity<Recibo> resposta(Gravacao resultado) {
        return ResponseEntity.status(resultado.nova() ? 201 : 200).body(resultado.recibo());
    }
}

@RestController
@Profile("demo")
@RequestMapping("/api/demo")
class ApiDemonstracao {
    private final Monitoramento servico;
    ApiDemonstracao(Monitoramento servico) { this.servico = servico; }

    @PostMapping(value="/sensores", consumes="application/json")
    ResponseEntity<Recibo> sensor(@RequestBody Medicao medicao, HttpServletRequest request) throws UnknownHostException {
        if (!InetAddress.getByName(request.getRemoteAddr()).isLoopbackAddress())
            throw new Falha(HttpStatus.FORBIDDEN, "origem", "A simulação só está disponível no computador que executa a API.");
        return Api.resposta(servico.simular(medicao));
    }
}
