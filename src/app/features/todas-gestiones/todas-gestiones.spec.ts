import { ActivatedRoute } from "@angular/router";
import { TodasGestiones } from "./todas-gestiones";
import { Tramite } from "../tramites/models/tramite";
import { TramitesMock } from "../../shared/services/tramites-mock";
import { crearTramiteFixture, TramitesFixture } from "../../testing/tramite-fixtures";

class TramitesMockVolumen extends TramitesMock {
  private readonly fixture = crearTramiteFixture();

  override cargarTodos() {
    return new TramitesFixture(Array.from({ length: 123 }, (_, indice) => ({
      ...this.fixture,
      id: 3000 + indice,
      idEstacion: String(70000 + indice),
      razonSocial: `Razón social ${indice + 1}`,
    }))).cargarTodos();
  }

  override obtenerTodos(): Tramite[] {
    return Array.from({ length: 123 }, (_, indice) => ({ ...this.fixture, id: 3000 + indice }));
  }
}

describe("TodasGestiones", () => {
  const crearRuta = (parametros: Record<string, string>): ActivatedRoute =>
    ({
      snapshot: {
        queryParamMap: {
          get: (clave: string) => parametros[clave] ?? null,
        },
      },
    }) as unknown as ActivatedRoute;

  it("incluye solamente los tres responsables del equipo interno", () => {
    const componente = new TodasGestiones(new TramitesFixture(Array.from({ length: 8 }, (_, indice) => crearTramiteFixture(indice + 1))));
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
    expect(componente.tituloInformacionAlcance).toBe(
      "¿Qué es la vista Todas las Gestiones?",
    );
    expect(componente.informacionAlcance).toBe(
      "En esta vista, ves todas las gestiones del sistema, de todos los responsables.",
    );
  });

  it("acepta más de cien registros aunque no estén en los datos asociados", () => {
    const componente = new TodasGestiones(new TramitesMockVolumen());

    expect(componente.gestiones).toHaveLength(123);
    expect(componente.gestiones[0].rutRazonSocial).toContain("76.000.");
    expect(componente.gestiones[0].tieneDetalle).toBe(true);
    expect(componente.gestiones.at(-1)?.tieneDetalle).toBe(true);
  });

  it("recibe enlaces directos al detalle y filtros por estación", () => {
    const componente = new TodasGestiones(
      new TramitesFixture([crearTramiteFixture()]),
      crearRuta({ detalle: "1001", estacion: "60001" }),
    );

    expect(componente.tramiteDetalleInicialId).toBe(1001);
    expect(componente.idEstacionInicial).toBe("60001");
  });
});
