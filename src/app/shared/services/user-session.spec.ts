import { Subject } from "rxjs";
import { BackendUser } from "./api-models";
import { IdentityApiService } from "./identity-api";
import { UserSessionService } from "./user-session";

const usuarioLogin: BackendUser = {
  id: "7",
  rut: "11111111-1",
  names: "Ana",
  firstSurname: "Pérez",
  secondSurname: null,
  email: "ana@example.com",
  role: "gestiones",
};

const perfilCompleto: BackendUser = {
  ...usuarioLogin,
  phone: "+56 9 1234 5678",
  description: "Gestora de trámites",
  organization: "Operaciones",
};

function crearApi() {
  const perfil = new Subject<BackendUser>();
  const api = { profile: vi.fn(() => perfil.asObservable()) };
  return { api, perfil, servicio: new UserSessionService(api as unknown as IdentityApiService) };
}

describe("UserSessionService", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("completa los datos del login con el perfil del usuario", () => {
    const { api, perfil, servicio } = crearApi();

    servicio.setSession("token", "2099-01-01T00:00:00.000Z", usuarioLogin);
    expect(servicio.currentUser()).toMatchObject({ fullName: "Ana Pérez", phone: "", initials: "AP" });
    expect(api.profile).toHaveBeenCalledTimes(1);

    perfil.next(perfilCompleto);
    expect(servicio.currentUser()).toMatchObject({
      phone: "+56 9 1234 5678",
      description: "Gestora de trámites",
      organization: "Operaciones",
    });
  });

  it("no restaura datos si el perfil llega después de cerrar sesión", () => {
    const { perfil, servicio } = crearApi();

    servicio.setSession("token", "2099-01-01T00:00:00.000Z", usuarioLogin);
    servicio.clearSession();
    perfil.next(perfilCompleto);

    expect(servicio.currentUser().fullName).toBe("");
    expect(localStorage.getItem("gestion-tramites.user")).toBeNull();
  });

  it("no consulta el perfil sin una sesión vigente", () => {
    localStorage.setItem("gestion-tramites.access-token", "token");
    localStorage.setItem("gestion-tramites.expires-at", "2000-01-01T00:00:00.000Z");
    const { api } = crearApi();

    expect(api.profile).not.toHaveBeenCalled();
    expect(localStorage.getItem("gestion-tramites.access-token")).toBeNull();
  });
});
