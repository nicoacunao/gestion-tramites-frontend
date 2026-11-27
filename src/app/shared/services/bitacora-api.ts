import { Injectable } from "@angular/core";
import { ApiBaseService } from "./api-base";
import { BackendLogEntry } from "./api-models";

@Injectable({ providedIn: "root" })
export class BitacoraApiService extends ApiBaseService {
  logs(managementId: string) {
    return this.get<BackendLogEntry[]>("/bitacora/items", { managementId });
  }

  createLog(body: object) {
    return this.post<BackendLogEntry>("/bitacora/items", body);
  }
}
