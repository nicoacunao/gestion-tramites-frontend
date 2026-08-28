import { TodasGestiones } from "./todas-gestiones";
import { TramitesMock } from "../tramites/services/tramites-mock";

describe("TodasGestiones", () => {
  let componente: TodasGestiones;

  beforeEach(() => {
    componente = new TodasGestiones(new TramitesMock());
  });

  it("incluye solamente los tres responsables del equipo interno", () => {
    expect(componente.gestiones.length).toBe(8);
    expect(componente.cantidadResponsables).toBe(3);
    expect(componente.responsables).toEqual([
      "Claudio Doñas",
      "Claudio Henríquez",
      "José Luis Rosa",
    ]);
  });

  it("combina los filtros de responsable y semáforo desde las columnas", () => {
    componente.filtrosPendientes.responsableInterno = ["José Luis Rosa"];
    componente.filtrosPendientes.semaforoEtiqueta = ["Al día"];
    componente.buscarGestiones();

    expect(componente.filtrosTabla["responsableInterno"]).toEqual([
      { value: ["José Luis Rosa"], matchMode: "in", operator: "and" },
    ]);
    expect(componente.filtrosTabla["semaforoEtiqueta"]).toEqual([
      { value: ["Al día"], matchMode: "in", operator: "and" },
    ]);
  });

  it("limpia todos los filtros aplicados", () => {
    componente.busquedaGeneral = "Santiago";
    componente.filtrosPendientes.responsableInterno = ["Claudio Doñas"];
    componente.filtrosPendientes.semaforoEtiqueta = ["Próximo a vencer"];
    componente.buscarGestiones();
    componente.limpiarFiltros();

    expect(componente.busquedaGeneral).toBe("");
    expect(componente.filtrosPendientes.responsableInterno).toEqual([]);
    expect(componente.filtrosPendientes.semaforoEtiqueta).toEqual([]);
  });
});
