import { api } from './client';
import type { AreaDTO } from '../types';

export const getAreas = () => api.get<AreaDTO[]>('/api/areas');
export const getArea = (id: number) => api.get<AreaDTO>(`/api/areas/${id}`);
export const createArea = (data: Omit<AreaDTO, 'id' | 'liderNome' | 'coLiderNome'>) =>
  api.post<AreaDTO>('/api/areas', data);
export const updateArea = (id: number, data: Partial<AreaDTO>) =>
  api.put<AreaDTO>(`/api/areas/${id}`, data);
export const deleteArea = (id: number) => api.delete(`/api/areas/${id}`);
