import { Injectable } from "@angular/core";
import { ApiBaseService } from "./api-base";

/** Archivo de un antecedente (`FileRecord`); su id es el del antecedente. */
export interface BackendFileRecord {
  id: string;
  managementSpecificId: string;
  storageReference: string;
  uploadedAt: string;
}

/** Tamaño máximo de archivo aceptado en la interfaz. */
export const FILE_MAX_BYTES = 10_000_000;

/** Nombre legible de una referencia `"<antecedente>/<uuid>-<nombre>"`. */
export function nombreDeArchivo(referencia: string | null | undefined): string {
  if (!referencia) return "";
  const base = referencia.split("/").pop() ?? referencia;
  return base.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "");
}

@Injectable({ providedIn: "root" })
export class FilesApiService extends ApiBaseService {
  files(managementSpecificId: string) {
    return this.get<BackendFileRecord[]>("/archivos/items", { managementSpecificId });
  }

  file(id: string) {
    return this.get<BackendFileRecord>(`/archivos/items/${encodeURIComponent(id)}`);
  }

  /** Sube (o reemplaza) el archivo de un antecedente. */
  upload(file: File, managementSpecificId: string) {
    const body = new FormData();
    body.append("file", file, file.name);
    body.append("managementSpecificId", managementSpecificId);
    return this.post<BackendFileRecord>("/archivos/items", body);
  }

  download(id: string) {
    return this.getBlob(`/archivos/items/${encodeURIComponent(id)}/download`);
  }
}
