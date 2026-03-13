import { NextRequest, NextResponse } from "next/server";
import { loadStationHeatmap } from "@/services/smdt-data";
import { apiLogger } from "@/lib/logger";
import { ERROR_MESSAGES } from "@/lib/constants";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timestamp = searchParams.get("timestamp");

    if (!timestamp) {
      apiLogger.warn("GET /api/heatmap - Missing timestamp parameter");
      return NextResponse.json(
        {
          success: false,
          error: {
            message: ERROR_MESSAGES.missingParameter("timestamp"),
            code: "MISSING_PARAMETER",
          },
        },
        { status: 400 },
      );
    }

    const stations = await loadStationHeatmap(timestamp);

    apiLogger.info("GET /api/heatmap", { timestamp, stationCount: stations.length });

    return NextResponse.json({
      success: true,
      data: { timestamp, stations },
      meta: { count: stations.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    apiLogger.error("GET /api/heatmap failed", error);
    return NextResponse.json(
      { success: false, error: { message: "Failed to fetch heatmap data" } },
      { status: 500 },
    );
  }
}
