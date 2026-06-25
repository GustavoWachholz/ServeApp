import { api } from './client';
import type { FrequenciaDTO } from '../types';

export const getFrequencia = (de: string, ate: string) =>
  api.get<FrequenciaDTO[]>(`/api/relatorios/frequencia?de=${de}&ate=${ate}`);
