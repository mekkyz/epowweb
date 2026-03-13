import fs from "fs";
import Database from "better-sqlite3";
import { createLogger } from "@/lib/logger";
import type { UserRole } from "@/lib/auth";

const authLogger = createLogger("AuthStore");

export type { UserRole };

interface UserRow {
  kuerzel: string;
  role: "full" | "admin";
  email: string | null;
  affiliation: string | null;
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  const dbPath = process.env.AUTH_DB_PATH ?? "./data/auth.db";
  const dir = dbPath.substring(0, dbPath.lastIndexOf("/"));

  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      kuerzel TEXT PRIMARY KEY,
      role    TEXT NOT NULL CHECK(role IN ('full', 'admin'))
    )
  `);

  // Migrate: add profile columns if missing
  for (const col of ["email", "affiliation", "name", "given_name", "family_name"]) {
    try {
      db.exec(`ALTER TABLE users ADD COLUMN ${col} TEXT`);
    } catch {
      /* column already exists */
    }
  }

  seedFromEnv();
  authLogger.info("Auth database ready", { path: dbPath });

  return db;
}

function seedFromEnv() {
  const d = db!;
  const existing = d.prepare("SELECT COUNT(*) as cnt FROM users").get() as { cnt: number };

  if (existing.cnt > 0) return;

  const admins = (process.env.AUTH_ADMIN_USERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const fulls = (process.env.AUTH_FULL_USERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const insert = d.prepare("INSERT OR IGNORE INTO users (kuerzel, role) VALUES (?, ?)");
  const tx = d.transaction(() => {
    for (const k of admins) insert.run(k, "admin");
    for (const k of fulls) insert.run(k, "full");
  });

  tx();

  if (admins.length + fulls.length > 0) {
    authLogger.info("Seeded auth.db from env", { admins: admins.length, fulls: fulls.length });
  }
}

export function getUserRole(kuerzel: string): UserRole {
  const d = getDb();
  const row = d.prepare("SELECT role FROM users WHERE kuerzel = ?").get(kuerzel) as
    | UserRow
    | undefined;

  return row?.role ?? "demo";
}

export function listUsers(): UserRow[] {
  const d = getDb();

  return d
    .prepare("SELECT kuerzel, role, email, affiliation FROM users ORDER BY role, kuerzel")
    .all() as UserRow[];
}

export function setUserRole(kuerzel: string, role: "full" | "admin"): void {
  const d = getDb();

  d.prepare(
    "INSERT INTO users (kuerzel, role) VALUES (?, ?) ON CONFLICT(kuerzel) DO UPDATE SET role = excluded.role",
  ).run(kuerzel, role);
  authLogger.info("User role updated", { kuerzel, role });
}

export function removeUser(kuerzel: string): void {
  const d = getDb();

  d.prepare("DELETE FROM users WHERE kuerzel = ?").run(kuerzel);
  authLogger.info("User removed", { kuerzel });
}

export function updateUserProfile(
  kuerzel: string,
  profile: { email?: string; affiliation?: string[] },
): void {
  const d = getDb();

  d.prepare("UPDATE users SET email = ?, affiliation = ? WHERE kuerzel = ?").run(
    profile.email ?? null,
    profile.affiliation?.join(", ") ?? null,
    kuerzel,
  );
}
