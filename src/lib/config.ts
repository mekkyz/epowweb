// Legacy config kept for optional external integrations; defaults are unused in the current app.
export const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_BASE ?? '';
export const HEATMAP_BASE = process.env.NEXT_PUBLIC_HEATMAP_BASE ?? '';
export const ANEMOS_BASE = process.env.NEXT_PUBLIC_ANEMOS_BASE ?? '';

export const resolveLegacyUrl = (path: string) => path;
