import { CommonModule } from "@angular/common";
import { Component, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { FilterMetadata, MessageService } from "primeng/api";
import { ButtonDirective } from "primeng/button";
import { CardModule } from "primeng/card";
import { ExclamationTriangleIcon } from "primeng/icons/exclamationtriangle";
import { InfoCircleIcon } from "primeng/icons/infocircle";
import { MultiSelectModule } from "primeng/multiselect";
import { Table, TableModule, TablePageEvent } from "primeng/table";
import { TagModule } from "primeng/tag";
import { TooltipModule } from "primeng/tooltip";
import { ToastModule } from "primeng/toast";
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";
import { TramitesNavegacion } from "../../services/tramites-navegacion";

type TagSeverity =
  "success" | "secondary" | "info" | "warn" | "danger" | "contrast";

type PrioridadEstacion = "Alta" | "Media" | "Baja" | "Sin prioridad";
type EstadoGeneral =
  "Urgente" | "Requiere atención" | "Al día" | "Sin gestiones activas";
type IndicadorSemaforo = "Rojo" | "Amarillo" | "Verde" | "Gris";
type FiltrosTabla = Record<string, FilterMetadata | FilterMetadata[]>;

interface DatosEstacion {
  idEstacion: string;
  tramitesActivos: number;
  tramitesPendientes: number;
  prioridad: PrioridadEstacion;
  diasSinAvance: number;
}

interface ResumenEstacion extends DatosEstacion {
  estadoGeneral: EstadoGeneral;
  indicador: IndicadorSemaforo;
}

interface ResumenCard {
  cantidad: number;
  titulo: string;
  icono: "active" | "pending" | "urgent";
  class: string;
}

@Component({
  selector: "app-estado-gestiones-estacion",
  standalone: true,
  imports: [
    Breadcrumbs,
    ButtonDirective,
    CardModule,
    CommonModule,
    ExclamationTriangleIcon,
    FormsModule,
    InfoCircleIcon,
    MultiSelectModule,
    RouterLink,
    TableModule,
    TagModule,
    TooltipModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: "./estado-estaciones.html",
  styleUrl: "./estado-estaciones.scss",
})
export class EstadoEstaciones {
  @ViewChild("tabla") tabla?: Table;

  readonly breadcrumbs = [
    {
      label: "Módulo de Gestión de Trámites",
      route: "/tramites",
    },
    {
      label: "Estado de Estaciones",
    },
  ];

  readonly estaciones: ResumenEstacion[];
  readonly idsEstacion: string[];
  readonly cantidadesTramitesActivos: number[];
  readonly cantidadesTramitesPendientes: number[];
  readonly estadosGenerales: EstadoGeneral[];
  readonly prioridades: PrioridadEstacion[];
  readonly indicadores: IndicadorSemaforo[];

  filtrosTabla: FiltrosTabla = {};
  first = 0;
  rows = 10;

  constructor(
    private readonly tramitesNavegacion: TramitesNavegacion,
    private readonly messageService: MessageService,
  ) {
    const datosEstaciones: DatosEstacion[] = [
      {
        idEstacion: "60001",
        tramitesActivos: 5,
        tramitesPendientes: 1,
        prioridad: "Alta",
        diasSinAvance: 3,
      },
      {
        idEstacion: "60002",
        tramitesActivos: 0,
        tramitesPendientes: 0,
        prioridad: "Sin prioridad",
        diasSinAvance: 0,
      },
      {
        idEstacion: "60003",
        tramitesActivos: 4,
        tramitesPendientes: 3,
        prioridad: "Alta",
        diasSinAvance: 12,
      },
      {
        idEstacion: "60004",
        tramitesActivos: 3,
        tramitesPendientes: 1,
        prioridad: "Media",
        diasSinAvance: 8,
      },
      {
        idEstacion: "60005",
        tramitesActivos: 1,
        tramitesPendientes: 0,
        prioridad: "Baja",
        diasSinAvance: 2,
      },
      {
        idEstacion: "60006",
        tramitesActivos: 0,
        tramitesPendientes: 0,
        prioridad: "Sin prioridad",
        diasSinAvance: 0,
      },
      {
        idEstacion: "60007",
        tramitesActivos: 4,
        tramitesPendientes: 2,
        prioridad: "Alta",
        diasSinAvance: 16,
      },
      {
        idEstacion: "60008",
        tramitesActivos: 2,
        tramitesPendientes: 1,
        prioridad: "Media",
        diasSinAvance: 5,
      },
    ];

    this.estaciones = datosEstaciones.map((estacion) =>
      this.construirResumen(estacion),
    );
    this.idsEstacion = this.valoresUnicos(
      this.estaciones.map(({ idEstacion }) => idEstacion),
    ).sort((a, b) => a.localeCompare(b, "es-CL", { numeric: true }));
    this.cantidadesTramitesActivos = this.ordenarNumeros(
      this.estaciones.map(({ tramitesActivos }) => tramitesActivos),
    );
    this.cantidadesTramitesPendientes = this.ordenarNumeros(
      this.estaciones.map(({ tramitesPendientes }) => tramitesPendientes),
    );
    this.estadosGenerales = this.valoresUnicos(
      this.estaciones.map(({ estadoGeneral }) => estadoGeneral),
    );
    this.prioridades = this.valoresUnicos(
      this.estaciones.map(({ prioridad }) => prioridad),
    );
    this.indicadores = this.valoresUnicos(
      this.estaciones.map(({ indicador }) => indicador),
    );
  }

  get resumenCards(): ResumenCard[] {
    return [
      {
        cantidad: this.estaciones.filter(
          ({ tramitesActivos }) => tramitesActivos > 0,
        ).length,
        titulo: "Estaciones con trámites activos",
        icono: "active",
        class: "summary-card--active",
      },
      {
        cantidad: this.estaciones.filter(
          ({ tramitesPendientes }) => tramitesPendientes > 0,
        ).length,
        titulo: "Estaciones con trámites pendientes",
        icono: "pending",
        class: "summary-card--pending",
      },
      {
        cantidad: this.estaciones.filter(
          ({ estadoGeneral }) => estadoGeneral === "Urgente",
        ).length,
        titulo: "Estaciones en estado urgente",
        icono: "urgent",
        class: "summary-card--urgent",
      },
    ];
  }

  mostrarCriterioEstado(): void {
    this.messageService.add({
      severity: "info",
      summary: "Cálculo del estado general",
      detail:
        "Se calcula según la cantidad de trámites pendientes, su prioridad y los días transcurridos sin avances. No representa el estado de un trámite individual.",
      life: 7000,
    });
  }

  limpiarFiltros(): void {
    this.filtrosTabla = {};
    this.tabla?.clear();
    this.first = 0;
  }

  prepararConsultaTramites(idEstacion: string): void {
    this.tramitesNavegacion.prepararFiltroEstacion(idEstacion);
  }

  pageChange(event: TablePageEvent): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  obtenerSeveridadEstado(estado: EstadoGeneral): TagSeverity {
    const severidades: Record<EstadoGeneral, TagSeverity> = {
      Urgente: "danger",
      "Requiere atención": "warn",
      "Al día": "success",
      "Sin gestiones activas": "secondary",
    };

    return severidades[estado];
  }

  obtenerSeveridadPrioridad(prioridad: PrioridadEstacion): TagSeverity {
    const severidades: Record<PrioridadEstacion, TagSeverity> = {
      Alta: "danger",
      Media: "warn",
      Baja: "info",
      "Sin prioridad": "secondary",
    };

    return severidades[prioridad];
  }

  obtenerClaseIndicador(indicador: IndicadorSemaforo): string {
    return `semaforo--${indicador.toLocaleLowerCase("es-CL")}`;
  }

  private construirResumen(estacion: DatosEstacion): ResumenEstacion {
    const { estadoGeneral, indicador } = this.calcularSituacion(estacion);

    return {
      ...estacion,
      estadoGeneral,
      indicador,
    };
  }

  private calcularSituacion(
    estacion: DatosEstacion,
  ): Pick<ResumenEstacion, "estadoGeneral" | "indicador"> {
    if (estacion.tramitesActivos === 0) {
      return {
        estadoGeneral: "Sin gestiones activas",
        indicador: "Gris",
      };
    }

    const esUrgente =
      estacion.tramitesPendientes >= 3 ||
      estacion.diasSinAvance >= 15 ||
      (estacion.prioridad === "Alta" &&
        (estacion.tramitesPendientes >= 2 || estacion.diasSinAvance >= 7));

    if (esUrgente) {
      return { estadoGeneral: "Urgente", indicador: "Rojo" };
    }

    const requiereAtencion =
      estacion.tramitesPendientes > 0 ||
      estacion.diasSinAvance >= 7 ||
      estacion.prioridad === "Alta";

    if (requiereAtencion) {
      return {
        estadoGeneral: "Requiere atención",
        indicador: "Amarillo",
      };
    }

    return { estadoGeneral: "Al día", indicador: "Verde" };
  }

  private valoresUnicos<T>(valores: T[]): T[] {
    return [...new Set(valores)];
  }

  private ordenarNumeros(valores: number[]): number[] {
    return this.valoresUnicos(valores).sort((a, b) => a - b);
  }
}
