import { Escritorio } from "./escritorio";
import { Tramite } from "../tramites/models/tramite";
import { TramitesMock } from "../../shared/services/tramites-mock";
import { crearTramiteFixture, TramitesFixture } from "../../testing/tramite-fixtures";
import { of, throwError } from "rxjs";

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
  it("muestra todas las gestiones que entrega el backend con assignedToMe", () => {
    const fixture = new TramitesFixture(Array.from({ length: 5 }, (_, indice) => crearTramiteFixture(indice + 1)));
    const cargarTodos = vi.spyOn(fixture, "cargarTodos");
    const componente = new Escritorio(fixture);

    expect(cargarTodos).toHaveBeenCalledWith(true);
    // El backend ya filtró por usuario autenticado: no se descarta nada en el cliente.
    expect(componente.gestiones).toHaveLength(5);
    expect(componente.loading).toBe(false);
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
  });

  it("muestra un mensaje genérico ante errores no controlados y permite reintentar", () => {
    let intentos = 0;
    class TramitesConError extends TramitesMock {
      override cargarTodos() {
        intentos += 1;
        return intentos === 1 ? throwError(() => new Error("detalle interno")) : of([crearTramiteFixture()]);
      }
    }
    const componente = new Escritorio(new TramitesConError());

    expect(componente.errorMessage).toBe("No fue posible cargar tus gestiones. Inténtalo nuevamente.");

    componente.cargar();
    expect(componente.errorMessage).toBe("");
    expect(componente.gestiones).toHaveLength(1);
  });
});
