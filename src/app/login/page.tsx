import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Card } from '@/components/ui';
import { LogIn, AlertCircle } from 'lucide-react';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  if (session) {
    redirect('/');
  }

  const params = await searchParams;
  const error = params?.error;
  const from = params?.from || '/';

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <Card variant="elevated" padding="lg" className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-medium text-foreground">
            Sign in to SMDT
          </h1>
          <p className="mt-2 text-sm text-foreground-secondary">
            KIT Campus North Power Grid Web-Service
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error === 'invalid_state'
              ? 'Login session expired. Please try again.'
              : 'Authentication failed. Please try again.'}
          </div>
        )}

        <a
          href={`/api/auth/login?from=${encodeURIComponent(from)}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
        >
          <LogIn className="h-4 w-4" />
          Sign in with KIT Account
        </a>

        <p className="mt-4 text-center text-xs text-foreground-tertiary">
          You will be redirected to the KIT Identity Provider
        </p>
      </Card>
    </div>
  );
}
