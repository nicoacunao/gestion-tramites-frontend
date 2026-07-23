import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";

@Component({
  selector: "app-tramite-modificacion",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Breadcrumbs],
  templateUrl: "./tramite-modificacion.html",
  styleUrl: "./tramite-modificacion.scss",
})
export class TramiteModificacion {
  readonly tramiteId: string;
  readonly estados = ["Pendiente", "En revisión", "Recibido", "Finalizado"];
  readonly responsables = [
    "María González",
    "Carlos Ramírez",
    "Oficina técnica",
    "Concesionario",
  ];

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

  antecedentesRequeridos = [
    {
      antecedente: "Certificado de dominio vigente",
      obligatorio: true,
      responsable: "Concesionario",
      estado: "Recibido",
      observaciones: "Documento revisado y vigente.",
    },
    {
      antecedente: "Plano de instalaciones",
      obligatorio: true,
      responsable: "Oficina técnica",
      estado: "Pendiente",
      observaciones: "Pendiente de entrega por parte del solicitante.",
    },
  ];

  antecedentesExtraordinarios = [
    {
      antecedente: "Informe complementario de seguridad",
      obligatorio: false,
      responsable: "Oficina técnica",
      estado: "En revisión",
      observaciones: "Se solicitaron aclaraciones menores.",
    },
  ];

  hitosGestion = [
    {
      hito: "Ingreso de solicitud",
      estado: "Finalizado",
      fechaEstimada: "2026-07-02",
      fechaReal: "2026-07-02",
      responsable: "Carlos Ramírez",
      observacion: "Solicitud ingresada correctamente.",
    },
    {
      hito: "Revisión técnica",
      estado: "En revisión",
      fechaEstimada: "2026-07-08",
      fechaReal: "",
      responsable: "María González",
      observacion: "Revisión documental y técnica en proceso.",
    },
  ];

  constructor(
    route: ActivatedRoute,
    private readonly router: Router,
  ) {
    this.tramiteId = route.snapshot.paramMap.get("id") ?? "1001";
    this.breadcrumbs = [
      { label: "Módulo de Gestión de Trámites", route: "/tramites" },
      {
        label: `Trámite ${this.tramiteId}`,
        route: `/tramites/${this.tramiteId}`,
      },
      { label: "Modificar" },
    ];
  }

  agregarAntecedenteRequerido(): void {
    this.antecedentesRequeridos.push(this.crearAntecedenteVacio());
  }

  agregarAntecedenteExtraordinario(): void {
    this.antecedentesExtraordinarios.push(this.crearAntecedenteVacio());
  }

  agregarHito(): void {
    this.hitosGestion.push({
      hito: "",
      estado: "",
      fechaEstimada: "",
      fechaReal: "",
      responsable: "",
      observacion: "",
    });
  }

  grabar(): void {
    void this.router.navigate(["/tramites", this.tramiteId]);
  }

  private crearAntecedenteVacio() {
    return {
      antecedente: "",
      obligatorio: false,
      responsable: "",
      estado: "",
      observaciones: "",
    };
  }
}
