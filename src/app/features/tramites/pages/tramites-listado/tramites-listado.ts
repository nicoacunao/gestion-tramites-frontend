import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { Tramite } from "../../models/tramite";
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";

@Component({
  selector: "app-tramites-listado",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Breadcrumbs],
  templateUrl: "./tramites-listado.html",
  styleUrl: "./tramites-listado.scss",
})
export class TramitesListado implements OnInit {
  constructor(private readonly route: ActivatedRoute) {}

  breadcrumbs = [
    {
      label: "Módulo de Gestión de Trámites",
      route: "/tramites",
    },
    {
      label: "Consulta de Trámites",
    },
  ];
  filtros = {
    estacionServicio: "",
    fechaAperturaDesde: "",
    fechaAperturaHasta: "",
    fechaTerminoDesde: "",
    fechaTerminoHasta: "",
    estado: "",
  };

  estacionesServicio = [
    "Copec Concón",
    "Copec Reñaca",
    "Copec Viña Centro",
    "Copec Valparaíso",
    "Copec Quilpué",
    "Copec Villa Alemana",
    "Copec Curauma",
    "Copec Placilla",
  ];

  estados = [
    {
      title: "Ingresado",
      textColor: "text-bg-primary",
    },
    {
      title: "En revisión",
      textColor: "text-bg-warning",
    },
    {
      title: "Observado",
      textColor: "text-bg-info",
    },
    {
      title: "Aprobado",
      textColor: "text-bg-success",
    },
    {
      title: "Finalizado",
      textColor: "text-bg-dark",
    },
  ];

  tramites: Tramite[] = [
    {
      id: 1001,
      tipoTramite: "Nuevo trámite",
      estacionServicio: "Copec Concón",
      estado: "Ingresado",
      concesionario: "Comercial Los Pinos SpA",
      fechaApertura: "02-07-2026",
      fechaEstimadaTermino: "12-07-2026",
    },
    {
      id: 1002,
      tipoTramite: "Modificación",
      estacionServicio: "Copec Reñaca",
      estado: "En revisión",
      concesionario: "Servicios Reñaca Ltda.",
      fechaApertura: "01-07-2026",
      fechaEstimadaTermino: "10-07-2026",
    },
    {
      id: 1003,
      tipoTramite: "Nuevo trámite",
      estacionServicio: "Copec Viña Centro",
      estado: "Observado",
      concesionario: "Inversiones Costa Azul",
      fechaApertura: "28-06-2026",
      fechaEstimadaTermino: "08-07-2026",
    },
    {
      id: 1004,
      tipoTramite: "Modificación",
      estacionServicio: "Copec Valparaíso",
      estado: "Aprobado",
      concesionario: "Transportes Puerto Ltda.",
      fechaApertura: "25-06-2026",
      fechaEstimadaTermino: "05-07-2026",
    },
    {
      id: 1005,
      tipoTramite: "Nuevo trámite",
      estacionServicio: "Copec Quilpué",
      estado: "Finalizado",
      concesionario: "Sociedad El Belloto",
      fechaApertura: "20-06-2026",
      fechaEstimadaTermino: "30-06-2026",
    },
  ];

  tramitesFiltrados: Tramite[] = [...this.tramites];

  ngOnInit(): void {
    const estacion = this.route.snapshot.queryParamMap.get("estacion");

    if (estacion) {
      this.filtros.estacionServicio = estacion;
      this.buscar();
    }
  }

  buscar(): void {
    this.tramitesFiltrados = this.tramites.filter((tramite) => {
      const coincideEstacion =
        !this.filtros.estacionServicio ||
        tramite.estacionServicio === this.filtros.estacionServicio;

      const coincideEstado =
        !this.filtros.estado || tramite.estado === this.filtros.estado;

      const fechaApertura = this.convertirFecha(tramite.fechaApertura);
      const fechaTermino = this.convertirFecha(tramite.fechaEstimadaTermino);

      const coincideAperturaDesde =
        !this.filtros.fechaAperturaDesde ||
        fechaApertura >= this.filtros.fechaAperturaDesde;
      const coincideAperturaHasta =
        !this.filtros.fechaAperturaHasta ||
        fechaApertura <= this.filtros.fechaAperturaHasta;
      const coincideTerminoDesde =
        !this.filtros.fechaTerminoDesde ||
        fechaTermino >= this.filtros.fechaTerminoDesde;
      const coincideTerminoHasta =
        !this.filtros.fechaTerminoHasta ||
        fechaTermino <= this.filtros.fechaTerminoHasta;

      return (
        coincideEstacion &&
        coincideEstado &&
        coincideAperturaDesde &&
        coincideAperturaHasta &&
        coincideTerminoDesde &&
        coincideTerminoHasta
      );
    });
  }

  limpiarFiltros(): void {
    this.filtros = {
      estacionServicio: "",
      fechaAperturaDesde: "",
      fechaAperturaHasta: "",
      fechaTerminoDesde: "",
      fechaTerminoHasta: "",
      estado: "",
    };

    this.tramitesFiltrados = [...this.tramites];
  }

  obtenerClaseEstado(estadoActual: string): string {
    return (
      this.estados.find((item) => item.title === estadoActual)?.textColor ??
      "text-bg-secondary"
    );
  }

  private convertirFecha(fecha: string): string {
    const [dia, mes, anio] = fecha.split("-");
    return `${anio}-${mes}-${dia}`;
  }
}
