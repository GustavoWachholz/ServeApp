import {
  createContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { getIgreja } from '../api/igreja';
import type { ConfiguracaoIgrejaDTO } from '../types';

interface IgrejaContextValue {
  igreja: ConfiguracaoIgrejaDTO | null;
  isLoading: boolean;
}

export const IgrejaContext = createContext<IgrejaContextValue | null>(null);

export function IgrejaProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['igreja'],
    queryFn: getIgreja,
    staleTime: 5 * 60 * 1000,
  });

  const value = useMemo(
    () => ({ igreja: data ?? null, isLoading }),
    [data, isLoading]
  );

  return <IgrejaContext.Provider value={value}>{children}</IgrejaContext.Provider>;
}
