import { Component } from "@angular/core";
import { finalize } from "rxjs";
import { Breadcrumbs } from "../../shared/components/breadcrumbs/breadcrumbs";
import { GestionAlcanceInfo } from "../../shared/components/gestion-alcance-info/gestion-alcance-info";
import {
  GestionListado,
  GestionListadoItem,
} from "../../shared/components/gestion-listado/gestion-listado";
import { TramitesMock } from "../tramites/services/tramites-mock";

@Component({
  selector: "app-escritorio",
  standalone: true,
  imports: [Breadcrumbs, GestionAlcanceInfo, GestionListado],
  templateUrl: "./escritorio.html",
  styleUrl: "./escritorio.scss",
})
export class Escritorio {
  readonly tituloInformacionAlcance = "¿Qué es la vista Escritorio?";
  readonly informacionAlcance =
    "En esta vista, ves las gestiones en las que tú eres el responsable.";

  readonly breadcrumbs = [
    {
      label: "Módulo de Gestión de Trámites",
      route: "/home",
    },
    {
      label: "Escritorio",
    },
  ];

  gestiones: GestionListadoItem[] = [];
  loading = true;
  errorMessage = "";

  constructor(tramitesMock: TramitesMock) {
    tramitesMock.cargarTodos().pipe(finalize(() => { this.loading = false; })).subscribe({
      next: (tramites) => {
        this.gestiones = tramites;
      },
      error: (error: Error) => { this.errorMessage = error.message; },
    });
  }
}
