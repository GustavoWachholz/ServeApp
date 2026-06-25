import { api } from './client';
import type { AvisoDTO, AvisoRequest } from '../types';

export const getAvisos = () => api.get<AvisoDTO[]>('/api/avisos');
export const createAviso = (data: AvisoRequest) =>
  api.post<AvisoDTO>('/api/avisos', data);
export const updateAviso = (id: number, data: AvisoRequest) =>
  api.put<AvisoDTO>(`/api/avisos/${id}`, data);
export const deleteAviso = (id: number) => api.delete(`/api/avisos/${id}`);
