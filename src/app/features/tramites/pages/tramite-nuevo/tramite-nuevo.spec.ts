import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { TestBed } from "@angular/core/testing";
import { of } from "rxjs";
import { UserSessionService } from "../../../../shared/services/user-session";
import { TramiteDetalle } from "../../../tramite-detalle/tramite-detalle";
import { TramitesMock } from "../../services/tramites-mock";
import { TramiteNuevo } from "./tramite-nuevo";

describe("TramiteNuevo", () => {
  let componente: TramiteNuevo;
  let tramitesMock: TramitesMock;

  beforeEach(() => {
    tramitesMock = new TramitesMock();

    TestBed.configureTestingModule({
      imports: [TramiteNuevo],
      providers: [
        { provide: HttpClient, useValue: { get: () => of({}) } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: TramitesMock, useValue: tramitesMock },
      ],
    });

    componente = TestBed.createComponent(TramiteNuevo).componentInstance;
    componente.tiposTramite = [
      {
        id: "tipo-a",
        nombre: "Tipo A",
        segundoNivelLabel: "Gestión específica",
        requiereSeleccionSegundoNivelParaPrincipal: false,
        tramitesEspecificos: [
          {
            id: "gestion-a1",
            nombre: "Gestión A1",
            antecedentes: ["Documento A1"],
          },
          {
            id: "gestion-a2",
            nombre: "Gestión A2",
            antecedentes: ["Documento A2"],
          },
        ],
      },
      {
        id: "tipo-b",
        nombre: "Tipo B",
        segundoNivelLabel: "Gestión específica",
        requiereSeleccionSegundoNivelParaPrincipal: false,
        tramitesEspecificos: [
          {
            id: "gestion-b1",
            nombre: "Gestión B1",
            antecedentes: ["Documento B1"],
          },
        ],
      },
    ];
  });

  it("mantiene los pasos dependientes ocultos e incompletos sin tipo de trámite", () => {
    expect(componente.tipoSeleccionado).toBeUndefined();
    expect(componente.modalidadCreacion).toBeNull();
    expect(componente.requiereSeleccionSegundoNivel).toBe(false);
    expect(componente.configuracionLista).toBe(false);
    expect(componente.antecedentesDisponibles).toEqual([]);
    expect(componente.etapasGestion).toEqual([]);
  });

  it("exige seleccionar la modalidad después de seleccionar el tipo", () => {
    componente.onTipoTramiteChange("tipo-a");

    expect(componente.tipoSeleccionado?.id).toBe("tipo-a");
    expect(componente.modalidadCreacion).toBeNull();
    expect(componente.configuracionLista).toBe(false);
    expect(componente.antecedentesDisponibles).toEqual([]);
  });

  it("exige una gestión válida para configurar sus documentos", () => {
    componente.onTipoTramiteChange("tipo-a");
    componente.onModalidadChange("subtramite");

    expect(componente.requiereSeleccionSegundoNivel).toBe(true);
    expect(componente.configuracionLista).toBe(false);

    componente.onTramiteEspecificoChange("gestion-inexistente");

    expect(componente.form.tramiteEspecifico).toBe("");
    expect(componente.configuracionLista).toBe(false);
    expect(componente.antecedentesDisponibles).toEqual([]);

    componente.onTramiteEspecificoChange("gestion-a1");

    expect(componente.configuracionLista).toBe(true);
    expect(componente.antecedentesDisponibles).toEqual(["Documento A1"]);
    expect(componente.etapasGestion).toHaveLength(7);
    expect(
      componente.etapasGestion.map(({ porcentaje }) => porcentaje),
    ).toEqual([10, 20, 30, 40, 50, 80, 100]);
    expect(componente.etapasGestion[0]).toMatchObject({
      responsable: "",
      fechaEstimada: "",
      observacion: "",
    });

    componente.antecedentesComplementarios[0].antecedente =
      "Documento complementario anterior";
    componente.onTramiteEspecificoChange("gestion-a2");

    expect(componente.antecedentesDisponibles).toEqual(["Documento A2"]);
    expect(componente.antecedentesComplementarios[0].antecedente).toBe("");
  });

  it("reinicia modalidad, gestión y documentos al cambiar o borrar el tipo", () => {
    componente.onTipoTramiteChange("tipo-a");
    componente.onModalidadChange("subtramite");
    componente.onTramiteEspecificoChange("gestion-a1");
    componente.antecedentesComplementarios[0].antecedente =
      "Documento complementario anterior";

    componente.onTipoTramiteChange("tipo-b");

    expect(componente.modalidadCreacion).toBeNull();
    expect(componente.form.tramiteEspecifico).toBe("");
    expect(componente.configuracionLista).toBe(false);
    expect(componente.antecedentesDisponibles).toEqual([]);
    expect(componente.antecedentesComplementarios[0].antecedente).toBe("");

    componente.onTipoTramiteChange(null);

    expect(componente.tipoSeleccionado).toBeUndefined();
    expect(componente.tramitesEspecificos).toEqual([]);
    expect(componente.configuracionLista).toBe(false);
  });

  it("reinicia la gestión específica y sus documentos al cambiar la modalidad", () => {
    componente.onTipoTramiteChange("tipo-a");
    componente.onModalidadChange("subtramite");
    componente.onTramiteEspecificoChange("gestion-a1");

    componente.onModalidadChange("principal");

    expect(componente.form.tramiteEspecifico).toBe("");
    expect(componente.requiereSeleccionSegundoNivel).toBe(false);
    expect(componente.configuracionLista).toBe(true);
    expect(componente.antecedentesDisponibles).toEqual([
      "Documento A1",
      "Documento A2",
    ]);
    expect(componente.etapasGestion).toHaveLength(7);
  });

  it("mantiene la estructura común de etapas para todos los tipos de trámite", () => {
    const etapasEsperadas = [
      "Consulta y definición de antecedentes",
      "Recolección de antecedentes y preparación del expediente",
      "Ingreso del expediente",
      "Revisión del expediente y emisión de observaciones",
      "Respuesta a las observaciones",
      "Aprobación del expediente",
      "Emisión o entrega del documento definitivo",
    ];

    for (const tipo of ["tipo-a", "tipo-b"]) {
      componente.onTipoTramiteChange(tipo);
      componente.onModalidadChange("principal");

      expect(componente.etapasGestion.map(({ etapa }) => etapa)).toEqual(
        etapasEsperadas,
      );
    }
  });

  it("impide crear el trámite con una selección incompleta", () => {
    const guardar = vi.spyOn(tramitesMock, "guardar");
    componente.onTipoTramiteChange("tipo-a");
    componente.onModalidadChange("subtramite");

    componente.crearTramite();

    expect(guardar).not.toHaveBeenCalled();
    expect(componente.mensajeCreacionVisible).toBe(false);
  });

  it("crea el trámite con antecedentes, etapas estándar y bitácora inicial", () => {
    componente.onTipoTramiteChange("tipo-a");
    componente.onModalidadChange("principal");
    componente.antecedentesSeleccionadosBorrador = ["Documento A1"];
    componente.guardarSeleccionAntecedentes();
    componente.antecedentesComplementarios[0].antecedente =
      "Certificado extraordinario";
    componente.form.responsableInterno = "Claudio Doñas";
    componente.form.solicitanteCopec = "Jefatura de zona";
    componente.form.fechaApertura = "15/10/2026";

    componente.crearTramite();
    componente.ngOnDestroy();

    const tramiteCreado = tramitesMock.obtenerPorId(componente.tramiteCreadoId);

    expect(tramiteCreado).toMatchObject({
      antecedentesConfigurados: ["Documento A1"],
      antecedentesComplementariosConfigurados: ["Certificado extraordinario"],
      etapasConfiguradas: componente.etapasGestion.map(({ etapa }) => etapa),
    });

    const detalle = new TramiteDetalle(tramitesMock, new UserSessionService());
    detalle.tramiteId = componente.tramiteCreadoId;

    expect(detalle.bitacora.find(({ automatica }) => automatica)).toMatchObject(
      {
        fecha: "15-10-2026",
        usuario: "Jefatura de zona",
        titulo: "Inicio del trámite",
      },
    );
  });
});
