import { Injectable } from "@angular/core";
import { map } from "rxjs";
import { ApiBaseService } from "./api-base";
import {
  BackendBackground,
  BackendManagement,
  BackendStage,
} from "./api-models";

@Injectable({ providedIn: "root" })
export class ManagementApiService extends ApiBaseService {
  managements() {
    return this.get<BackendManagement[]>("/gestiones/items");
  }

  management(id: string) {
    return this.get<BackendManagement>(
      `/gestiones/items/${encodeURIComponent(id)}`,
    );
  }

  createManagement(body: object) {
    return this.request<{ data: BackendManagement }>("/gestiones/items", {
      method: "post",
      body,
    }).pipe(map(({ data }) => data));
  }

  updateManagement(id: string, body: object) {
    return this.request<{ data: BackendManagement }>(
      `/gestiones/items/${encodeURIComponent(id)}`,
      { method: "put", body },
    ).pipe(map(({ data }) => data));
  }

  backgrounds(id: string) {
    return this.get<BackendBackground[]>(
      `/gestiones/items/${encodeURIComponent(id)}/backgrounds`,
    );
  }

  stages(id: string) {
    return this.get<BackendStage[]>(
      `/gestiones/items/${encodeURIComponent(id)}/stages`,
    );
  }

  updateBackground(id: string, body: object) {
    return this.request<{ data: BackendBackground }>(
      `/gestiones/backgrounds/${encodeURIComponent(id)}`,
      { method: "put", body },
    ).pipe(map(({ data }) => data));
  }

  updateStage(id: string, body: object) {
    return this.request<{ data: BackendStage }>(
      `/gestiones/stages/${encodeURIComponent(id)}`,
      { method: "put", body },
    ).pipe(map(({ data }) => data));
  }

  createBackground(managementId: string, body: object) {
    return this.request<{ data: BackendBackground | null }>(
      `/gestiones/items/${encodeURIComponent(managementId)}/backgrounds`,
      { method: "post", body },
    ).pipe(map(({ data }) => data));
  }
}
