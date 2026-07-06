package com.servants.logging;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.encoder.PatternLayoutEncoder;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.LoggingEvent;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifica que {@link MaskingEncoder} de fato intercepta e mascara a saída de um
 * encoder real do Logback ({@link PatternLayoutEncoder}, o mesmo usado em produção
 * fora do perfil {@code prod}) — não apenas que a regex de {@link SensitiveDataMasker}
 * funciona isoladamente, mas que a integração via {@code logback-spring.xml} de fato
 * passa cada evento pela máscara antes de gravar.
 */
class MaskingEncoderTest {

    private LoggerContext context;

    @BeforeEach
    void setUp() {
        context = new LoggerContext();
        context.start();
    }

    @AfterEach
    void tearDown() {
        context.stop();
    }

    @Test
    void mascaraSaidaDeUmEncoderRealDelegado() {
        PatternLayoutEncoder delegate = new PatternLayoutEncoder();
        delegate.setContext(context);
        delegate.setPattern("%msg%n");

        MaskingEncoder encoder = new MaskingEncoder();
        encoder.setContext(context);
        encoder.setDelegate(delegate);
        encoder.start();

        Logger logger = context.getLogger("com.servants.TesteMascaramento");
        ILoggingEvent event = new LoggingEvent(
                MaskingEncoderTest.class.getName(), logger, Level.INFO,
                "login com senha: MinhaSenha123 do usuário joao@teste.com", null, null);

        String saida = new String(encoder.encode(event), StandardCharsets.UTF_8);

        assertFalse(saida.contains("MinhaSenha123"), "senha não pode chegar ao destino final do log");
        assertFalse(saida.contains("joao@teste.com"), "e-mail não pode chegar ao destino final do log");
        assertTrue(saida.contains("senha: ***"));

        encoder.stop();
    }
}
