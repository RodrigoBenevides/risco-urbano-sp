package br.com.riscourbano;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import static br.com.riscourbano.Contratos.Erro;

@RestControllerAdvice
class ErrosHttp {
    @ExceptionHandler(Falha.class)
    ResponseEntity<Erro> negocio(Falha e) {
        return ResponseEntity.status(e.status).body(new Erro(e.getMessage(), e.campo));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Erro> corpo(HttpMessageNotReadableException ex) {
        Throwable causa = ex.getCause();
        String campo = "corpo";
        if (causa instanceof UnrecognizedPropertyException) {
            // Não refletir texto livre ou dados pessoais em resposta para campo desconhecido.
            return ResponseEntity.badRequest().body(new Erro("O formulário contém um campo não aceito.", campo));
        }
        if (causa instanceof JsonMappingException erro && !erro.getPath().isEmpty()) {
            String nome = erro.getPath().getFirst().getFieldName();
            if (nome != null) campo = nome;
        }
        return ResponseEntity.badRequest().body(new Erro("Confira o tipo e o formato do valor informado.", campo));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<Erro> parametro(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.badRequest().body(new Erro("Valor de consulta inválido.", ex.getName()));
    }
}
