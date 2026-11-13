import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import { environment } from "../../../environments/environment";
import { ApiEnvelope, ApiErrorBody } from "./api-models";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly requestId?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export abstract class ApiBaseService {
  protected readonly http = inject(HttpClient);
  protected readonly baseUrl = environment.apiUrl;

  protected get<T>(path: string): Observable<T> {
    return this.request<ApiEnvelope<T>>(path, { method: "get" }).pipe(
      map(({ data }) => data),
    );
  }

  protected request<T>(
    path: string,
    options: { method: "get" | "post" | "put"; body?: object | FormData; headers?: Record<string, string> },
  ): Observable<T> {
    const url = `${this.baseUrl}${path}`;
    const request = options.method === "get"
      ? this.http.get<T>(url, { headers: options.headers })
      : options.method === "post"
        ? this.http.post<T>(url, options.body, { headers: options.headers })
        : this.http.put<T>(url, options.body, { headers: options.headers });

    return request.pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => this.createApiError(error)),
      ),
    );
  }

  protected createApiError(error: HttpErrorResponse): ApiClientError {
    const body = this.parseErrorBody(error.error);
    const fallback = error.status === 401
      ? "La sesión no es válida o ha expirado."
      : error.status === 403
        ? "No tienes permisos para realizar esta operación."
        : error.status === 409
          ? "La información cambió en otra sesión. Recarga e inténtalo nuevamente."
          : error.status === 503
            ? "El servicio externo de almacenamiento no está configurado."
            : "No fue posible completar la operación.";
    return new ApiClientError(
      body?.error?.message ?? fallback,
      error.status,
      body?.error?.code,
      body?.meta?.requestId,
      body?.error?.details,
    );
  }

  private parseErrorBody(error: unknown): ApiErrorBody | undefined {
    if (typeof error === "object" && error !== null) {
      return error as ApiErrorBody;
    }

    if (typeof error !== "string") {
      return undefined;
    }

    try {
      const parsed: unknown = JSON.parse(error);
      return typeof parsed === "object" && parsed !== null
        ? parsed as ApiErrorBody
        : undefined;
    } catch {
      return undefined;
    }
  }
}
