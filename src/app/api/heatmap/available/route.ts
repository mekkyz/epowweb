import { NextRequest, NextResponse } from "next/server";
import { listHeatmapDates, listDayTimestamps } from "@/services/smdt-data";
import { apiLogger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date");

    if (date) {
      // Return timestamps for a specific date (~96 entries)
      const timestamps = await listDayTimestamps(date);

      apiLogger.info("GET /api/heatmap/available (day)", { date, count: timestamps.length });

      return NextResponse.json(
        {
          success: true,
          data: { timestamps },
          meta: { count: timestamps.length, timestamp: new Date().toISOString() },
        },
        {
          headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
        },
      );
    }

    // Return available dates (~365 entries)
    const dates = await listHeatmapDates();

    apiLogger.info("GET /api/heatmap/available", { count: dates.length });

    return NextResponse.json(
      {
        success: true,
        data: { dates },
        meta: { count: dates.length, timestamp: new Date().toISOString() },
      },
      {
        headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
      },
    );
  } catch (error) {
    apiLogger.error("GET /api/heatmap/available failed", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to fetch available heatmap data" } },
      { status: 500 },
    );
  }
}
