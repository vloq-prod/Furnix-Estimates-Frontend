import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import type { CompanySettings } from '@/types';

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: async () => (await api.get<CompanySettings>('/settings')).data,
    staleTime: 10 * 60_000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CompanySettings>) => api.patch<CompanySettings>('/settings', body),
    onSuccess: (response) => queryClient.setQueryData(queryKeys.settings, response.data),
  });
}
