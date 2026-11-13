import { HttpErrorResponse, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, map, throwError } from "rxjs";
import { ApiBaseService } from "./api-base";
import { ApiEnvelope } from "./api-models";

export interface BackendFileRecord {
  id: string;
  managementId: string;
  managementBackgroundId: string | null;
  storageProvider: string;
  storageReference: string;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
  uploadedByUserId: string;
  uploadedAt: string;
  version: number;
}

@Injectable({ providedIn: "root" })
export class FilesApiService extends ApiBaseService {
  files(managementId: string) {
    return this.get<BackendFileRecord[]>(`/archivos/items?managementId=${encodeURIComponent(managementId)}`);
  }

  file(id: string) {
    return this.get<BackendFileRecord>(`/archivos/items/${encodeURIComponent(id)}`);
  }

  upload(file: File, managementId: string, managementBackgroundId?: string) {
    const body = new FormData();
    body.append("file", file, file.name);
    body.append("managementId", managementId);
    if (managementBackgroundId) body.append("managementBackgroundId", managementBackgroundId);
    return this.http.post<ApiEnvelope<BackendFileRecord>>(`${this.baseUrl}/archivos/items`, body, {
      headers: new HttpHeaders({ Accept: "application/json" }),
    }).pipe(
      map(({ data }) => data),
      catchError((error: HttpErrorResponse) => throwError(() => this.createApiError(error))),
    );
  }

  download(id: string) {
    return this.http.get(`${this.baseUrl}/archivos/items/${encodeURIComponent(id)}/download`, {
      responseType: "blob",
    }).pipe(catchError((error: HttpErrorResponse) => throwError(() => this.createApiError(error))));
  }
}
