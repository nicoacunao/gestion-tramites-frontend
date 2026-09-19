import { UserSessionService } from "../../shared/services/user-session";
import { TramitesMock } from "../tramites/services/tramites-mock";
import { TramiteDetalle } from "./tramite-detalle";

describe("TramiteDetalle", () => {
  let componente: TramiteDetalle;

  beforeEach(() => {
    componente = new TramiteDetalle(
      new TramitesMock(),
      new UserSessionService(),
    );
    componente.tramiteId = 1001;
  });

  it("carga los datos originales del trámite para mostrarlos en solo lectura", () => {
    expect(componente.tramite).toMatchObject({
      id: 1001,
      estacionServicio: "Copec Concón",
      tipoTramite: "Patente comercial",
    });
  });

  it("incluye una primera entrada automática de inicio con fecha y usuario", () => {
    const inicio = componente.bitacora.find(({ automatica }) => automatica);

    expect(inicio).toMatchObject({
      fecha: "02-07-2026",
      hora: "09:00",
      usuario: "Claudio Doñas",
      titulo: "Inicio del trámite",
    });
  });

  it("aplica los niveles y su jerarquía directamente a los antecedentes", () => {
    expect(
      componente.antecedentesRequeridosVisibles.map(
        ({ antecedente }) => antecedente.nivel,
      ),
    ).toEqual(["N2", "N3", "N3"]);
    expect(
      componente.antecedentesComplementariosVisibles.map(
        ({ antecedente }) => antecedente.nivel,
      ),
    ).toEqual(["N2", "N3"]);

    const antecedentePadre = componente.antecedentesRequeridos[0];
    componente.alternarAntecedente(
      antecedentePadre,
      componente.antecedentesRequeridos,
    );

    expect(antecedentePadre.expandido).toBe(false);
    expect(
      componente.antecedentesRequeridosVisibles.map(
        ({ antecedente }) => antecedente.nivel,
      ),
    ).toEqual(["N2"]);
  });

  it("asocia un documento adicional y registra su contexto en la bitácora", () => {
    componente.tipoAntecedenteNuevo = "Informe técnico";
    componente.archivoAntecedenteNuevo = new File(
      ["contenido"],
      "informe-tecnico.pdf",
      { type: "application/pdf" },
    );
    componente.contextoDocumentoNuevo =
      "La municipalidad entregó el informe y se coordinó su revisión.";

    componente.adjuntarAntecedente();

    expect(componente.antecedentesComplementarios[0]).toMatchObject({
      tipoDocumento: "Informe técnico",
      archivo: "informe-tecnico.pdf",
    });
    expect(componente.archivosAdjuntos[0]).toMatchObject({
      categoria: "Antecedente adicional",
      archivo: "informe-tecnico.pdf",
    });
    expect(componente.bitacora[0]).toMatchObject({
      titulo: "Documento incorporado: Informe técnico",
      comentario:
        "La municipalidad entregó el informe y se coordinó su revisión.",
    });
  });

  it("registra novedades sin convertir los hitos en comentarios", () => {
    componente.tituloNuevaEntrada = "Institución cerrada";
    componente.comentarioNuevaEntrada =
      "La visita no pudo realizarse y se coordinó una nueva fecha.";

    componente.registrarNovedad();

    expect(componente.bitacora[0]).toMatchObject({
      usuario: "Jose Luis Rozas",
      titulo: "Institución cerrada",
      comentario: "La visita no pudo realizarse y se coordinó una nueva fecha.",
      automatica: false,
    });
    expect(componente.mensajeBitacora).toContain("se agregó correctamente");
  });
});
