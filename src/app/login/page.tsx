import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { AlertCircle } from 'lucide-react';

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
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg border border-slate-200 p-8 pb-4 shadow-lg shadow-slate-200/50">
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-semibold text-slate-900">
              ePowWeb - SMDT
            </h1>
            <p className="mt-2 text-sm text-slate-600 uppercase">
              KIT Campus North Power Grid Web-Service
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-md">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">
                  {error === 'invalid_state'
                    ? 'Login session expired. Please try again.'
                    : 'Authentication failed. Please try again.'}
                </p>
              </div>
            </div>
          )}

          <a
            href={`/api/auth/login?from=${encodeURIComponent(from)}`}
            className="flex w-full items-center justify-center gap-2 px-6 py-3 text-white! bg-slate-700 rounded-md hover:bg-slate-800 font-normal transition-all focus:ring-2 focus:ring-slate-500"
          >
            Sign in with KIT Account
          </a>

          <p className="mt-4 text-center text-xs text-slate-500">
            You will be redirected to the KIT Identity Provider
          </p>

          <div className="text-center text-xs text-slate-600 mt-8 pt-4 border-t border-slate-200">
            © {currentYear}&nbsp;
            <a
              href="https://www.kit.edu"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-blue-600"
            >
              KIT
            </a>
            &nbsp;-&nbsp;
            <a
              href="https://www.iai.kit.edu/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-blue-600"
            >
              IAI
            </a>
            &nbsp;-&nbsp;
            <a
              href="https://www.iai.kit.edu/gruppen_4104.php"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-blue-600"
            >
              ESA
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
