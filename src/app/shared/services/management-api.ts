import { Injectable } from "@angular/core";
import { ApiBaseService } from "./api-base";
import {
  BackendBackground,
  BackendManagement,
  BackendStage,
  BackgroundCreate,
  BackgroundUpdate,
  ManagementContract,
  ManagementWrite,
  StageCreate,
  StageUpdate,
} from "./api-models";

/** Campos de una gestión que acepta el backend al crearla o actualizarla. */
export function aManagementWrite(item: ManagementContract): ManagementWrite {
  return {
    stationId: item.stationId,
    responsibleUserId: item.responsibleUserId,
    openedOn: item.openedOn,
    estimatedCompletionOn: item.estimatedCompletionOn,
    lastReviewedOn: item.lastReviewedOn,
    priority: item.priority,
    status: item.status,
    requesterName: item.requesterName,
  };
}

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

  updateManagement(id: string, body: ManagementWrite) {
    return this.put<BackendManagement>(`/gestiones/items/${encodeURIComponent(id)}`, body);
  }

  backgrounds(id: string) {
    return this.get<BackendBackground[]>(
      `/gestiones/items/${encodeURIComponent(id)}/backgrounds`,
    );
  }

  createBackground(managementId: string, body: BackgroundCreate) {
    return this.post<BackendBackground>(
      `/gestiones/items/${encodeURIComponent(managementId)}/backgrounds`,
      body,
    );
  }

  updateBackground(id: string, body: BackgroundUpdate) {
    return this.put<BackendBackground>(`/gestiones/backgrounds/${encodeURIComponent(id)}`, body);
  }

  stages(id: string) {
    return this.get<BackendStage[]>(`/gestiones/items/${encodeURIComponent(id)}/stages`);
  }

  createStage(managementId: string, body: StageCreate) {
    return this.post<BackendStage>(
      `/gestiones/items/${encodeURIComponent(managementId)}/stages`,
      body,
    );
  }

  updateStage(id: string, body: StageUpdate) {
    return this.put<BackendStage>(`/gestiones/stages/${encodeURIComponent(id)}`, body);
  }
}
