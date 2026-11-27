import { ChangeDetectorRef, Component, Optional } from "@angular/core";
import { finalize } from "rxjs";
import { Breadcrumbs } from "../../shared/components/breadcrumbs/breadcrumbs";
import { GestionAlcanceInfo } from "../../shared/components/gestion-alcance-info/gestion-alcance-info";
import {
  GestionListado,
  GestionListadoItem,
} from "../../shared/components/gestion-listado/gestion-listado";
import { mensajeDeError } from "../../shared/services/api-base";
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
    private readonly tramitesMock: TramitesMock,
    @Optional() private readonly changeDetectorRef: ChangeDetectorRef | null = null,
  ) {
    this.cargar();
  }

  /**
   * `assignedToMe=true`: el backend devuelve solo las gestiones del usuario
   * autenticado, por lo que no se vuelve a filtrar en el cliente.
   */
  cargar(): void {
    this.loading = true;
    this.errorMessage = "";
    this.changeDetectorRef?.markForCheck();
    this.tramitesMock.cargarTodos(true).pipe(finalize(() => {
      this.loading = false;
      this.changeDetectorRef?.markForCheck();
    })).subscribe({
      next: (tramites) => {
        this.gestiones = tramites;
      },
      error: (error: unknown) => {
        this.gestiones = [];
        this.errorMessage = mensajeDeError(
          error,
          "No fue posible cargar tus gestiones. Inténtalo nuevamente.",
        );
      },
    });
  }
}
