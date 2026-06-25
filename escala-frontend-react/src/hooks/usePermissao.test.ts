import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { AuthContext } from '../context/AuthContext';
import { usePermissao } from './usePermissao';
import type { PermissaoDTO } from '../types';

function makePermissao(tela: string, flags: Partial<PermissaoDTO>): PermissaoDTO {
  return { tela, acessar: false, criar: false, editar: false, excluir: false, ...flags };
}

function buildWrapper(permissoes: PermissaoDTO[], adminRole = false) {
  const isAdmin = vi.fn().mockReturnValue(adminRole);
  const podeAcessar = (tela: string) =>
    adminRole || (permissoes.find((p) => p.tela === tela)?.acessar ?? false);
  const podeCriar = (tela: string) =>
    adminRole || (permissoes.find((p) => p.tela === tela)?.criar ?? false);
  const podeEditar = (tela: string) =>
    adminRole || (permissoes.find((p) => p.tela === tela)?.editar ?? false);
  const podeExcluir = (tela: string) =>
    adminRole || (permissoes.find((p) => p.tela === tela)?.excluir ?? false);

  const contextValue = {
    session: {
      id: 1, nome: 'Test', email: 't@t.com', tema: 'light',
      corPrimaria: '#fff', role: adminRole ? 'ADMIN' : 'VOLUNTARIO',
      permissoes, token: 'tok',
    },
    foto: null,
    isAdmin,
    podeAcessar,
    podeCriar,
    podeEditar,
    podeExcluir,
    salvarSessao: vi.fn(),
    atualizarFoto: vi.fn(),
    logout: vi.fn(),
  };

  return ({ children }: { children: ReactNode }) =>
    React.createElement(AuthContext.Provider, { value: contextValue }, children);
}

describe('usePermissao – permission matrix', () => {
  it('returns false for all flags when user has no permission on tela', () => {
    const { result } = renderHook(() => usePermissao('AGENDA'), {
      wrapper: buildWrapper([makePermissao('SERVOS', { acessar: true })]),
    });
    expect(result.current.acessar).toBe(false);
    expect(result.current.criar).toBe(false);
  });

  it('returns correct flags from permission matrix', () => {
    const { result } = renderHook(() => usePermissao('AGENDA'), {
      wrapper: buildWrapper([makePermissao('AGENDA', { acessar: true, criar: true })]),
    });
    expect(result.current.acessar).toBe(true);
    expect(result.current.criar).toBe(true);
    expect(result.current.editar).toBe(false);
  });

  it('admin returns true for all flags regardless of permissoes', () => {
    const { result } = renderHook(() => usePermissao('AGENDA'), {
      wrapper: buildWrapper([], true),
    });
    expect(result.current.acessar).toBe(true);
    expect(result.current.criar).toBe(true);
    expect(result.current.editar).toBe(true);
    expect(result.current.excluir).toBe(true);
  });
});
