import { api } from './client';
import type { NotificacaoDTO } from '../types';

export const getNotificacoes = () => api.get<NotificacaoDTO[]>('/api/notificacoes');

export const getContagemNaoLidas = () =>
  api.get<{ total: number }>('/api/notificacoes/nao-lidas/contagem');

export const marcarNotificacaoLida = (id: number) =>
  api.put<NotificacaoDTO>(`/api/notificacoes/${id}/lida`, {});

export const deleteNotificacao = (id: number) => api.delete(`/api/notificacoes/${id}`);
