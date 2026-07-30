import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import {
  AutoCompleteCompleteEvent,
  AutoCompleteModule,
} from "primeng/autocomplete";
import { ButtonDirective } from "primeng/button";
import { CardModule } from "primeng/card";
import { FloatLabelModule } from "primeng/floatlabel";
import { CheckIcon } from "primeng/icons/check";
import { ExclamationTriangleIcon } from "primeng/icons/exclamationtriangle";
import { InfoCircleIcon } from "primeng/icons/infocircle";
import { TableModule, TablePageEvent } from "primeng/table";
import { TagModule } from "primeng/tag";
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";
import { TramitesNavegacion } from "../../services/tramites-navegacion";

type TagSeverity =
  | "success"
  | "secondary"
  | "info"
  | "warn"
  | "danger"
  | "contrast";

interface ResumenEstacion {
  idEstacion: string;
  comuna: string;
  concesionario: string;
  totalTramites: number;
  tramitesActivos: number;
  ultimaActualizacion: string;
  estadoGeneral: string;
}

@Component({
  selector: "app-estado-gestiones-estacion",
  standalone: true,
  imports: [
    AutoCompleteModule,
    Breadcrumbs,
    ButtonDirective,
    CardModule,
    CheckIcon,
    CommonModule,
    ExclamationTriangleIcon,
    FloatLabelModule,
    FormsModule,
    InfoCircleIcon,
    RouterLink,
    TableModule,
    TagModule,
  ],
  templateUrl: "./estado-estaciones.html",
  styleUrl: "./estado-estaciones.scss",
})
export class EstadoEstaciones {
  constructor(private readonly tramitesNavegacion: TramitesNavegacion) {}

  breadcrumbs = [
    {
      label: "Módulo de Gestión de Trámites",
      route: "/tramites",
    },
    {
      label: "Estado de Estaciones",
    },
  ];

  filtros = {
    idEstacion: "",
    estadoGeneral: "",
    comuna: "",
  };

  idsEstacion = [
    "60001",
    "60002",
    "60003",
    "60004",
    "60005",
    "60006",
    "60007",
    "60008",
  ];

  estadosGenerales = ["Activa", "Sin trámites", "Urgente", "Con observaciones"];

  comunas = [
    "Concón",
    "Viña del Mar",
    "Valparaíso",
    "Quilpué",
    "Villa Alemana",
  ];

  idsEstacionSugeridos = [...this.idsEstacion];
  estadosSugeridos = [...this.estadosGenerales];
  comunasSugeridas = [...this.comunas];

  resumenCards = [
    {
      cantidad: 76,
      titulo: "Estaciones con Trámites activos",
      icono: "active",
      class: "summary-card--active",
    },
    {
      cantidad: 23,
      titulo: "Estaciones sin Trámites",
      icono: "empty",
      class: "summary-card--empty",
    },
    {
      cantidad: 23,
      titulo: "Estaciones con Trámites urgentes",
      icono: "urgent",
      class: "summary-card--urgent",
    },
  ];

  estaciones: ResumenEstacion[] = [
    {
      idEstacion: "60001",
      comuna: "Concón",
      concesionario: "Comercial Los Pinos SpA",
      totalTramites: 12,
      tramitesActivos: 5,
      ultimaActualizacion: "03-07-2026",
      estadoGeneral: "Activa",
    },
    {
      idEstacion: "60002",
      comuna: "Viña del Mar",
      concesionario: "Servicios Reñaca Ltda.",
      totalTramites: 0,
      tramitesActivos: 0,
      ultimaActualizacion: "02-07-2026",
      estadoGeneral: "Sin trámites",
    },
    {
      idEstacion: "60003",
      comuna: "Viña del Mar",
      concesionario: "Inversiones Costa Azul",
      totalTramites: 8,
      tramitesActivos: 4,
      ultimaActualizacion: "02-07-2026",
      estadoGeneral: "Urgente",
    },
    {
      idEstacion: "60004",
      comuna: "Valparaíso",
      concesionario: "Transportes Puerto Ltda.",
      totalTramites: 10,
      tramitesActivos: 3,
      ultimaActualizacion: "01-07-2026",
      estadoGeneral: "Con observaciones",
    },
    {
      idEstacion: "60005",
      comuna: "Quilpué",
      concesionario: "Sociedad El Belloto",
      totalTramites: 3,
      tramitesActivos: 1,
      ultimaActualizacion: "30-06-2026",
      estadoGeneral: "Activa",
    },
    {
      idEstacion: "60006",
      comuna: "Villa Alemana",
      concesionario: "Estación Troncal Ltda.",
      totalTramites: 0,
      tramitesActivos: 0,
      ultimaActualizacion: "29-06-2026",
      estadoGeneral: "Sin trámites",
    },
    {
      idEstacion: "60007",
      comuna: "Valparaíso",
      concesionario: "Gestora Camino La Pólvora",
      totalTramites: 6,
      tramitesActivos: 4,
      ultimaActualizacion: "28-06-2026",
      estadoGeneral: "Urgente",
    },
    {
      idEstacion: "60008",
      comuna: "Valparaíso",
      concesionario: "Servicios Placilla SpA",
      totalTramites: 4,
      tramitesActivos: 2,
      ultimaActualizacion: "27-06-2026",
      estadoGeneral: "Con observaciones",
    },
  ];

  estacionesFiltradas: ResumenEstacion[] = [...this.estaciones];
  first = 0;
  rows = 5;

  filtrarIdsEstacion(event: AutoCompleteCompleteEvent): void {
    this.idsEstacionSugeridos = this.filtrarOpciones(
      this.idsEstacion,
      event.query,
    );
  }

  filtrarEstados(event: AutoCompleteCompleteEvent): void {
    this.estadosSugeridos = this.filtrarOpciones(
      this.estadosGenerales,
      event.query,
    );
  }

  filtrarComunas(event: AutoCompleteCompleteEvent): void {
    this.comunasSugeridas = this.filtrarOpciones(this.comunas, event.query);
  }

  buscar(): void {
    this.estacionesFiltradas = this.estaciones.filter((estacion) => {
      const coincideIdEstacion =
        !this.filtros.idEstacion ||
        estacion.idEstacion === this.filtros.idEstacion;

      const coincideEstado =
        !this.filtros.estadoGeneral ||
        estacion.estadoGeneral === this.filtros.estadoGeneral;

      const coincideComuna =
        !this.filtros.comuna || estacion.comuna === this.filtros.comuna;

      return coincideIdEstacion && coincideEstado && coincideComuna;
    });
    this.first = 0;
  }

  limpiarFiltros(): void {
    this.filtros = {
      idEstacion: "",
      estadoGeneral: "",
      comuna: "",
    };

    this.estacionesFiltradas = [...this.estaciones];
    this.first = 0;
  }

  prepararConsultaTramites(idEstacion: string): void {
    this.tramitesNavegacion.prepararFiltroEstacion(idEstacion);
  }

  pageChange(event: TablePageEvent): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  existenFiltrosAplicados(): boolean {
    return !!(
      this.filtros.idEstacion ||
      this.filtros.estadoGeneral ||
      this.filtros.comuna
    );
  }

  obtenerSeveridadEstado(estado: string): TagSeverity {
    const severidades: Record<string, TagSeverity> = {
      Activa: "success",
      "Sin trámites": "secondary",
      Urgente: "danger",
      "Con observaciones": "warn",
    };

    return severidades[estado] ?? "secondary";
  }

  private filtrarOpciones(opciones: string[], consulta: string): string[] {
    const consultaNormalizada = this.normalizarTexto(consulta);

    return opciones.filter((opcion) =>
      this.normalizarTexto(opcion).includes(consultaNormalizada),
    );
  }

  private normalizarTexto(texto: string): string {
    return texto
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("es-CL");
  }
}
