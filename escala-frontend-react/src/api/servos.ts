import { api } from './client';
import type { ServoDTO } from '../types';

export const getServos = () => api.get<ServoDTO[]>('/api/servos');
export const getServo = (id: number) => api.get<ServoDTO>(`/api/servos/${id}`);
export const updateServo = (id: number, data: Partial<ServoDTO>) =>
  api.put<ServoDTO>(`/api/servos/${id}`, data);
