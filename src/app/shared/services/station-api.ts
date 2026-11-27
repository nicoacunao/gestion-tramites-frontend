import { Injectable } from "@angular/core";
import { map } from "rxjs";
import { ApiBaseService } from "./api-base";
import {
  ApiMeta,
  ApiPageMeta,
  BackendStation,
  BackendStationPage,
  BackendStationSummary,
  ImportStationsMeta,
  ImportStationsResponse,
} from "./api-models";

@Injectable({ providedIn: "root" })
export class StationApiService extends ApiBaseService {
  stationSummary() {
    return this.get<BackendStationSummary[]>("/consultas/stations/summary");
  }

  stations(page = 1, pageSize = 5) {
    return this.requestEnvelope<BackendStation[], ApiMeta & Partial<Omit<ApiPageMeta, "requestId">>>("/consultas/stations", {
      method: "get",
      params: { page, pageSize },
    }).pipe(
      map(({ mensaje: data, meta }) => {
        const total = meta.total ?? data.length;
        const returnedPage = meta.page ?? page;
        const returnedPageSize = meta.pageSize ?? pageSize;
        const hasServerPagination = meta.total !== undefined
          || meta.totalPages !== undefined
          || meta.page !== undefined;
        const pageData = hasServerPagination
          ? data
          : data.slice((page - 1) * pageSize, page * pageSize);

        return {
          data: pageData,
          allData: hasServerPagination ? undefined : data,
          meta: {
            requestId: meta.requestId,
            page: returnedPage,
            pageSize: returnedPageSize,
            total,
            totalPages: meta.totalPages
              ?? Math.max(1, Math.ceil(total / returnedPageSize)),
          },
        } satisfies BackendStationPage;
      }),
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
