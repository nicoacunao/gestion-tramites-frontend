import { Escritorio } from "./escritorio";
import { TramitesMock } from "../tramites/services/tramites-mock";

describe("Escritorio", () => {
  let componente: Escritorio;

  beforeEach(() => {
    componente = new Escritorio(new TramitesMock());
  });

  it("acumula el ordenamiento de una nueva columna", () => {
    componente.acumularOrdenamiento({
      multisortmeta: [{ field: "codigo", order: 1 }],
    });

    expect(componente.ordenamientos).toEqual([
      { field: "fechaIngresoOrden", order: -1 },
      { field: "codigo", order: 1 },
    ]);
  });

  it("alterna una columna sin eliminar los otros ordenamientos", () => {
    componente.acumularOrdenamiento({
      multisortmeta: [{ field: "codigo", order: 1 }],
    });
    componente.acumularOrdenamiento({
      multisortmeta: [{ field: "codigo", order: -1 }],
    });

    expect(componente.ordenamientos).toEqual([
      { field: "fechaIngresoOrden", order: -1 },
      { field: "codigo", order: -1 },
    ]);
  });

  it("abre la bitácora con la gestión seleccionada", () => {
    const gestion = componente.gestiones[0];

    componente.abrirBitacora(gestion);

    expect(componente.bitacoraVisible).toBe(true);
    expect(componente.gestionBitacoraSeleccionada?.codigo).toBe(gestion.codigo);
  });
});
