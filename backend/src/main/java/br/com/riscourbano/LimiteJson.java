package br.com.riscourbano;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
class LimiteJson extends OncePerRequestFilter {
    static final int LIMITE = 8192;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        return !"POST".equals(req.getMethod()) || !req.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain cadeia)
            throws IOException, ServletException {
        byte[] corpo = req.getInputStream().readNBytes(LIMITE + 1);
        if (corpo.length > LIMITE) {
            res.setStatus(413);
            res.setContentType("application/json;charset=UTF-8");
            res.getWriter().write("{\"mensagem\":\"O limite do envio é de 8 KiB.\",\"campo\":\"corpo\"}");
            return;
        }
        var copia = new HttpServletRequestWrapper(req) {
            @Override public ServletInputStream getInputStream() {
                var stream = new ByteArrayInputStream(corpo);
                return new ServletInputStream() {
                    public int read() { return stream.read(); }
                    public int read(byte[] b, int off, int len) { return stream.read(b, off, len); }
                    public boolean isReady() { return true; }
                    public boolean isFinished() { return stream.available() == 0; }
                    public void setReadListener(ReadListener l) { throw new UnsupportedOperationException(); }
                };
            }
            @Override public java.io.BufferedReader getReader() {
                return new java.io.BufferedReader(new java.io.InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
            }
        };
        cadeia.doFilter(copia, res);
    }
}
