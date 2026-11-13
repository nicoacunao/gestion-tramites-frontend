import { HttpClient } from "@angular/common/http";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideHttpClientTesting, HttpTestingController } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
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
    request.flush({ data: [], meta: { requestId: "req-auth" } });
  });
});
