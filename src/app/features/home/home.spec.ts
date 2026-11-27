import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { MessageService } from "primeng/api";
import { NEVER, Subject } from "rxjs";
import { ApiClientError } from "../../shared/services/api-base";
import { ManagementApiService } from "../../shared/services/management-api";
import { StationApiService } from "../../shared/services/station-api";
import { ConnectedUser, UserSessionService } from "../../shared/services/user-session";
import { Home } from "./home";

const usuario: ConnectedUser = {
  id: "7",
  names: "Ana",
  firstSurname: "Pérez",
  secondSurname: "",
  firstName: "Ana",
  fullName: "Ana Pérez",
  initials: "AP",
  role: "gestiones",
  description: "",
  email: "ana@example.com",
  phone: "",
  rut: "11111111-1",
  organization: "",
};

describe("Home › Mis datos", () => {
  let user: ReturnType<typeof signal<ConnectedUser>>;
  let guardado: Subject<ConnectedUser>;
  let session: { currentUser: () => ConnectedUser; updateProfile: ReturnType<typeof vi.fn> };

  function crear() {
    user = signal(usuario);
    guardado = new Subject<ConnectedUser>();
    session = { currentUser: user.asReadonly(), updateProfile: vi.fn(() => guardado.asObservable()) };
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: UserSessionService, useValue: session },
        { provide: ManagementApiService, useValue: { managements: () => NEVER } },
        { provide: StationApiService, useValue: { stations: () => NEVER } },
      ],
    });
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const messages = fixture.debugElement.injector.get(MessageService);
    return { fixture, componente: fixture.componentInstance, add: vi.spyOn(messages, "add") };
  }

  it("refleja el perfil que llega después mientras no se haya editado", () => {
    const { fixture, componente } = crear();

    user.set({ ...usuario, phone: "+56 9 1234 5678", description: "Gestora" });
    fixture.detectChanges();
    expect(componente.userForm.getRawValue()).toMatchObject({ phone: "+56 9 1234 5678", description: "Gestora" });

    componente.userForm.controls.names.setValue("Editado");
    componente.userForm.markAsDirty();
    user.set({ ...usuario, names: "Servidor" });
    fixture.detectChanges();
    expect(componente.userForm.controls.names.value).toBe("Editado");
  });

  it("acepta teléfono y descripción vacíos y respeta los límites del backend", () => {
    const { componente } = crear();
    const form = componente.userForm;

    expect(form.valid).toBe(true);
    form.controls.description.setValue("a".repeat(501));
    form.controls.names.setValue("");
    expect(form.controls.description.hasError("maxlength")).toBe(true);
    expect(form.controls.names.hasError("required")).toBe(true);
  });

  it("guarda una sola vez y confirma solo cuando responde el servidor", () => {
    const { componente, add } = crear();
    componente.userForm.controls.phone.setValue("+56 9 1234 5678");
    componente.userForm.markAsDirty();

    componente.saveUserData();
    componente.saveUserData();
    expect(session.updateProfile).toHaveBeenCalledTimes(1);
    expect(componente.savingProfile).toBe(true);
    expect(add).not.toHaveBeenCalled();

    guardado.next({ ...usuario, phone: "+56 9 1234 5678" });
    guardado.complete();

    expect(componente.savingProfile).toBe(false);
    expect(componente.userForm.pristine).toBe(true);
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ severity: "success" }));
  });

  it("marca el correo cuando el servidor responde 409", () => {
    const { componente, add } = crear();

    componente.saveUserData();
    guardado.error(new ApiClientError("Ya existe un registro con esos datos únicos.", 409, "RESOURCE_CONFLICT"));

    expect(componente.userForm.controls.email.hasError("conflict")).toBe(true);
    expect(componente.savingProfile).toBe(false);
    expect(add).not.toHaveBeenCalled();
  });

  it("muestra el mensaje del servidor ante otros errores", () => {
    const { componente, add } = crear();

    componente.saveUserData();
    guardado.error(new ApiClientError("El servicio no está disponible temporalmente.", 503));

    expect(add).toHaveBeenCalledWith(expect.objectContaining({
      severity: "error",
      detail: "El servicio no está disponible temporalmente.",
    }));
  });
});
