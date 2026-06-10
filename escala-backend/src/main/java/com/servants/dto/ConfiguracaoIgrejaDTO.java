package com.servants.dto;

/**
 * DTO de transporte dos dados institucionais da igreja entre frontend e backend.
 *
 * @param id        identificador (sempre 1 na prática; pode ser {@code null} no PUT).
 * @param nome      nome da igreja (título central do sistema).
 * @param telefone  telefone de contato.
 * @param endereco  endereço físico.
 * @param instagram perfil/URL do Instagram.
 * @param facebook  perfil/URL do Facebook.
 * @param whatsapp  número/URL do WhatsApp.
 * @param youtube   canal/URL do YouTube.
 * @param site      site institucional.
 */
public record ConfiguracaoIgrejaDTO(
    Long id,
    String nome,
    String telefone,
    String endereco,
    String instagram,
    String facebook,
    String whatsapp,
    String youtube,
    String site
) {}
