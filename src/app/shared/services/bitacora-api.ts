import { Injectable } from "@angular/core";
import { map } from "rxjs";
import { ApiBaseService } from "./api-base";
import { BackendLogEntry } from "./api-models";

@Injectable({ providedIn: "root" })
export class BitacoraApiService extends ApiBaseService {
  logs(id: string) {
    return this.get<BackendLogEntry[]>(
      `/bitacora/items?managementId=${encodeURIComponent(id)}`,
    );
  }

  createLog(body: object) {
    return this.request<{ data: BackendLogEntry }>("/bitacora/items", {
      method: "post",
      body,
    }).pipe(map(({ data }) => data));
  }
}
