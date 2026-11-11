import {
  Component,
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
import { UserSessionService } from "../../shared/services/user-session";
import { ApiClient, ApiClientError, BackendManagement, BackendStation, ImportStationsResponse } from "../../shared/services/api-client";

type QuickAccessId = "datos" | "estaciones" | "tareas" | "reporte";
type TaskSeverity = "success" | "warn" | "danger";
type TrafficLightStatus = "al-dia" | "proximo-vencer" | "atrasado";

interface QuickAccess {
  id: QuickAccessId;
  title: string;
  caption: string;
  status?: string;
}

interface HomeTask {
  id: number;
  code: string;
  stationId: string;
  title: string;
  detail: string;
  updatedAt: string;
  trafficStatus: TrafficLightStatus;
  trafficLabel: string;
  severity: TaskSeverity;
  route: string;
  queryParams: { detalle: number };
}

type ImportState = "idle" | "selected" | "verified" | "importing";

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

  @ViewChild("homeTabPanel", { read: ElementRef })
  private homeTabPanel?: ElementRef<HTMLElement>;

  @ViewChildren("quickAccessTab", { read: ElementRef })
  private quickAccessTabs?: QueryList<ElementRef<HTMLButtonElement>>;

  activeAccessId: QuickAccessId = "tareas";

  readonly user = this.userSession.currentUser;

  readonly userForm = new FormGroup({
    fullName: new FormControl(this.user().fullName, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(80),
      ],
    }),
    email: new FormControl(this.user().email, {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    phone: new FormControl(this.user().phone, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^\+?[0-9][0-9\s-]{7,17}$/),
      ],
    }),
    description: new FormControl(this.user().description, {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(140)],
    }),
  });

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
  loadingTasks = true;
  tasksError = "";
  stations: BackendStation[] = [];
  readonly stationPageSize = 5;
  stationsTotal = 0;
  stationsPage = 1;
  stationsLoading = true;
  stationsError = "";
  importDialogVisible = false;
  importState: ImportState = "idle";
  selectedImportFile: File | null = null;
  importError = "";
  importSummary = "";
  importRequestId = "";

  constructor(private readonly api: ApiClient) {
    this.api.managements().subscribe({
      next: (items) => { this.tasks = items.slice(0, 3).map((item) => this.toTask(item)); this.loadingTasks = false; },
      error: (error: Error) => { this.tasks = []; this.tasksError = error.message; this.loadingTasks = false; },
    });
    this.loadStations();
  }

  loadStations(page = 1): void {
    this.stationsLoading = true;
    this.stationsError = "";
    this.api.stations(page, this.stationPageSize).subscribe({
      next: ({ data, meta }) => {
        this.stations = data;
        this.stationsPage = meta.page;
        this.stationsTotal = meta.total;
        this.stationsLoading = false;
      },
      error: (error: Error) => {
        this.stations = [];
        this.stationsTotal = 0;
        this.stationsError = error.message;
        this.stationsLoading = false;
      },
    });
  }

  onStationsPage(event: TablePageEvent): void {
    const pageSize = event.rows || this.stationPageSize;
    this.loadStations(Math.floor(event.first / pageSize) + 1);
  }

  private toTask(item: BackendManagement): HomeTask {
    const id = Number.parseInt(item.id.replace(/\D/g, ""), 10) || 0;
    const attention = item.status === "Observado" || item.status === "Rechazado";
    return { id, code: item.id, stationId: item.stationId, title: item.managementTypeName ?? item.managementTypeId, detail: item.status ?? "Pendiente", updatedAt: item.lastReviewedOn ?? item.openedOn, trafficStatus: attention ? "atrasado" : "al-dia", trafficLabel: attention ? "Requiere atención" : "Al día", severity: attention ? "danger" : "success", route: "/todas-las-gestiones", queryParams: { detalle: id } };
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
    this.userForm.reset({
      fullName: this.user().fullName,
      email: this.user().email,
      phone: this.user().phone,
      description: this.user().description,
    });
  }

  saveUserData(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.userSession.updateProfile(this.userForm.getRawValue());
    this.userForm.markAsPristine();

    this.messageService.add({
      severity: "success",
      summary: "Datos actualizados",
      detail: "Los cambios de tu perfil se guardaron correctamente.",
      life: 4500,
    });
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
    this.importSummary = "";
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
    this.api.importStations(this.selectedImportFile).subscribe({
      next: ({ data, meta }: ImportStationsResponse) => {
        this.importState = "verified";
        this.importRequestId = meta.requestId;
        this.importDialogVisible = false;
        this.messageService.add({ severity: "success", summary: "Importación completada", detail: `${data.length} estaciones procesadas: ${meta.created} nuevas, ${meta.updated} actualizadas${meta.rejected ? ` y ${meta.rejected} rechazadas` : ""}.`, life: 6000 });
        this.loadStations();
      },
      error: (error: Error) => {
        this.importState = "verified";
        const apiError = error instanceof ApiClientError ? error : undefined;
        this.importRequestId = apiError?.requestId ?? "";
        this.importError = apiError?.code === "INVALID_MULTIPART"
          ? `El servidor indicó: ${error.message} Vuelve a seleccionar el archivo e inténtalo nuevamente.`
          : error.message;
      },
    });
  }

  resetImport(): void {
    this.selectedImportFile = null;
    this.importState = "idle";
    this.importError = "";
    this.importSummary = "";
    this.importRequestId = "";
  }

  stationStatusSeverity(status: string): "success" | "warn" | "secondary" {
    return status.toLowerCase() === "no" ? "success" : status.toLowerCase().includes("pendiente") ? "warn" : "secondary";
  }
}
