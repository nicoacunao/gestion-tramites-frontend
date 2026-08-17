import { CommonModule } from "@angular/common";
import { AfterViewInit, Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { MessageService } from "primeng/api";
import { ButtonDirective } from "primeng/button";
import { InfoCircleIcon } from "primeng/icons/infocircle";
import { PanelModule } from "primeng/panel";
import { TagModule } from "primeng/tag";
import { PopoverModule } from "primeng/popover";
import { TextareaModule } from "primeng/textarea";
import { TimelineModule } from "primeng/timeline";
import { ToastModule } from "primeng/toast";
import { Breadcrumbs } from "../../../../shared/components/breadcrumbs/breadcrumbs";
import {
  resolverSeveridadEstado,
  TagSeverity,
} from "../../models/estado-tramite";
import { Tramite } from "../../models/tramite";
import { TramitesMock } from "../../services/tramites-mock";

interface EntradaBitacora {
  fecha: string;
  hora: string;
  accion: string;
  comentario: string;
  comentarioBorrador: string;
  editando: boolean;
}

@Component({
  selector: "app-tramite-detalle",
  standalone: true,
  imports: [
    Breadcrumbs,
    ButtonDirective,
    CommonModule,
    FormsModule,
    InfoCircleIcon,
    PanelModule,
    RouterLink,
    TagModule,
    TextareaModule,
    TimelineModule,
    ToastModule,
    PopoverModule,
  ],
  providers: [MessageService],
  templateUrl: "./tramite-detalle.html",
  styleUrl: "./tramite-detalle.scss",
})
export class TramiteDetalle implements AfterViewInit {
  readonly tramiteId: string;
  readonly tramite: Tramite | undefined;
  private readonly mostrarToastActualizacion: boolean;

  readonly breadcrumbs: Array<{ label: string; route?: string }>;

  readonly bitacora: EntradaBitacora[] = [
    {
      fecha: "08-07-2026",
      hora: "16:40",
      accion: "Observación recibida",
      comentario:
        "La municipalidad solicitó complementar el plano con la ubicación de los accesos.",
      comentarioBorrador:
        "La municipalidad solicitó complementar el plano con la ubicación de los accesos.",
      editando: false,
    },
    {
      fecha: "08-07-2026",
      hora: "09:15",
      accion: "Revisión de la institución",
      comentario:
        "El expediente fue asignado al profesional revisor de la Dirección de Obras Municipales.",
      comentarioBorrador:
        "El expediente fue asignado al profesional revisor de la Dirección de Obras Municipales.",
      editando: false,
    },
    {
      fecha: "02-07-2026",
      hora: "11:30",
      accion: "Ingreso ante la institución",
      comentario:
        "Expediente ingresado en la Municipalidad de Concón bajo el folio DOM-2841.",
      comentarioBorrador:
        "Expediente ingresado en la Municipalidad de Concón bajo el folio DOM-2841.",
      editando: false,
    },
    {
      fecha: "02-07-2026",
      hora: "09:00",
      accion: "Creación del trámite",
      comentario: "Se creó el trámite y se asignó el responsable interno.",
      comentarioBorrador:
        "Se creó el trámite y se asignó el responsable interno.",
      editando: false,
    },
  ];

  readonly antecedentesRequeridos = [
    {
      antecedente: "Certificado de dominio vigente",
      obligatorio: true,
      responsable: "Concesionario",
      estado: "Recibido conforme",
      fechaCarga: "02-07-2026",
      archivo: "certificado-dominio.pdf",
    },
    {
      antecedente: "Plano de instalaciones",
      obligatorio: true,
      responsable: "Oficina técnica",
      estado: "Recibido",
      fechaCarga: "07-07-2026",
      archivo: "plano-instalaciones-v2.pdf",
    },
    {
      antecedente: "Formulario de ingreso",
      obligatorio: true,
      responsable: "Concesionario",
      estado: "Pendiente",
      fechaCarga: "—",
      archivo: "—",
    },
  ];

  readonly antecedentesComplementarios = [
    {
      tipoDocumento: "Informe complementario de seguridad",
      solicitadoPor: "Municipalidad de Concón",
      responsable: "Prevención de riesgos",
      estado: "Recibido",
      fechaCarga: "08-07-2026",
      archivo: "informe-seguridad.pdf",
    },
    {
      tipoDocumento: "Certificado de matrimonio",
      solicitadoPor: "Municipalidad de Concón",
      responsable: "Concesionario",
      estado: "Pendiente",
      fechaCarga: "—",
      archivo: "—",
    },
  ];

  readonly hitosGestion = [
    {
      hito: "Ingreso de la solicitud",
      estado: "Completado",
      fechaEstimada: "02-07-2026",
      fechaReal: "02-07-2026",
      responsable: "Carlos Ramírez",
      observacion: "Solicitud interna recibida.",
    },
    {
      hito: "Revisión de la ficha",
      estado: "Completado",
      fechaEstimada: "03-07-2026",
      fechaReal: "03-07-2026",
      responsable: "María González",
      observacion: "Datos generales validados.",
    },
    {
      hito: "Preparación del expediente",
      estado: "Completado",
      fechaEstimada: "06-07-2026",
      fechaReal: "06-07-2026",
      responsable: "Oficina técnica",
      observacion: "Expediente consolidado para ingreso.",
    },
    {
      hito: "Ingreso ante Municipalidad de Concón",
      estado: "Completado",
      fechaEstimada: "07-07-2026",
      fechaReal: "07-07-2026",
      responsable: "Carlos Ramírez",
      observacion: "Folio de ingreso DOM-2841.",
    },
    {
      hito: "Revisión de la institución",
      estado: "En curso",
      fechaEstimada: "15-07-2026",
      fechaReal: "—",
      responsable: "María González",
      observacion: "En revisión por la Dirección de Obras Municipales.",
    },
    {
      hito: "Reingreso de antecedentes",
      estado: "Pendiente",
      fechaEstimada: "18-07-2026",
      fechaReal: "—",
      responsable: "Oficina técnica",
      observacion: "Sujeto a la subsanación de observaciones.",
    },
    {
      hito: "Finalización",
      estado: "Pendiente",
      fechaEstimada: "25-07-2026",
      fechaReal: "—",
      responsable: "María González",
      observacion: "Pendiente del pronunciamiento de la institución.",
    },
  ];

  readonly archivosAdjuntos = [
    {
      archivo: "certificado-dominio.pdf",
      categoria: "Antecedente requerido",
      documento: "Certificado de dominio vigente",
      fechaCarga: "02-07-2026 10:12",
      cargadoPor: "Carlos Ramírez",
    },
    {
      archivo: "plano-instalaciones-v2.pdf",
      categoria: "Antecedente requerido",
      documento: "Plano de instalaciones",
      fechaCarga: "07-07-2026 17:05",
      cargadoPor: "Oficina técnica",
    },
    {
      archivo: "informe-seguridad.pdf",
      categoria: "Antecedente complementario",
      documento: "Informe complementario de seguridad",
      fechaCarga: "08-07-2026 15:48",
      cargadoPor: "Prevención de riesgos",
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

  editarComentario(entrada: EntradaBitacora): void {
    entrada.comentarioBorrador = entrada.comentario;
    entrada.editando = true;
  }

  guardarComentario(entrada: EntradaBitacora): void {
    const comentario = entrada.comentarioBorrador.trim();

    if (comentario) {
      entrada.comentario = comentario;
    }

    entrada.editando = false;
  }

  cancelarEdicionComentario(entrada: EntradaBitacora): void {
    entrada.comentarioBorrador = entrada.comentario;
    entrada.editando = false;
  }

  tieneArchivo(archivo: string): boolean {
    return archivo !== "—";
  }

  obtenerSeveridadEstado(estado: string): TagSeverity {
    return resolverSeveridadEstado(estado);
  }
}
