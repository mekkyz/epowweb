import { NextRequest, NextResponse } from "next/server";
import { getNeighborTimestamp } from "@/services/smdt-data";
import { apiLogger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const current = searchParams.get("current");
  const direction = searchParams.get("direction") as "prev" | "next";

  if (!current || !direction || !["prev", "next"].includes(direction)) {
    return NextResponse.json(
      { success: false, error: { message: "Missing current or direction parameter" } },
      { status: 400 },
    );
  }

  try {
    const timestamp = await getNeighborTimestamp(current, direction);

    return NextResponse.json({ success: true, data: { timestamp } });
  } catch (error) {
    apiLogger.error("GET /api/heatmap/step failed", error);

    return NextResponse.json(
      { success: false, error: { message: "Failed to fetch neighbor timestamp" } },
      { status: 500 },
    );
  }
}
