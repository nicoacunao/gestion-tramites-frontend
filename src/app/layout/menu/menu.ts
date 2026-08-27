import { Component } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { Router, RouterLink } from "@angular/router";
import { MenuItem } from "primeng/api";
import { Menubar } from "primeng/menubar";
import { TramitesNavegacion } from "../../features/tramites/services/tramites-navegacion";

@Component({
  selector: "app-menu",
  imports: [MatIconModule, Menubar, RouterLink],
  templateUrl: "./menu.html",
  styleUrl: "./menu.scss",
})
export class MenuComponent {
  readonly menuItems: MenuItem[] = [
    {
      id: "home",
      label: "Home",
      icon: "home",
      routerLink: "/home",
    },
    {
      id: "mi-escritorio",
      label: "Mi escritorio",
      icon: "space_dashboard",
      routerLink: "",

    },
    {
      id: "todas-las-gestiones",
      label: "Todas las gestiones",
      icon: "format_list_bulleted",
      routerLink: "/tramites",
      command: () => this.tramitesNavegacion.solicitarListadoCompleto(),
    },
    {
      id: "ingreso-proyecto",
      label: "Ingreso proyecto",
      icon: "add_box",
      routerLink: "/tramites/nuevo",
    },
  ];

  constructor(
    private readonly router: Router,
    private readonly tramitesNavegacion: TramitesNavegacion,
  ) { }

  estaActivo(item: MenuItem): boolean {
    const rutaActual = this.router.url.split(/[?#]/)[0];

    switch (item.id) {
      case "home":
        return rutaActual === "/home";
      case "tramites-menu":
        return rutaActual.startsWith("/tramites");
      case "todas-las-gestiones":
        return (
          rutaActual === "/tramites" ||
          /^\/tramites\/\d+(?:\/modificar)?$/.test(rutaActual)
        );
      case "ingreso-proyecto":
        return rutaActual === "/tramites/nuevo";
      default:
        return false;
    }
  }
}
