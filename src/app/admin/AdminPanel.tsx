"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Trash2, UserPlus, Shield, ShieldCheck, Users } from "lucide-react";
import { Button, Input, Select, Badge, useToast } from "@/components/ui";

interface UserEntry {
  kuerzel: string;
  role: "full" | "admin";
  email: string | null;
  affiliation: string | null;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [kuerzel, setKuerzel] = useState("");
  const [role, setRole] = useState<"full" | "admin">("full");
  const [saving, setSaving] = useState(false);
  const { success, error: showError } = useToast();

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users");
    const body = await res.json();

    if (body.success) setUsers(body.data);
    setLoading(false);
  };

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/admin/users");
      const body = await res.json();

      if (body.success) setUsers(body.data);
      setLoading(false);
    };

    load();
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!kuerzel.trim()) return;

    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kuerzel: kuerzel.trim().toLowerCase(), role }),
    });

    if (res.ok) {
      success(`Added ${kuerzel.trim().toLowerCase()} as ${role}`);
    } else {
      showError("Failed to add user");
    }
    setKuerzel("");
    await fetchUsers();
    setSaving(false);
  };

  const handleRemove = async (k: string) => {
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kuerzel: k }),
    });

    if (res.ok) {
      success(`Removed ${k}`);
    } else {
      showError("Failed to remove user");
    }
    await fetchUsers();
  };

  return (
    <div className="space-y-6">
      {/* Add User Form */}
      <div className="border-border bg-panel rounded-xl border p-4 shadow-sm">
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] flex-1">
            <Input
              label="KIT Kürzel"
              value={kuerzel}
              onChange={(e) => setKuerzel(e.target.value)}
              placeholder="e.g. kg2527"
              required
            />
          </div>
          <div className="w-36">
            <Select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as "full" | "admin")}
              options={[
                { value: "full", label: "Full" },
                { value: "admin", label: "Admin" },
              ]}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            icon={<UserPlus className="h-4 w-4" />}
          >
            Add User
          </Button>
        </form>
      </div>

      {/* Users Table */}
      <div className="border-border bg-panel overflow-hidden rounded-xl border shadow-sm">
        <div className="border-border flex items-center gap-2 border-b px-4 py-3">
          <Users className="h-4 w-4 text-emerald-400" />
          <span className="text-foreground text-sm font-medium">Admin/Full Users</span>
          <span className="text-foreground-tertiary ml-auto text-xs">{users.length} users</span>
        </div>

        {loading ? (
          <div className="text-foreground-secondary px-4 py-8 text-center text-sm">
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="text-foreground-secondary px-4 py-8 text-center text-sm">
            No admin or full users configured. All KIT users have demo access.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-panel/95 text-foreground-secondary sticky top-0 text-xs tracking-wider uppercase backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Kürzel</th>
                  <th className="px-4 py-2.5 text-left font-medium">Email</th>
                  <th className="px-4 py-2.5 text-left font-medium">Affiliation</th>
                  <th className="px-4 py-2.5 text-left font-medium">Role</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {users.map((u) => (
                  <tr
                    key={u.kuerzel}
                    className="text-foreground-secondary hover:bg-surface transition-colors"
                  >
                    <td className="text-foreground px-4 py-2.5 font-mono">{u.kuerzel}</td>
                    <td className="px-4 py-2.5">
                      {u.email ? (
                        <span className="text-foreground-secondary">{u.email}</span>
                      ) : (
                        <span className="text-foreground-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {u.affiliation ? (
                        <span className="text-foreground-secondary text-xs">{u.affiliation}</span>
                      ) : (
                        <span className="text-foreground-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={u.role === "admin" ? "warning" : "success"} size="sm">
                        {u.role === "admin" ? (
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Full
                          </span>
                        )}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemove(u.kuerzel)}
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        aria-label={`Remove ${u.kuerzel}`}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
