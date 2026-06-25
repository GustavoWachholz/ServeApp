import { api } from './client';
import type { UsuarioResponseDTO, CadastroRequest } from '../types';

export function login(email: string, senha: string): Promise<UsuarioResponseDTO> {
  return api.post<UsuarioResponseDTO>('/api/auth/login', { email, senha });
}

export function cadastro(data: CadastroRequest): Promise<UsuarioResponseDTO> {
  return api.post<UsuarioResponseDTO>('/api/auth/cadastro', data);
}

export function logout(): Promise<void> {
  return api.post<void>('/api/auth/logout');
}
