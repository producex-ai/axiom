/**
 * Server Action Utilities - Shared Errors and Responses
 * 
 * Standardized error handling and response types for all server actions
 */

export class ServerActionError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = "ServerActionError";
  }
}

export class ValidationError extends ServerActionError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends ServerActionError {
  constructor(message: string = "Authentication required") {
    super("AUTHENTICATION_ERROR", message, 401);
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends ServerActionError {
  constructor(message: string, details?: unknown) {
    super("NOT_FOUND", message, 404, details);
    this.name = "NotFoundError";
  }
}

export class ServerError extends ServerActionError {
  constructor(message: string, details?: unknown) {
    super("SERVER_ERROR", message, 500, details);
    this.name = "ServerError";
  }
}

/**
 * Standard response type for server actions
 */
export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Format error response
 */
export function createErrorResponse(error: unknown): ActionResponse {
  if (error instanceof ServerActionError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: {
        code: "UNKNOWN_ERROR",
        message: error.message,
      },
    };
  }

  return {
    success: false,
    error: {
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred",
    },
  };
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(data: T): ActionResponse<T> {
  return {
    success: true,
    data,
  };
}
