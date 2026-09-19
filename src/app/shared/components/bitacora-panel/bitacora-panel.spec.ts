import { UserSessionService } from "../../services/user-session";
import { BitacoraPanel, EntradaBitacora } from "./bitacora-panel";

describe("BitacoraPanel", () => {
  let componente: BitacoraPanel;
  let entradaEmitida: EntradaBitacora | undefined;

  beforeEach(() => {
    entradaEmitida = undefined;
    componente = new BitacoraPanel(new UserSessionService());
    componente.contextoId = 1001;
    componente.entradaRegistrada.subscribe((entrada) => {
      entradaEmitida = entrada;
    });
  });

  it("crea una novedad con el usuario conectado y limpia el formulario", () => {
    componente.tituloNuevo = "Retraso excepcional";
    componente.comentarioNuevo = "  Se informó un retraso excepcional.  ";

    componente.registrarEntrada();

    expect(entradaEmitida).toMatchObject({
      usuario: "Jose Luis Rozas",
      iniciales: "JL",
      tipo: "novedad",
      titulo: "Retraso excepcional",
      comentario: "Se informó un retraso excepcional.",
      automatica: false,
    });
    expect(componente.tituloNuevo).toBe("");
    expect(componente.comentarioNuevo).toBe("");
    expect(componente.mensajeConfirmacion).toBe(
      "La novedad se agregó correctamente.",
    );
  });

  it("valida título y comentario antes de emitir una entrada", () => {
    componente.comentarioNuevo = "La institución informó una novedad.";
    componente.registrarEntrada();
    expect(entradaEmitida).toBeUndefined();
    expect(componente.mensajeValidacion).toContain("Escribe un título");

    componente.tituloNuevo = "Seguimiento a la institución";
    componente.comentarioNuevo = "   ";
    componente.registrarEntrada();
    expect(entradaEmitida).toBeUndefined();
    expect(componente.mensajeValidacion).toContain("Escribe un comentario");
  });
});
