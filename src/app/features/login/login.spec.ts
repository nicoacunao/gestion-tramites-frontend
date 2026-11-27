import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from "@angular/router";
import { Subject } from "rxjs";
import { ApiClientError } from "../../shared/services/api-base";
import { LoginResponse } from "../../shared/services/api-models";
import { IdentityApiService } from "../../shared/services/identity-api";
import { UserSessionService } from "../../shared/services/user-session";
import { Login } from "./login";

describe("Login", () => {
  let respuesta: Subject<LoginResponse>;
  let api: { login: ReturnType<typeof vi.fn> };
  let session: { setSession: ReturnType<typeof vi.fn> };

  function crear(reason?: string) {
    respuesta = new Subject<LoginResponse>();
    api = { login: vi.fn(() => respuesta.asObservable()) };
    session = { setSession: vi.fn() };
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: IdentityApiService, useValue: api },
        { provide: UserSessionService, useValue: session },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(reason ? { reason } : {}) } },
        },
      ],
    });
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    return fixture;
  }

  function completar(componente: Login) {
    componente.form.setValue({ rut: "11.111.111-1", password: "secreta" });
  }

  it("informa cuando la sesión expiró", () => {
    const fixture = crear("session-expired");
    const aviso: HTMLElement | null = fixture.nativeElement.querySelector(".session-notice");

    expect(aviso?.textContent).toContain("Tu sesión expiró");
    expect(aviso?.getAttribute("role")).toBe("status");
  });

  it("envía el RUT limpio, guarda la sesión y evita envíos duplicados", () => {
    const componente = crear().componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), "navigate").mockResolvedValue(true);
    completar(componente);

    componente.submit();
    componente.submit();
    expect(api.login).toHaveBeenCalledTimes(1);
    expect(api.login).toHaveBeenCalledWith("111111111", "secreta");
    expect(componente.loading).toBe(true);

    const user = { id: "1", rut: "11111111-1", names: "Ana", firstSurname: "Pérez", secondSurname: null, email: "a@b.cl", role: "gestiones" };
    respuesta.next({ accessToken: "token", expiresAt: "2099-01-01T00:00:00.000Z", user });

    expect(session.setSession).toHaveBeenCalledWith("token", "2099-01-01T00:00:00.000Z", user);
    expect(navigate).toHaveBeenCalledWith(["/home"]);
    expect(componente.loading).toBe(false);
  });

  it("muestra el mensaje del servidor ante credenciales inválidas y lo limpia al corregir", () => {
    const componente = crear().componentInstance;
    completar(componente);

    componente.submit();
    respuesta.error(new ApiClientError("RUT o contraseña inválidos.", 401, "INVALID_CREDENTIALS"));

    expect(componente.loading).toBe(false);
    expect(componente.errorMessage).toBe("RUT o contraseña inválidos.");

    componente.form.controls.password.setValue("otra");
    expect(componente.errorMessage).toBe("");
  });

  it("usa un mensaje genérico ante errores no controlados", () => {
    const componente = crear().componentInstance;
    completar(componente);

    componente.submit();
    respuesta.error(new Error("detalle interno"));

    expect(componente.errorMessage).toBe("No fue posible iniciar sesión. Inténtalo nuevamente.");
  });

  it("no envía el formulario si es inválido", () => {
    const componente = crear().componentInstance;

    componente.submit();

    expect(api.login).not.toHaveBeenCalled();
    expect(componente.form.controls.rut.touched).toBe(true);
  });
});
