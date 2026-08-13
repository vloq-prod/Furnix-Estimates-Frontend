import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { type Permission, can } from '@furnix/shared';



import { api, tokenStore } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import type { AuthUser } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  can: (permission: Permission) => boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.session,
    queryFn: async () => (await api.get<AuthUser>('/auth/me')).data,
    enabled: Boolean(tokenStore.get()),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const signOut = useCallback(() => {
    tokenStore.clear();
    queryClient.clear();
    location.assign('/sign-in');
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: data ?? null,
      isLoading,
      can: (permission) => (data ? can(data.role, permission) : false),
      signOut,
    }),
    [data, isLoading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await api.post<{ accessToken: string; user: AuthUser }>(
        '/auth/login',
        credentials,
      );
      tokenStore.set(response.data.accessToken);
      return response;
    },
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.session, response.data.user);
    },
  });
}
