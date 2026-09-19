import { UserSessionService } from "../../shared/services/user-session";
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

  it("agrega una entrada con el usuario conectado y limpia el formulario", () => {
    componente.tituloNuevo = "Retraso excepcional";
    componente.comentarioNuevo = "  Se informó un retraso excepcional.  ";

    componente.registrarEntrada();

    expect(componente.entradas[0]).toMatchObject({
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

  it("no agrega comentarios vacíos", () => {
    const cantidadInicial = componente.entradas.length;
    componente.tituloNuevo = "Seguimiento a la institución";
    componente.comentarioNuevo = "   ";

    componente.registrarEntrada();

    expect(componente.entradas).toHaveLength(cantidadInicial);
    expect(componente.mensajeValidacion).toContain("Escribe un comentario");
  });

  it("no agrega registros sin título", () => {
    const cantidadInicial = componente.entradas.length;
    componente.comentarioNuevo = "La institución informó una novedad.";

    componente.registrarEntrada();

    expect(componente.entradas).toHaveLength(cantidadInicial);
    expect(componente.mensajeValidacion).toContain("Escribe un título");
  });

  it("mantiene historiales independientes por gestión", () => {
    componente.tituloNuevo = "Primera gestión";
    componente.comentarioNuevo = "Novedad de la primera gestión";
    componente.registrarEntrada();

    componente.gestion = { ...gestion, id: 1002, codigo: "N1-SAN-002" };

    expect(componente.entradas).toHaveLength(3);
    expect(
      componente.entradas.some(({ comentario }) =>
        comentario.includes("primera gestión"),
      ),
    ).toBe(false);
  });
});
