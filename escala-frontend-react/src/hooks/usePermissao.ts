import { useAuth } from './useAuth';

export function usePermissao(tela: string) {
  const { podeAcessar, podeCriar, podeEditar, podeExcluir, isAdmin } = useAuth();
  return {
    acessar: podeAcessar(tela),
    criar: podeCriar(tela),
    editar: podeEditar(tela),
    excluir: podeExcluir(tela),
    admin: isAdmin(),
  };
}
