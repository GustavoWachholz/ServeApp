import { api } from './client';
import type { AniversarianteDTO } from '../types';

export const getAniversariantes = () =>
  api.get<AniversarianteDTO[]>('/api/aniversariantes');
