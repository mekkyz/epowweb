/**
 * Async SQLite query runner using a Worker Thread.
 *
 * better-sqlite3 is synchronous — every query blocks the Node.js event loop.
 * This module moves all queries to a dedicated Worker Thread so the main
 * event loop stays free for HTTP requests, health probes, etc.
 */
import { Worker } from "worker_threads";
import { dbLogger } from "@/lib/logger";

// The worker script is inlined as a string so it works in Next.js standalone
// builds without needing a separate file in the output bundle.
const WORKER_CODE = `
const { parentPort, workerData } = require('worker_threads');
const Database = require('better-sqlite3');

let db = null;

function getDb() {
  if (!db) {
    db = new Database(workerData.dbPath, { readonly: true });
    db.pragma('journal_mode = WAL');
    db.pragma('mmap_size = 2147483648');
    db.pragma('cache_size = -64000');
    db.pragma('temp_store = MEMORY');
    db.pragma('query_only = ON');
  }
  return db;
}

parentPort.on('message', (msg) => {
  try {
    const database = getDb();
    const stmt = database.prepare(msg.sql);
    const result = msg.method === 'get'
      ? stmt.get(...(msg.params || []))
      : stmt.all(...(msg.params || []));
    parentPort.postMessage({ id: msg.id, result });
  } catch (err) {
    parentPort.postMessage({ id: msg.id, error: err.message });
  }
});

parentPort.postMessage({ type: 'ready' });
`;

let worker: Worker | null = null;
let reqId = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

function ensureWorker(dbPath: string): Worker {
  if (worker) return worker;

  worker = new Worker(WORKER_CODE, {
    eval: true,
    workerData: { dbPath },
  });

  worker.on("message", (msg: { id?: number; type?: string; result?: unknown; error?: string }) => {
    if (msg.type === "ready") {
      dbLogger.info("SQLite worker thread ready", { dbPath });
      return;
    }
    if (msg.id == null) return;
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.error) p.reject(new Error(msg.error));
    else p.resolve(msg.result);
  });

  worker.on("error", (err) => {
    dbLogger.error("SQLite worker thread error", err);
    for (const [id, p] of pending) {
      p.reject(err);
      pending.delete(id);
    }
    worker = null;
  });

  worker.on("exit", (code) => {
    if (code !== 0) {
      dbLogger.error("SQLite worker thread exited", { code });
    }
    worker = null;
  });

  return worker;
}

export function queryAll(dbPath: string, sql: string, params: unknown[] = []): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const id = reqId++;
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    ensureWorker(dbPath).postMessage({ id, sql, params, method: "all" });
  });
}

export function queryGet(dbPath: string, sql: string, params: unknown[] = []): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = reqId++;
    pending.set(id, { resolve, reject });
    ensureWorker(dbPath).postMessage({ id, sql, params, method: "get" });
  });
}
