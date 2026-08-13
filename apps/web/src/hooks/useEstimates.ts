import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EstimateStatus, PricingResult } from '@furnix/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import type {
  Estimate,
  EstimateActivityEntry,
  EstimateListRow,
  EstimatePayload,
  EstimateRevisionEntry,
  EstimateSummary,
} from '@/types';

export interface EstimateListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: EstimateStatus | 'ALL';
  hostingModel?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

export function useEstimates(query: EstimateListQuery = {}) {
  return useQuery({
    queryKey: queryKeys.estimates(query),
    queryFn: () => api.list<EstimateListRow>('/estimates', query as Record<string, string | number>),
    placeholderData: (previous) => previous,
  });
}

export function useEstimateSummary() {
  return useQuery({
    queryKey: queryKeys.estimateSummary,
    queryFn: async () => (await api.get<EstimateSummary>('/estimates/summary')).data,
  });
}

export function useEstimate(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.estimate(id ?? ''),
    queryFn: async () => (await api.get<Estimate>(`/estimates/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useEstimateActivity(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.estimateActivity(id ?? ''),
    queryFn: async () => (await api.get<EstimateActivityEntry[]>(`/estimates/${id}/activity`)).data,
    enabled: Boolean(id),
  });
}

export function useEstimateRevisions(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.estimateRevisions(id ?? ''),
    queryFn: async () => (await api.get<EstimateRevisionEntry[]>(`/estimates/${id}/revisions`)).data,
    enabled: Boolean(id),
  });
}

function useEstimateInvalidation() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: ['estimates'] });
    if (id) void queryClient.invalidateQueries({ queryKey: queryKeys.estimate(id) });
  };
}

export function useCreateEstimate() {
  const invalidate = useEstimateInvalidation();
  return useMutation({
    mutationFn: (body: EstimatePayload) => api.post<Estimate>('/estimates', body),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateEstimate(id: string) {
  const invalidate = useEstimateInvalidation();
  return useMutation({
    mutationFn: (body: EstimatePayload) => api.put<Estimate>(`/estimates/${id}`, body),
    onSuccess: () => invalidate(id),
  });
}

export function useUpdateEstimateStatus() {
  const invalidate = useEstimateInvalidation();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: EstimateStatus; note?: string }) =>
      api.patch<Estimate>(`/estimates/${id}/status`, { status, note }),
    onSuccess: (_response, variables) => invalidate(variables.id),
  });
}

export function useDuplicateEstimate() {
  const invalidate = useEstimateInvalidation();
  return useMutation({
    mutationFn: (id: string) => api.post<Estimate>(`/estimates/${id}/duplicate`),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteEstimate() {
  const invalidate = useEstimateInvalidation();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/estimates/${id}`),
    onSuccess: () => invalidate(),
  });
}

/**
 * Server-side recalculation. The builder computes the same figures locally on
 * every keystroke for instant feedback; this confirms them against live master
 * prices before save, so a stale browser tab cannot quote an outdated number.
 */
export function useCalculatePricing() {
  return useMutation({
    mutationFn: (body: {
      hostingModel: string;
      userCount: number;
      gstPercent: number;
      modules: { moduleId: string; overrideOneTimeFee?: number | null; overrideMonthlyPerUser?: number | null }[];
      adjustment?: { type: string; value: number; scope: string };
    }) => api.post<PricingResult>('/estimates/calculate', body),
  });
}

export function downloadEstimatePdf(id: string, estimateNumber: string) {
  return api.download(`/estimates/${id}/pdf`, `${estimateNumber.replace(/[^\w.-]+/g, '-')}.pdf`);
}
