import { ChangeDetectorRef, Component, Optional } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { finalize } from "rxjs";
import { Breadcrumbs } from "../../shared/components/breadcrumbs/breadcrumbs";
import { GestionAlcanceInfo } from "../../shared/components/gestion-alcance-info/gestion-alcance-info";
import {
  GestionListado,
  GestionListadoItem,
} from "../../shared/components/gestion-listado/gestion-listado";
import { mensajeDeError } from "../../shared/services/api-base";
import { TramitesMock } from "../../shared/services/tramites-mock";

interface GestionGlobal extends GestionListadoItem {
  rutRepresentanteLegal: string;
  tieneDetalle: boolean;
}

/** Ids de gestión válidos según el backend (`^[1-9]\d*$`). */
const ID_GESTION = /^[1-9]\d*$/;

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
  /** Gestión a abrir desde `?detalle=<id>` (por ejemplo, desde Home › Mis tareas). */
  readonly tramiteDetalleInicialId: string | null;
  /** Estación a filtrar desde `?estacion=<id>`. */
  readonly idEstacionInicial: string | null;

  constructor(
    private readonly tramitesMock: TramitesMock,
    route?: ActivatedRoute,
    @Optional() private readonly changeDetectorRef: ChangeDetectorRef | null = null,
  ) {
    const detalleParam = route?.snapshot.queryParamMap.get("detalle")?.trim() ?? "";
    this.tramiteDetalleInicialId = ID_GESTION.test(detalleParam) ? detalleParam : null;
    this.idEstacionInicial =
      route?.snapshot.queryParamMap.get("estacion")?.trim() || null;

    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.errorMessage = "";
    this.changeDetectorRef?.markForCheck();
    this.tramitesMock.cargarTodos().pipe(finalize(() => {
      this.loading = false;
      this.changeDetectorRef?.markForCheck();
    })).subscribe({
      next: (tramites) => {
        this.gestiones = tramites.map((tramite) => ({
          ...tramite,
          tieneDetalle: true,
        }));
      },
      error: (error: unknown) => {
        this.gestiones = [];
        this.errorMessage = mensajeDeError(
          error,
          "No fue posible cargar las gestiones. Inténtalo nuevamente.",
        );
      },
    });
  }
}
