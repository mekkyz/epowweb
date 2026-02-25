/**
 * Next.js instrumentation hook — runs once on server startup.
 * Adds crash diagnostics and periodic memory logging.
 */
export function register() {
  if (typeof window !== 'undefined') return; // server-only

  process.on('uncaughtException', (err) => {
    console.error('[CRASH] Uncaught exception:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[CRASH] Unhandled rejection:', reason);
  });

  process.on('SIGTERM', () => {
    console.log('[SHUTDOWN] Received SIGTERM — graceful shutdown');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('[SHUTDOWN] Received SIGINT — graceful shutdown');
    process.exit(0);
  });

  // Log memory usage every 60s at debug level
  setInterval(() => {
    const mem = process.memoryUsage();
    console.log('[MEMORY]', {
      rss: `${(mem.rss / 1024 / 1024).toFixed(1)}MB`,
      heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB`,
      heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`,
      external: `${(mem.external / 1024 / 1024).toFixed(1)}MB`,
    });
  }, 60_000).unref();

  console.log('[INSTRUMENTATION] Crash diagnostics registered');
}
