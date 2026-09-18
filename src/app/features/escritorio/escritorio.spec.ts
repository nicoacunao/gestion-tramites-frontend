import { Escritorio } from "./escritorio";
import { Tramite } from "../tramites/models/tramite";
import { TramitesMock } from "../tramites/services/tramites-mock";

class TramitesMockVolumen extends TramitesMock {
  override obtenerTodos(): Tramite[] {
    const tramiteBase = super.obtenerTodos()[0];

    return Array.from({ length: 120 }, (_, indice) => ({
      ...tramiteBase,
      id: 3000 + indice,
      idEstacion: String(70000 + indice),
      razonSocial: `Razón social ${indice + 1}`,
      datosAdicionales: {
        rutRazonSocial: `76.000.${String(indice).padStart(3, "0")}-K`,
      },
    }));
  }
}

describe("Escritorio", () => {
  it("construye las gestiones asociadas al usuario", () => {
    const componente = new Escritorio(new TramitesMock());

    expect(componente.gestiones).toHaveLength(5);
    expect(componente.gestiones[0].codigo).toMatch(/^N\d-/);
  });

  it("admite listados de más de cien registros", () => {
    const componente = new Escritorio(new TramitesMockVolumen());

    expect(componente.gestiones).toHaveLength(120);
    expect(componente.gestiones.at(-1)?.rutRazonSocial).toContain("76.000.");
  });
});
