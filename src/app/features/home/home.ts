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
import { TagModule } from "primeng/tag";
import { TextareaModule } from "primeng/textarea";
import { ToastModule } from "primeng/toast";
import { UserSessionService } from "../../shared/services/user-session";
import { ApiClient, BackendManagement, BackendStation } from "../../shared/services/api-client";

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
  stationsLoading = true;
  stationsError = "";
  importDialogVisible = false;
  importState: ImportState = "idle";
  selectedImportFile: File | null = null;
  importError = "";
  importSummary = "";

  readonly seedStations: BackendStation[] = [
    { stationId: "60001", legalName: "Comercial y Servicios Soar Limitada", address: "Pedro Fontova 6789", comuna: "Huechuraba", zoneManager: "Alejandra Zuvic", commercialManager: "Eduardo Consiglio", companyRut: "77.618.579-5", legalRepresentative: "Américo Soza Aravena", legalRepresentativeRut: "10.995.619-8", status: "Pendiente de validar" },
    { stationId: "60003", legalName: "Centros de Servicios Focacci Bórquez Limitada", address: "Av. Gabriela N°3950", comuna: "Puente Alto", zoneManager: "Veronica Torreblanca", commercialManager: "Mauricio Soto", companyRut: "77.094.345-0", legalRepresentative: "Alejandro Focacci González", legalRepresentativeRut: "8.320.617-9", status: "No" },
    { stationId: "60004", legalName: "Garcia y Compañía Limitada", address: "Av. Chamisero N°10.410", comuna: "Colina", zoneManager: "Alejandra Zuvic", commercialManager: "Eduardo Consiglio", companyRut: "76.194.458-4", legalRepresentative: "Felipe García Real", legalRepresentativeRut: "10.820.309-9", status: "No" },
    { stationId: "60006", legalName: "Comercial y Servicios Tarahuin Limitada", address: "Av. Jorge Alessandri Rodriguez N°20011 al N°20055", comuna: "San Bernardo", zoneManager: "Veronica Torreblanca", commercialManager: "Mauricio Soto", companyRut: "76.197.149-2", legalRepresentative: "Mario Torrealba Andrade", legalRepresentativeRut: "8.399.040-6", status: "Pendiente de validar" },
    { stationId: "60007", legalName: "Inversiones y Proyectos Haensgen Limitada", address: "Balmaceda N°83", comuna: "Peñaflor", zoneManager: "Benjamin Fuentes", commercialManager: "Mauricio Soto", companyRut: "76.724.513-0", legalRepresentative: "Anne Marie Haensgen Martínez", legalRepresentativeRut: "13.458.764-4", status: "No" },
  ];

  constructor(private readonly api: ApiClient) {
    this.api.managements().subscribe({
      next: (items) => { this.tasks = items.slice(0, 3).map((item) => this.toTask(item)); this.loadingTasks = false; },
      error: (error: Error) => { this.tasks = []; this.tasksError = error.message; this.loadingTasks = false; },
    });
    this.api.stations().subscribe({
      next: (items) => { this.stations = items; this.stationsLoading = false; },
      error: () => { this.stations = this.seedStations; this.stationsLoading = false; },
    });
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
      next: (items) => {
        this.stations = items;
        this.importState = "verified";
        this.importDialogVisible = false;
        this.messageService.add({ severity: "success", summary: "Importación completada", detail: `${items.length} estaciones fueron actualizadas correctamente.`, life: 5000 });
      },
      error: (error: Error) => {
        this.importState = "verified";
        this.importError = error.message;
      },
    });
  }

  resetImport(): void {
    this.selectedImportFile = null;
    this.importState = "idle";
    this.importError = "";
    this.importSummary = "";
  }

  stationStatusSeverity(status: string): "success" | "warn" | "secondary" {
    return status.toLowerCase() === "no" ? "success" : status.toLowerCase().includes("pendiente") ? "warn" : "secondary";
  }
}
