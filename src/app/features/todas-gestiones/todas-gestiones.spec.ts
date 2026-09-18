import { TodasGestiones } from "./todas-gestiones";
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

describe("TodasGestiones", () => {
  it("incluye solamente los tres responsables del equipo interno", () => {
    const componente = new TodasGestiones(new TramitesMock());
    const responsables = [
      ...new Set(
        componente.gestiones.map(
          ({ responsableInterno }) => responsableInterno,
        ),
      ),
    ].sort((a, b) => a.localeCompare(b, "es-CL"));

    expect(componente.gestiones).toHaveLength(8);
    expect(responsables).toEqual([
      "Claudio Doñas",
      "Claudio Henríquez",
      "José Luis Rosa",
    ]);
  });

  it("acepta más de cien registros aunque no estén en los datos asociados", () => {
    const componente = new TodasGestiones(new TramitesMockVolumen());

    expect(componente.gestiones).toHaveLength(123);
    expect(componente.gestiones[0].rutRazonSocial).toContain("76.000.");
    expect(componente.gestiones[0].tieneDetalle).toBe(true);
    expect(componente.gestiones.at(-1)?.tieneDetalle).toBe(false);
  });
});
