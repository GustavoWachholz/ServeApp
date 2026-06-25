import { api } from './client';
import type { DashboardResponse } from '../types';

export const getDashboard = () => api.get<DashboardResponse>('/api/dashboard');
