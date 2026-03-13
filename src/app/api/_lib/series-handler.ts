import { NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/logger";
import { API_DEFAULTS } from "@/lib/constants";
import type { SeriesBounds } from "@/types/smdt";

type Params = { params: { id: string } | Promise<{ id: string }> };

interface SeriesHandlerConfig {
  entityType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getMeta: (id: string) => Record<string, any> | undefined;
  getBounds: (idOrMeters: string | string[]) => Promise<SeriesBounds>;
  loadSeries: (
    idOrMeters: string | string[],
    opts: { start?: string; end?: string; limit?: number },
  ) => Promise<unknown[]>;
  /** For meters: pass the id directly. For buildings/stations: pass meta.meters. */
  useMeterIds?: boolean;
}

/**
 * Creates a GET handler for entity series routes.
 * Shared by /api/meters/[id]/series, /api/buildings/[id]/series, /api/stations/[id]/series.
 */
export function createSeriesHandler(config: SeriesHandlerConfig) {
  const { entityType, getMeta, getBounds, loadSeries, useMeterIds = false } = config;
  const routePath = `/api/${entityType}s/[id]/series`;

  return async function GET(req: NextRequest, context: Params) {
    const ctxParams = await context.params;
    const entityId = ctxParams.id;

    try {
      const meta = getMeta(entityId);

      if (!meta) {
        apiLogger.warn(`GET ${routePath} - ${entityType} not found`, {
          [entityType + "Id"]: entityId,
        });

        return NextResponse.json(
          {
            success: false,
            error: { message: `${entityType} '${entityId}' not found`, code: "NOT_FOUND" },
          },
          { status: 404 },
        );
      }

      const { searchParams } = new URL(req.url);
      const start = searchParams.get("start") ?? undefined;
      const end = searchParams.get("end") ?? undefined;
      const limitParam = searchParams.get("limit");
      const limit = limitParam ? Number(limitParam) : API_DEFAULTS.seriesLimit;

      const boundsArg = useMeterIds ? meta.meters! : entityId;
      const bounds = await getBounds(boundsArg);
      const defaultStartDate = bounds.end
        ? new Date(
            new Date(bounds.end).valueOf() - API_DEFAULTS.defaultTimeRangeDays * 24 * 3600 * 1000,
          )
            .toISOString()
            .slice(0, 19)
            .replace("T", " ")
        : undefined;

      const finalStart = start ?? defaultStartDate;
      const finalEnd = end ?? bounds.end;

      const seriesArg = useMeterIds ? meta.meters! : entityId;
      const series = await loadSeries(seriesArg, { start: finalStart, end: finalEnd, limit });

      apiLogger.info(`GET ${routePath}`, {
        [entityType + "Id"]: entityId,
        seriesCount: series.length,
      });

      return NextResponse.json({
        success: true,
        data: { [entityType]: meta, series, bounds },
        meta: { count: series.length, timestamp: new Date().toISOString() },
      });
    } catch (error) {
      apiLogger.error(`GET ${routePath} failed`, error, { [entityType + "Id"]: entityId });

      return NextResponse.json(
        { success: false, error: { message: `Failed to fetch ${entityType} series data` } },
        { status: 500 },
      );
    }
  };
}
