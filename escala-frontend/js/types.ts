export interface AtribuicaoDTO {
  voluntarioId: number;
  funcao: string;
  voluntarioNome?: string;
}

export interface EscalaDTO {
  id?: number;
  titulo: string;
  dataEscala: string;
  classificacao: string;
  cor: string;
  status?: string;
  atribuicoes: AtribuicaoDTO[];
}
