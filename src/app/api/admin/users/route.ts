import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { listUsers, setUserRole, removeUser } from "@/services/auth-store";
import { successResponse, errorResponse, badRequestResponse } from "@/lib/api-utils";
import { HTTP_STATUS } from "@/lib/constants";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return errorResponse("Forbidden", HTTP_STATUS.UNAUTHORIZED, "FORBIDDEN");
    }
    return successResponse(listUsers());
  } catch {
    return errorResponse("Failed to fetch users", HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return errorResponse("Forbidden", HTTP_STATUS.UNAUTHORIZED, "FORBIDDEN");
    }

    let body: { kuerzel?: string; role?: string };
    try {
      body = await request.json();
    } catch {
      return badRequestResponse("Invalid request body");
    }

    const { kuerzel, role } = body;
    if (!kuerzel || !role || (role !== "full" && role !== "admin")) {
      return badRequestResponse("kuerzel and role (full|admin) are required");
    }

    setUserRole(kuerzel, role);
    return successResponse({ kuerzel, role });
  } catch {
    return errorResponse("Failed to update user", HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return errorResponse("Forbidden", HTTP_STATUS.UNAUTHORIZED, "FORBIDDEN");
    }

    let body: { kuerzel?: string };
    try {
      body = await request.json();
    } catch {
      return badRequestResponse("Invalid request body");
    }

    if (!body.kuerzel) {
      return badRequestResponse("kuerzel is required");
    }

    removeUser(body.kuerzel);
    return successResponse({ removed: body.kuerzel });
  } catch {
    return errorResponse("Failed to remove user", HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
