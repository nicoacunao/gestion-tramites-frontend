import { Injectable } from "@angular/core";
import { ApiBaseService } from "./api-base";

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
    return this.get<BackendFileRecord[]>("/archivos/items", { managementId });
  }

  file(id: string) {
    return this.get<BackendFileRecord>(`/archivos/items/${encodeURIComponent(id)}`);
  }

  upload(file: File, managementId: string, managementBackgroundId?: string) {
    const body = new FormData();
    body.append("file", file, file.name);
    body.append("managementId", managementId);
    if (managementBackgroundId) body.append("managementBackgroundId", managementBackgroundId);
    return this.post<BackendFileRecord>("/archivos/items", body);
  }

  download(id: string) {
    return this.getBlob(`/archivos/items/${encodeURIComponent(id)}/download`);
  }
}
