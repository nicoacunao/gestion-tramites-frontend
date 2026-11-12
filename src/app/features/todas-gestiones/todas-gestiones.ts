import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { finalize } from "rxjs";
import { Breadcrumbs } from "../../shared/components/breadcrumbs/breadcrumbs";
import { GestionAlcanceInfo } from "../../shared/components/gestion-alcance-info/gestion-alcance-info";
import {
  GestionListado,
  GestionListadoItem,
} from "../../shared/components/gestion-listado/gestion-listado";
import { TramitesMock } from "../../shared/services/tramites-mock";

interface GestionGlobal extends GestionListadoItem {
  rutRepresentanteLegal: string;
  tieneDetalle: boolean;
}

@Component({
  selector: "app-todas-gestiones",
  standalone: true,
  imports: [Breadcrumbs, GestionAlcanceInfo, GestionListado],
  templateUrl: "./todas-gestiones.html",
  styleUrl: "./todas-gestiones.scss",
})
export class TodasGestiones {
  readonly tituloInformacionAlcance = "¿Qué es la vista Todas las Gestiones?";
  readonly informacionAlcance =
    "En esta vista, ves todas las gestiones del sistema, de todos los responsables.";

  readonly breadcrumbs = [
    { label: "Módulo de Gestión de Trámites", route: "/home" },
    { label: "Todas las gestiones" },
  ];

  gestiones: GestionGlobal[] = [];
  loading = true;
  errorMessage = "";
  readonly tramiteDetalleInicialId: string | number | null;
  readonly idEstacionInicial: string | null;

  constructor(tramitesMock: TramitesMock, route?: ActivatedRoute) {
    const detalleParam = route?.snapshot.queryParamMap.get("detalle") ?? null;
    this.tramiteDetalleInicialId = detalleParam && /^\d+$/.test(detalleParam)
      ? Number(detalleParam)
      : detalleParam;
    this.idEstacionInicial =
      route?.snapshot.queryParamMap.get("estacion") ?? null;

    tramitesMock.cargarTodos().pipe(finalize(() => { this.loading = false; })).subscribe({
      next: (tramites) => {
        this.gestiones = tramites.map((tramite) => ({
          ...tramite,
          tieneDetalle: true,
        }));
      },
      error: (error: Error) => { this.errorMessage = error.message; },
    });
  }

}
