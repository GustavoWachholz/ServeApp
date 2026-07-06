package com.servants.logging;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Prova concreta de que {@link SensitiveDataMasker} realmente redige senha, token,
 * e-mail e CPF — e que NÃO mascara texto legítimo que apenas menciona essas palavras
 * sem um valor associado (o que tornaria os logs inúteis).
 */
class SensitiveDataMaskerTest {

    @Test
    void mascaraSenhaEmFormatoJson() {
        String out = SensitiveDataMasker.mask("{\"email\":\"joao@teste.com\",\"senha\":\"MinhaSenh@123\"}");
        assertFalse(out.contains("MinhaSenh@123"), "senha não pode aparecer em texto plano");
        assertTrue(out.contains("\"senha\":\"***\""));
    }

    @Test
    void mascaraTokenEmFormatoQueryString() {
        String out = SensitiveDataMasker.mask("callback?token=abc123XYZ&outro=1");
        assertFalse(out.contains("abc123XYZ"));
        assertTrue(out.contains("token=***"));
        assertTrue(out.contains("&outro=1"), "campos não sensíveis ao lado não devem ser afetados");
    }

    @Test
    void mascaraCabecalhoAuthorizationBearer() {
        String jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.assinatura-fake";
        String out = SensitiveDataMasker.mask("Authorization: Bearer " + jwt);
        assertFalse(out.contains(jwt), "o JWT não pode sobreviver à mascara");
        assertTrue(out.contains("Bearer ***"));
    }

    @Test
    void mascaraEmail() {
        String out = SensitiveDataMasker.mask("Já existe um cadastro com o e-mail: joao.silva@example.com");
        assertFalse(out.contains("joao.silva@example.com"));
        assertTrue(out.contains("***@***"));
    }

    @Test
    void mascaraCpfComOuSemPontuacao() {
        assertEquals("CPF: ***.***.***-**", SensitiveDataMasker.mask("CPF: 123.456.789-01"));
        assertEquals("CPF: ***.***.***-**", SensitiveDataMasker.mask("CPF: 12345678901"));
    }

    @Test
    void naoMascaraMencaoSemValorAssociado() {
        String texto = "Login falhou: senha incorreta para o usuário.";
        assertEquals(texto, SensitiveDataMasker.mask(texto),
                "a palavra 'senha' sozinha (sem valor) não deve ser tocada — perderia utilidade do log");
    }

    @Test
    void lidaComEntradaNulaOuVazia() {
        assertEquals(null, SensitiveDataMasker.mask(null));
        assertEquals("", SensitiveDataMasker.mask(""));
    }
}
