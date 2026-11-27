import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, throwError } from "rxjs";
import { ApiClientError } from "../../../../shared/services/api-base";
import {
  BackendUser,
  CatalogStation,
  ManagementContract,
  ManagementTypeNode,
  StageCatalogItem,
} from "../../../../shared/services/api-models";
import { BitacoraApiService } from "../../../../shared/services/bitacora-api";
import { CatalogApiService } from "../../../../shared/services/catalog-api";
import { FilesApiService } from "../../../../shared/services/files-api";
import { IdentityApiService } from "../../../../shared/services/identity-api";
import { ManagementApiService } from "../../../../shared/services/management-api";
import { TramiteNuevo } from "./tramite-nuevo";

const tipos: ManagementTypeNode[] = [
  { id: "1", parentId: null, scopeId: "10", name: "Patente comercial", level: 1, required: true },
  { id: "2", parentId: "1", scopeId: null, name: "Solicitud de patente", level: 2, required: true },
  { id: "3", parentId: "2", scopeId: null, name: "Plano de planta", level: 3, required: true },
  { id: "4", parentId: "2", scopeId: null, name: "Informe técnico", level: 3, required: false },
  { id: "5", parentId: "1", scopeId: null, name: "Renovación", level: 2, required: true },
];

const estaciones: CatalogStation[] = [
  { id: "60123", address: "Av. Uno 1", commune: "Concón", legalName: "Comercial Los Pinos SpA", estado: "No" },
];

const usuarios: BackendUser[] = [
  { id: "3", rut: "3-3", names: "Ana", firstSurname: "Pérez", secondSurname: null, email: "a@x.cl", role: "gestiones" },
];

const etapas: StageCatalogItem[] = [
  { id: "e1", name: "Consulta", percentage: 10, order: 1 },
  { id: "e2", name: "Ingreso", percentage: 30, order: 2 },
];

const creada = { id: "99" } as ManagementContract;

function crear(overrides: { management?: Record<string, unknown>; files?: Record<string, unknown> } = {}) {
  const management = {
    createManagement: vi.fn(() => of(creada)),
    createBackground: vi.fn((_id: string, body: { managementTypeId: string }) => of({ id: `bg-${body.managementTypeId}` })),
    updateBackground: vi.fn(() => of({})),
    createStage: vi.fn(() => of({})),
    ...overrides.management,
  };
  const files = { upload: vi.fn(() => of({ storageReference: "ref" })), ...overrides.files };
  const createLog = vi.fn(() => of({}));
  TestBed.configureTestingModule({
    imports: [TramiteNuevo],
    providers: [
      provideRouter([]),
      {
        provide: CatalogApiService,
        useValue: {
          catalogStations: () => of(estaciones),
          managementTypes: () => of(tipos),
          stageCatalog: () => of(etapas),
        },
      },
      { provide: IdentityApiService, useValue: { cachedUsers: () => of(usuarios) } },
      { provide: ManagementApiService, useValue: management },
      { provide: BitacoraApiService, useValue: { createLog } },
      { provide: FilesApiService, useValue: files },
    ],
  });
  const componente = TestBed.createComponent(TramiteNuevo).componentInstance;
  componente.ngOnInit();
  return { componente, management, files, createLog };
}

function completarFormulario(componente: TramiteNuevo) {
  componente.form.estacionServicio = "60123";
  componente.onEstacionChange();
  componente.form.prioridad = "Media";
  componente.onResponsablePrincipalChange("3");
  componente.form.estado = "Ingresado";
  componente.form.solicitanteCopec = "  Jefatura de zona ";
  componente.form.fechaApertura = "15/10/2026";
  componente.form.fechaEstimadaTermino = "30/11/2026";
}

describe("TramiteNuevo con API", () => {
  afterEach(() => vi.useRealTimers());

  it("arma los tipos desde el catálogo jerárquico y las estaciones sin nombre", () => {
    const { componente } = crear();

    expect(componente.catalogosCargando).toBe(false);
    expect(componente.tiposTramite).toHaveLength(1);
    const [tipo] = componente.tiposTramite;
    expect(tipo.tramitesEspecificos.map(({ nombre }) => nombre)).toEqual(["Renovación", "Solicitud de patente"]);
    const solicitud = tipo.tramitesEspecificos[1];
    expect(solicitud.antecedentes.map(({ id, level, parentBackgroundId }) => ({ id, level, parentBackgroundId }))).toEqual([
      { id: "2", level: "N2", parentBackgroundId: null },
      { id: "3", level: "N3", parentBackgroundId: "2" },
    ]);
    expect(solicitud.complementarios?.map(({ name }) => name)).toEqual(["Informe técnico"]);
    expect(componente.opcionesResponsables).toEqual([{ label: "Ana Pérez", value: "3" }]);

    componente.form.estacionServicio = "60123";
    componente.onEstacionChange();
    expect(componente.form.razonSocial).toBe("Comercial Los Pinos SpA");
    expect(componente.form.nombreConcesionario).toBe("Comercial Los Pinos");
  });

  it("muestra el error de catálogos", () => {
    TestBed.configureTestingModule({
      imports: [TramiteNuevo],
      providers: [
        provideRouter([]),
        {
          provide: CatalogApiService,
          useValue: {
            catalogStations: () => throwError(() => new ApiClientError("No tienes permisos.", 403, "FORBIDDEN")),
            managementTypes: () => of([]),
            stageCatalog: () => of([]),
          },
        },
        { provide: IdentityApiService, useValue: { cachedUsers: () => of([]) } },
      ],
    });
    const componente = TestBed.createComponent(TramiteNuevo).componentInstance;

    componente.ngOnInit();

    expect(componente.catalogosError).toBe("No tienes autorización para consultar los catálogos del formulario.");
    expect(componente.catalogosCargando).toBe(false);
  });

  it("crea la gestión, sus antecedentes, las etapas con datos y la bitácora", () => {
    vi.useFakeTimers();
    const { componente, management, createLog } = crear();
    componente.onTipoTramiteChange("1");
    componente.onModalidadChange("subtramite");
    componente.onTramiteEspecificoChange("2");
    componente.antecedentesSeleccionadosBorrador = ["2", "3"];
    componente.guardarSeleccionAntecedentes();
    componente.agregarAntecedenteComplementario();
    componente.antecedentesComplementarios[0].backgroundId = "4";
    componente.etapasGestion[0].estado = "En curso";
    componente.etapasGestion[0].fechaEstimada = "20/10/2026";
    completarFormulario(componente);

    componente.crearTramite();

    expect(componente.erroresValidacion).toEqual([]);
    expect(management.createManagement).toHaveBeenCalledWith({
      stationId: "60123",
      responsibleUserId: "3",
      openedOn: "2026-10-15",
      estimatedCompletionOn: "2026-11-30",
      lastReviewedOn: null,
      priority: "Media",
      status: "Ingresado",
      requesterName: "Jefatura de zona",
    });
    expect(management.createBackground.mock.calls.map(([id, body]) => [id, body.managementTypeId])).toEqual([
      ["99", "1"], ["99", "2"], ["99", "3"], ["99", "4"],
    ]);
    expect(management.createBackground).toHaveBeenCalledWith("99", { managementTypeId: "3", responsibleUserId: "3", status: "Pendiente" });
    expect(management.createStage).toHaveBeenCalledTimes(1);
    expect(management.createStage).toHaveBeenCalledWith("99", {
      stageId: "e1", status: "En curso", estimatedOn: "2026-10-20", completedOn: null, responsibleUserId: null, notes: null,
    });
    expect(createLog).toHaveBeenCalledWith(expect.objectContaining({ managementId: "99", type: "inicio", registeredOn: "2026-10-15" }));
    expect(componente.mensajeCreacionVisible).toBe(true);
    expect(componente.avisosCreacion).toEqual([]);
    expect(componente.tramiteCreadoId).toBe("99");
  });

  it("exige archivo para crear un antecedente como recibido y lo sube antes de fijar el estado", () => {
    const { componente, management, files } = crear();
    componente.onTipoTramiteChange("1");
    componente.onModalidadChange("subtramite");
    componente.onTramiteEspecificoChange("2");
    componente.antecedentesSeleccionadosBorrador = ["2", "3"];
    componente.guardarSeleccionAntecedentes();
    completarFormulario(componente);
    const plano = componente.antecedentesRequeridos.find(({ backgroundId }) => backgroundId === "3")!;
    plano.estado = "Recibido";

    componente.crearTramite();
    expect(componente.erroresValidacion).toContain("Para marcar «Plano de planta» como recibido debes adjuntar su archivo.");
    expect(management.createManagement).not.toHaveBeenCalled();

    const archivo = new File(["x"], "plano.pdf");
    plano.archivo = archivo;
    componente.crearTramite();

    expect(management.createBackground).toHaveBeenCalledWith("99", { managementTypeId: "3", responsibleUserId: "3", status: "Pendiente" });
    expect(files.upload).toHaveBeenCalledWith(archivo, "bg-3");
    expect(management.updateBackground).toHaveBeenCalledWith("bg-3", { responsibleUserId: "3", status: "Recibido", fileReference: "ref" });
  });

  it("informa lo que no se registró sin perder la gestión creada", () => {
    vi.useFakeTimers();
    const { componente } = crear({
      management: {
        createBackground: vi.fn((_id: string, body: { managementTypeId: string }) => body.managementTypeId === "3"
          ? throwError(() => new ApiClientError("Referencias inválidas.", 422))
          : of({ id: `bg-${body.managementTypeId}` })),
      },
      files: { upload: vi.fn(() => throwError(() => new ApiClientError("El servidor de almacenamiento de archivos aún no está disponible.", 503))) },
    });
    componente.onTipoTramiteChange("1");
    componente.onModalidadChange("subtramite");
    componente.onTramiteEspecificoChange("2");
    componente.antecedentesSeleccionadosBorrador = ["2", "3"];
    componente.guardarSeleccionAntecedentes();
    completarFormulario(componente);
    componente.antecedentesRequeridos.find(({ backgroundId }) => backgroundId === "2")!.archivo = new File(["x"], "s.pdf");

    componente.crearTramite();

    expect(componente.mensajeCreacionVisible).toBe(true);
    expect(componente.avisosCreacion).toEqual(expect.arrayContaining([
      "«Plano de planta»: Referencias inválidas.",
      expect.stringContaining("«Solicitud de patente»: quedó registrado como Pendiente"),
    ]));
    vi.advanceTimersByTime(10_000);
    expect(componente.mensajeCreacionVisible).toBe(true);
  });

  it("muestra el error del servidor si no se pudo crear la gestión", () => {
    const { componente, management } = crear({
      management: { createManagement: vi.fn(() => throwError(() => new ApiClientError("La solicitud contiene datos inválidos.", 400, "VALIDATION_ERROR", "req-1"))) },
    });
    componente.onTipoTramiteChange("1");
    componente.onModalidadChange("principal");
    completarFormulario(componente);

    componente.crearTramite();

    expect(componente.creando).toBe(false);
    expect(componente.creacionError).toBe("La solicitud contiene datos inválidos.");
    expect(componente.creacionRequestId).toBe("req-1");
    expect(management.createBackground).not.toHaveBeenCalled();
  });
});
