import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, catchError, map, throwError } from "rxjs";
import { environment } from "../../../environments/environment";

export interface ApiEnvelope<T> { data: T; meta: { requestId: string }; }
export interface ApiErrorBody { error?: { code?: string; message?: string }; meta?: { requestId?: string }; }
export interface LoginResponse { accessToken: string; expiresAt: string; user: BackendUser; }
export interface BackendUser { id: string; rut: string; names: string; firstSurname: string; secondSurname: string | null; email: string; phone?: string | null; description?: string | null; role: string; organization?: string | null; version?: number; }
export interface BackendManagement { id: string; stationId: string; managementTypeId: string; scopeCode: string; responsibleUserId: string; level: "N1" | "N2" | "N3" | "N4"; sequence: number; openedOn: string; estimatedCompletionOn: string | null; lastReviewedOn: string | null; priority: "Alta" | "Media" | "Baja"; requesterName: string; status: string | null; version: number; stationName?: string | null; legalName?: string | null; responsibleName?: string | null; managementTypeName?: string | null; managementTypeCode?: string | null; comuna?: string | null; address?: string | null; legalRut?: string | null; legalRepresentative?: string | null; creationMode?: "principal" | "subtramite"; specificManagementId?: string | null; }
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

@Injectable({ providedIn: "root" })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  login(rut: string, password: string): Observable<LoginResponse> { return this.request<ApiEnvelope<LoginResponse>>("/identidad/login", { method: "post", body: { rut, password } }).pipe(map(({ data }) => data)); }
  profile(): Observable<BackendUser> { return this.get<BackendUser>("/identidad/profile"); }
  updateProfile(body: object): Observable<BackendUser> { return this.request<ApiEnvelope<BackendUser>>("/identidad/profile", { method: "put", body }).pipe(map(({ data }) => data)); }
  users(): Observable<BackendUser[]> { return this.get<BackendUser[]>("/identidad/users"); }
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
  stations(): Observable<BackendStation[]> { return this.get<BackendStation[]>("/consultas/stations"); }
  importStations(file: File): Observable<BackendStation[]> {
    const body = new FormData();
    body.append("file", file, file.name);
    return this.http.post<ApiEnvelope<BackendStation[]>>(`${this.baseUrl}/consultas/stations/import`, body).pipe(
      map(({ data }) => data),
      catchError((error: HttpErrorResponse) => {
        const response = error.error as ApiErrorBody | undefined;
        return throwError(() => new Error(response?.error?.message ?? "No fue posible importar el archivo."));
      }),
    );
  }
  catalogs<T>(path: string): Observable<T> { return this.get<T>(path); }

  private get<T>(path: string): Observable<T> { return this.request<ApiEnvelope<T>>(path, { method: "get" }).pipe(map(({ data }) => data)); }
  private request<T>(path: string, options: { method: "get" | "post" | "put"; body?: object }): Observable<T> {
    const url = `${this.baseUrl}${path}`;
    const request = options.method === "get" ? this.http.get<T>(url) : options.method === "post" ? this.http.post<T>(url, options.body) : this.http.put<T>(url, options.body);
    return request.pipe(catchError((error: HttpErrorResponse) => {
      const body = error.error as ApiErrorBody | undefined;
      return throwError(() => new Error(body?.error?.message ?? "No fue posible completar la operación."));
    }));
  }
}
