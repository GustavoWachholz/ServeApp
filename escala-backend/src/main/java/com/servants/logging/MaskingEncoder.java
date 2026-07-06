package com.servants.logging;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.encoder.Encoder;
import ch.qos.logback.core.spi.ContextAwareBase;

import java.nio.charset.StandardCharsets;

/**
 * Decorator de {@link Encoder} que aplica {@link SensitiveDataMasker} sobre a saída
 * já formatada por um encoder delegado (texto ou JSON), antes de gravá-la no destino.
 *
 * <p>Envolve o delegado em vez de reimplementar a serialização — funciona igualmente
 * para {@code PatternLayoutEncoder} (console legível) e {@code LogstashEncoder} (JSON),
 * garantindo que a máscara se aplique independentemente do formato de saída escolhido
 * por perfil (ver {@code logback-spring.xml}).</p>
 */
public class MaskingEncoder extends ContextAwareBase implements Encoder<ILoggingEvent> {

    private Encoder<ILoggingEvent> delegate;
    private boolean started;

    /** Propriedade configurada via Joran: {@code <delegate class="...">} no XML. */
    public void setDelegate(Encoder<ILoggingEvent> delegate) {
        this.delegate = delegate;
    }

    @Override
    public byte[] headerBytes() {
        return delegate.headerBytes();
    }

    @Override
    public byte[] encode(ILoggingEvent event) {
        byte[] raw = delegate.encode(event);
        if (raw == null || raw.length == 0) return raw;
        String masked = SensitiveDataMasker.mask(new String(raw, StandardCharsets.UTF_8));
        return masked.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public byte[] footerBytes() {
        return delegate.footerBytes();
    }

    @Override
    public void start() {
        delegate.setContext(getContext());
        delegate.start();
        started = true;
    }

    @Override
    public void stop() {
        delegate.stop();
        started = false;
    }

    @Override
    public boolean isStarted() {
        return started;
    }
}
