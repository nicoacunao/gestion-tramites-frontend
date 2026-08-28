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
import { InputTextModule } from "primeng/inputtext";
import { ProgressBarModule } from "primeng/progressbar";
import { TagModule } from "primeng/tag";
import { TextareaModule } from "primeng/textarea";
import { ToastModule } from "primeng/toast";
import { UserSessionService } from "../../shared/services/user-session";

type ActivityTone = "success" | "info" | "warn";
type QuickAccessId = "datos" | "estaciones" | "tareas" | "reporte";

interface QuickAccess {
  id: QuickAccessId;
  title: string;
  caption: string;
  status?: string;
}

interface RecentActivity {
  title: string;
  detail: string;
  time: string;
  tone: ActivityTone;
  route: string;
}

@Component({
  selector: "app-home",
  standalone: true,
  imports: [
    AvatarModule,
    ButtonDirective,
    CardModule,
    InputTextModule,
    ProgressBarModule,
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

  readonly recentActivity: RecentActivity[] = [
    {
      title: "Trámite RM-2026-084 actualizado",
      detail: "Se incorporaron nuevos antecedentes a la solicitud.",
      time: "Hace 18 min",
      tone: "success",
      route: "/tramites/1001",
    },
    {
      title: "Estación 60003 requiere atención",
      detail: "Mantiene tres gestiones pendientes y prioridad alta.",
      time: "Hace 1 h",
      tone: "warn",
      route: "/tramites/estado-estaciones",
    },
    {
      title: "Listado de trámites sincronizado",
      detail: "La información disponible está actualizada.",
      time: "Hoy, 08:45",
      tone: "info",
      route: "/tramites",
    },
  ];

  get greeting(): string {
    const hour = new Date().getHours();

    if (hour < 12) {
      return "Buenos días";
    }

    if (hour < 20) {
      return "Buenas tardes";
    }

    return "Buenas noches";
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
