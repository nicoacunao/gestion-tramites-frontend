import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { InputTextModule } from "primeng/inputtext";
import { TableModule, TablePageEvent } from "primeng/table";
import { TooltipModule } from "primeng/tooltip";
import { Breadcrumbs } from "../../shared/components/breadcrumbs/breadcrumbs";
import { Tramite } from "../tramites/models/tramite";
import { TramitesMock } from "../tramites/services/tramites-mock";

type EstadoSemaforo = "al-dia" | "proximo-vencer" | "atrasado";
type FiltroSemaforo = EstadoSemaforo | "todos";

interface DatosAsociados {
  rutRazonSocial: string;
  representanteLegal: string;
  rutRepresentanteLegal: string;
  semaforo: EstadoSemaforo;
}

interface GestionEscritorio {
  id: number;
  codigo: string;
  idEstacion: string;
  estacionServicio: string;
  direccion: string;
  comuna: string;
  rutRazonSocial: string;
  razonSocial: string;
  representanteLegal: string;
  rutRepresentanteLegal: string;
  descripcion: string;
  fechaIngreso: string;
  fechaIngresoOrden: string;
  semaforo: EstadoSemaforo;
  semaforoEtiqueta: string;
  editable: boolean;
}

const DATOS_ASOCIADOS: Record<number, DatosAsociados> = {
  1001: {
    rutRazonSocial: "76.543.210-3",
    representanteLegal: "María José Soto Pérez",
    rutRepresentanteLegal: "12.345.678-5",
    semaforo: "al-dia",
  },
  1002: {
    rutRazonSocial: "76.222.111-K",
    representanteLegal: "Andrés Fuentes Díaz",
    rutRepresentanteLegal: "15.842.367-7",
    semaforo: "proximo-vencer",
  },
  1003: {
    rutRazonSocial: "77.101.990-0",
    representanteLegal: "Paula Andrea Rojas Silva",
    rutRepresentanteLegal: "9.876.543-3",
    semaforo: "atrasado",
  },
  1004: {
    rutRazonSocial: "76.908.440-1",
    representanteLegal: "Felipe Muñoz Contreras",
    rutRepresentanteLegal: "13.579.246-2",
    semaforo: "al-dia",
  },
  1005: {
    rutRazonSocial: "77.450.320-K",
    representanteLegal: "Carolina Pérez Lagos",
    rutRepresentanteLegal: "17.223.456-9",
    semaforo: "atrasado",
  },
};

const ETIQUETAS_SEMAFORO: Record<EstadoSemaforo, string> = {
  "al-dia": "Al día",
  "proximo-vencer": "Próximo a vencer",
  atrasado: "Requiere atención",
};

@Component({
  selector: "app-escritorio",
  standalone: true,
  imports: [
    Breadcrumbs,
    CommonModule,
    FormsModule,
    InputTextModule,
    RouterLink,
    TableModule,
    TooltipModule,
  ],
  templateUrl: "./escritorio.html",
  styleUrl: "./escritorio.scss",
})
export class Escritorio {
  readonly breadcrumbs = [
    {
      label: "Módulo de Gestión de Trámites",
      route: "/home",
    },
    {
      label: "Escritorio",
    },
  ];

  readonly gestiones: GestionEscritorio[];

  consulta = "";
  filtroSemaforo: FiltroSemaforo = "todos";
  first = 0;
  rows = 10;

  constructor(tramitesMock: TramitesMock) {
    this.gestiones = tramitesMock
      .obtenerTodos()
      .map((tramite) => this.crearGestion(tramite));
  }

  get gestionesFiltradas(): GestionEscritorio[] {
    const consultaNormalizada = this.normalizar(this.consulta.trim());

    return this.gestiones.filter((gestion) => {
      const coincideSemaforo =
        this.filtroSemaforo === "todos" ||
        gestion.semaforo === this.filtroSemaforo;

      if (!coincideSemaforo || !consultaNormalizada) {
        return coincideSemaforo;
      }

      const contenido = [
        gestion.codigo,
        gestion.idEstacion,
        gestion.estacionServicio,
        gestion.direccion,
        gestion.comuna,
        gestion.rutRazonSocial,
        gestion.razonSocial,
        gestion.representanteLegal,
        gestion.rutRepresentanteLegal,
        gestion.descripcion,
        gestion.fechaIngreso,
        gestion.semaforoEtiqueta,
      ]
        .map((valor) => this.normalizar(valor))
        .join(" ");

      return contenido.includes(consultaNormalizada);
    });
  }

  get hayFiltrosActivos(): boolean {
    return Boolean(this.consulta.trim()) || this.filtroSemaforo !== "todos";
  }

  totalPorSemaforo(estado: EstadoSemaforo): number {
    return this.gestiones.filter((gestion) => gestion.semaforo === estado)
      .length;
  }

  seleccionarSemaforo(estado: FiltroSemaforo): void {
    this.filtroSemaforo = estado;
    this.first = 0;
  }

  actualizarConsulta(valor: string): void {
    this.consulta = valor;
    this.first = 0;
  }

  limpiarFiltros(): void {
    this.consulta = "";
    this.filtroSemaforo = "todos";
    this.first = 0;
  }

  pageChange(event: TablePageEvent): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  private crearGestion(tramite: Tramite): GestionEscritorio {
    const datos = DATOS_ASOCIADOS[tramite.id] ?? {
      rutRazonSocial:
        tramite.datosAdicionales?.["rutRazonSocial"] ?? "Sin registrar",
      representanteLegal:
        tramite.datosAdicionales?.["representanteLegal"] ?? "Sin registrar",
      rutRepresentanteLegal:
        tramite.datosAdicionales?.["rutRepresentanteLegal"] ?? "Sin registrar",
      semaforo: "al-dia",
    };

    return {
      id: tramite.id,
      codigo: `TR-2026-${tramite.id}`,
      idEstacion: tramite.idEstacion,
      estacionServicio: tramite.estacionServicio,
      direccion: tramite.direccion,
      comuna: tramite.comuna,
      rutRazonSocial: datos.rutRazonSocial,
      razonSocial: tramite.razonSocial,
      representanteLegal: datos.representanteLegal,
      rutRepresentanteLegal: datos.rutRepresentanteLegal,
      descripcion: tramite.tramiteEspecifico,
      fechaIngreso: tramite.fechaApertura,
      fechaIngresoOrden: this.convertirFechaAOrden(tramite.fechaApertura),
      semaforo: datos.semaforo,
      semaforoEtiqueta: ETIQUETAS_SEMAFORO[datos.semaforo],
      editable: !tramite.estado
        .toLocaleLowerCase("es-CL")
        .startsWith("terminado"),
    };
  }

  private convertirFechaAOrden(fecha: string): string {
    const [dia, mes, anio] = fecha.split("-");
    return `${anio}-${mes}-${dia}`;
  }

  private normalizar(valor: string): string {
    return valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es-CL");
  }
}
