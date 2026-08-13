import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button, Field, Input } from '@/components/ui';
import { useAuth, useSignIn } from '@/hooks/useAuth';
import { ApiError, tokenStore } from '@/lib/api';

export default function SignIn() {
  const { user } = useAuth();
  const signIn = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (user && tokenStore.get()) return <Navigate to="/estimates/new" replace />;

  const submit = () => {
    setError('');
    signIn.mutate(
      { email, password },
      {
        onSuccess: () => location.assign('/estimates/new'),
        onError: (cause) =>
          setError(cause instanceof ApiError ? cause.message : 'Sign in failed. Try again.'),
      },
    );
  };

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <span className="font-display text-[30px] font-extrabold tracking-tight text-ink">
            F<span className="text-gold">x</span>
          </span>
          <h1 className="mt-3 font-display text-[19px] font-bold text-ink">Estimates & pricing</h1>
          <p className="mt-1 text-[13px] text-ink-soft">Sign in to build and send estimates.</p>
        </div>

        <div className="card space-y-4 p-6">
          <Field label="Email" required>
            {(props) => (
              <Input
                {...props}
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && submit()}
              />
            )}
          </Field>

          <Field label="Password" required error={error}>
            {(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && submit()}
              />
            )}
          </Field>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            loading={signIn.isPending}
            disabled={!email || !password}
            onClick={submit}
          >
            Sign in
          </Button>
        </div>
      </div>
    </div>
  );
}
