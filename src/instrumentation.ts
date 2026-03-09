/**
 * Next.js instrumentation hook — runs once on server startup.
 * Adds crash diagnostics and periodic memory logging.
 *
 * Access process via globalThis to avoid Edge Runtime static-analysis warnings
 * (all routes use Node.js runtime, so process is always available).
 */
export async function register() {
  if (typeof window !== 'undefined') return;

  const p = (globalThis as Record<string, unknown>)['process'] as typeof process | undefined;
  if (!p?.on) return;

  p.on('uncaughtException', (err: Error) => {
    console.error('[CRASH] Uncaught exception:', err);
    p.exit(1);
  });

  p.on('unhandledRejection', (reason: unknown) => {
    console.error('[CRASH] Unhandled rejection:', reason);
  });

  p.on('SIGTERM', () => {
    console.log('[SHUTDOWN] Received SIGTERM — graceful shutdown');
    p.exit(0);
  });

  p.on('SIGINT', () => {
    console.log('[SHUTDOWN] Received SIGINT — graceful shutdown');
    p.exit(0);
  });

  setInterval(() => {
    const mem = p.memoryUsage();
    console.log('[MEMORY]', {
      rss: `${(mem.rss / 1024 / 1024).toFixed(1)}MB`,
      heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB`,
      heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`,
      external: `${(mem.external / 1024 / 1024).toFixed(1)}MB`,
    });
  }, 60_000).unref();

  console.log('[INSTRUMENTATION] Crash diagnostics registered');
}
