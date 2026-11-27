import { Injectable } from "@angular/core";
import { ApiBaseService } from "./api-base";
import {
  BackendCatalogBackground,
  BackendCatalogStation,
  BackendManagementType,
  BackendSpecificManagement,
  StageCatalogItem,
} from "./api-models";

@Injectable({ providedIn: "root" })
export class CatalogApiService extends ApiBaseService {
  catalogStations() {
    return this.get<BackendCatalogStation[]>("/catalogos/items");
  }

  stageCatalog() {
    return this.get<StageCatalogItem[]>("/catalogos/stages");
  }

  managementTypes() {
    return this.get<BackendManagementType[]>("/catalogos/management-types");
  }

  specificManagements(managementTypeId?: string) {
    return this.get<BackendSpecificManagement[]>(
      "/gestiones-especificas/items",
      managementTypeId ? { managementTypeId } : undefined,
    );
  }

  backgroundCatalog(category?: "requerido" | "complementario") {
    return this.get<BackendCatalogBackground[]>(
      "/antecedentes/items",
      category ? { categoria: category } : undefined,
    );
  }
}
