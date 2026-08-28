import { Bitacora, GestionBitacora } from "./bitacora";

describe("Bitacora", () => {
  let componente: Bitacora;

  const gestion: GestionBitacora = {
    id: 1001,
    codigo: "N1-MUN-001",
    nivel: "N1",
    idEstacion: "60001",
    estacionServicio: "Copec Concón",
    direccion: "Av. Borgoño 21.350",
    comuna: "Concón",
    fechaInicio: "02-07-2026",
    fechaEstimadaTermino: "12-07-2026",
    concesionario: "Comercial Los Pinos",
    razonSocial: "Comercial Los Pinos SpA",
    representanteLegal: "María José Soto Pérez",
    descripcion: "Solicitud de patente EDS",
    semaforo: "al-dia",
    semaforoEtiqueta: "Al día",
    responsableInterno: "José L. Rosas",
  };

  beforeEach(() => {
    componente = new Bitacora();
    componente.gestion = gestion;
  });

  it("muestra únicamente los N2 al abrir la bitácora", () => {
    expect(componente.antecedentesVisibles.map(({ nivel }) => nivel)).toEqual([
      "N2",
      "N2",
    ]);
  });

  it("despliega N3 y N4 de manera progresiva", () => {
    componente.alternarNivelesInferiores("ANT-002");

    expect(componente.antecedentesVisibles.map(({ nivel }) => nivel)).toEqual([
      "N2",
      "N3",
      "N3",
      "N2",
    ]);

    componente.alternarNivelesInferiores("ANT-004");

    expect(componente.antecedentesVisibles.map(({ nivel }) => nivel)).toEqual([
      "N2",
      "N3",
      "N3",
      "N4",
      "N2",
    ]);
  });

  it("vuelve a ocultar todos los descendientes al contraer el N2", () => {
    componente.alternarNivelesInferiores("ANT-002");
    componente.alternarNivelesInferiores("ANT-004");
    componente.alternarNivelesInferiores("ANT-002");

    expect(componente.antecedentesVisibles.map(({ nivel }) => nivel)).toEqual([
      "N2",
      "N2",
    ]);
    expect(componente.estaExpandido("ANT-004")).toBe(false);
  });

  it("controla de forma independiente los niveles de otras gestiones asociadas", () => {
    expect(
      componente.otrosAntecedentesGestionesVisibles.map(({ nivel }) => nivel),
    ).toEqual(["N2", "N2"]);

    componente.alternarNivelesInferiores("ASO-011");

    expect(
      componente.otrosAntecedentesGestionesVisibles.map(({ nivel }) => nivel),
    ).toEqual(["N2", "N3", "N2"]);
    expect(componente.antecedentesVisibles.map(({ nivel }) => nivel)).toEqual([
      "N2",
      "N2",
    ]);
  });
});
