import { ChangeDetectorRef, Component, Optional } from "@angular/core";
import { finalize } from "rxjs";
import { Breadcrumbs } from "../../shared/components/breadcrumbs/breadcrumbs";
import { GestionAlcanceInfo } from "../../shared/components/gestion-alcance-info/gestion-alcance-info";
import {
  GestionListado,
  GestionListadoItem,
} from "../../shared/components/gestion-listado/gestion-listado";
import { TramitesMock } from "../../shared/services/tramites-mock";

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

  constructor(
    tramitesMock: TramitesMock,
    @Optional() private readonly changeDetectorRef: ChangeDetectorRef | null = null,
  ) {
    tramitesMock.cargarTodos().pipe(finalize(() => {
      this.loading = false;
      this.changeDetectorRef?.markForCheck();
    })).subscribe({
      next: (tramites) => {
        this.gestiones = tramites;
      },
      error: (error: Error) => {
        this.errorMessage = error.message;
      },
    });
  }
}
