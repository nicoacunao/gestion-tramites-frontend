import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, catchError, map, throwError } from "rxjs";
import { environment } from "../../../environments/environment";

export interface ApiEnvelope<T> { data: T; meta: { requestId: string; page?: number; pageSize?: number; total?: number; totalPages?: number }; }
export interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
  meta?: { requestId?: string };
}
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
export interface LoginResponse { accessToken: string; expiresAt: string; user: BackendUser; }
export interface BackendUser { id: string; rut: string; names: string; firstSurname: string; secondSurname: string | null; email: string; phone?: string | null; description?: string | null; role: string; organization?: string | null; version?: number; }
export interface BackendCatalogStation { id: string; name?: string | null; address: string; commune: string; legalName: string; companyRut: string; }
export interface BackendManagementType { id: string; name: string; version: number; secondLevelLabel?: string; requiresSpecificSelection?: boolean; }
export interface BackendSpecificManagement {
  id: string;
  managementTypeId: string;
  code: string;
  name: string;
  active: boolean;
  backgrounds?: Array<{ id: string; name: string }>;
}
export interface BackendCatalogBackground { id: string; name: string; version: number; }
export interface BackendManagement {
  id: string;
  stationId: string;
  managementTypeId: string;
  scopeCode: string;
  responsibleUserId: string;
  level: "N1" | "N2" | "N3" | "N4";
  sequence: number;
  openedOn: string;
  estimatedCompletionOn: string | null;
  lastReviewedOn: string | null;
  priority: "Alta" | "Media" | "Baja";
  requesterName: string;
  status: string | null;
  version: number;
  codigo: string;
  nivel: `N${number}`;
  ambito: string;
  codigoAmbito: string;
  correlativo: number;
  semaforo: "al-dia" | "proximo-vencer" | "atrasado";
  semaforoEtiqueta: string;
  fechaInicio: string;
  fechaIngreso: string;
  fechaIngresoOrden: string;
  fechaEstimadaTermino: string;
  responsableInterno: string;
  idEstacion: string;
  estacionServicio: string;
  direccion: string;
  comuna: string;
  rutRazonSocial: string;
  razonSocial: string;
  representanteLegal: string;
  rutRepresentanteLegal: string;
  concesionario: string;
  descripcion: string;
  stationName?: string | null;
  legalName?: string | null;
  responsibleName?: string | null;
  managementTypeName?: string | null;
  managementTypeCode?: string | null;
  legalRut?: string | null;
  legalRepresentative?: string | null;
  creationMode?: "principal" | "subtramite";
  specificManagementId?: string | null;
}
export interface BackendBackground { id: string; managementId: string; parentManagementBackgroundId: string | null; managementTypeId: string; backgroundId: string; level: "N2" | "N3" | "N4"; required: boolean; responsibleUserId: string; status: string; fileReference: string | null; uploadedAt: string | null; version: number; }
export interface BackendStage { id: string; managementId: string; stageId: string; status: string; estimatedOn: string | null; completedOn: string | null; responsible: string | null; notes: string | null; version: number; }
export interface BackendLogEntry { id: string; managementId: string; userId: string | null; registeredOn: string; registeredAt: string; title: string; comment: string; authorName?: string | null; authorInitials?: string | null; type?: "inicio" | "novedad" | "seguimiento" | "contacto" | null; automatic?: boolean; version: number; }
export interface BackendStationSummary { stationId: string; activeCount: number; pendingCount: number; daysWithoutProgress: number; overallStatus: string; }
export interface BackendStation {
  stationId: string;
  legalName: string;
  address: string;
  comuna: string;
  zoneManager: string;
  commercialManager: string;
  companyRut: string;
  legalRepresentative: string;
  legalRepresentativeRut: string;
  status: string;
}
export interface BackendStationPage {
  data: BackendStation[];
  meta: { requestId: string; page: number; pageSize: number; total: number; totalPages: number };
  allData?: BackendStation[];
}
export interface ImportStationsMeta { requestId: string; created: number; updated: number; rejected: number; }
export interface ImportStationsResponse { data: BackendStation[]; meta: ImportStationsMeta; }

@Injectable({ providedIn: "root" })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  login(rut: string, password: string): Observable<LoginResponse> { return this.request<ApiEnvelope<LoginResponse>>("/identidad/login", { method: "post", body: { rut, password } }).pipe(map(({ data }) => data)); }
  profile(): Observable<BackendUser> { return this.get<BackendUser>("/identidad/profile"); }
  updateProfile(body: object): Observable<BackendUser> { return this.request<ApiEnvelope<BackendUser>>("/identidad/profile", { method: "put", body }).pipe(map(({ data }) => data)); }
  users(): Observable<BackendUser[]> { return this.get<BackendUser[]>("/identidad/users"); }
  catalogStations(): Observable<BackendCatalogStation[]> { return this.get<BackendCatalogStation[]>("/catalogos/items"); }
  managementTypes(): Observable<BackendManagementType[]> { return this.get<BackendManagementType[]>("/catalogos/management-types"); }
  specificManagements(managementTypeId?: string): Observable<BackendSpecificManagement[]> {
    const query = managementTypeId ? `?managementTypeId=${encodeURIComponent(managementTypeId)}` : "";
    return this.get<BackendSpecificManagement[]>(`/gestiones-especificas/items${query}`);
  }
  backgroundCatalog(category?: "requerido" | "complementario"): Observable<BackendCatalogBackground[]> {
    const query = category ? `?categoria=${encodeURIComponent(category)}` : "";
    return this.get<BackendCatalogBackground[]>(`/antecedentes/items${query}`);
  }
  managements(): Observable<BackendManagement[]> { return this.get<BackendManagement[]>("/gestiones/items"); }
  management(id: string): Observable<BackendManagement> { return this.get<BackendManagement>(`/gestiones/items/${encodeURIComponent(id)}`); }
  createManagement(body: object): Observable<BackendManagement> { return this.request<ApiEnvelope<BackendManagement>>("/gestiones/items", { method: "post", body }).pipe(map(({ data }) => data)); }
  updateManagement(id: string, body: object): Observable<BackendManagement> { return this.request<ApiEnvelope<BackendManagement>>(`/gestiones/items/${encodeURIComponent(id)}`, { method: "put", body }).pipe(map(({ data }) => data)); }
  backgrounds(id: string): Observable<BackendBackground[]> { return this.get<BackendBackground[]>(`/gestiones/items/${encodeURIComponent(id)}/backgrounds`); }
  stages(id: string): Observable<BackendStage[]> { return this.get<BackendStage[]>(`/gestiones/items/${encodeURIComponent(id)}/stages`); }
  updateBackground(id: string, body: object): Observable<BackendBackground> { return this.request<ApiEnvelope<BackendBackground>>(`/gestiones/backgrounds/${encodeURIComponent(id)}`, { method: "put", body }).pipe(map(({ data }) => data)); }
  updateStage(id: string, body: object): Observable<BackendStage> { return this.request<ApiEnvelope<BackendStage>>(`/gestiones/stages/${encodeURIComponent(id)}`, { method: "put", body }).pipe(map(({ data }) => data)); }
  logs(id: string): Observable<BackendLogEntry[]> { return this.get<BackendLogEntry[]>(`/bitacora/items?managementId=${encodeURIComponent(id)}`); }
  createLog(body: object): Observable<BackendLogEntry> { return this.request<ApiEnvelope<BackendLogEntry>>("/bitacora/items", { method: "post", body }).pipe(map(({ data }) => data)); }
  stationSummary(): Observable<BackendStationSummary[]> { return this.get<BackendStationSummary[]>("/consultas/stations/summary"); }
  stations(page = 1, pageSize = 5): Observable<BackendStationPage> {
    const params = new HttpParams().set("page", page).set("pageSize", pageSize);
    return this.http.get<ApiEnvelope<BackendStation[]>>(`${this.baseUrl}/consultas/stations`, { params }).pipe(
      map(({ data, meta }) => {
        const total = meta.total ?? data.length;
        const returnedPage = meta.page ?? page;
        const returnedPageSize = meta.pageSize ?? pageSize;
        const hasServerPagination = meta.total !== undefined || meta.totalPages !== undefined || meta.page !== undefined;
        const pageData = hasServerPagination ? data : data.slice((page - 1) * pageSize, page * pageSize);
        return {
          data: pageData,
          allData: hasServerPagination ? undefined : data,
          meta: {
            requestId: meta.requestId,
            page: returnedPage,
            pageSize: returnedPageSize,
            total,
            totalPages: meta.totalPages ?? Math.max(1, Math.ceil(total / pageSize)),
          },
        };
      }),
      catchError((error: HttpErrorResponse) => {
        const body = this.parseErrorBody(error.error);
        return throwError(() => new ApiClientError(
          body?.error?.message ?? "No fue posible cargar las estaciones.",
          error.status,
          body?.error?.code,
          body?.meta?.requestId,
          body?.error?.details,
        ));
      }),
    );
  }
  importStations(file: File): Observable<ImportStationsResponse> {
    const body = new FormData();
    body.append("file", file, file.name);
    // Do not set Content-Type manually: the browser must add the multipart boundary.
    return this.http.post<ImportStationsResponse>(
      `${this.baseUrl}/consultas/stations/import`,
      body,
      { headers: new HttpHeaders({ Accept: "application/json" }) },
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        const response = this.parseErrorBody(error.error);
        return throwError(() => new ApiClientError(
          response?.error?.message ?? "No fue posible importar el archivo.",
          error.status,
          response?.error?.code,
          response?.meta?.requestId,
          response?.error?.details,
        ));
      }),
    );
  }
  catalogs<T>(path: string): Observable<T> { return this.get<T>(path); }

  private get<T>(path: string): Observable<T> { return this.request<ApiEnvelope<T>>(path, { method: "get" }).pipe(map(({ data }) => data)); }
  private request<T>(path: string, options: { method: "get" | "post" | "put"; body?: object }): Observable<T> {
    const url = `${this.baseUrl}${path}`;
    const request = options.method === "get" ? this.http.get<T>(url) : options.method === "post" ? this.http.post<T>(url, options.body) : this.http.put<T>(url, options.body);
    return request.pipe(catchError((error: HttpErrorResponse) => {
      const body = this.parseErrorBody(error.error);
      return throwError(() => new ApiClientError(
        body?.error?.message ?? "No fue posible completar la operación.",
        error.status,
        body?.error?.code,
        body?.meta?.requestId,
        body?.error?.details,
      ));
    }));
  }

  private parseErrorBody(error: unknown): ApiErrorBody | undefined {
    if (typeof error === "object" && error !== null) return error as ApiErrorBody;
    if (typeof error !== "string") return undefined;
    try {
      const parsed: unknown = JSON.parse(error);
      return typeof parsed === "object" && parsed !== null ? parsed as ApiErrorBody : undefined;
    } catch {
      return undefined;
    }
  }
}
