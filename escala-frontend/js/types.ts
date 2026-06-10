/**
 * types.ts — Tipos compartilhados pelo frontend da agenda (espelham os DTOs do backend).
 */

/**
 * Atribuição de um voluntário a uma função/área em uma escala.
 *
 * @property voluntarioId   identificador do voluntário.
 * @property funcao         nome da função/área.
 * @property voluntarioNome nome do voluntário (opcional; presente nas respostas).
 */
export interface AtribuicaoDTO {
  voluntarioId: number;
  funcao: string;
  voluntarioNome?: string;
}

/**
 * Escala (evento) trafegada entre o frontend da agenda e o backend.
 *
 * @property id            identificador (ausente ao criar).
 * @property titulo        título/nome do evento.
 * @property dataEscala    data e hora de início (ISO).
 * @property dataFim       data e hora de término (ISO), opcional.
 * @property classificacao chave da classificação/ministério.
 * @property cor           cor (hex) do evento.
 * @property status        status de preenchimento ("COMPLETO"/"INCOMPLETO"), opcional.
 * @property atribuicoes   lista de atribuições de voluntários.
 */
export interface EscalaDTO {
  id?: number;
  titulo: string;
  dataEscala: string;
  dataFim?: string;
  classificacao: string;
  cor: string;
  status?: string;
  atribuicoes: AtribuicaoDTO[];
}
