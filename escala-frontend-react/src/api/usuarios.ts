import { api } from './client';
import type { UsuarioListItemDTO, PerfilDTO, PermissaoDTO } from '../types';

export const getUsuarios = () => api.get<UsuarioListItemDTO[]>('/api/usuarios');
export const getMe = () => api.get<PerfilDTO>('/api/usuarios/me');
export const getUsuario = (id: number) => api.get<PerfilDTO>(`/api/usuarios/${id}`);
export const updatePermissoes = (id: number, permissoes: PermissaoDTO[]) =>
  api.put(`/api/usuarios/${id}/permissoes`, { permissoes });
export const updatePerfil = (id: number, data: Partial<PerfilDTO>) =>
  api.put<PerfilDTO>(`/api/usuarios/${id}/perfil`, data);
export const updateSenha = (id: number, senhaAtual: string, novaSenha: string) =>
  api.put(`/api/usuarios/${id}/senha`, { senhaAtual, novaSenha });
export const vincularServo = (id: number, servoId: number | null) =>
  api.put(`/api/usuarios/${id}/vincular-servo`, { servoId });
export const deleteUsuario = (id: number) => api.delete(`/api/usuarios/${id}`);
