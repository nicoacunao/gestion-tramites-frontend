import { UserSessionService } from "../../shared/services/user-session";
import { TramitesMock } from "../tramites/services/tramites-mock";
import { TramiteDetalle } from "./tramite-detalle";

describe("TramiteDetalle", () => {
  let componente: TramiteDetalle;
  let tramitesMock: TramitesMock;

  beforeEach(() => {
    tramitesMock = new TramitesMock();
    componente = new TramiteDetalle(tramitesMock, new UserSessionService());
    componente.tramiteId = 1001;
  });

  it("carga los datos originales del trámite para mostrarlos en solo lectura", () => {
    expect(componente.tramite).toMatchObject({
      id: 1001,
      estacionServicio: "Copec Concón",
      tipoTramite: "Patente comercial",
      fechaUltimaRevision: "08-07-2026",
    });
  });

  it("actualiza la fecha de última revisión al visualizar el detalle", () => {
    const fechaEsperada = new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Santiago",
    })
      .format(new Date())
      .replaceAll("/", "-");

    componente.visible = true;

    expect(componente.tramite?.fechaUltimaRevision).toBe(fechaEsperada);
    expect(tramitesMock.obtenerPorId(1001)?.fechaUltimaRevision).toBe(
      fechaEsperada,
    );
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

  it("mantiene las novedades separadas de las etapas", () => {
    componente.agregarEntradaBitacora({
      id: "BIT-1001-novedad",
      fecha: "19-09-2026",
      fechaIso: "2026-09-19",
      hora: "10:30",
      usuario: "Jose Luis Rozas",
      iniciales: "JL",
      tipo: "novedad",
      titulo: "Institución cerrada",
      comentario: "La visita no pudo realizarse y se coordinó una nueva fecha.",
      automatica: false,
    });

    expect(componente.bitacora[0]).toMatchObject({
      usuario: "Jose Luis Rozas",
      titulo: "Institución cerrada",
      comentario: "La visita no pudo realizarse y se coordinó una nueva fecha.",
      automatica: false,
    });
  });

  it("utiliza las siete etapas estándar del trámite", () => {
    expect(componente.etapasGestion.map(({ etapa }) => etapa)).toEqual([
      "Consulta y definición de antecedentes",
      "Recolección de antecedentes y preparación del expediente",
      "Ingreso del expediente",
      "Revisión del expediente y emisión de observaciones",
      "Respuesta a las observaciones",
      "Aprobación del expediente",
      "Emisión o entrega del documento definitivo",
    ]);
    expect(
      componente.etapasGestion.map(({ porcentaje }) => porcentaje),
    ).toEqual([10, 20, 30, 40, 50, 80, 100]);
    expect(componente.etapasGestion[3]).toMatchObject({
      responsable: "María González",
      fechaEstimada: "15/07/2026",
      observacion: "Funcionario informó un plazo estimado de 15 días.",
    });
    expect(componente.porcentajeAvance).toBe(40);
  });

  it("habilita las etapas de forma consecutiva", () => {
    expect(componente.etapasGestion).toHaveLength(7);
    expect(componente.puedeEditarEtapa(3)).toBe(true);
    expect(componente.puedeEditarEtapa(4)).toBe(false);

    componente.actualizarEstadoEtapa(4, "En curso");

    expect(componente.etapasGestion[4].estado).toBe("Pendiente");

    componente.actualizarEstadoEtapa(3, "Completado");

    expect(componente.puedeEditarEtapa(4)).toBe(true);
    expect(componente.porcentajeAvance).toBe(40);

    componente.actualizarEstadoEtapa(1, "En curso");

    expect(componente.etapasGestion).toHaveLength(7);
    expect(componente.puedeEditarEtapa(2)).toBe(false);
    expect(componente.etapasGestion[2].estado).toBe("Pendiente");
    expect(componente.porcentajeAvance).toBe(20);
  });

  it("genera la fecha de carga al subir un archivo pendiente", () => {
    const antecedente = componente.antecedentesRequeridos[2];
    const archivo = new File(["contenido"], "formulario-ingreso.pdf", {
      type: "application/pdf",
    });
    const input = {
      files: { item: () => archivo },
      value: "archivo-seleccionado",
    };

    componente.cargarArchivoAntecedente(
      { target: input } as unknown as Event,
      antecedente,
    );

    expect(antecedente.archivo).toBe("formulario-ingreso.pdf");
    expect(antecedente.fechaCarga).not.toBe("—");
    expect(input.value).toBe("");
  });

  it("guarda los cambios editables del detalle", () => {
    componente.antecedentesRequeridos[0].estado = "Pendiente";
    componente.etapasGestion[3].observacion = "Revisión a cargo de DOM.";

    componente.guardarCambios();

    const tramiteGuardado = tramitesMock.obtenerPorId(1001);

    expect(
      tramiteGuardado?.detalleEditable?.antecedentesRequeridos[0].estado,
    ).toBe("Pendiente");
    expect(tramiteGuardado?.detalleEditable?.etapas[3].observacion).toBe(
      "Revisión a cargo de DOM.",
    );
  });
});
