import { Injectable } from "@angular/core";
import { map } from "rxjs";
import { ApiBaseService } from "./api-base";
import {
  ApiPageMeta,
  BackendStation,
  BackendStationPage,
  BackendStationSummary,
  ImportStationsMeta,
  ImportStationsResponse,
} from "./api-models";

/** Máximo de filas por página aceptado por `GET /consultas/stations`. */
export const STATION_MAX_PAGE_SIZE = 100;

@Injectable({ providedIn: "root" })
export class StationApiService extends ApiBaseService {
  stationSummary() {
    return this.get<BackendStationSummary[]>("/consultas/stations/summary");
  }

  /** Página de estaciones; el backend pagina y entrega los totales en `meta`. */
  stations(page = 1, pageSize = 5) {
    return this.requestEnvelope<BackendStation[], ApiPageMeta>("/consultas/stations", {
      method: "get",
      params: { page, pageSize: Math.min(pageSize, STATION_MAX_PAGE_SIZE) },
    }).pipe(
      map(({ mensaje, meta }): BackendStationPage => ({ data: mensaje, meta })),
    );
  }

  importStations(file: File) {
    const body = new FormData();
    body.append("file", file, file.name);

    return this.requestEnvelope<BackendStation[], ImportStationsMeta>(
      "/consultas/stations/import",
      { method: "post", body },
    ).pipe(
      map(({ mensaje, meta }): ImportStationsResponse => ({ data: mensaje, meta })),
    );
  }
}
