import { api } from './client';
import type { EscalaDTO } from '../types';

export const getEscalas = () => api.get<EscalaDTO[]>('/api/escalas');
export const getEscala = (id: number) => api.get<EscalaDTO>(`/api/escalas/${id}`);
export const createEscala = (data: Partial<EscalaDTO>) =>
  api.post<EscalaDTO>('/api/escalas', data);
export const updateEscala = (id: number, data: Partial<EscalaDTO>) =>
  api.put<EscalaDTO>(`/api/escalas/${id}`, data);
export const deleteEscala = (id: number) => api.delete(`/api/escalas/${id}`);
