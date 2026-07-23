import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";

@Component({
  selector: "app-tramite-detalle",
  standalone: true,
  imports: [CommonModule, RouterLink, Breadcrumbs],
  templateUrl: "./tramite-detalle.html",
  styleUrl: "./tramite-detalle.scss",
})
export class TramiteDetalle {
  readonly tramiteId: string;

  breadcrumbs: Array<{ label: string; route?: string }>;

  readonly tramite = {
    estacionServicio: "Copec Concón",
    concesionario: "Comercial Los Pinos SpA",
    prioridad: "Alta",
    estado: "En revisión",
    responsableInterno: "María González",
    tipoTramite: "Nuevo trámite",
    tramiteEspecifico: "Regularización de instalaciones",
    solicitanteCopec: "Carlos Ramírez",
    fechaApertura: "02-07-2026",
    fechaEstimadaTermino: "12-07-2026",
  };

  readonly antecedentesRequeridos = [
    {
      antecedente: "Certificado de dominio vigente",
      obligatorio: true,
      responsable: "Concesionario",
      estado: "Recibido",
      archivo: "certificado-dominio.pdf",
      observaciones: "Documento revisado y vigente.",
    },
    {
      antecedente: "Plano de instalaciones",
      obligatorio: true,
      responsable: "Oficina técnica",
      estado: "Pendiente",
      archivo: "Sin archivo",
      observaciones: "Pendiente de entrega por parte del solicitante.",
    },
  ];

  readonly antecedentesExtraordinarios = [
    {
      antecedente: "Informe complementario de seguridad",
      obligatorio: false,
      responsable: "Prevención de riesgos",
      estado: "En revisión",
      archivo: "informe-seguridad.pdf",
      observaciones: "Se solicitaron aclaraciones menores.",
    },
  ];

  readonly hitosGestion = [
    {
      hito: "Ingreso de solicitud",
      estado: "Finalizado",
      fechaEstimada: "02-07-2026",
      fechaReal: "02-07-2026",
      responsable: "Carlos Ramírez",
      observacion: "Solicitud ingresada correctamente.",
    },
    {
      hito: "Revisión técnica",
      estado: "En curso",
      fechaEstimada: "08-07-2026",
      fechaReal: "—",
      responsable: "María González",
      observacion: "Revisión documental y técnica en proceso.",
    },
  ];

  constructor(route: ActivatedRoute) {
    this.tramiteId = route.snapshot.paramMap.get("id") ?? "1001";
    this.breadcrumbs = [
      {
        label: "Módulo de Gestión de Trámites",
        route: "/tramites",
      },
      {
        label: "Consulta de Trámites",
        route: "/tramites",
      },
      {
        label: `Trámite ${this.tramiteId}`,
      },
    ];
  }

  obtenerClaseEstado(estado: string): string {
    const clases: Record<string, string> = {
      "En revisión": "text-bg-warning",
      Recibido: "text-bg-success",
      Pendiente: "text-bg-secondary",
      Finalizado: "text-bg-success",
      "En curso": "text-bg-primary",
    };

    return clases[estado] ?? "text-bg-secondary";
  }
}
