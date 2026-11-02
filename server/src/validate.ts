import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class ApiError extends Error {
  status: ContentfulStatusCode;
  code: string | undefined;
  constructor(status: ContentfulStatusCode, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function fail(status: ContentfulStatusCode, message: string, code?: string): never {
  throw new ApiError(status, message, code);
}
