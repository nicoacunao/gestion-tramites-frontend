import { Injectable } from "@angular/core";
import { ApiBaseService } from "./api-base";
import { BackendLogEntry, LogEntryWrite } from "./api-models";

/** Límites de `POST /bitacora/items`. */
export const LOG_TITLE_MAX = 80;
export const LOG_COMMENT_MAX = 1000;

@Injectable({ providedIn: "root" })
export class BitacoraApiService extends ApiBaseService {
  logs(managementId: string) {
    return this.get<BackendLogEntry[]>("/bitacora/items", { managementId });
  }

  createLog(body: LogEntryWrite) {
    return this.post<BackendLogEntry>("/bitacora/items", body);
  }
}
