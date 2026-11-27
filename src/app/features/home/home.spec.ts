import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { MessageService } from "primeng/api";
import { NEVER, Subject } from "rxjs";
import { ApiClientError } from "../../shared/services/api-base";
import { BackendStation, BackendStationPage, ImportStationsResponse, ManagementContract } from "../../shared/services/api-models";
import { ManagementApiService } from "../../shared/services/management-api";
import { StationApiService } from "../../shared/services/station-api";
import { ConnectedUser, UserSessionService } from "../../shared/services/user-session";
import { Home } from "./home";

const usuario: ConnectedUser = {
  id: "7",
  names: "Ana",
  firstSurname: "Pérez",
  secondSurname: "",
  firstName: "Ana",
  fullName: "Ana Pérez",
  initials: "AP",
  role: "gestiones",
  description: "",
  email: "ana@example.com",
  phone: "",
  rut: "11111111-1",
  organization: "",
};

describe("Home › Mis datos", () => {
  let user: ReturnType<typeof signal<ConnectedUser>>;
  let guardado: Subject<ConnectedUser>;
  let session: { currentUser: () => ConnectedUser; updateProfile: ReturnType<typeof vi.fn> };

  function crear() {
    user = signal(usuario);
    guardado = new Subject<ConnectedUser>();
    session = { currentUser: user.asReadonly(), updateProfile: vi.fn(() => guardado.asObservable()) };
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: UserSessionService, useValue: session },
        { provide: ManagementApiService, useValue: { managements: () => NEVER } },
        { provide: StationApiService, useValue: { stations: () => NEVER } },
      ],
    });
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const messages = fixture.debugElement.injector.get(MessageService);
    return { fixture, componente: fixture.componentInstance, add: vi.spyOn(messages, "add") };
  }

  it("refleja el perfil que llega después mientras no se haya editado", () => {
    const { fixture, componente } = crear();

    user.set({ ...usuario, phone: "+56 9 1234 5678", description: "Gestora" });
    fixture.detectChanges();
    expect(componente.userForm.getRawValue()).toMatchObject({ phone: "+56 9 1234 5678", description: "Gestora" });

    componente.userForm.controls.names.setValue("Editado");
    componente.userForm.markAsDirty();
    user.set({ ...usuario, names: "Servidor" });
    fixture.detectChanges();
    expect(componente.userForm.controls.names.value).toBe("Editado");
  });

  it("acepta teléfono y descripción vacíos y respeta los límites del backend", () => {
    const { componente } = crear();
    const form = componente.userForm;

    expect(form.valid).toBe(true);
    form.controls.description.setValue("a".repeat(501));
    form.controls.names.setValue("");
    expect(form.controls.description.hasError("maxlength")).toBe(true);
    expect(form.controls.names.hasError("required")).toBe(true);
  });

  it("guarda una sola vez y confirma solo cuando responde el servidor", () => {
    const { componente, add } = crear();
    componente.userForm.controls.phone.setValue("+56 9 1234 5678");
    componente.userForm.markAsDirty();

    componente.saveUserData();
    componente.saveUserData();
    expect(session.updateProfile).toHaveBeenCalledTimes(1);
    expect(componente.savingProfile).toBe(true);
    expect(add).not.toHaveBeenCalled();

    guardado.next({ ...usuario, phone: "+56 9 1234 5678" });
    guardado.complete();

    expect(componente.savingProfile).toBe(false);
    expect(componente.userForm.pristine).toBe(true);
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ severity: "success" }));
  });

  it("marca el correo cuando el servidor responde 409", () => {
    const { componente, add } = crear();

    componente.saveUserData();
    guardado.error(new ApiClientError("Ya existe un registro con esos datos únicos.", 409, "RESOURCE_CONFLICT"));

    expect(componente.userForm.controls.email.hasError("conflict")).toBe(true);
    expect(componente.savingProfile).toBe(false);
    expect(add).not.toHaveBeenCalled();
  });

  it("muestra el mensaje del servidor ante otros errores", () => {
    const { componente, add } = crear();

    componente.saveUserData();
    guardado.error(new ApiClientError("El servicio no está disponible temporalmente.", 503));

    expect(add).toHaveBeenCalledWith(expect.objectContaining({
      severity: "error",
      detail: "El servicio no está disponible temporalmente.",
    }));
  });
});

const estacion: BackendStation = {
  stationId: "1001",
  legalName: "Comercial Uno",
  address: "Av. Siempre Viva 123",
  comuna: "Santiago",
  zoneManager: null,
  commercialManager: null,
  companyRut: null,
  legalRepresentative: null,
  legalRepresentativeRut: null,
  estado: "No",
};

function pagina(page: number, data = [estacion]): BackendStationPage {
  return { data, meta: { requestId: `req-${page}`, page, pageSize: 5, total: 12, totalPages: 3 } };
}

describe("Home › Estaciones", () => {
  let respuestas: Subject<BackendStationPage>[];
  let importacion: Subject<ImportStationsResponse>;
  let stations: ReturnType<typeof vi.fn>;

  function crear() {
    respuestas = [];
    importacion = new Subject<ImportStationsResponse>();
    stations = vi.fn(() => {
      const respuesta = new Subject<BackendStationPage>();
      respuestas.push(respuesta);
      return respuesta.asObservable();
    });
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: UserSessionService, useValue: { currentUser: signal(usuario).asReadonly(), updateProfile: vi.fn() } },
        { provide: ManagementApiService, useValue: { managements: () => NEVER } },
        { provide: StationApiService, useValue: { stations, importStations: vi.fn(() => importacion.asObservable()) } },
      ],
    });
    const fixture = TestBed.createComponent(Home);
    fixture.componentInstance.activeAccessId = "estaciones";
    fixture.detectChanges();
    const messages = fixture.debugElement.injector.get(MessageService);
    return { fixture, componente: fixture.componentInstance, add: vi.spyOn(messages, "add") };
  }

  it("muestra campos nulos sin romper la tabla y conserva las filas al cambiar de página", () => {
    const { fixture, componente } = crear();
    expect(componente.stationsInitialLoading).toBe(true);

    respuestas[0].next(pagina(1));
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(texto).toContain("Comercial Uno");
    expect(texto).toContain("—");
    expect(componente.stationsTotal).toBe(12);

    componente.loadStations(2);
    expect(componente.stationsLoading).toBe(true);
    expect(componente.stationsInitialLoading).toBe(false);
    expect(componente.stations).toHaveLength(1);
    expect(stations).toHaveBeenLastCalledWith(2, 5);
  });

  it("permite reintentar la página que falló", () => {
    const { componente } = crear();

    respuestas[0].error(new ApiClientError("El servicio no está disponible temporalmente.", 503));
    expect(componente.stationsError).toBe("El servicio no está disponible temporalmente.");

    componente.retryStations();
    expect(stations).toHaveBeenCalledTimes(2);
    expect(stations).toHaveBeenLastCalledWith(1, 5);
  });

  it("rechaza archivos de más de 10 MB antes de enviarlos", () => {
    const { componente } = crear();
    const archivo = new File(["x"], "estaciones.xlsx");
    Object.defineProperty(archivo, "size", { value: 10 * 1024 * 1024 + 1 });

    componente.onImportFileSelect({ files: [archivo] });
    componente.verifyImportFile();

    expect(componente.importState).toBe("selected");
    expect(componente.importError).toContain("10 MB");
  });

  it("mantiene el diálogo abierto con las filas rechazadas de una importación parcial", () => {
    const { componente, add } = crear();
    componente.openImportDialog();
    componente.onImportFileSelect({ files: [new File(["EDS"], "estaciones.csv")] });
    componente.verifyImportFile();
    componente.confirmImport();
    expect(componente.importState).toBe("importing");

    importacion.next({
      data: [estacion],
      meta: { requestId: "req-imp", created: 1, updated: 0, rejected: 1, rejectedRows: [{ row: 4, message: "EDS duplicado: 1001." }] },
    });

    expect(componente.importState).toBe("completed");
    expect(componente.importDialogVisible).toBe(true);
    expect(componente.importResult?.rejectedRows).toEqual([{ row: 4, message: "EDS duplicado: 1001." }]);
    expect(add).not.toHaveBeenCalled();
    expect(stations).toHaveBeenLastCalledWith(1, 5);
  });

  it("muestra las filas de details.errors cuando ninguna fila es válida", () => {
    const { componente } = crear();
    componente.onImportFileSelect({ files: [new File(["EDS"], "estaciones.csv")] });
    componente.verifyImportFile();
    componente.confirmImport();

    importacion.error(new ApiClientError("Fila 2: EDS es obligatorio.", 422, "INVALID_IMPORT_ROWS", "req-err", {
      errors: [{ row: 2, message: "EDS es obligatorio." }],
      totalErrors: 1,
    }));

    expect(componente.importState).toBe("verified");
    expect(componente.importErrorRows).toEqual([{ row: 2, message: "EDS es obligatorio." }]);
    expect(componente.importRequestId).toBe("req-err");
  });
});

function gestion(id: string, extra: Partial<ManagementContract> = {}): ManagementContract {
  return {
    id,
    stationId: "1001",
    responsibleUserId: "7",
    openedOn: "2026-11-01",
    estimatedCompletionOn: null,
    lastReviewedOn: null,
    priority: "Media",
    status: "Ingresado",
    requesterName: "Solicitante",
    ...extra,
  };
}

describe("Home › Mis tareas", () => {
  let respuestas: Subject<ManagementContract[]>[];
  let managements: ReturnType<typeof vi.fn>;

  function crear() {
    respuestas = [];
    managements = vi.fn(() => {
      const respuesta = new Subject<ManagementContract[]>();
      respuestas.push(respuesta);
      return respuesta.asObservable();
    });
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: UserSessionService, useValue: { currentUser: signal(usuario).asReadonly(), updateProfile: vi.fn() } },
        { provide: ManagementApiService, useValue: { managements } },
        { provide: StationApiService, useValue: { stations: () => NEVER } },
      ],
    });
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    return { fixture, componente: fixture.componentInstance };
  }

  it("pide solo las gestiones asignadas y resume las más urgentes con el total", () => {
    const { fixture, componente } = crear();
    expect(managements).toHaveBeenCalledWith(true);

    respuestas[0].next([
      gestion("1", { trafficLight: "al-dia" }),
      gestion("2", { trafficLight: "atrasado", estimatedCompletionOn: "2026-11-10" }),
      gestion("3", { trafficLight: "proximo-vencer", estimatedCompletionOn: "2026-12-01" }),
      gestion("4", { trafficLight: "atrasado", estimatedCompletionOn: "2026-11-05" }),
      // Otro responsable: el backend ya filtró, así que no se descarta en el cliente.
      gestion("5", { responsibleUserId: "99", trafficLight: "al-dia" }),
    ]);
    fixture.detectChanges();

    expect(componente.tasksTotal).toBe(5);
    expect(componente.tasks.map(({ id }) => id)).toEqual(["4", "2", "3"]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("5 gestiones asignadas");
  });

  it("usa los datos de presentación del backend y tolera los faltantes", () => {
    const { componente } = crear();

    respuestas[0].next([
      gestion("10", {
        code: "N1-MUN-003",
        managementTypeName: "Patente comercial",
        trafficLight: "proximo-vencer",
        trafficLightLabel: "Vence en 3 días",
        stationName: "EDS Centro",
        lastReviewedOn: "2026-11-20",
      }),
      gestion("11"),
    ]);

    expect(componente.tasks[0]).toMatchObject({
      code: "N1-MUN-003",
      title: "Patente comercial",
      trafficLabel: "Vence en 3 días",
      severity: "warn",
      stationName: "EDS Centro",
      updatedAt: "20-11-2026",
      queryParams: { detalle: "10" },
    });
    expect(componente.tasks[1]).toMatchObject({
      code: "Gestión 11",
      title: "Gestión sin tipo asignado",
      trafficLabel: "Al día",
      severity: "success",
      updatedAt: "01-11-2026",
    });
  });

  it("muestra el error del servidor y permite reintentar", () => {
    const { componente } = crear();

    respuestas[0].error(new ApiClientError("No tienes permisos para gestionar gestiones.", 403, "FORBIDDEN"));
    expect(componente.tasksError).toBe("No tienes permisos para gestionar gestiones.");
    expect(componente.loadingTasks).toBe(false);

    componente.loadTasks();
    expect(managements).toHaveBeenCalledTimes(2);
    expect(componente.loadingTasks).toBe(true);
    expect(componente.tasksError).toBe("");
  });
});
