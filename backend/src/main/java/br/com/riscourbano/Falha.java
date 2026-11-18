package br.com.riscourbano;

import org.springframework.http.HttpStatus;

final class Falha extends RuntimeException {
    final HttpStatus status;
    final String campo;

    Falha(HttpStatus status, String campo, String mensagem) {
        super(mensagem);
        this.status = status;
        this.campo = campo;
    }

    static Falha campo(String nome, String mensagem) {
        return new Falha(HttpStatus.BAD_REQUEST, nome, mensagem);
    }
}
