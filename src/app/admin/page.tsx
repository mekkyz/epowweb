import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminPanel from "./AdminPanel";
import PageHeader from "@/components/layout/PageHeader";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        label="Admin"
        title="User Management"
        subtitle="Manage which KIT users have full or admin access. Users not listed here get demo access by default."
      />
      <AdminPanel />
    </div>
  );
}
