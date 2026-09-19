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
import { InputTextModule } from "primeng/inputtext";
import { TagModule } from "primeng/tag";
import { TextareaModule } from "primeng/textarea";
import { ToastModule } from "primeng/toast";
import { UserSessionService } from "../../shared/services/user-session";

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

@Component({
  selector: "app-home",
  standalone: true,
  imports: [
    AvatarModule,
    ButtonDirective,
    CardModule,
    DataViewModule,
    InputTextModule,
    ReactiveFormsModule,
    RouterLink,
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

  readonly tasks: HomeTask[] = [
    {
      id: 1001,
      code: "N1-MUN-001",
      stationId: "60001",
      title: "Solicitud de patente EDS",
      detail: "Se incorporaron nuevos antecedentes a la solicitud.",
      updatedAt: "Actualizado hace 18 min",
      trafficStatus: "al-dia",
      trafficLabel: "Al día",
      severity: "success",
      route: "/todas-las-gestiones",
      queryParams: { detalle: 1001 },
    },
    {
      id: 1002,
      code: "N1-SAN-002",
      stationId: "60002",
      title: "Resolución sanitaria de alimentos",
      detail: "La fecha estimada de término se encuentra próxima.",
      updatedAt: "Actualizado hoy, 09:20",
      trafficStatus: "proximo-vencer",
      trafficLabel: "Próximo a vencer",
      severity: "warn",
      route: "/todas-las-gestiones",
      queryParams: { detalle: 1002 },
    },
    {
      id: 1003,
      code: "N1-SAN-003",
      stationId: "60003",
      title: "Informe sanitario de establecimiento",
      detail: "Mantiene observaciones pendientes que requieren atención.",
      updatedAt: "Actualizado hace 1 h",
      trafficStatus: "atrasado",
      trafficLabel: "Requiere atención",
      severity: "danger",
      route: "/todas-las-gestiones",
      queryParams: { detalle: 1003 },
    },
  ];

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
}
