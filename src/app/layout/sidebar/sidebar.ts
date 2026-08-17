import { Component, EventEmitter, HostListener, Input, Output } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { TramitesNavegacion } from "../../features/tramites/services/tramites-navegacion";

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}

interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

@Component({
  selector: "app-sidebar",
  imports: [MatIconModule, RouterLink],
  templateUrl: "./sidebar.html",
  styleUrl: "./sidebar.scss",
})

export class SidebarComponent {
  constructor(
    private readonly router: Router,
    private readonly tramitesNavegacion: TramitesNavegacion,
  ) { }

  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  readonly navigationSections: SidebarSection[] = [
    {
      label: "Módulo de Trámites",
      items: [
        {
          id: "tramites",
          label: "Listado de trámites",
          icon: "assignment",
          route: "/tramites",
        },
        {
          id: "nuevo-tramite",
          label: "Nuevo trámite",
          icon: "add_circle",
          route: "/tramites/nuevo",
        },
        {
          id: "estado-estaciones",
          label: "Estado de estaciones",
          icon: "monitor_heart",
          route: "/tramites/estado-estaciones",
        },
      ],
    },
  ];

  alNavegar(item: SidebarItem): void {
    if (item.id === "tramites") {
      this.tramitesNavegacion.solicitarListadoCompleto();
    }

    this.closeSidebar();
  }

  irAlPortal(): void {
    this.tramitesNavegacion.solicitarListadoCompleto();
  }

  estaActivo(item: SidebarItem): boolean {
    const rutaActual = this.router.url.split(/[?#]/)[0];

    if (item.id === "tramites") {
      return (
        rutaActual === "/tramites" ||
        /^\/tramites\/\d+(?:\/modificar)?$/.test(rutaActual)
      );
    }

    return rutaActual === item.route;
  }

  closeSidebar(): void {
    this.closed.emit();
  }

  @HostListener("document:keydown.escape")
  closeWithEscape(): void {
    if (this.open) {
      this.closeSidebar();
    }
  }
}
