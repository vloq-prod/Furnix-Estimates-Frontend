import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import type { ModuleMaster, SelectableModule } from '@/types';

/** Write-side shape. Prices are numbers going in and Decimal strings coming back. */
export interface ModuleInput {
  code?: string;
  name?: string;
  description?: string | null;
  cloudSetupFee?: number;
  selfHostedSetupFee?: number;
  monthlyPricePerUser?: number;
  isActive?: boolean;
  sequence?: number;
}

export interface ModuleListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: 'true' | 'false' | 'all';
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export function useModules(query: ModuleListQuery = {}) {
  return useQuery({
    queryKey: queryKeys.modules(query),
    queryFn: () => api.list<ModuleMaster>('/modules', query as Record<string, string | number>),
  });
}

/** Active modules for the estimate builder picker. */
export function useSelectableModules() {
  return useQuery({
    queryKey: queryKeys.selectableModules,
    queryFn: async () => (await api.get<SelectableModule[]>('/modules/selectable')).data,
    staleTime: 5 * 60_000,
  });
}

function useModuleInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['modules'] });
  };
}

export function useCreateModule() {
  const invalidate = useModuleInvalidation();
  return useMutation({
    mutationFn: (body: ModuleInput) => api.post<ModuleMaster>('/modules', body),
    onSuccess: invalidate,
  });
}

export function useUpdateModule() {
  const invalidate = useModuleInvalidation();
  return useMutation({
    mutationFn: ({ id, ...body }: ModuleInput & { id: string }) =>
      api.patch<ModuleMaster>(`/modules/${id}`, body),
    onSuccess: invalidate,
  });
}

export function useDeleteModule() {
  const invalidate = useModuleInvalidation();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/modules/${id}`),
    onSuccess: invalidate,
  });
}

export function useReorderModules() {
  const invalidate = useModuleInvalidation();
  return useMutation({
    mutationFn: (order: { id: string; sequence: number }[]) =>
      api.patch('/modules/reorder', { order }),
    onSuccess: invalidate,
  });
}
