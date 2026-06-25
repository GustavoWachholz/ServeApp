import { api } from './client';
import type { ConfiguracaoIgrejaDTO } from '../types';

export const getIgreja = () => api.get<ConfiguracaoIgrejaDTO>('/api/igreja');
export const updateIgreja = (data: Partial<ConfiguracaoIgrejaDTO>) =>
  api.put<ConfiguracaoIgrejaDTO>('/api/igreja', data);
