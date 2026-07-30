import { CommonModule } from "@angular/common";
import { AfterViewInit, Component } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { MessageService } from "primeng/api";
import { ButtonDirective } from "primeng/button";
import { PanelModule } from "primeng/panel";
import { TagModule } from "primeng/tag";
import { ToastModule } from "primeng/toast";
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";
import {
  resolverSeveridadEstado,
  TagSeverity,
} from "../../models/estado-tramite";
import { Tramite } from "../../models/tramite";
import { TramitesMock } from "../../services/tramites-mock";

@Component({
  selector: "app-tramite-detalle",
  standalone: true,
  imports: [
    Breadcrumbs,
    ButtonDirective,
    CommonModule,
    PanelModule,
    RouterLink,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: "./tramite-detalle.html",
  styleUrl: "./tramite-detalle.scss",
})
export class TramiteDetalle implements AfterViewInit {
  readonly tramiteId: string;
  readonly tramite: Tramite | undefined;
  private readonly mostrarToastActualizacion: boolean;

  breadcrumbs: Array<{ label: string; route?: string }>;

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

  constructor(
    route: ActivatedRoute,
    router: Router,
    private readonly messageService: MessageService,
    tramitesMock: TramitesMock,
  ) {
    this.tramiteId = route.snapshot.paramMap.get("id") ?? "1001";
    this.tramite = tramitesMock.obtenerPorId(Number(this.tramiteId));
    this.mostrarToastActualizacion =
      router.getCurrentNavigation()?.extras.state?.["tramiteActualizado"] ===
      true;
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

  ngAfterViewInit(): void {
    if (!this.mostrarToastActualizacion) {
      return;
    }

    queueMicrotask(() => {
      this.messageService.add({
        severity: "success",
        summary: "Trámite actualizado",
        detail: "Los cambios se guardaron correctamente.",
        life: 5000,
      });
    });
  }

  obtenerSeveridadEstado(estado: string): TagSeverity {
    return resolverSeveridadEstado(estado);
  }
}
