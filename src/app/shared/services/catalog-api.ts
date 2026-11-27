import { Injectable } from "@angular/core";
import { ApiBaseService } from "./api-base";
import { CatalogStation, ManagementTypeNode, StageCatalogItem } from "./api-models";

@Injectable({ providedIn: "root" })
export class CatalogApiService extends ApiBaseService {
  catalogStations() {
    return this.get<CatalogStation[]>("/catalogos/items");
  }

  /** Catálogo jerárquico completo de tipos de gestión. */
  managementTypes() {
    return this.get<ManagementTypeNode[]>("/catalogos/management-types");
  }

  stageCatalog() {
    return this.get<StageCatalogItem[]>("/catalogos/stages");
  }
}
