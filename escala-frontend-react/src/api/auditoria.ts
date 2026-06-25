import { api } from './client';
import type { RegistroAuditoriaDTO, Page } from '../types';

export interface AuditoriaParams {
  modulo?: string;
  acao?: string;
  usuarioId?: number;
  de?: string;
  ate?: string;
  page?: number;
  size?: number;
}

export function getAuditoria(params: AuditoriaParams = {}): Promise<Page<RegistroAuditoriaDTO>> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') qs.set(k, String(v));
  });
  const query = qs.toString();
  return api.get<Page<RegistroAuditoriaDTO>>(`/api/auditoria${query ? `?${query}` : ''}`);
}
