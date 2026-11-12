import { Injectable } from "@angular/core";
import { ApiBaseService } from "./api-base";
import {
  BackendCatalogBackground,
  BackendCatalogStation,
  BackendManagementType,
  BackendSpecificManagement,
} from "./api-models";

@Injectable({ providedIn: "root" })
export class CatalogApiService extends ApiBaseService {
  catalogStations() {
    return this.get<BackendCatalogStation[]>("/catalogos/items");
  }

  managementTypes() {
    return this.get<BackendManagementType[]>("/catalogos/management-types");
  }

  specificManagements(managementTypeId?: string) {
    const query = managementTypeId
      ? `?managementTypeId=${encodeURIComponent(managementTypeId)}`
      : "";
    return this.get<BackendSpecificManagement[]>(
      `/gestiones-especificas/items${query}`,
    );
  }

  backgroundCatalog(category?: "requerido" | "complementario") {
    const query = category
      ? `?categoria=${encodeURIComponent(category)}`
      : "";
    return this.get<BackendCatalogBackground[]>(
      `/antecedentes/items${query}`,
    );
  }
}
