import { Component, ElementRef, ViewChild } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { AvatarModule } from "primeng/avatar";
import { ButtonDirective } from "primeng/button";
import { CardModule } from "primeng/card";
import { ProgressBarModule } from "primeng/progressbar";
import { TagModule } from "primeng/tag";

type ActivityTone = "success" | "info" | "warn";

interface ConnectedUser {
  firstName: string;
  fullName: string;
  initials: string;
  role: string;
  description: string;
  email: string;
  rut: string;
  organization: string;
}

interface QuickAccess {
  id: "datos" | "estaciones" | "tareas" | "reporte";
  title: string;
  caption: string;
  action?: "user-data";
  route?: string;
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
    ProgressBarModule,
    RouterLink,
    TagModule,
  ],
  templateUrl: "./home.html",
  styleUrl: "./home.scss",
})
export class Home {
  @ViewChild("profileCard", { read: ElementRef })
  private profileCard?: ElementRef<HTMLElement>;

  showUserData = false;

  readonly user: ConnectedUser = {
    firstName: "María",
    fullName: "María Contreras",
    initials: "MC",
    role: "Gestora de trámites",
    description: "Administración y seguimiento de gestiones municipales",
    email: "maria.contreras@gestion.cl",
    rut: "15.482.963-7",
    organization: "Municipalidad de Santiago",
  };

  readonly quickAccesses: QuickAccess[] = [
    {
      id: "datos",
      title: "Mis datos",
      caption: "Perfil y cuenta",
      action: "user-data",
    },
    {
      id: "estaciones",
      title: "Datos estaciones de servicio",
      caption: "Información de estaciones",
      route: "/tramites/estado-estaciones",
    },
    {
      id: "tareas",
      title: "Mis tareas",
      caption: "Gestiones asignadas",
      route: "/tramites",
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

  constructor(private readonly router: Router) {}

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

  toggleUserData(): void {
    this.showUserData = !this.showUserData;
  }

  openQuickAccess(access: QuickAccess): void {
    if (access.action === "user-data") {
      this.showUserData = true;
      this.profileCard?.nativeElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    if (access.route) {
      void this.router.navigateByUrl(access.route);
    }
  }

  signOut(): void {
    void this.router.navigate(["/login"]);
  }
}
