import { NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants';

/**
 * Standardized API response structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  meta?: {
    timestamp: string;
    [key: string]: unknown;
  };
}

/**
 * Creates a successful API response
 */
export function successResponse<T>(
  data: T,
  meta?: Record<string, unknown>,
  status: number = HTTP_STATUS.OK
): NextResponse<ApiResponse<T>> {
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
): NextResponse<ApiResponse<never>> {
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
export function badRequestResponse(message: string, code?: string): NextResponse<ApiResponse<never>> {
  return errorResponse(message, HTTP_STATUS.BAD_REQUEST, code);
}

/**
 * Creates a 404 Not Found response
 */
export function notFoundResponse(message: string = ERROR_MESSAGES.notFound): NextResponse<ApiResponse<never>> {
  return errorResponse(message, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
}

/**
 * Creates a 500 Internal Server Error response
 */
export function serverErrorResponse(
  message: string = ERROR_MESSAGES.serverError
): NextResponse<ApiResponse<never>> {
  return errorResponse(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR');
}

/**
 * Wraps an API handler with standardized error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: { endpoint: string; method: string }
): Promise<NextResponse<ApiResponse<T>>> {
  return handler()
    .then((data) => successResponse(data))
    .catch((error) => {
      apiLogger.error(`${context.method} ${context.endpoint} failed`, error);
      
      if (error instanceof ApiError) {
        return errorResponse(error.message, error.status, error.code);
      }
      
      return serverErrorResponse();
    });
}

/**
 * Custom API Error class for typed errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Type guard for checking if a value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Safely parses a numeric query parameter
 */
export function parseNumericParam(value: string | null, defaultValue?: number): number | undefined {
  if (value === null) return defaultValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

/**
 * Safely parses a date/timestamp query parameter
 */
export function parseDateParam(value: string | null): string | undefined {
  if (!value) return undefined;
  // Basic validation - the actual parsing can be more sophisticated
  return value.trim() || undefined;
}
