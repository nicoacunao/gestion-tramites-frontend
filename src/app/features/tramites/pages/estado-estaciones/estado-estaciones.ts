import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";

interface ResumenEstacion {
  estacionServicio: string;
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
  imports: [CommonModule, FormsModule, RouterLink, Breadcrumbs],
  templateUrl: "./estado-estaciones.html",
  styleUrl: "./estado-estaciones.scss",
})
export class EstadoEstaciones {
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
    estacionServicio: "",
    estadoGeneral: "",
    comuna: "",
  };

  estacionesServicio = [
    "Copec Concón",
    "Copec Reñaca",
    "Copec Viña Centro",
    "Copec Valparaíso",
    "Copec Quilpué",
    "Copec Villa Alemana",
  ];

  estadosGenerales = ["Activa", "Sin trámites", "Urgente", "Con observaciones"];

  comunas = [
    "Concón",
    "Viña del Mar",
    "Valparaíso",
    "Quilpué",
    "Villa Alemana",
  ];

  resumenCards = [
    {
      cantidad: 76,
      titulo: "Estaciones con Trámites activos",
      icono: "◷",
      class: "bg-warning-subtle border-warning",
      textClass: "text-warning-emphasis",
    },
    {
      cantidad: 23,
      titulo: "Estaciones sin Trámites",
      icono: "✓",
      class: "bg-success-subtle border-success",
      textClass: "text-success-emphasis",
    },
    {
      cantidad: 23,
      titulo: "Estaciones con Trámites urgentes",
      icono: "!",
      class: "bg-danger-subtle border-danger",
      textClass: "text-danger-emphasis",
    },
  ];

  estaciones: ResumenEstacion[] = [
    {
      estacionServicio: "Copec Concón",
      comuna: "Concón",
      concesionario: "Comercial Los Pinos SpA",
      totalTramites: 12,
      tramitesActivos: 5,
      ultimaActualizacion: "03-07-2026",
      estadoGeneral: "Activa",
    },
    {
      estacionServicio: "Copec Reñaca",
      comuna: "Viña del Mar",
      concesionario: "Servicios Reñaca Ltda.",
      totalTramites: 0,
      tramitesActivos: 0,
      ultimaActualizacion: "02-07-2026",
      estadoGeneral: "Sin trámites",
    },
    {
      estacionServicio: "Copec Viña Centro",
      comuna: "Viña del Mar",
      concesionario: "Inversiones Costa Azul",
      totalTramites: 8,
      tramitesActivos: 4,
      ultimaActualizacion: "02-07-2026",
      estadoGeneral: "Urgente",
    },
    {
      estacionServicio: "Copec Valparaíso",
      comuna: "Valparaíso",
      concesionario: "Transportes Puerto Ltda.",
      totalTramites: 10,
      tramitesActivos: 3,
      ultimaActualizacion: "01-07-2026",
      estadoGeneral: "Con observaciones",
    },
    {
      estacionServicio: "Copec Quilpué",
      comuna: "Quilpué",
      concesionario: "Sociedad El Belloto",
      totalTramites: 3,
      tramitesActivos: 1,
      ultimaActualizacion: "30-06-2026",
      estadoGeneral: "Activa",
    },
    {
      estacionServicio: "Copec Villa Alemana",
      comuna: "Villa Alemana",
      concesionario: "Estación Troncal Ltda.",
      totalTramites: 0,
      tramitesActivos: 0,
      ultimaActualizacion: "29-06-2026",
      estadoGeneral: "Sin trámites",
    },
    {
      estacionServicio: "Copec Curauma",
      comuna: "Valparaíso",
      concesionario: "Gestora Camino La Pólvora",
      totalTramites: 6,
      tramitesActivos: 4,
      ultimaActualizacion: "28-06-2026",
      estadoGeneral: "Urgente",
    },
    {
      estacionServicio: "Copec Placilla",
      comuna: "Valparaíso",
      concesionario: "Servicios Placilla SpA",
      totalTramites: 4,
      tramitesActivos: 2,
      ultimaActualizacion: "27-06-2026",
      estadoGeneral: "Con observaciones",
    },
  ];

  estacionesFiltradas: ResumenEstacion[] = [...this.estaciones];

  buscar(): void {
    this.estacionesFiltradas = this.estaciones.filter((estacion) => {
      const coincideEstacion =
        !this.filtros.estacionServicio ||
        estacion.estacionServicio === this.filtros.estacionServicio;

      const coincideEstado =
        !this.filtros.estadoGeneral ||
        estacion.estadoGeneral === this.filtros.estadoGeneral;

      const coincideComuna =
        !this.filtros.comuna || estacion.comuna === this.filtros.comuna;

      return coincideEstacion && coincideEstado && coincideComuna;
    });
  }

  limpiarFiltros(): void {
    this.filtros = {
      estacionServicio: "",
      estadoGeneral: "",
      comuna: "",
    };

    this.estacionesFiltradas = [...this.estaciones];
  }

  existenFiltrosAplicados(): boolean {
    return !!(
      this.filtros.estacionServicio ||
      this.filtros.estadoGeneral ||
      this.filtros.comuna
    );
  }

  obtenerClaseEstado(estado: string): string {
    return estado
      .toLowerCase()
      .replace(" ", "-")
      .replace("á", "a")
      .replace("é", "e")
      .replace("í", "i")
      .replace("ó", "o")
      .replace("ú", "u");
  }
}
