import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { environment } from "../../../environments/environment";
import { authInterceptor } from "./auth.interceptor";

describe("authInterceptor", () => {
  let httpClient: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem("gestion-tramites.access-token", "token-de-prueba");
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.clear();
    http.verify();
  });

  it("envía Bearer y no agrega userId", () => {
    httpClient.get("http://localhost:8787/api/v1/gestiones/items?assignedToMe=true").subscribe();
    const request = http.expectOne((item) => item.urlWithParams.includes("assignedToMe=true"));
    expect(request.request.headers.get("Authorization")).toBe("Bearer token-de-prueba");
    expect(request.request.urlWithParams).not.toContain("userId=");
    request.flush({ exito: true, mensaje: [], meta: { requestId: "req-auth" } });
  });

  it("no envía el token al login ni trata su 401 como sesión vencida", () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, "navigate").mockResolvedValue(true);
    let status: number | undefined;

    httpClient.post(`${environment.apiUrl}/identidad/login`, { rut: "1", password: "x" })
      .subscribe({ error: (error: HttpErrorResponse) => { status = error.status; } });
    const request = http.expectOne(`${environment.apiUrl}/identidad/login`);
    expect(request.request.headers.has("Authorization")).toBe(false);
    request.flush(
      { exito: false, mensaje: "Credenciales inválidas.", error: { code: "INVALID_CREDENTIALS", message: "Credenciales inválidas." }, meta: { requestId: "req-login" } },
      { status: 401, statusText: "Unauthorized" },
    );

    expect(status).toBe(401);
    expect(navigate).not.toHaveBeenCalled();
    expect(localStorage.getItem("gestion-tramites.access-token")).toBe("token-de-prueba");
  });

  it("cierra la sesión y redirige cuando otra solicitud responde 401", () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, "navigate").mockResolvedValue(true);

    httpClient.get(`${environment.apiUrl}/gestiones/items`).subscribe({ error: () => undefined });
    http.expectOne(`${environment.apiUrl}/gestiones/items`).flush(
      { exito: false, mensaje: "Sesión vencida.", error: { code: "UNAUTHORIZED", message: "Sesión vencida." }, meta: { requestId: "req-401" } },
      { status: 401, statusText: "Unauthorized" },
    );

    expect(localStorage.getItem("gestion-tramites.access-token")).toBeNull();
    expect(navigate).toHaveBeenCalledWith(["/login"], { queryParams: { reason: "session-expired" } });
  });
});
