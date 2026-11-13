import { Escritorio } from "./escritorio";
import { Tramite } from "../tramites/models/tramite";
import { TramitesMock } from "../../shared/services/tramites-mock";
import { crearTramiteFixture, TramitesFixture } from "../../testing/tramite-fixtures";

class TramitesMockVolumen extends TramitesMock {
  private readonly fixture = crearTramiteFixture();

  override cargarTodos() {
    return new TramitesFixture(Array.from({ length: 120 }, (_, indice) => ({
      ...this.fixture,
      id: 3000 + indice,
      idEstacion: String(70000 + indice),
      razonSocial: `Razón social ${indice + 1}`,
    }))).cargarTodos();
  }

  override obtenerTodos(): Tramite[] {
    return Array.from({ length: 120 }, (_, indice) => ({ ...this.fixture, id: 3000 + indice }));
  }
}

describe("Escritorio", () => {
  it("construye las gestiones asociadas al usuario", () => {
    const componente = new Escritorio(new TramitesFixture(Array.from({ length: 5 }, (_, indice) => crearTramiteFixture(indice + 1))));

    expect(componente.gestiones).toHaveLength(5);
    expect(componente.gestiones[0].codigo).toMatch(/^N\d-/);
    expect(componente.tituloInformacionAlcance).toBe(
      "¿Qué es la vista Escritorio?",
    );
    expect(componente.informacionAlcance).toBe(
      "En esta vista, ves las gestiones en las que tú eres el responsable.",
    );
  });

  it("admite listados de más de cien registros", () => {
    const componente = new Escritorio(new TramitesMockVolumen());

    expect(componente.gestiones).toHaveLength(120);
    expect(componente.gestiones.at(-1)?.rutRazonSocial).toContain("76.000.");
  });
});
