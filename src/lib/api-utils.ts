import { NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/lib/constants';

/**
 * Creates a successful API response
 */
export function successResponse<T>(
  data: T,
  meta?: Record<string, unknown>,
  status: number = HTTP_STATUS.OK
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    { status }
  );
}

/**
 * Creates an error API response
 */
export function errorResponse(
  message: string,
  status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  code?: string
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

/**
 * Creates a 400 Bad Request response
 */
export function badRequestResponse(message: string, code?: string): NextResponse {
  return errorResponse(message, HTTP_STATUS.BAD_REQUEST, code);
}
