import { Escritorio } from "./escritorio";
import { Tramite } from "../tramites/models/tramite";
import { TramitesMock } from "../../shared/services/tramites-mock";
import { crearTramiteFixture, TramitesFixture } from "../../testing/tramite-fixtures";
import { UserSessionService } from "../../shared/services/user-session";

class TramitesMockVolumen extends TramitesMock {
  private readonly fixture = crearTramiteFixture();

  override cargarTodos() {
    return new TramitesFixture(Array.from({ length: 120 }, (_, indice) => ({
      ...this.fixture,
      id: 3000 + indice,
      idEstacion: String(70000 + indice),
      razonSocial: `Razón social ${indice + 1}`,
      responsableUserId: String((indice % 3) + 1),
    }))).cargarTodos();
  }

  override obtenerTodos(): Tramite[] {
    return Array.from({ length: 120 }, (_, indice) => ({ ...this.fixture, id: 3000 + indice }));
  }
}

describe("Escritorio", () => {
  it("construye las gestiones asociadas al usuario", () => {
    const session = new UserSessionService();
    session.setSession("token", "2099-01-01T00:00:00.000Z", { id: "2", rut: "2-2", names: "Usuario", firstSurname: "Prueba", secondSurname: null, email: "test@example.com", role: "Prueba" });
    const componente = new Escritorio(new TramitesFixture(Array.from({ length: 5 }, (_, indice) => crearTramiteFixture(indice + 1))), session);

    expect(componente.gestiones).toHaveLength(2);
    expect(componente.gestiones.every(({ responsableUserId }) => responsableUserId === "2")).toBe(true);
    expect(componente.tituloInformacionAlcance).toBe(
      "¿Qué es la vista Escritorio?",
    );
    expect(componente.informacionAlcance).toBe(
      "En esta vista, ves las gestiones en las que tú eres el responsable.",
    );
  });

  it("admite listados de más de cien registros", () => {
    const session = new UserSessionService();
    session.setSession("token", "2099-01-01T00:00:00.000Z", { id: "2", rut: "2-2", names: "Usuario", firstSurname: "Prueba", secondSurname: null, email: "test@example.com", role: "Prueba" });
    const componente = new Escritorio(new TramitesMockVolumen(), session);

    expect(componente.gestiones.every(({ responsableUserId }) => responsableUserId === "2")).toBe(true);
  });
});
