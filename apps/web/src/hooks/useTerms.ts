import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import type { TermsTemplate } from '@/types';

export interface TermsInput {
  title?: string;
  contentHtml?: string;
  version?: string;
  isActive?: boolean;
  isDefault?: boolean;
  sequence?: number;
}

export function useTermsList(query: { page?: number; search?: string; isActive?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.terms(query),
    queryFn: () => api.list<TermsTemplate>('/terms', query as Record<string, string | number>),
  });
}

/** The clause set behind "Load default terms" in the estimate builder. */
export function useDefaultTerms() {
  return useQuery({
    queryKey: queryKeys.defaultTerms,
    queryFn: async () => (await api.get<TermsTemplate[]>('/terms/defaults')).data,
    staleTime: 5 * 60_000,
  });
}

export function useActiveTerms() {
  return useQuery({
    queryKey: queryKeys.terms('active'),
    queryFn: async () => (await api.get<TermsTemplate[]>('/terms/active')).data,
    staleTime: 5 * 60_000,
  });
}

function useTermsInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['terms'] });
  };
}

export function useCreateTerms() {
  const invalidate = useTermsInvalidation();
  return useMutation({
    mutationFn: (body: TermsInput) => api.post<TermsTemplate>('/terms', body),
    onSuccess: invalidate,
  });
}

export function useUpdateTerms() {
  const invalidate = useTermsInvalidation();
  return useMutation({
    mutationFn: ({ id, ...body }: TermsInput & { id: string }) =>
      api.patch<TermsTemplate>(`/terms/${id}`, body),
    onSuccess: invalidate,
  });
}

export function useDeleteTerms() {
  const invalidate = useTermsInvalidation();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/terms/${id}`),
    onSuccess: invalidate,
  });
}
