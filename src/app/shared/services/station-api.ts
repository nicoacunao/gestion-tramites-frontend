import { HttpErrorResponse, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, map, throwError } from "rxjs";
import { ApiBaseService } from "./api-base";
import {
  ApiEnvelope,
  BackendStation,
  BackendStationPage,
  BackendStationSummary,
  ImportStationsResponse,
} from "./api-models";

@Injectable({ providedIn: "root" })
export class StationApiService extends ApiBaseService {
  stationSummary() {
    return this.get<BackendStationSummary[]>("/consultas/stations/summary");
  }

  stations(page = 1, pageSize = 5) {
    const params = { page, pageSize };
    return this.http.get<ApiEnvelope<BackendStation[]>>(
      `${this.baseUrl}/consultas/stations`,
      { params },
    ).pipe(
      map(({ data, meta }) => {
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
              ?? Math.max(1, Math.ceil(total / pageSize)),
          },
        } satisfies BackendStationPage;
      }),
      catchError((error: HttpErrorResponse) =>
        throwError(() => this.createApiError(error)),
      ),
    );
  }

  importStations(file: File) {
    const body = new FormData();
    body.append("file", file, file.name);

    return this.http.post<ImportStationsResponse>(
      `${this.baseUrl}/consultas/stations/import`,
      body,
      { headers: new HttpHeaders({ Accept: "application/json" }) },
    ).pipe(
      catchError((error: HttpErrorResponse) =>
        throwError(() => this.createApiError(error)),
      ),
    );
  }
}
