
export type FieldError = {
  field: string;
  message: string;
};

type ErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: FieldError[];
  };
};

export class ApiError extends Error {
  status: number;
  code: string;
  details: FieldError[];

  constructor(
    status: number,
    code: string,
    message: string,
    details: FieldError[] = []
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}


export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);

  // Required by our Step 3 backend security middleware
  if (!["GET", "HEAD"].includes(method)) {
    headers.set("X-Requested-With", "XMLHttpRequest");
  }

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`/api${path}`, {
      ...options,
      method,
      headers,
      credentials: "same-origin"
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Unable to connect to the server. Please try again."
    );
  }

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      response.status,
      "INVALID_RESPONSE",
      "The server returned an unexpected response."
    );
  }

  if (!response.ok) {
    const body = data as ErrorBody;

    throw new ApiError(
      response.status,
      body?.error?.code ?? "REQUEST_FAILED",
      body?.error?.message ?? "Request failed",
      body?.error?.details ?? []
    );
  }

  return data as T;
}
