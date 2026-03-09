import { NextResponse } from 'next/server';

interface ApiErrorResponse {
  error: string;
  code?: string;
}

interface ApiSuccessResponse<T> {
  data: T;
}

/**
 * Return a standardized API error response.
 */
export function apiError(message: string, status: number, code?: string): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error: message, ...(code && { code }) }, { status });
}

/**
 * Return a standardized API success response.
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ data }, { status });
}
