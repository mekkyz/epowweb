'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Trash2, UserPlus, Shield, ShieldCheck } from 'lucide-react';
import { Button, Input, Select, Card, Badge } from '@/components/ui';

interface UserEntry {
  kuerzel: string;
  role: 'full' | 'admin';
}

export default function AdminPanel() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [kuerzel, setKuerzel] = useState('');
  const [role, setRole] = useState<'full' | 'admin'>('full');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users');
    const body = await res.json();
    if (body.success) setUsers(body.data);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/users')
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.success) setUsers(body.data);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!kuerzel.trim()) return;

    setSaving(true);
    await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kuerzel: kuerzel.trim().toLowerCase(), role }),
    });
    setKuerzel('');
    await fetchUsers();
    setSaving(false);
  };

  const handleRemove = async (k: string) => {
    await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kuerzel: k }),
    });
    await fetchUsers();
  };

  return (
    <div className="space-y-6">
      <Card variant="elevated" padding="md">
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[160px]">
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
              onChange={(e) => setRole(e.target.value as 'full' | 'admin')}
              options={[
                { value: 'full', label: 'Full' },
                { value: 'admin', label: 'Admin' },
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
      </Card>

      <Card variant="elevated" padding="none">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-foreground-secondary">
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-foreground-secondary">
            No elevated users configured. All KIT users have demo access.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-foreground-secondary">
                <th className="px-4 py-3 font-medium">Kürzel</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.kuerzel} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 font-mono text-foreground">{u.kuerzel}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={u.role === 'admin' ? 'warning' : 'success'}
                      size="sm"
                    >
                      {u.role === 'admin' ? (
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
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
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
        )}
      </Card>
    </div>
  );
}
