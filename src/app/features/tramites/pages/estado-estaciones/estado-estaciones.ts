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
import { ApiClient, BackendStationSummary } from "../../../../shared/services/api-client";

type TagSeverity =
  "success" | "secondary" | "info" | "warn" | "danger" | "contrast";

type PrioridadEstacion = "Alta" | "Media" | "Baja" | "Sin prioridad";
type EstadoGeneral =
  "Urgente" | "Requiere atención" | "Al día" | "Sin gestiones activas";
type IndicadorSemaforo = "Rojo" | "Amarillo" | "Verde" | "Gris";
type FiltrosTabla = Record<string, FilterMetadata | FilterMetadata[]>;

interface ResumenEstacion {
  idEstacion: string;
  tramitesActivos: number;
  tramitesPendientes: number;
  prioridad: PrioridadEstacion;
  diasSinAvance: number;
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
      label: "Todas las gestiones",
      route: "/todas-las-gestiones",
    },
    {
      label: "Estado de Estaciones",
    },
  ];

  estaciones: ResumenEstacion[] = [];
  idsEstacion: string[] = [];
  cantidadesTramitesActivos: number[] = [];
  cantidadesTramitesPendientes: number[] = [];
  estadosGenerales: EstadoGeneral[] = [];
  prioridades: PrioridadEstacion[] = [];
  indicadores: IndicadorSemaforo[] = [];
  loading = true;
  errorMessage = "";

  filtrosTabla: FiltrosTabla = {};
  first = 0;
  rows = 10;

  constructor(private readonly messageService: MessageService, private readonly api: ApiClient) {
    this.api.stationSummary().subscribe({
      next: (items) => { this.cargarResumen(items); this.loading = false; },
      error: (error: Error) => { this.loading = false; this.errorMessage = error.message; },
    });
  }

  private cargarResumen(items: BackendStationSummary[]): void {
    this.estaciones = items.map((item) => ({
      idEstacion: item.stationId,
      tramitesActivos: item.activeCount,
      tramitesPendientes: item.pendingCount,
      prioridad: item.activeCount === 0 ? "Sin prioridad" : "Media",
      diasSinAvance: item.daysWithoutProgress,
      estadoGeneral: this.normalizarEstado(item.overallStatus),
      indicador: this.indicadorDeEstado(item.overallStatus),
    }));
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

  private normalizarEstado(value: string): EstadoGeneral { return value as EstadoGeneral; }
  private indicadorDeEstado(value: string): IndicadorSemaforo {
    return value === "Urgente" ? "Rojo" : value === "Requiere atención" ? "Amarillo" : value === "Al día" ? "Verde" : "Gris";
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

  private valoresUnicos<T>(valores: T[]): T[] {
    return [...new Set(valores)];
  }

  private ordenarNumeros(valores: number[]): number[] {
    return this.valoresUnicos(valores).sort((a, b) => a - b);
  }
}
