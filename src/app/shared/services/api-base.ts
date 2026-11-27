import { HttpClient, HttpErrorResponse, HttpParams } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, from, map, Observable, switchMap, throwError } from "rxjs";
import { environment } from "../../../environments/environment";
import { ApiEnvelope, ApiErrorBody, ApiMeta } from "./api-models";

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

/** Código asignado cuando el servidor responde algo que no cumple el contrato. */
export const UNEXPECTED_RESPONSE_CODE = "UNEXPECTED_RESPONSE";
/** Código asignado cuando no hubo respuesta HTTP (sin red, CORS, servidor caído). */
export const NETWORK_ERROR_CODE = "NETWORK_ERROR";

type HttpMethod = "get" | "post" | "put";
type QueryParams = Record<string, string | number | boolean>;

interface RequestOptions {
  method: HttpMethod;
  body?: object | FormData;
  params?: QueryParams;
}

const MENSAJES_POR_ESTADO: Record<number, string> = {
  0: "No fue posible conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.",
  400: "La solicitud contiene datos inválidos. Revisa la información e inténtalo nuevamente.",
  401: "La sesión no es válida o ha expirado.",
  403: "No tienes permisos para realizar esta operación.",
  404: "El recurso solicitado no existe.",
  409: "La operación entra en conflicto con información existente.",
  422: "Los datos ingresados no cumplen las reglas de validación.",
  429: "Se realizaron demasiadas solicitudes. Espera un momento e inténtalo nuevamente.",
  500: "Ocurrió un error inesperado. Inténtalo nuevamente.",
  503: "El servicio no está disponible temporalmente. Inténtalo más tarde.",
};

const MENSAJE_GENERICO = "No fue posible completar la operación.";
const MENSAJE_RESPUESTA_INESPERADA =
  "El servidor respondió con un formato inesperado. Inténtalo nuevamente.";

export abstract class ApiBaseService {
  protected readonly http = inject(HttpClient);
  protected readonly baseUrl = environment.apiUrl;

  /** GET que devuelve únicamente los datos (`mensaje`) de la respuesta. */
  protected get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.requestData<T>(path, { method: "get", params });
  }

  /** POST (JSON o multipart) que devuelve únicamente los datos. */
  protected post<T>(path: string, body: object | FormData): Observable<T> {
    return this.requestData<T>(path, { method: "post", body });
  }

  /** PUT que devuelve únicamente los datos. */
  protected put<T>(path: string, body: object): Observable<T> {
    return this.requestData<T>(path, { method: "put", body });
  }

  /** Devuelve la respuesta completa cuando se necesitan los metadatos (paginación, importaciones). */
  protected requestEnvelope<T, M extends ApiMeta = ApiMeta>(
    path: string,
    options: RequestOptions,
  ): Observable<ApiEnvelope<T, M>> {
    const url = `${this.baseUrl}${path}`;
    const params = options.params ? new HttpParams({ fromObject: options.params }) : undefined;
    const request = options.method === "get"
      ? this.http.get<unknown>(url, { params })
      : options.method === "post"
        ? this.http.post<unknown>(url, options.body, { params })
        : this.http.put<unknown>(url, options.body, { params });

    return request.pipe(
      catchError((error: HttpErrorResponse) => throwError(() => this.createApiError(error))),
      map((body) => this.assertEnvelope<T, M>(body)),
    );
  }

  /** Descarga binaria; los errores llegan como Blob y se interpretan igual que los JSON. */
  protected getBlob(path: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}${path}`, { responseType: "blob" }).pipe(
      catchError((error: HttpErrorResponse) =>
        error.error instanceof Blob
          ? from(error.error.text()).pipe(
              switchMap((text) =>
                throwError(() => this.createApiError(new HttpErrorResponse({
                  error: text,
                  status: error.status,
                  statusText: error.statusText,
                  url: error.url ?? undefined,
                }))),
              ),
            )
          : throwError(() => this.createApiError(error)),
      ),
    );
  }

  protected createApiError(error: HttpErrorResponse): ApiClientError {
    const body = this.parseErrorBody(error.error);
    const message = body?.error?.message?.trim()
      || body?.mensaje?.trim()
      || MENSAJES_POR_ESTADO[error.status]
      || MENSAJE_GENERICO;

    return new ApiClientError(
      message,
      error.status,
      body?.error?.code ?? (error.status === 0 ? NETWORK_ERROR_CODE : undefined),
      body?.meta?.requestId ?? error.headers?.get("x-request-id") ?? undefined,
      body?.error?.details,
    );
  }

  private requestData<T>(path: string, options: RequestOptions): Observable<T> {
    return this.requestEnvelope<T>(path, options).pipe(map(({ mensaje }) => mensaje));
  }

  private assertEnvelope<T, M extends ApiMeta>(body: unknown): ApiEnvelope<T, M> {
    if (
      typeof body === "object"
      && body !== null
      && (body as { exito?: unknown }).exito === true
      && "mensaje" in body
    ) {
      return body as ApiEnvelope<T, M>;
    }

    const requestId = typeof body === "object" && body !== null
      ? (body as ApiErrorBody).meta?.requestId
      : undefined;
    throw new ApiClientError(MENSAJE_RESPUESTA_INESPERADA, 200, UNEXPECTED_RESPONSE_CODE, requestId);
  }

  private parseErrorBody(error: unknown): ApiErrorBody | undefined {
    if (typeof error === "object" && error !== null) {
      return error as ApiErrorBody;
    }

    if (typeof error !== "string" || !error.trim()) {
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
