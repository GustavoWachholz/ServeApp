package com.servants;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Classe de entrada (bootstrap) da aplicação Spring Boot do backend de escalas.
 * A anotação {@link SpringBootApplication} habilita autoconfiguração, varredura de
 * componentes e configuração baseada em propriedades.
 */
@SpringBootApplication
@EnableScheduling
public class EscalaBackendApplication {

	/**
	 * Ponto de entrada da aplicação: inicia o contexto Spring Boot.
	 *
	 * @param args argumentos de linha de comando repassados ao Spring.
	 */
	public static void main(String[] args) {
		SpringApplication.run(EscalaBackendApplication.class, args);
	}

}
