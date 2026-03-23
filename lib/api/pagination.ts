import { NextResponse } from "next/server";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

export function parsePagination(url: URL): { limit: number; offset: number } {
  const rawLimit = url.searchParams.get("limit");
  const rawOffset = url.searchParams.get("offset");

  let limit = rawLimit ? parseInt(rawLimit, 10) : DEFAULT_LIMIT;
  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  let offset = rawOffset ? parseInt(rawOffset, 10) : 0;
  if (isNaN(offset) || offset < 0) offset = 0;

  return { limit, offset };
}

/** Response shape for paginated endpoints. */
export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
}

/** Wrap a paginated result with totalCount metadata. */
export function paginatedResponse<T>(
  data: T[],
  totalCount: number,
): NextResponse {
  return NextResponse.json({ data, totalCount } satisfies PaginatedResponse<T>);
}
