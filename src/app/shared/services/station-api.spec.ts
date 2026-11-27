import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { environment } from "../../../environments/environment";
import { BackendStationPage, ImportStationsResponse } from "./api-models";
import { StationApiService } from "./station-api";

const estacion = {
  stationId: "1001",
  legalName: "Comercial Uno",
  address: "Av. Siempre Viva 123",
  comuna: "Santiago",
  zoneManager: null,
  commercialManager: null,
  companyRut: null,
  legalRepresentative: null,
  legalRepresentativeRut: null,
  estado: "No",
};

describe("StationApiService", () => {
  let api: StationApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StationApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(StationApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it("pide la página al servidor y usa sus metadatos", () => {
    let page: BackendStationPage | undefined;
    api.stations(3, 500).subscribe((value) => { page = value; });

    const request = http.expectOne((item) => item.url === `${environment.apiUrl}/consultas/stations`);
    expect(request.request.params.get("page")).toBe("3");
    expect(request.request.params.get("pageSize")).toBe("100");
    request.flush({
      exito: true,
      mensaje: [estacion],
      meta: { requestId: "req-1", page: 3, pageSize: 100, total: 201, totalPages: 3 },
    });

    expect(page).toEqual({
      data: [estacion],
      meta: { requestId: "req-1", page: 3, pageSize: 100, total: 201, totalPages: 3 },
    });
  });

  it("devuelve el resumen y las filas rechazadas de la importación", () => {
    let result: ImportStationsResponse | undefined;
    api.importStations(new File(["EDS"], "estaciones.csv")).subscribe((value) => { result = value; });

    const request = http.expectOne(`${environment.apiUrl}/consultas/stations/import`);
    expect(request.request.body).toBeInstanceOf(FormData);
    request.flush({
      exito: true,
      mensaje: [estacion],
      meta: { requestId: "req-2", created: 1, updated: 0, rejected: 1, rejectedRows: [{ row: 3, message: "EDS es obligatorio." }] },
    });

    expect(result?.data).toEqual([estacion]);
    expect(result?.meta.rejectedRows).toEqual([{ row: 3, message: "EDS es obligatorio." }]);
  });
});
