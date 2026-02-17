import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AdminPanel from './AdminPanel';

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        User Management
      </h1>
      <p className="mt-1 text-sm text-foreground-secondary">
        Manage which KIT users have full or admin access. Users not listed here get demo access by default.
      </p>
      <div className="mt-6">
        <AdminPanel />
      </div>
    </div>
  );
}
