import { Injectable } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { environment } from "../../../environments/environment";
import {
  API_TIMEOUT_MS,
  API_TRANSFER_TIMEOUT_MS,
  ApiBaseService,
  ApiClientError,
  NETWORK_ERROR_CODE,
  TIMEOUT_CODE,
  UNEXPECTED_RESPONSE_CODE,
} from "./api-base";

@Injectable()
class TestApiService extends ApiBaseService {
  item(params?: Record<string, string>) { return this.get<{ id: string }>("/prueba", params); }
  create(body: object) { return this.post<{ id: string }>("/prueba", body); }
  page() { return this.requestEnvelope<string[], { requestId: string; total: number }>("/prueba", { method: "get" }); }
  blob() { return this.getBlob("/prueba/descarga"); }
}

describe("ApiBaseService", () => {
  let api: TestApiService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/prueba`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TestApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(TestApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  it("devuelve los datos de `mensaje` y codifica los parámetros", () => {
    let result: unknown;
    api.item({ managementId: "10 & 2" }).subscribe((value) => { result = value; });

    const request = http.expectOne((item) => item.url === url);
    expect(request.request.params.get("managementId")).toBe("10 & 2");
    request.flush({ exito: true, mensaje: { id: "1" }, meta: { requestId: "req-1" } });
    expect(result).toEqual({ id: "1" });
  });

  it("expone la respuesta completa cuando se piden los metadatos", () => {
    let result: unknown;
    api.page().subscribe((value) => { result = value; });

    http.expectOne(url).flush({ exito: true, mensaje: ["a"], meta: { requestId: "req-2", total: 1 } });
    expect(result).toEqual({ exito: true, mensaje: ["a"], meta: { requestId: "req-2", total: 1 } });
  });

  it("rechaza respuestas que no cumplen el contrato", () => {
    let error: ApiClientError | undefined;
    api.create({}).subscribe({ error: (value: ApiClientError) => { error = value; } });

    http.expectOne(url).flush({ data: { id: "1" }, meta: { requestId: "req-3" } });
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ code: UNEXPECTED_RESPONSE_CODE, requestId: "req-3" });
  });

  it("usa el mensaje seguro del servidor y conserva código, requestId y detalles", () => {
    let error: ApiClientError | undefined;
    api.create({}).subscribe({ error: (value: ApiClientError) => { error = value; } });

    http.expectOne(url).flush(
      {
        exito: false,
        mensaje: "La entrada no es válida.",
        error: { code: "INVALID_LOG_ENTRY", message: "El título es obligatorio.", details: { field: "title" } },
        meta: { requestId: "req-4" },
      },
      { status: 422, statusText: "Unprocessable Entity" },
    );
    expect(error).toMatchObject({
      status: 422,
      code: "INVALID_LOG_ENTRY",
      message: "El título es obligatorio.",
      requestId: "req-4",
      details: { field: "title" },
    });
  });

  it("usa un mensaje por estado cuando el error no trae cuerpo", () => {
    let error: ApiClientError | undefined;
    api.item().subscribe({ error: (value: ApiClientError) => { error = value; } });

    http.expectOne(url).flush(null, { status: 503, statusText: "Service Unavailable" });
    expect(error?.message).toBe("El servicio no está disponible temporalmente. Inténtalo más tarde.");
  });

  it("identifica los errores de red", () => {
    let error: ApiClientError | undefined;
    api.item().subscribe({ error: (value: ApiClientError) => { error = value; } });

    http.expectOne(url).error(new ProgressEvent("error"), { status: 0, statusText: "" });
    expect(error).toMatchObject({ status: 0, code: NETWORK_ERROR_CODE });
    expect(error?.message).toContain("No fue posible conectar con el servidor");
  });

  it("interpreta errores JSON recibidos como Blob en descargas", async () => {
    const result = new Promise<ApiClientError>((resolve) => {
      api.blob().subscribe({ error: (value: ApiClientError) => resolve(value) });
    });

    http.expectOne(`${url}/descarga`).flush(
      new Blob([JSON.stringify({
        exito: false,
        mensaje: "El archivo no existe.",
        error: { code: "RESOURCE_NOT_FOUND", message: "El archivo no existe." },
        meta: { requestId: "req-5" },
      })], { type: "application/json" }),
      { status: 404, statusText: "Not Found" },
    );

    expect(await result).toMatchObject({ status: 404, code: "RESOURCE_NOT_FOUND", message: "El archivo no existe.", requestId: "req-5" });
  });

  it("corta la espera si el servidor no responde y cancela la solicitud", () => {
    vi.useFakeTimers();
    let error: ApiClientError | undefined;
    api.create({ rut: "1" }).subscribe({ error: (value: ApiClientError) => { error = value; } });
    const request = http.expectOne(url);

    vi.advanceTimersByTime(API_TIMEOUT_MS - 1);
    expect(error).toBeUndefined();

    vi.advanceTimersByTime(1);
    expect(error).toMatchObject({ status: 0, code: TIMEOUT_CODE });
    expect(error?.message).toContain("no respondió a tiempo");
    expect(request.cancelled).toBe(true);
  });

  it("da más tiempo a las cargas de archivos", () => {
    vi.useFakeTimers();
    let error: ApiClientError | undefined;
    let result: unknown;
    api.create(new FormData()).subscribe({ next: (value) => { result = value; }, error: (value: ApiClientError) => { error = value; } });
    const request = http.expectOne(url);

    vi.advanceTimersByTime(API_TIMEOUT_MS + 1);
    expect(error).toBeUndefined();
    request.flush({ exito: true, mensaje: { id: "1" }, meta: { requestId: "req-6" } });

    expect(result).toEqual({ id: "1" });
    expect(API_TRANSFER_TIMEOUT_MS).toBeGreaterThan(API_TIMEOUT_MS);
  });

  it("aplica el tiempo máximo de transferencia a las descargas", () => {
    vi.useFakeTimers();
    let error: ApiClientError | undefined;
    api.blob().subscribe({ error: (value: ApiClientError) => { error = value; } });
    const request = http.expectOne(`${url}/descarga`);

    vi.advanceTimersByTime(API_TRANSFER_TIMEOUT_MS);

    expect(error).toMatchObject({ code: TIMEOUT_CODE });
    expect(request.cancelled).toBe(true);
  });
});
