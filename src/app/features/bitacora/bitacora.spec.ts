import { Bitacora } from "./bitacora";

describe("Bitacora", () => {
  it("emite los cambios de visibilidad y se cierra", () => {
    const componente = new Bitacora();
    const emitidos: boolean[] = [];
    componente.visibleChange.subscribe((visible) => emitidos.push(visible));

    componente.actualizarVisibilidad(true);
    componente.cerrar();

    expect(componente.visible).toBe(false);
    expect(emitidos).toEqual([true, false]);
  });
});
