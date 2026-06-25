import { useContext } from 'react';
import { IgrejaContext } from '../context/IgrejaContext';

export function useIgreja() {
  const ctx = useContext(IgrejaContext);
  if (!ctx) throw new Error('useIgreja must be used within IgrejaProvider');
  return ctx;
}
