import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AlertCircle } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  const params = await searchParams;
  const error = params?.error;
  const from = params?.from || "/";
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-slate-200 bg-white p-8 pb-4 shadow-lg shadow-slate-200/50">
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-semibold text-slate-900">ePowMon</h1>
            <p className="mt-2 text-sm text-slate-600 uppercase">
              KIT Campus North Power Grid Monitoring
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-md border border-red-300 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <p className="text-sm text-red-700">
                  {error === "invalid_state"
                    ? "Login session expired. Please try again."
                    : "Authentication failed. Please try again."}
                </p>
              </div>
            </div>
          )}

          <a
            href={`/api/auth/login?from=${encodeURIComponent(from)}`}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-700 px-6 py-3 font-normal text-white! transition-all hover:bg-slate-800 focus:ring-2 focus:ring-slate-500"
          >
            Sign in with KIT Account
          </a>

          <p className="mt-4 text-center text-xs text-slate-500">
            You will be redirected to the KIT Identity Provider
          </p>

          <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-600">
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
