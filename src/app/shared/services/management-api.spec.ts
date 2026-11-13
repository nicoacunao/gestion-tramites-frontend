import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { ManagementApiService } from "./management-api";

describe("ManagementApiService", () => {
  let api: ManagementApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ManagementApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ManagementApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it("consulta solo las gestiones asignadas al usuario actual", () => {
    let result: unknown;
    api.managements(true).subscribe((items) => { result = items; });

    const request = http.expectOne((request) => request.urlWithParams.endsWith("/api/v1/gestiones/items?assignedToMe=true"));
    expect(request.request.urlWithParams).not.toContain("userId=");
    request.flush({ data: [], meta: { requestId: "req-1" } });
    expect(result).toEqual([]);
  });

  it("mantiene el listado completo sin parámetros de alcance", () => {
    api.managements().subscribe();

    const request = http.expectOne((item) => item.urlWithParams.endsWith("/api/v1/gestiones/items"));
    expect(request.request.urlWithParams).not.toContain("assignedToMe");
    expect(request.request.urlWithParams).not.toContain("userId=");
    request.flush({ data: [], meta: { requestId: "req-2" } });
  });

  it("propaga un 403 estructurado", () => {
    let error: unknown;
    api.managements(true).subscribe({ error: (value) => { error = value; } });

    const request = http.expectOne((item) => item.urlWithParams.includes("assignedToMe=true"));
    request.flush({ error: { code: "FORBIDDEN", message: "Sin permiso" }, meta: { requestId: "req-3" } }, { status: 403, statusText: "Forbidden" });
    expect(error).toMatchObject({ status: 403, code: "FORBIDDEN", requestId: "req-3" });
  });
});
