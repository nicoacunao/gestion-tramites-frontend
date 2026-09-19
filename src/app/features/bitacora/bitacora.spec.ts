import { UserSessionService } from "../../shared/services/user-session";
import { EntradaBitacora } from "../../shared/components/bitacora-panel/bitacora-panel";
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
    componente = new Bitacora(new UserSessionService());
    componente.gestion = gestion;
  });

  it("genera automáticamente la entrada de inicio del trámite", () => {
    const inicio = componente.entradas.find(({ tipo }) => tipo === "inicio");

    expect(inicio).toMatchObject({
      fecha: "02-07-2026",
      hora: "09:00",
      usuario: "José L. Rosas",
      titulo: "Inicio del trámite",
      automatica: true,
    });
  });

  it("muestra las novedades desde la más reciente", () => {
    expect(componente.entradas.map(({ tipo }) => tipo)).toEqual([
      "seguimiento",
      "contacto",
      "inicio",
    ]);
  });

  it("atribuye al usuario conectado los registros de una bitácora personal", () => {
    componente.usarUsuarioActualComoAutor = true;

    expect(
      componente.entradas.every(({ usuario }) => usuario === "Jose Luis Rozas"),
    ).toBe(true);
  });

  it("incorpora al historial la entrada emitida por el panel compartido", () => {
    componente.agregarEntrada(crearEntrada("Retraso excepcional"));

    expect(componente.entradas[0]).toMatchObject({
      usuario: "Jose Luis Rozas",
      iniciales: "JL",
      tipo: "novedad",
      titulo: "Retraso excepcional",
      comentario: "Se informó un retraso excepcional.",
      automatica: false,
    });
  });

  it("mantiene historiales independientes por gestión", () => {
    componente.agregarEntrada(
      crearEntrada("Primera gestión", "Novedad de la primera gestión"),
    );

    componente.gestion = { ...gestion, id: 1002, codigo: "N1-SAN-002" };

    expect(componente.entradas).toHaveLength(3);
    expect(
      componente.entradas.some(({ comentario }) =>
        comentario.includes("primera gestión"),
      ),
    ).toBe(false);
  });

  function crearEntrada(
    titulo: string,
    comentario = "Se informó un retraso excepcional.",
  ): EntradaBitacora {
    return {
      id: `BIT-1001-${titulo}`,
      fecha: "19-09-2026",
      fechaIso: "2026-09-19",
      hora: "10:30",
      usuario: "Jose Luis Rozas",
      iniciales: "JL",
      tipo: "novedad",
      titulo,
      comentario,
      automatica: false,
    };
  }
});
