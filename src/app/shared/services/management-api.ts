import { Injectable } from "@angular/core";
import { ApiBaseService } from "./api-base";
import {
  BackendBackground,
  BackendManagement,
  BackendStage,
} from "./api-models";

@Injectable({ providedIn: "root" })
export class ManagementApiService extends ApiBaseService {
  managements(assignedToMe = false) {
    return this.get<BackendManagement[]>(
      "/gestiones/items",
      assignedToMe ? { assignedToMe: true } : undefined,
    );
  }

  management(id: string) {
    return this.get<BackendManagement>(`/gestiones/items/${encodeURIComponent(id)}`);
  }

  createManagement(body: object) {
    return this.post<BackendManagement>("/gestiones/items", body);
  }

  updateManagement(id: string, body: object) {
    return this.put<BackendManagement>(`/gestiones/items/${encodeURIComponent(id)}`, body);
  }

  backgrounds(id: string) {
    return this.get<BackendBackground[]>(
      `/gestiones/items/${encodeURIComponent(id)}/backgrounds`,
    );
  }

  stages(id: string) {
    return this.get<BackendStage[]>(`/gestiones/items/${encodeURIComponent(id)}/stages`);
  }

  updateBackground(id: string, body: object) {
    return this.put<BackendBackground>(`/gestiones/backgrounds/${encodeURIComponent(id)}`, body);
  }

  updateStage(id: string, body: object) {
    return this.put<BackendStage>(`/gestiones/stages/${encodeURIComponent(id)}`, body);
  }

  createBackground(managementId: string, body: object) {
    return this.post<BackendBackground>(
      `/gestiones/items/${encodeURIComponent(managementId)}/backgrounds`,
      body,
    );
  }
}
