import { api } from './client';
import type { IndisponibilidadeDTO, IndisponibilidadeRequest, EscalaConflitoDTO } from '../types';

export const getMinhasIndisponibilidades = () =>
  api.get<IndisponibilidadeDTO[]>('/api/indisponibilidades');

export const createIndisponibilidade = (data: IndisponibilidadeRequest) =>
  api.post<IndisponibilidadeDTO>('/api/indisponibilidades', data);

export const updateIndisponibilidade = (id: number, data: IndisponibilidadeRequest) =>
  api.put<IndisponibilidadeDTO>(`/api/indisponibilidades/${id}`, data);

export const deleteIndisponibilidade = (id: number) =>
  api.delete(`/api/indisponibilidades/${id}`);

/** Ids dos servos indisponíveis no intervalo (autocomplete da Agenda). Datas em `YYYY-MM-DD`. */
export const getServosIndisponiveis = (de: string, ate: string) =>
  api.get<number[]>(`/api/indisponibilidades/servos?de=${de}&ate=${ate}`);

/** Escalas do próprio servo no intervalo (modal de confirmação). Datas em `YYYY-MM-DD`. */
export const getConflitos = (de: string, ate: string) =>
  api.get<EscalaConflitoDTO[]>(`/api/indisponibilidades/conflitos?de=${de}&ate=${ate}`);

/** Indisponibilidades de todos os servos no intervalo (modal do mês na Agenda). Datas em `YYYY-MM-DD`. */
export const getIndisponibilidadesIntervalo = (de: string, ate: string) =>
  api.get<IndisponibilidadeDTO[]>(`/api/indisponibilidades/intervalo?de=${de}&ate=${ate}`);
