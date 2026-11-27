import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  QueryList,
  ViewChild,
  ViewChildren,
} from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { RouterLink } from "@angular/router";
import { MessageService } from "primeng/api";
import { AvatarModule } from "primeng/avatar";
import { ButtonDirective } from "primeng/button";
import { CardModule } from "primeng/card";
import { DataViewModule } from "primeng/dataview";
import { DialogModule } from "primeng/dialog";
import { FileUploadModule } from "primeng/fileupload";
import { InputTextModule } from "primeng/inputtext";
import { TableModule } from "primeng/table";
import { TablePageEvent } from "primeng/table";
import { TagModule } from "primeng/tag";
import { SkeletonModule } from "primeng/skeleton";
import { TextareaModule } from "primeng/textarea";
import { ToastModule } from "primeng/toast";
import { Subscription } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ConnectedUser, EditableUserProfile, UserSessionService } from "../../shared/services/user-session";
import { ApiClientError } from "../../shared/services/api-base";
import { ManagementContract, TrafficLight, BackendStation, BackendStationPage, ImportStationsResponse, StationImportRowError } from "../../shared/services/api-models";
import { ManagementApiService } from "../../shared/services/management-api";
import { StationApiService } from "../../shared/services/station-api";

type QuickAccessId = "datos" | "estaciones" | "tareas" | "reporte";
type TaskSeverity = "success" | "warn" | "danger";
type TrafficLightStatus = TrafficLight;

interface QuickAccess {
  id: QuickAccessId;
  title: string;
  caption: string;
  status?: string;
}

interface HomeTask {
  id: string;
  code: string;
  stationId: string;
  stationName: string;
  title: string;
  detail: string;
  /** Fecha `YYYY-MM-DD` para el atributo `datetime`. */
  updatedOn: string;
  /** Fecha `DD-MM-YYYY` para mostrar. */
  updatedAt: string;
  trafficStatus: TrafficLightStatus;
  trafficLabel: string;
  severity: TaskSeverity;
  route: string;
  queryParams: { detalle: string };
}

/** Cantidad de gestiones que se resumen en la pestaña; el resto está en Escritorio. */
const TASKS_PREVIEW = 3;

const TRAFFIC_SEVERITY: Record<TrafficLightStatus, TaskSeverity> = {
  "al-dia": "success",
  "proximo-vencer": "warn",
  atrasado: "danger",
};

const TRAFFIC_LABEL: Record<TrafficLightStatus, string> = {
  "al-dia": "Al día",
  "proximo-vencer": "Próximo a vencer",
  atrasado: "Atrasado",
};

/** Orden de urgencia para elegir qué gestiones resumir. */
const TRAFFIC_PRIORITY: Record<TrafficLightStatus, number> = {
  atrasado: 0,
  "proximo-vencer": 1,
  "al-dia": 2,
};

type ImportState = "idle" | "selected" | "verified" | "importing" | "completed";

/** Tamaño máximo aceptado por `POST /consultas/stations/import`. */
const IMPORT_MAX_BYTES = 10 * 1024 * 1024;
const IMPORT_ROWS_PREVIEW = 10;

interface ImportResult {
  detail: string;
  rejectedRows: StationImportRowError[];
}

@Component({
  selector: "app-home",
  standalone: true,
  imports: [
    AvatarModule,
    ButtonDirective,
    CardModule,
    DataViewModule,
    DialogModule,
    FileUploadModule,
    InputTextModule,
    ReactiveFormsModule,
    RouterLink,
    SkeletonModule,
    TableModule,
    TagModule,
    TextareaModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: "./home.html",
  styleUrl: "./home.scss",
})
export class Home {
  private readonly userSession = inject(UserSessionService);
  private readonly messageService = inject(MessageService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  @ViewChild("homeTabPanel", { read: ElementRef })
  private homeTabPanel?: ElementRef<HTMLElement>;

  @ViewChildren("quickAccessTab", { read: ElementRef })
  private quickAccessTabs?: QueryList<ElementRef<HTMLButtonElement>>;

  activeAccessId: QuickAccessId = "tareas";

  readonly user = this.userSession.currentUser;

  /** Límites tomados de `PUT /identidad/profile`. */
  readonly profileLimits = {
    names: 100,
    firstSurname: 80,
    secondSurname: 80,
    email: 254,
    phone: 30,
    description: 500,
  } as const;

  readonly userForm = new FormGroup({
    names: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(this.profileLimits.names)],
    }),
    firstSurname: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(this.profileLimits.firstSurname)],
    }),
    secondSurname: new FormControl("", {
      nonNullable: true,
      validators: [Validators.maxLength(this.profileLimits.secondSurname)],
    }),
    email: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(this.profileLimits.email)],
    }),
    phone: new FormControl("", {
      nonNullable: true,
      validators: [
        Validators.maxLength(this.profileLimits.phone),
        Validators.pattern(/^\+?[0-9][0-9\s-]{7,17}$/),
      ],
    }),
    description: new FormControl("", {
      nonNullable: true,
      validators: [Validators.maxLength(this.profileLimits.description)],
    }),
  });

  savingProfile = false;
  private readonly destroyRef = inject(DestroyRef);

  readonly quickAccesses: QuickAccess[] = [
    {
      id: "datos",
      title: "Mis datos",
      caption: "Perfil y cuenta",
    },
    {
      id: "estaciones",
      title: "Datos estaciones de servicio",
      caption: "Información de estaciones",
    },
    {
      id: "tareas",
      title: "Mis tareas",
      caption: "Gestiones asignadas",
    },
    {
      id: "reporte",
      title: "Reporte",
      caption: "Reportes y documentos",
      status: "Próximamente",
    },
  ];

  tasks: HomeTask[] = [];
  /** Total de gestiones asignadas (la lista solo resume las más urgentes). */
  tasksTotal = 0;
  loadingTasks = true;
  tasksError = "";
  private tasksRequest?: Subscription;
  stations: BackendStation[] = [];
  readonly stationPageSize = 5;
  stationsTotal = 0;
  stationsPage = 1;
  private readonly stationPageCache = new Map<number, BackendStation[]>();
  private stationRequestPage: number | null = null;
  private stationRequest?: Subscription;
  /** Página que falló, para reintentarla. */
  private stationsFailedPage = 1;
  stationsLoading = true;
  stationsError = "";
  importDialogVisible = false;
  importState: ImportState = "idle";
  selectedImportFile: File | null = null;
  importError = "";
  importSummary = "";
  importRequestId = "";
  importErrorRows: StationImportRowError[] = [];
  importResult: ImportResult | null = null;

  constructor(private readonly managementApi: ManagementApiService, private readonly stationApi: StationApiService) {
    // El perfil completo puede llegar después de construir la vista: se refleja
    // en el formulario mientras la persona no haya empezado a editarlo.
    effect(() => {
      const user = this.user();
      if (!this.userForm.dirty && !this.savingProfile) {
        this.userForm.reset(this.profileFormValue(user));
      }
    });
    this.loadTasks();
    this.loadStations();
  }

  /** `true` mientras no se ha cargado ninguna página (se muestra el skeleton). */
  get stationsInitialLoading(): boolean {
    return this.stationsLoading && this.stations.length === 0;
  }

  loadStations(page = 1, force = false): void {
    if (!force && this.stationRequestPage === page) return;
    if (!force && this.stationsPage === page && this.stations.length > 0 && !this.stationsError) return;
    const cachedPage = this.stationPageCache.get(page);
    if (!force && cachedPage) {
      this.stations = cachedPage;
      this.stationsPage = page;
      this.stationsError = "";
      this.stationsLoading = false;
      this.changeDetector.markForCheck();
      return;
    }
    // Se conservan las filas actuales mientras carga otra página; la tabla
    // muestra su propio indicador de carga y el paginador no desaparece.
    this.stationsLoading = true;
    this.stationsError = "";
    this.changeDetector.markForCheck();
    this.stationRequest?.unsubscribe();
    this.stationRequestPage = page;
    this.stationRequest = this.stationApi.stations(page, this.stationPageSize).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (response: BackendStationPage) => {
        this.stationRequestPage = null;
        this.stationRequest = undefined;
        this.stationPageCache.set(response.meta.page, response.data);
        this.stations = response.data;
        this.stationsPage = response.meta.page;
        this.stationsTotal = response.meta.total;
        this.stationsLoading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: Error) => {
        this.stationRequestPage = null;
        this.stationRequest = undefined;
        this.stationsFailedPage = page;
        this.stationsError = error instanceof ApiClientError
          ? error.message
          : "No fue posible cargar las estaciones. Inténtalo nuevamente.";
        this.stationsLoading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  retryStations(): void {
    this.loadStations(this.stationsFailedPage, true);
  }

  onStationsPage(event: TablePageEvent): void {
    const pageSize = event.rows || this.stationPageSize;
    this.loadStations(Math.floor(event.first / pageSize) + 1);
  }

  /**
   * `assignedToMe=true` hace que el backend devuelva solo las gestiones del
   * usuario autenticado; no se vuelve a filtrar en el cliente.
   */
  loadTasks(): void {
    this.tasksRequest?.unsubscribe();
    this.loadingTasks = true;
    this.tasksError = "";
    this.changeDetector.markForCheck();
    this.tasksRequest = this.managementApi.managements(true).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (items) => {
        this.tasksTotal = items.length;
        this.tasks = [...items]
          .sort((a, b) => this.compareUrgency(a, b))
          .slice(0, TASKS_PREVIEW)
          .map((item) => this.toTask(item));
        this.loadingTasks = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.tasks = [];
        this.tasksTotal = 0;
        this.tasksError = error instanceof ApiClientError
          ? error.message
          : "No fue posible cargar tus gestiones. Inténtalo nuevamente.";
        this.loadingTasks = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  private compareUrgency(a: ManagementContract, b: ManagementContract): number {
    const byTraffic = TRAFFIC_PRIORITY[this.trafficOf(a)] - TRAFFIC_PRIORITY[this.trafficOf(b)];
    if (byTraffic !== 0) return byTraffic;
    // Sin fecha estimada va al final.
    return (a.estimatedCompletionOn ?? "9999-12-31").localeCompare(b.estimatedCompletionOn ?? "9999-12-31");
  }

  private trafficOf(item: ManagementContract): TrafficLightStatus {
    const value = item.trafficLight ?? item.semaforo;
    return value && value in TRAFFIC_SEVERITY ? value : "al-dia";
  }

  private toTask(item: ManagementContract): HomeTask {
    const trafficStatus = this.trafficOf(item);
    const updatedOn = (item.lastReviewedOn ?? item.openedOn).slice(0, 10);
    return {
      id: item.id,
      code: item.code ?? item.codigo ?? `Gestión ${item.id}`,
      stationId: item.stationId,
      stationName: item.stationName ?? item.legalName ?? "",
      title: item.managementTypeName?.trim() || "Gestión sin tipo asignado",
      detail: item.status,
      updatedOn,
      updatedAt: this.formatDate(updatedOn),
      trafficStatus,
      trafficLabel: item.trafficLightLabel ?? item.semaforoEtiqueta ?? TRAFFIC_LABEL[trafficStatus],
      severity: TRAFFIC_SEVERITY[trafficStatus],
      route: "/todas-las-gestiones",
      queryParams: { detalle: item.id },
    };
  }

  private formatDate(isoDate: string): string {
    const [year, month, day] = isoDate.split("-");
    return year && month && day ? `${day}-${month}-${year}` : isoDate;
  }


  selectQuickAccess(id: QuickAccessId, scrollPanel = true): void {
    this.activeAccessId = id;

    if (
      scrollPanel &&
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 700px)").matches
    ) {
      requestAnimationFrame(() => {
        this.homeTabPanel?.nativeElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }

  handleTabKey(event: KeyboardEvent, currentId: QuickAccessId): void {
    const currentIndex = this.quickAccesses.findIndex(
      (access) => access.id === currentId,
    );
    let nextIndex = currentIndex;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % this.quickAccesses.length;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex =
        (currentIndex - 1 + this.quickAccesses.length) %
        this.quickAccesses.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = this.quickAccesses.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    this.selectQuickAccess(this.quickAccesses[nextIndex].id, false);
    this.quickAccessTabs?.get(nextIndex)?.nativeElement.focus();
  }

  showCardInfo(summary: string, detail: string): void {
    this.messageService.clear();
    this.messageService.add({
      severity: "info",
      summary,
      detail,
      life: 5000,
    });
  }

  resetUserData(): void {
    this.userForm.reset(this.profileFormValue(this.user()));
  }

  saveUserData(): void {
    if (this.savingProfile) {
      return;
    }

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.savingProfile = true;
    this.userForm.disable({ emitEvent: false });
    this.userSession.updateProfile(this.userForm.getRawValue()).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (user) => {
        this.endProfileSave();
        this.userForm.reset(this.profileFormValue(user));
        this.messageService.add({
          severity: "success",
          summary: "Datos actualizados",
          detail: "Los cambios de tu perfil se guardaron correctamente.",
          life: 4500,
        });
      },
      error: (error: unknown) => {
        // Se rehabilita antes de marcar errores: `enable()` recalcula la validez
        // y borraría un error asignado con anterioridad.
        this.endProfileSave();
        this.handleProfileError(error);
      },
    });
  }

  private endProfileSave(): void {
    this.savingProfile = false;
    this.userForm.enable({ emitEvent: false });
    this.changeDetector.markForCheck();
  }

  private handleProfileError(error: unknown): void {
    const apiError = error instanceof ApiClientError ? error : undefined;

    // 401 lo resuelve el interceptor redirigiendo al login.
    if (apiError?.status === 401) {
      return;
    }

    if (apiError?.status === 409) {
      const email = this.userForm.controls.email;
      email.setErrors({ ...email.errors, conflict: true });
      email.markAsTouched();
      return;
    }

    this.messageService.add({
      severity: "error",
      summary: "No se guardaron los cambios",
      detail: apiError?.message ?? "No fue posible guardar tu perfil. Inténtalo nuevamente.",
      life: 6000,
    });
  }

  private profileFormValue(user: ConnectedUser): EditableUserProfile {
    return {
      names: user.names,
      firstSurname: user.firstSurname,
      secondSurname: user.secondSurname,
      email: user.email,
      phone: user.phone,
      description: user.description,
    };
  }

  openImportDialog(): void {
    this.importDialogVisible = true;
    this.resetImport();
  }

  closeImportDialog(): void {
    if (this.importState !== "importing") this.importDialogVisible = false;
  }

  onImportFileSelect(event: { files?: File[] }): void {
    const file = event.files?.[0] ?? null;
    this.selectedImportFile = file;
    this.importError = "";
    this.importErrorRows = [];
    this.importSummary = "";
    this.importResult = null;
    this.importState = file ? "selected" : "idle";
  }

  verifyImportFile(): void {
    if (!this.selectedImportFile) return;
    const extension = this.selectedImportFile.name.split(".").pop()?.toLowerCase();
    if (!extension || !["xlsx", "csv"].includes(extension)) {
      this.importError = "El archivo debe estar en formato Excel (.xlsx) o CSV (.csv).";
      return;
    }
    if (this.selectedImportFile.size === 0) {
      this.importError = "El archivo está vacío. Selecciona un archivo con registros.";
      return;
    }
    if (this.selectedImportFile.size > IMPORT_MAX_BYTES) {
      this.importError = "El archivo supera el máximo permitido de 10 MB.";
      return;
    }
    this.importError = "";
    this.importSummary = extension === "csv"
      ? "Formato CSV reconocido. Se validarán las columnas y los IDs antes de guardar."
      : "Formato Excel reconocido. Se validarán las columnas y los IDs antes de guardar.";
    this.importState = "verified";
  }

  confirmImport(): void {
    if (!this.selectedImportFile || this.importState !== "verified") return;
    this.importState = "importing";
    this.importError = "";
    this.importErrorRows = [];
    this.stationApi.importStations(this.selectedImportFile).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: ({ data, meta }: ImportStationsResponse) => {
        this.importRequestId = meta.requestId;
        const rejectedRows = meta.rejectedRows ?? [];
        const detail = `${data.length} estaciones procesadas: ${meta.created} nuevas, ${meta.updated} actualizadas${meta.rejected ? ` y ${meta.rejected} rechazadas` : ""}.`;
        this.stationPageCache.clear();
        this.loadStations(1, true);

        if (meta.rejected > 0) {
          // Se mantiene el diálogo abierto para que la persona vea qué filas corregir.
          this.importState = "completed";
          this.importSummary = "";
          this.importResult = { detail, rejectedRows };
          this.changeDetector.markForCheck();
          return;
        }

        this.importState = "verified";
        this.importDialogVisible = false;
        this.messageService.add({ severity: "success", summary: "Importación completada", detail, life: 6000 });
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.importState = "verified";
        const apiError = error instanceof ApiClientError ? error : undefined;
        this.importRequestId = apiError?.requestId ?? "";
        this.importErrorRows = this.extractImportRowErrors(apiError?.details);
        this.importError = apiError?.code === "INVALID_MULTIPART"
          ? `El servidor indicó: ${apiError.message} Vuelve a seleccionar el archivo e inténtalo nuevamente.`
          : apiError?.message ?? "No fue posible importar el archivo. Inténtalo nuevamente.";
        this.changeDetector.markForCheck();
      },
    });
  }

  resetImport(): void {
    this.selectedImportFile = null;
    this.importState = "idle";
    this.importError = "";
    this.importErrorRows = [];
    this.importSummary = "";
    this.importRequestId = "";
    this.importResult = null;
  }

  /** Filas mostradas en el diálogo; el resto se resume con un contador. */
  visibleImportRows(rows: StationImportRowError[]): StationImportRowError[] {
    return rows.slice(0, IMPORT_ROWS_PREVIEW);
  }

  hiddenImportRowsCount(rows: StationImportRowError[]): number {
    return Math.max(0, rows.length - IMPORT_ROWS_PREVIEW);
  }

  stationStatusSeverity(status: string | null | undefined): "success" | "warn" | "secondary" {
    const normalized = (status ?? "").toLowerCase();
    return normalized === "no" ? "success" : normalized.includes("pendiente") ? "warn" : "secondary";
  }

  /** `details.errors` de `INVALID_IMPORT_ROWS` (422): fila y motivo de cada rechazo. */
  private extractImportRowErrors(details: unknown): StationImportRowError[] {
    const errors = typeof details === "object" && details !== null
      ? (details as { errors?: unknown }).errors
      : undefined;
    if (!Array.isArray(errors)) return [];
    return errors.filter((item): item is StationImportRowError =>
      typeof item === "object"
      && item !== null
      && typeof (item as StationImportRowError).row === "number"
      && typeof (item as StationImportRowError).message === "string");
  }

}
