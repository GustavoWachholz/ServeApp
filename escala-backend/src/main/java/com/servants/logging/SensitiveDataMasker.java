package com.servants.logging;

import java.util.regex.Pattern;

/**
 * Mascara dados sensíveis em texto de log já formatado (mensagem, MDC e stack trace
 * juntos). Usado pelo {@link MaskingEncoder} como defesa em profundidade: mesmo que
 * um desenvolvedor logue por engano uma mensagem de exceção ou objeto contendo senha,
 * token ou dado pessoal, o valor nunca chega ao destino final do log em texto plano.
 *
 * <p>Cobre: pares chave/valor sensíveis (JSON, query string ou texto livre — senha,
 * password, token, secret, etc.), esquemas de autenticação ({@code Bearer}/{@code Basic}),
 * e-mail e CPF. Não mascara a palavra sozinha (ex.: "senha incorreta"), apenas quando
 * há de fato um valor associado.</p>
 */
public final class SensitiveDataMasker {

    private SensitiveDataMasker() {}

    /** {@code Authorization: Bearer <token>} / {@code Basic <credenciais>}. */
    private static final Pattern AUTH_SCHEME =
            Pattern.compile("(?i)\\b(Bearer|Basic)\\s+[A-Za-z0-9\\-_.+/=]+");

    /** Pares chave/valor sensíveis: {@code "senha": "..."}, {@code token=...}, etc. */
    private static final Pattern KEY_VALUE = Pattern.compile(
            "(?i)(\"?\\b(?:senha|password|pwd|token|secret|accessToken|refreshToken|jwt|apiKey|api_key)\\b\"?\\s*[:=]\\s*\"?)[^\"&,\\s}]+");

    /** CPF com ou sem separadores. */
    private static final Pattern CPF =
            Pattern.compile("\\b\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}\\b");

    private static final Pattern EMAIL =
            Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");

    public static String mask(String text) {
        if (text == null || text.isEmpty()) return text;
        String out = AUTH_SCHEME.matcher(text).replaceAll("$1 ***");
        out = KEY_VALUE.matcher(out).replaceAll("$1***");
        out = CPF.matcher(out).replaceAll("***.***.***-**");
        out = EMAIL.matcher(out).replaceAll("***@***");
        return out;
    }
}
