import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Retrying a 401/403/422 just burns time — the answer will not change.
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});

export const queryKeys = {
  session: ['session'] as const,
  modules: (query?: unknown) => ['modules', query ?? {}] as const,
  selectableModules: ['modules', 'selectable'] as const,
  terms: (query?: unknown) => ['terms', query ?? {}] as const,
  defaultTerms: ['terms', 'defaults'] as const,
  settings: ['settings'] as const,
  estimates: (query?: unknown) => ['estimates', query ?? {}] as const,
  estimateSummary: ['estimates', 'summary'] as const,
  estimate: (id: string) => ['estimates', id] as const,
  estimateActivity: (id: string) => ['estimates', id, 'activity'] as const,
  estimateRevisions: (id: string) => ['estimates', id, 'revisions'] as const,
};
