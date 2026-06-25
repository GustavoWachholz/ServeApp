import { api } from './client';
import type { MinisterioDTO, MinisterioRequest } from '../types';

export const getMinisterios = () => api.get<MinisterioDTO[]>('/api/ministerios');
// O backend identifica o ministério pela CHAVE de classificação (string), não pelo id numérico.
export const getMinisterio = (classificacao: string) =>
  api.get<MinisterioDTO>(`/api/ministerios/${encodeURIComponent(classificacao)}`);
export const createMinisterio = (data: MinisterioRequest) =>
  api.post<MinisterioDTO>('/api/ministerios', data);
export const updateMinisterio = (classificacao: string, data: MinisterioRequest) =>
  api.put<MinisterioDTO>(`/api/ministerios/${encodeURIComponent(classificacao)}`, data);
export const deleteMinisterio = (classificacao: string) =>
  api.delete(`/api/ministerios/${encodeURIComponent(classificacao)}`);
